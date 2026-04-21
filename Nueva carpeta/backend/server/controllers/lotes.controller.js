"use strict";
const pool = require("../config/db");

const listar = async (req,res) => {
  try {
    const {estado,fecha_desde,fecha_hasta,codigo,proveedor_id,conductor_id} = req.query;
    let q = `
      SELECT l.*,
        u.nombre   AS creado_por_nombre,
        ur.nombre  AS recibido_por_nombre,
        pr.nombre  AS proveedor_nombre, pr.rut AS proveedor_rut,
        co.nombre  AS conductor_nombre, co.rut AS conductor_rut,
        co.empresa_transporte,
        COUNT(DISTINCT p.id)::int  AS total_pesajes,
        COUNT(DISTINCT ca.id)::int AS total_cajas,
        COUNT(DISTINCT c.id)::int  AS total_carros,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.kilos ELSE 0 END),0) AS kilos_producidos,
        COALESCE(SUM(CASE WHEN pt.es_desecho=true  THEN p.kilos ELSE 0 END),0) AS kilos_desecho
      FROM lotes l
      LEFT JOIN usuarios u   ON u.id=l.creado_por
      LEFT JOIN usuarios ur  ON ur.id=l.recibido_por
      LEFT JOIN proveedores pr ON pr.id=l.proveedor_id
      LEFT JOIN conductores co ON co.id=l.conductor_id
      LEFT JOIN pesajes p    ON p.lote_id=l.id
      LEFT JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      LEFT JOIN carros c     ON c.lote_id=l.id
      LEFT JOIN cajas ca     ON ca.lote_id=l.id
      WHERE 1=1`;
    const params=[];
    if(estado)      { params.push(estado);        q+=` AND l.estado=$${params.length}`; }
    if(fecha_desde) { params.push(fecha_desde);   q+=` AND l.fecha_ingreso>=$${params.length}`; }
    if(fecha_hasta) { params.push(fecha_hasta);   q+=` AND l.fecha_ingreso<=$${params.length}`; }
    if(codigo)      { params.push(`%${codigo}%`); q+=` AND l.codigo ILIKE $${params.length}`; }
    if(proveedor_id){ params.push(proveedor_id);  q+=` AND l.proveedor_id=$${params.length}`; }
    if(conductor_id){ params.push(conductor_id);  q+=` AND l.conductor_id=$${params.length}`; }
    q += " GROUP BY l.id,u.nombre,ur.nombre,pr.nombre,pr.rut,co.nombre,co.rut,co.empresa_transporte ORDER BY l.fecha_ingreso DESC,l.created_at DESC";
    const {rows} = await pool.query(q,params);
    return res.json(rows);
  } catch(e) { console.error("lotes.listar:",e.message); return res.status(500).json({error:"Error interno"}); }
};

