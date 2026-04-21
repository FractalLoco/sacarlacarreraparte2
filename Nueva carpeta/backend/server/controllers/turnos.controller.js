"use strict";
const pool = require("../config/db");

const listar = async (req,res) => {
  try {
    const {lote_id, estado} = req.query;
    let q = `
      SELECT t.*, u.nombre AS supervisor_nombre,
        l.codigo AS lote_codigo,
        COUNT(DISTINCT p.id)::int AS total_pesajes,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.kilos END),0) AS kilos_producidos,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.cajas END),0)::int AS cajas_producidas,
        EXTRACT(EPOCH FROM (COALESCE(t.hora_fin,NOW()) - t.hora_inicio))/3600 AS horas_transcurridas
      FROM turnos t
      JOIN lotes l ON l.id=t.lote_id
      LEFT JOIN usuarios u ON u.id=t.supervisor_id
      LEFT JOIN pesajes p ON p.turno_id=t.id
      LEFT JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      WHERE 1=1`;
    const p = [];
    if (lote_id) { p.push(lote_id); q += ` AND t.lote_id=$${p.length}`; }
    if (estado)  { p.push(estado);  q += ` AND t.estado=$${p.length}`; }
    q += " GROUP BY t.id,u.nombre,l.codigo ORDER BY t.created_at DESC";
    const {rows} = await pool.query(q, p);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const activo = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT t.*, u.nombre AS supervisor_nombre, l.codigo AS lote_codigo,
        COUNT(DISTINCT p.id)::int AS total_pesajes,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.kilos END),0) AS kilos_producidos,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.cajas END),0)::int AS cajas_producidas,
        EXTRACT(EPOCH FROM (NOW() - t.hora_inicio))/3600 AS horas_transcurridas
      FROM turnos t JOIN lotes l ON l.id=t.lote_id
      LEFT JOIN usuarios u ON u.id=t.supervisor_id
      LEFT JOIN pesajes p ON p.turno_id=t.id
      LEFT JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      WHERE t.estado='abierto'
      GROUP BY t.id,u.nombre,l.codigo
      LIMIT 1`);
    return res.json(rows[0]||null);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const abrir = async (req,res) => {
  try {
    const {lote_id, nombre, observacion} = req.body;
    if (!lote_id) return res.status(400).json({error:"lote_id es requerido"});
    const {rows} = await pool.query(
      `INSERT INTO turnos(lote_id,supervisor_id,nombre,hora_inicio,estado,observacion)
       VALUES($1,$2,$3,NOW(),'abierto',$4) RETURNING *`,
      [lote_id, req.usuario.id, nombre||`Turno ${new Date().toLocaleString("es-CL")}`, observacion||null]
    );
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const cerrar = async (req,res) => {
  try {
    const {observacion_cierre} = req.body;
    // Calcular resumen antes de cerrar
    const {rows:resumen} = await pool.query(`
      SELECT
        COUNT(DISTINCT p.id)::int AS total_pesajes,
        COUNT(DISTINCT p.linea_id)::int AS lineas_activas,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.kilos END),0) AS kilos_producidos,
        COALESCE(SUM(CASE WHEN pt.es_desecho=true  THEN p.kilos END),0) AS kilos_desecho,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.cajas END),0)::int AS cajas_producidas,
        EXTRACT(EPOCH FROM (NOW() - t.hora_inicio))/3600 AS horas
      FROM turnos t
      LEFT JOIN pesajes p ON p.turno_id=t.id
      LEFT JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      WHERE t.id=$1
      GROUP BY t.hora_inicio`,[req.params.id]);

    const {rows} = await pool.query(
      `UPDATE turnos SET estado='cerrado', hora_fin=NOW(),
       observacion_cierre=$1 WHERE id=$2 AND estado='abierto' RETURNING *`,
      [observacion_cierre||null, req.params.id]
    );
    if (!rows.length) return res.status(400).json({error:"Turno no encontrado o ya cerrado"});
    return res.json({...rows[0], resumen: resumen[0]||{}});
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const resumenTurno = async (req,res) => {
  try {
    const {rows:turno} = await pool.query(
      "SELECT t.*,u.nombre AS supervisor_nombre,l.codigo AS lote_codigo FROM turnos t JOIN lotes l ON l.id=t.lote_id LEFT JOIN usuarios u ON u.id=t.supervisor_id WHERE t.id=$1",
      [req.params.id]
    );
    if (!turno.length) return res.status(404).json({error:"Turno no encontrado"});
    const {rows:porProducto} = await pool.query(`
      SELECT pt.nombre AS producto, pt.es_desecho,
        COALESCE(c.nombre,'Sin calibre') AS calibre,
        lp.nombre AS linea,
        SUM(p.kilos) AS kilos, SUM(p.cajas)::int AS cajas
      FROM pesajes p
      JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      LEFT JOIN calibres c ON c.id=p.calibre_id
      LEFT JOIN lineas_produccion lp ON lp.id=p.linea_id
      WHERE p.turno_id=$1
      GROUP BY pt.nombre,pt.es_desecho,c.nombre,lp.nombre
      ORDER BY pt.es_desecho,pt.nombre,c.nombre`,[req.params.id]);
    const {rows:porLinea} = await pool.query(`
      SELECT lp.nombre AS linea,
        SUM(CASE WHEN pt.es_desecho=false THEN p.kilos END) AS kilos,
        SUM(CASE WHEN pt.es_desecho=false THEN p.cajas END)::int AS cajas
      FROM pesajes p JOIN lineas_produccion lp ON lp.id=p.linea_id
      JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      WHERE p.turno_id=$1 GROUP BY lp.nombre ORDER BY lp.nombre`,[req.params.id]);
    const kgProd = porProducto.filter(r=>!r.es_desecho).reduce((s,r)=>s+parseFloat(r.kilos||0),0);
    const kgDes  = porProducto.filter(r=>r.es_desecho).reduce((s,r)=>s+parseFloat(r.kilos||0),0);
    const cajas  = porProducto.filter(r=>!r.es_desecho).reduce((s,r)=>s+parseInt(r.cajas||0),0);
    const horas  = turno[0].hora_fin
      ? (new Date(turno[0].hora_fin)-new Date(turno[0].hora_inicio))/3600000
      : (Date.now()-new Date(turno[0].hora_inicio))/3600000;
    return res.json({turno:turno[0],por_producto:porProducto,por_linea:porLinea,
      kg_producidos:kgProd,kg_desecho:kgDes,total_cajas:cajas,horas_duracion:horas.toFixed(2)});
  } catch(e) { return res.status(500).json({error:e.message}); }
};

module.exports = {listar, activo, abrir, cerrar, resumenTurno};
