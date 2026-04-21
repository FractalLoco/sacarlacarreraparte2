"use strict";
const pool = require("../config/db");

/**
 * Crear múltiples cajas de una sola vez (después de pesaje)
 * POST /cajas/lote/:lote_id/generar
 * Body: { cantidad_cajas: 10, calibre_id: 1, producto_tipo_id: 2 }
 */
const generarCajasLote = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { lote_id } = req.params;
    const { cantidad_cajas, calibre_id, producto_tipo_id } = req.body;

    // Validar lote existe
    const { rows: lotes } = await client.query(
      "SELECT * FROM lotes WHERE id=$1",
      [lote_id]
    );
    if (!lotes.length)
      return res.status(404).json({ error: "Lote no encontrado" });

    const lote = lotes[0];

    // Obtener pesajes para calcular kg por caja
    const { rows: pesajes } = await client.query(
      `SELECT SUM(kilos) as total_kg, COUNT(*) as num_pesajes 
       FROM pesajes WHERE lote_id=$1`,
      [lote_id]
    );

    const total_kg = parseFloat(pesajes[0]?.total_kg || 0);
    if (total_kg === 0)
      return res
        .status(400)
        .json({ error: "Lote sin pesajes registrados" });

    const kg_por_caja = total_kg / cantidad_cajas;

    // Usar los del lote como fallback si no se pasan
    const pid = producto_tipo_id || lote.producto_tipo_id;
    const cid = calibre_id || lote.calibre_id;

    if (!pid)
      return res.status(400).json({ error: "El lote no tiene tipo de producto asignado" });

    // Obtener el número de cajas ya existentes en este lote para el correlativo
    const { rows: yaExisten } = await client.query(
      "SELECT COUNT(*)::int AS total FROM cajas WHERE lote_id=$1",
      [lote_id]
    );
    const offset = yaExisten[0].total;

    // Crear cajas
    const cajas = [];
    for (let i = 1; i <= cantidad_cajas; i++) {
      const seq = String(offset + i).padStart(3, "0");
      const numero = `${lote.codigo}-${seq}`;
      const { rows: nuevaCaja } = await client.query(
        `INSERT INTO cajas (lote_id, numero_caja, kilos_netos, calibre_id, producto_tipo_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [lote_id, numero, kg_por_caja, cid, pid]
      );
      cajas.push(nuevaCaja[0]);
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      cantidad_cajas,
      kg_por_caja: kg_por_caja.toFixed(2),
      cajas,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("cajas.generar:", e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

/**
 * Listar cajas de un lote (para imprimir etiquetas)
 * GET /cajas/lote/:lote_id
 */
const listarCajasLote = async (req, res) => {
  try {
    const { lote_id } = req.params;

    const { rows } = await pool.query(
      `SELECT c.*,
              l.codigo AS lote_codigo,
              pt.nombre AS producto_tipo_nombre,
              cal.nombre AS calibre_nombre
       FROM cajas c
       JOIN lotes l ON l.id=c.lote_id
       LEFT JOIN productos_tipo pt ON pt.id=c.producto_tipo_id
       LEFT JOIN calibres cal ON cal.id=c.calibre_id
       WHERE c.lote_id=$1
       ORDER BY c.numero_caja ASC`,
      [lote_id]
    );

    return res.json(rows);
  } catch (e) {
    console.error("cajas.listar:", e.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

/**
 * Validar compatibilidad de lotes en mismo carro
 * POST /cajas/validar-carro
 * Body: { carro_id, lote_id_nuevo }
 */
const validarCompatibilidadCarro = async (req, res) => {
  try {
    const { carro_id, lote_id_nuevo } = req.body;

    // Obtener lotes actualmente en este carro
    const { rows: cajasEnCarro } = await pool.query(
      `SELECT DISTINCT c.lote_id, l.codigo, l.producto_tipo_id, l.calibre_id
       FROM cajas c
       JOIN lotes l ON l.id=c.lote_id
       WHERE c.carro_id=$1`,
      [carro_id]
    );

    if (cajasEnCarro.length === 0) {
      return res.json({ compatible: true, mensaje: "Carro vacío" });
    }

    // Obtener datos del lote nuevo
    const { rows: loteNuevo } = await pool.query(
      "SELECT * FROM lotes WHERE id=$1",
      [lote_id_nuevo]
    );

    if (!loteNuevo.length)
      return res.status(404).json({ error: "Lote no encontrado" });

    const nuevo = loteNuevo[0];
    const lotesExistentes = cajasEnCarro;

    // Validaciones
    const incompatibilidades = [];

    lotesExistentes.forEach((lote) => {
      if (
        nuevo.producto_tipo_id &&
        lote.producto_tipo_id &&
        nuevo.producto_tipo_id !== lote.producto_tipo_id
      ) {
        incompatibilidades.push(
          `Producto diferente: ${nuevo.producto_tipo_id} vs ${lote.producto_tipo_id}`
        );
      }
      if (
        nuevo.calibre_id &&
        lote.calibre_id &&
        nuevo.calibre_id !== lote.calibre_id
      ) {
        incompatibilidades.push(
          `Calibre diferente: ${nuevo.calibre_id} vs ${lote.calibre_id}`
        );
      }
    });

    return res.json({
      compatible: incompatibilidades.length === 0,
      lotes_en_carro: lotesExistentes.map((l) => l.codigo),
      incompatibilidades,
    });
  } catch (e) {
    console.error("cajas.validar:", e.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

/**
 * Listar cajas de un carro con detalle de lote
 * GET /cajas/carro/:carro_id
 */
const listarCajasCarro = async (req, res) => {
  try {
    const { carro_id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.id, c.numero_caja, c.kilos_netos,
              l.id AS lote_id, l.codigo AS lote_codigo,
              pt.nombre AS producto_tipo_nombre,
              cal.nombre AS calibre_nombre
       FROM cajas c
       JOIN lotes l ON l.id = c.lote_id
       LEFT JOIN productos_tipo pt ON pt.id = c.producto_tipo_id
       LEFT JOIN calibres cal ON cal.id = c.calibre_id
       WHERE c.carro_id = $1
       ORDER BY l.codigo ASC, c.numero_caja ASC`,
      [carro_id]
    );
    return res.json(rows);
  } catch (e) {
    console.error("cajas.listarCarro:", e.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

module.exports = {
  generarCajasLote,
  listarCajasLote,
  listarCajasCarro,
  validarCompatibilidadCarro,
};