const obtenerActivo = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT l.*,u.nombre AS creado_por_nombre,
        pr.nombre AS proveedor_nombre, co.nombre AS conductor_nombre,
        co.empresa_transporte, l.patente_camion, patente_rampla,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.kilos ELSE 0 END),0) AS kilos_producidos,
        COALESCE(SUM(CASE WHEN pt.es_desecho=true  THEN p.kilos ELSE 0 END),0) AS kilos_desecho
      FROM lotes l
      LEFT JOIN usuarios u ON u.id=l.creado_por
      LEFT JOIN proveedores pr ON pr.id=l.proveedor_id
      LEFT JOIN conductores co ON co.id=l.conductor_id
      LEFT JOIN pesajes p ON p.lote_id=l.id
      LEFT JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      WHERE l.estado='en_proceso'
      GROUP BY l.id,u.nombre,pr.nombre,co.nombre,co.empresa_transporte,l.patente_camion
      LIMIT 1`);
    return res.json(rows[0]||null);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

const obtener = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT l.*,
        u.nombre  AS creado_por_nombre, ur.nombre AS recibido_por_nombre,
        pr.nombre AS proveedor_nombre, pr.rut AS proveedor_rut, pr.telefono AS proveedor_telefono,
        co.nombre AS conductor_nombre, co.rut AS conductor_rut, co.telefono AS conductor_telefono,
        co.empresa_transporte
      FROM lotes l
      LEFT JOIN usuarios u   ON u.id=l.creado_por
      LEFT JOIN usuarios ur  ON ur.id=l.recibido_por
      LEFT JOIN proveedores pr ON pr.id=l.proveedor_id
      LEFT JOIN conductores co ON co.id=l.conductor_id
      WHERE l.id=$1`,[req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Lote no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

const resumen = async (req,res) => {
  try {
    const {rows:lote} = await pool.query(`
      SELECT l.*,u.nombre AS creado_por_nombre,ur.nombre AS recibido_por_nombre,
        pr.nombre AS proveedor_nombre,co.nombre AS conductor_nombre,co.empresa_transporte
      FROM lotes l LEFT JOIN usuarios u ON u.id=l.creado_por
      LEFT JOIN usuarios ur ON ur.id=l.recibido_por
      LEFT JOIN proveedores pr ON pr.id=l.proveedor_id
      LEFT JOIN conductores co ON co.id=l.conductor_id
      WHERE l.id=$1`,[req.params.id]);
    if (!lote.length) return res.status(404).json({error:"Lote no encontrado"});
    const {rows:porTipo} = await pool.query(
      `SELECT pt.id,pt.nombre AS producto,pt.es_desecho,MAX(p.fecha_elaboracion) AS fecha_elaboracion,
         COALESCE(SUM(p.cajas),0)::int AS cajas,COALESCE(SUM(p.kilos),0) AS kilos,COALESCE(SUM(p.bandejas),0)::int AS bandejas
       FROM productos_tipo pt LEFT JOIN pesajes p ON p.producto_tipo_id=pt.id AND p.lote_id=$1
       GROUP BY pt.id,pt.nombre,pt.es_desecho ORDER BY pt.orden ASC`,[req.params.id]);
    const {rows:porCalibre} = await pool.query(
      `SELECT pt.nombre AS producto,COALESCE(c.nombre,'Sin calibre') AS calibre,
         COALESCE(SUM(p.cajas),0)::int AS cajas,COALESCE(SUM(p.kilos),0) AS kilos,COALESCE(SUM(p.bandejas),0)::int AS bandejas
       FROM pesajes p JOIN productos_tipo pt ON pt.id=p.producto_tipo_id LEFT JOIN calibres c ON c.id=p.calibre_id
       WHERE p.lote_id=$1 AND pt.es_desecho=false GROUP BY pt.nombre,c.nombre,pt.orden ORDER BY pt.orden ASC,c.nombre ASC`,[req.params.id]);
    const kb=parseFloat(lote[0].kilos_brutos);
    const kp=porTipo.filter(r=>!r.es_desecho).reduce((s,r)=>s+parseFloat(r.kilos||0),0);
    const kd=parseFloat(porTipo.find(r=>r.es_desecho)?.kilos||0);
    return res.json({
      lote:lote[0],
      por_tipo:porTipo.map(r=>({...r,rendimiento:kb>0?((parseFloat(r.kilos||0)/kb)*100).toFixed(2):"0.00"})),
      por_calibre:porCalibre, kilos_brutos:kb, kilos_producidos:kp, kilos_desecho:kd,
      rendimiento_total:kb>0?((kp/kb)*100).toFixed(2):"0.00",
      total_cajas:porTipo.filter(r=>!r.es_desecho).reduce((s,r)=>s+parseInt(r.cajas||0),0),
      total_bandejas:porTipo.filter(r=>!r.es_desecho).reduce((s,r)=>s+parseInt(r.bandejas||0),0),
    });
  } catch(e) { console.error("lotes.resumen:",e.message); return res.status(500).json({error:"Error interno"}); }
};

const crear = async (req,res) => {
  try {
    const {
      codigo, fecha_ingreso, kilos_brutos,
      guia_despacho, proveedor_guia, factura_numero, proveedor_factura,
      folio_abastecimiento, folio_produccion,
      proveedor_id, conductor_id, patente_camion, patente_rampla, empresa_transporte,
      hora_llegada, hora_inicio_descarga, hora_fin_descarga,
      temperatura_carga, estado_carga, observacion_recepcion, observacion
    } = req.body;

    if (!codigo || !kilos_brutos) return res.status(400).json({error:"codigo y kilos_brutos son requeridos"});
    if (parseFloat(kilos_brutos) < 0) return res.status(400).json({error:"kilos_brutos no puede ser negativo"});
    const enProceso = await pool.query("SELECT id FROM lotes WHERE estado='en_proceso'");
    if (enProceso.rows.length) return res.status(400).json({error:"Ya hay un lote en proceso. Ciérralo primero"});
    const dup = await pool.query("SELECT id FROM lotes WHERE codigo=$1",[codigo.toUpperCase().trim()]);
    if (dup.rows.length) return res.status(400).json({error:`Ya existe el lote ${codigo}`});

    const {rows} = await pool.query(
      `INSERT INTO lotes(
         codigo,fecha_ingreso,kilos_brutos,
         guia_despacho,proveedor_guia,factura_numero,proveedor_factura,
         folio_abastecimiento,folio_produccion,
         proveedor_id,conductor_id,patente_camion,patente_rampla,empresa_transporte,
         hora_llegada,hora_inicio_descarga,hora_fin_descarga,
         temperatura_carga,estado_carga,observacion_recepcion,observacion,
         estado,creado_por,recibido_por
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'pendiente',$22,$22)
       RETURNING *`,
      [
        codigo.toUpperCase().trim(), fecha_ingreso||new Date(), kilos_brutos,
        guia_despacho||null, proveedor_guia||null, factura_numero||null, proveedor_factura||null,
        folio_abastecimiento||null, folio_produccion||null,
        proveedor_id||null, conductor_id||null, patente_camion||null, patente_rampla||null, empresa_transporte||null,
        hora_llegada||null, hora_inicio_descarga||null, hora_fin_descarga||null,
        temperatura_carga||null, estado_carga||null, observacion_recepcion||null, observacion||null,
        req.usuario.id
      ]
    );
    return res.status(201).json(rows[0]);
  } catch(e) { console.error("lotes.crear:",e.message); return res.status(500).json({error:"Error interno"}); }
};

const actualizar = async (req,res) => {
  try {
    const {
      codigo, fecha_ingreso, kilos_brutos,
      guia_despacho, proveedor_guia, factura_numero, proveedor_factura,
      folio_abastecimiento, folio_produccion,
      proveedor_id, conductor_id, patente_camion, patente_rampla, empresa_transporte,
      hora_llegada, hora_inicio_descarga, hora_fin_descarga,
      temperatura_carga, estado_carga, observacion_recepcion, observacion
    } = req.body;

    if (kilos_brutos !== undefined && parseFloat(kilos_brutos) < 0)
      return res.status(400).json({error:"kilos_brutos no puede ser negativo"});

    const {rows} = await pool.query(
      `UPDATE lotes SET
         codigo=$1,fecha_ingreso=$2,kilos_brutos=$3,
         guia_despacho=$4,proveedor_guia=$5,factura_numero=$6,proveedor_factura=$7,
         folio_abastecimiento=$8,folio_produccion=$9,
         proveedor_id=$10,conductor_id=$11,patente_camion=$12,patente_rampla=$13,empresa_transporte=$14,
         hora_llegada=$15,hora_inicio_descarga=$16,hora_fin_descarga=$17,
         temperatura_carga=$18,estado_carga=$19,observacion_recepcion=$20,observacion=$21,
         updated_at=NOW()
       WHERE id=$22 RETURNING *`,
      [
        codigo, fecha_ingreso, kilos_brutos,
        guia_despacho, proveedor_guia, factura_numero, proveedor_factura,
        folio_abastecimiento, folio_produccion,
        proveedor_id||null, conductor_id||null, patente_camion||null, patente_rampla||null, empresa_transporte||null,
        hora_llegada||null, hora_inicio_descarga||null, hora_fin_descarga||null,
        temperatura_carga||null, estado_carga||null, observacion_recepcion||null, observacion||null,
        req.params.id
      ]
    );
    if (!rows.length) return res.status(404).json({error:"Lote no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

const cambiarEstado = async (req,res) => {
  try {
    const {estado} = req.body;
    if (!["pendiente","en_proceso","cerrado"].includes(estado))
      return res.status(400).json({error:"Estado inválido"});
    if (estado==="en_proceso") {
      const otro = await pool.query("SELECT id FROM lotes WHERE estado='en_proceso' AND id!=$1",[req.params.id]);
      if (otro.rows.length) return res.status(400).json({error:"Ya hay otro lote en proceso"});
    }
    const {rows} = await pool.query(
      "UPDATE lotes SET estado=$1,updated_at=NOW() WHERE id=$2 RETURNING *",[estado,req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Lote no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

module.exports = { listar, obtenerActivo, obtener, resumen, crear, actualizar, cambiarEstado };