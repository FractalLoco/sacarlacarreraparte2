"use strict";
const pool = require("../config/db");

const listar = async (req,res) => {
  try {
    const {activo,q} = req.query;
    let sql = "SELECT * FROM proveedores WHERE 1=1";
    const p = [];
    if (activo !== undefined) { p.push(activo === "false" ? false : true); sql += ` AND activo=$${p.length}`; }
    if (q) { p.push(`%${q}%`); sql += ` AND (nombre ILIKE $${p.length} OR rut ILIKE $${p.length})`; }
    sql += " ORDER BY nombre ASC";
    const {rows} = await pool.query(sql, p);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:"Error interno: "+e.message}); }
};

const obtener = async (req,res) => {
  try {
    const {rows} = await pool.query("SELECT * FROM proveedores WHERE id=$1",[req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Proveedor no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

const crear = async (req,res) => {
  try {
    const {rut,nombre,contacto,telefono,email,direccion} = req.body;
    if (!rut || !nombre) return res.status(400).json({error:"rut y nombre son requeridos"});
    const dup = await pool.query("SELECT id FROM proveedores WHERE rut=$1",[rut.trim()]);
    if (dup.rows.length) return res.status(400).json({error:"Ya existe un proveedor con ese RUT"});
    const {rows} = await pool.query(
      `INSERT INTO proveedores(rut,nombre,contacto,telefono,email,direccion)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [rut.trim(), nombre.trim(), contacto||null, telefono||null, email||null, direccion||null]
    );
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno: "+e.message}); }
};

const actualizar = async (req,res) => {
  try {
    const {rut,nombre,contacto,telefono,email,direccion,activo} = req.body;
    const {rows} = await pool.query(
      `UPDATE proveedores SET rut=$1,nombre=$2,contacto=$3,telefono=$4,email=$5,direccion=$6,activo=$7
       WHERE id=$8 RETURNING *`,
      [rut,nombre,contacto,telefono,email,direccion,activo,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Proveedor no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

module.exports = { listar, obtener, crear, actualizar };