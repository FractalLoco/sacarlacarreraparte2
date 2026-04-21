"use strict";
const pool = require("../config/db");

// ── PRODUCTOS TIPO ────────────────────────────────────────────
const listarProductos = async (_req,res) => {
  try {
    const {rows} = await pool.query(
      "SELECT p.*, COUNT(c.id)::int AS total_calibres FROM productos_tipo p LEFT JOIN calibres c ON c.id=p.id GROUP BY p.id ORDER BY p.orden,p.nombre"
    );
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const crearProducto = async (req,res) => {
  try {
    const {nombre,categoria,es_desecho,orden} = req.body;
    if (!nombre) return res.status(400).json({error:"nombre es requerido"});
    const {rows} = await pool.query(
      "INSERT INTO productos_tipo(nombre,categoria,es_desecho,orden) VALUES($1,$2,$3,$4) RETURNING *",
      [nombre.trim(),categoria||"jibia",es_desecho||false,orden||0]
    );
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

const actualizarProducto = async (req,res) => {
  try {
    const {nombre,categoria,es_desecho,orden,activo} = req.body;
    const {rows} = await pool.query(
      "UPDATE productos_tipo SET nombre=$1,categoria=$2,es_desecho=$3,orden=$4,activo=$5 WHERE id=$6 RETURNING *",
      [nombre,categoria,es_desecho,orden,activo,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Producto no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

// ── CALIBRES ──────────────────────────────────────────────────
const listarCalibres = async (_req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT c.*, pt.nombre AS producto_tipo_nombre
      FROM calibres c JOIN productos_tipo pt ON pt.id=c.producto_tipo_id
      ORDER BY pt.orden,pt.nombre,c.nombre`);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const crearCalibres = async (req,res) => {
  try {
    const {producto_tipo_id,nombre} = req.body;
    if (!producto_tipo_id||!nombre) return res.status(400).json({error:"producto_tipo_id y nombre son requeridos"});
    const {rows} = await pool.query(
      "INSERT INTO calibres(producto_tipo_id,nombre) VALUES($1,$2) RETURNING *",
      [producto_tipo_id,nombre.trim()]
    );
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

const actualizarCalibre = async (req,res) => {
  try {
    const {nombre,activo} = req.body;
    const {rows} = await pool.query(
      "UPDATE calibres SET nombre=$1,activo=$2 WHERE id=$3 RETURNING *",
      [nombre,activo,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Calibre no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

// ── LÍNEAS ────────────────────────────────────────────────────
const listarLineas = async (_req,res) => {
  try {
    const {rows} = await pool.query("SELECT * FROM lineas_produccion ORDER BY nombre");
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const crearLinea = async (req,res) => {
  try {
    const {nombre} = req.body;
    if (!nombre) return res.status(400).json({error:"nombre es requerido"});
    const {rows} = await pool.query(
      "INSERT INTO lineas_produccion(nombre) VALUES($1) RETURNING *",[nombre.trim()]);
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

const actualizarLinea = async (req,res) => {
  try {
    const {nombre,activa} = req.body;
    const {rows} = await pool.query(
      "UPDATE lineas_produccion SET nombre=$1,activa=$2 WHERE id=$3 RETURNING *",
      [nombre,activa,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Línea no encontrada"});
    return res.json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

// ── TÚNELES ───────────────────────────────────────────────────
const listarTuneles = async (_req,res) => {
  try {
    const {rows} = await pool.query("SELECT * FROM tuneles ORDER BY nombre");
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const crearTunel = async (req,res) => {
  try {
    const {nombre,capacidad_max,observacion} = req.body;
    if (!nombre) return res.status(400).json({error:"nombre es requerido"});
    const {rows} = await pool.query(
      "INSERT INTO tuneles(nombre,capacidad_max,observacion) VALUES($1,$2,$3) RETURNING *",
      [nombre.trim(),capacidad_max||32,observacion||null]
    );
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

const actualizarTunel = async (req,res) => {
  try {
    const {nombre,capacidad_max,activo,observacion} = req.body;
    const {rows} = await pool.query(
      "UPDATE tuneles SET nombre=$1,capacidad_max=$2,activo=$3,observacion=$4 WHERE id=$5 RETURNING *",
      [nombre,capacidad_max,activo,observacion,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Túnel no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

module.exports = {
  listarProductos, crearProducto, actualizarProducto,
  listarCalibres, crearCalibres, actualizarCalibre,
  listarLineas, crearLinea, actualizarLinea,
  listarTuneles, crearTunel, actualizarTunel,
};
