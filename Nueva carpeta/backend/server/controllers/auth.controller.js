"use strict";
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const pool   = require("../config/db");

const hashToken  = (t) => crypto.createHash("sha256").update(t).digest("hex");
const nuevoToken = ()  => crypto.randomBytes(32).toString("hex");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email y contrasena requeridos" });
    const { rows } = await pool.query(
      `SELECT u.id,u.nombre,u.email,u.password_hash,u.token_version,
              r.nombre AS rol,r.nivel
       FROM usuarios u JOIN roles r ON r.id=u.rol_id
       WHERE u.email=$1 AND u.activo=true`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: "Credenciales incorrectas" });
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales incorrectas" });

    const accessToken = jwt.sign(
      { id: u.id, rol: u.rol, tv: u.token_version },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    const refreshToken = nuevoToken();
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens(usuario_id,token_hash,expires_at) VALUES($1,$2,$3)",
      [u.id, hashToken(refreshToken), expiresAt]
    );

    return res.json({
      token: accessToken,
      refreshToken,
      usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, nivel: u.nivel },
    });
  } catch (e) {
    console.error("auth.login:", e.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

const me = (req, res) => {
  const { password_hash, token_version, ...datos } = req.usuario;
  return res.json(datos);
};

const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;
    if (!password_actual || !password_nueva)
      return res.status(400).json({ error: "Se requieren ambas contrasenas" });
    if (password_nueva.length < 8)
      return res.status(400).json({ error: "Minimo 8 caracteres" });
    const { rows } = await pool.query("SELECT password_hash FROM usuarios WHERE id=$1", [req.usuario.id]);
    if (!await bcrypt.compare(password_actual, rows[0].password_hash))
      return res.status(400).json({ error: "Contrasena actual incorrecta" });

    // Actualizar password e incrementar token_version en una sola query atómica.
    // Cualquier access token emitido antes queda invalidado automáticamente.
    await pool.query(
      "UPDATE usuarios SET password_hash=$1, token_version=token_version+1 WHERE id=$2",
      [await bcrypt.hash(password_nueva, 12), req.usuario.id]
    );
    // Revocar todos los refresh tokens activos del usuario
    await pool.query(
      "UPDATE refresh_tokens SET revocado=true WHERE usuario_id=$1",
      [req.usuario.id]
    );

    return res.json({ ok: true, mensaje: "Contrasena actualizada. Inicia sesion nuevamente." });
  } catch (e) {
    return res.status(500).json({ error: "Error interno" });
  }
};

// Sin middleware autenticar: el usuario puede hacer logout aunque el access token ya expiró.
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query(
        "UPDATE refresh_tokens SET revocado=true WHERE token_hash=$1",
        [hashToken(refreshToken)]
      );
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Error interno" });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token requerido" });

    const { rows } = await pool.query(
      `SELECT rt.id, rt.expires_at, rt.revocado,
              u.id AS usuario_id, u.token_version, u.activo,
              r.nombre AS rol, r.nivel
       FROM refresh_tokens rt
       JOIN usuarios u ON u.id=rt.usuario_id
       JOIN roles r ON r.id=u.rol_id
       WHERE rt.token_hash=$1`,
      [hashToken(refreshToken)]
    );

    if (!rows.length)          return res.status(401).json({ error: "Token inválido" });
    const rt = rows[0];
    if (rt.revocado)           return res.status(401).json({ error: "Token revocado" });
    if (!rt.activo)            return res.status(401).json({ error: "Usuario inactivo" });
    if (new Date() > new Date(rt.expires_at))
                               return res.status(401).json({ error: "Token expirado" });

    // Rotación: revocar el token usado y emitir uno nuevo.
    // Si el token ya fue rotado (revocado=true), indica posible re-uso → ya rechazado arriba.
    await pool.query("UPDATE refresh_tokens SET revocado=true WHERE id=$1", [rt.id]);

    const nuevoRefresh = nuevoToken();
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens(usuario_id,token_hash,expires_at) VALUES($1,$2,$3)",
      [rt.usuario_id, hashToken(nuevoRefresh), expiresAt]
    );

    const accessToken = jwt.sign(
      { id: rt.usuario_id, rol: rt.rol, tv: rt.token_version },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    return res.json({ token: accessToken, refreshToken: nuevoRefresh });
  } catch (e) {
    console.error("auth.refresh:", e.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

module.exports = { login, me, cambiarPassword, logout, refresh };
