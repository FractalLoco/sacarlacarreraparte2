"use strict";
const pool = require("../config/db");

const listar = async (req,res) => {
  try {
    const {activo,q} = req.query;
    let sql = "SELECT * FROM conductores WHERE 1=1";
    const p = [];
    if (activo !== undefined) { p.push(activo === "false" ? false : true); sql += ` AND activo=$${p.length}`; }
    if (q) { p.push(`%${q}%`); sql += ` AND (nombre ILIKE $${p.length} OR rut ILIKE $${p.length} OR patente_habitual ILIKE $${p.length})`; }
    sql += " ORDER BY nombre ASC";
    const {rows} = await pool.query(sql, p);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:"Error interno: "+e.message}); }
};

const obtener = async (req,res) => {
  try {
    const {rows} = await pool.query("SELECT * FROM conductores WHERE id=$1",[req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Conductor no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

const crear = async (req,res) => {
  try {
    const {rut,nombre,telefono,empresa_transporte,patente_habitual} = req.body;
    if (!rut || !nombre) return res.status(400).json({error:"rut y nombre son requeridos"});
    const dup = await pool.query("SELECT id FROM conductores WHERE rut=$1",[rut.trim()]);
    if (dup.rows.length) return res.status(400).json({error:"Ya existe un conductor con ese RUT"});
    const {rows} = await pool.query(
      `INSERT INTO conductores(rut,nombre,telefono,empresa_transporte,patente_habitual)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [rut.trim(), nombre.trim(), telefono||null, empresa_transporte||null, patente_habitual||null]
    );
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno: "+e.message}); }
};

const actualizar = async (req,res) => {
  try {
    const {rut,nombre,telefono,empresa_transporte,patente_habitual,activo} = req.body;
    const {rows} = await pool.query(
      `UPDATE conductores SET rut=$1,nombre=$2,telefono=$3,empresa_transporte=$4,patente_habitual=$5,activo=$6
       WHERE id=$7 RETURNING *`,
      [rut,nombre,telefono,empresa_transporte,patente_habitual,activo,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Conductor no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

module.exports = { listar, obtener, crear, actualizar };