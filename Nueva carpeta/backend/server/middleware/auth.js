"use strict";
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const autenticar = async (req, res, next) => {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token requerido" });
    const decoded = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    const { rows } = await pool.query(
      "SELECT u.*,r.nivel,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=$1 AND u.activo=true",
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ error: "Usuario no encontrado o inactivo" });
    if (decoded.tv !== rows[0].token_version) {
      return res.status(401).json({ error: "Sesión invalidada" });
    }
    req.usuario = rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

const nivelJefe       = (req, res, next) => req.usuario?.nivel >= 3 ? next() : res.status(403).json({ error: "Sin permisos" });
const nivelSupervisor = (req, res, next) => req.usuario?.nivel >= 2 ? next() : res.status(403).json({ error: "Sin permisos" });
const nivelBodeguero  = (req, res, next) => req.usuario?.nivel >= 1 ? next() : res.status(403).json({ error: "Sin permisos" });
const soloAdmin       = (req, res, next) => req.usuario?.nivel >= 4 ? next() : res.status(403).json({ error: "Solo admin" });

module.exports = { autenticar, nivelJefe, nivelSupervisor, nivelBodeguero, soloAdmin };
