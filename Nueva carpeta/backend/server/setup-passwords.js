#!/usr/bin/env node
// setup-passwords.js
// Ejecutar UNA VEZ despues de correr el schema:
//   node setup-passwords.js
// Esto setea la contrasena "1234" para todos los usuarios

require("dotenv").config();
const bcrypt  = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT,10) || 5432,
  database: process.env.DB_NAME     || "tresalmar_produccion",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASS || "",
});

const USUARIOS = [
  { email:"admin@tresalmar.cl",     password:"1234", rol_id:1, nombre:"Administrador" },
  { email:"jplanta@tresalmar.cl",   password:"1234", rol_id:2, nombre:"Juan Perez" },
  { email:"mgonzalez@tresalmar.cl", password:"1234", rol_id:3, nombre:"Maria Gonzalez" },
  { email:"csoto@tresalmar.cl",     password:"1234", rol_id:4, nombre:"Carlos Soto" },
  { email:"projas@tresalmar.cl",    password:"1234", rol_id:5, nombre:"Pedro Rojas" },
  { email:"aperez@tresalmar.cl",    password:"1234", rol_id:6, nombre:"Ana Perez" },
];

async function main() {
  console.log("\n🦑 TR3S AL MAR — Setup de contrasenas\n");

  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL conectado\n");
  } catch(e) {
    console.error("❌ No se pudo conectar a PostgreSQL:", e.message);
    console.error("   Verifica tu archivo .env y que PostgreSQL este corriendo");
    process.exit(1);
  }

  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 12);

    // Upsert: si existe actualiza, si no existe lo crea
    await pool.query(
      `INSERT INTO usuarios(nombre, email, password_hash, rol_id)
       VALUES($1, $2, $3, $4)
       ON CONFLICT(email)
       DO UPDATE SET password_hash = $3`,
      [u.nombre, u.email, hash, u.rol_id]
    );
    console.log(`  ✅ ${u.email.padEnd(30)} → ${u.password}`);
  }

  console.log("\n✅ Listo. Todos los usuarios tienen contrasena: 1234");
  console.log("\nUsuarios disponibles:");
  console.log("  admin@tresalmar.cl      → Admin (nivel 4)");
  console.log("  jplanta@tresalmar.cl    → Jefe de Planta (nivel 3)");
  console.log("  mgonzalez@tresalmar.cl  → Administrativo (nivel 3)");
  console.log("  csoto@tresalmar.cl      → Supervisor (nivel 2)");
  console.log("  projas@tresalmar.cl     → Pesador/Tunel (nivel 1)");
  console.log("  aperez@tresalmar.cl     → Bodeguero (nivel 1)\n");

  await pool.end();
}

main().catch(e => {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
});
