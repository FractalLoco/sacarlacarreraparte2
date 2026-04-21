"use strict";
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const pool   = require("../config/db");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error:"Email y contrasena requeridos" });
    const { rows } = await pool.query(
      `SELECT u.id,u.nombre,u.email,u.password_hash,r.nombre AS rol,r.nivel FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.email=$1 AND u.activo=true`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error:"Credenciales incorrectas" });
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error:"Credenciales incorrectas" });
    const token = jwt.sign({ id:u.id, rol:u.rol }, process.env.JWT_SECRET, { expiresIn:process.env.JWT_EXPIRES_IN||"8h" });
    return res.json({ token, usuario:{ id:u.id, nombre:u.nombre, email:u.email, rol:u.rol, nivel:u.nivel } });
  } catch(e) { console.error("auth.login:",e.message); return res.status(500).json({ error:"Error interno" }); }
};

const me = (req, res) => res.json(req.usuario);

const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;
    if (!password_actual||!password_nueva) return res.status(400).json({ error:"Se requieren ambas contrasenas" });
    if (password_nueva.length<8) return res.status(400).json({ error:"Minimo 8 caracteres" });
    const { rows } = await pool.query("SELECT password_hash FROM usuarios WHERE id=$1",[req.usuario.id]);
    if (!await bcrypt.compare(password_actual, rows[0].password_hash)) return res.status(400).json({ error:"Contrasena actual incorrecta" });
    await pool.query("UPDATE usuarios SET password_hash=$1 WHERE id=$2",[await bcrypt.hash(password_nueva,12),req.usuario.id]);
    return res.json({ ok:true, mensaje:"Contrasena actualizada" });
  } catch(e) { return res.status(500).json({ error:"Error interno" }); }
};

module.exports = { login, me, cambiarPassword };