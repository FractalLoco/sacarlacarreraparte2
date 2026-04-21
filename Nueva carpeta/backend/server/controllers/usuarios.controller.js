"use strict";
const bcrypt = require("bcryptjs");
const pool   = require("../config/db");

const listar = async (req,res) => {
  try {
    const { rows } = await pool.query(`SELECT u.id,u.nombre,u.email,u.activo,u.created_at,r.id AS rol_id,r.nombre AS rol,r.nivel FROM usuarios u JOIN roles r ON r.id=u.rol_id ORDER BY r.nivel DESC,u.nombre ASC`);
    return res.json(rows);
  } catch(e) { return res.status(500).json({ error:"Error interno" }); }
};

const listarRoles = async (req,res) => {
  try {
    const { rows } = await pool.query("SELECT id,nombre,descripcion,nivel FROM roles ORDER BY nivel DESC");
    return res.json(rows);
  } catch(e) { return res.status(500).json({ error:"Error interno" }); }
};

const crear = async (req,res) => {
  try {
    const { nombre,email,password,rol_id } = req.body;
    if (!nombre||!email||!password) return res.status(400).json({ error:"nombre, email y password requeridos" });
    if (password.length<8) return res.status(400).json({ error:"Minimo 8 caracteres" });
    const existe = await pool.query("SELECT id FROM usuarios WHERE email=$1",[email.toLowerCase().trim()]);
    if (existe.rows.length) return res.status(400).json({ error:"Email ya registrado" });
    const hash = await bcrypt.hash(password,12);
    const { rows } = await pool.query(`INSERT INTO usuarios(nombre,email,password_hash,rol_id) VALUES($1,$2,$3,$4) RETURNING id,nombre,email,activo`,[nombre,email.toLowerCase().trim(),hash,rol_id||5]);
    return res.status(201).json(rows[0]);
  } catch(e) { return res.status(500).json({ error:"Error interno" }); }
};

const actualizar = async (req,res) => {
  try {
    const { nombre,email,rol_id,activo } = req.body;
    const { rows } = await pool.query(`UPDATE usuarios SET nombre=$1,email=$2,rol_id=$3,activo=$4 WHERE id=$5 RETURNING id,nombre,email,activo`,[nombre,email,rol_id,activo,req.params.id]);
    if (!rows.length) return res.status(404).json({ error:"Usuario no encontrado" });
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({ error:"Error interno" }); }
};

const desactivar = async (req,res) => {
  try {
    const { rows } = await pool.query("UPDATE usuarios SET activo=false WHERE id=$1 RETURNING id",[req.params.id]);
    if (!rows.length) return res.status(404).json({ error:"Usuario no encontrado" });
    return res.json({ ok:true });
  } catch(e) { return res.status(500).json({ error:"Error interno" }); }
};

module.exports = { listar, listarRoles, crear, actualizar, desactivar };