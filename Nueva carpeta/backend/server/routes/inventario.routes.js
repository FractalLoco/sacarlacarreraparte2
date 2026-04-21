"use strict";
const router = require("express").Router();
const c      = require("../controllers/inventario.controller");
const {autenticar, nivelJefe} = require("../middleware/auth");
const audit  = require("../middleware/audit");
const pool   = require("../config/db");

// Consultar kg exactos de un carro (para mostrar en form antes de registrar)
router.get("/carro/:carro_id/resumen", autenticar, async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT
        ca.carro_id,
        c.codigo_carro,
        c.lote_id,
        l.codigo AS lote_codigo,
        COUNT(ca.id)::int                           AS total_cajas,
        COALESCE(SUM(ca.kilos_netos),0)::numeric    AS kg_total_exacto,
        COUNT(ca.id) FILTER (WHERE ca.en_inventario=true)::int AS cajas_ya_inventariadas,
        COALESCE(SUM(ca.kilos_netos) FILTER (WHERE ca.en_inventario=true),0)::numeric AS kg_ya_inventariados,
        -- Desglose por producto/calibre
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'producto_tipo_id', ca.producto_tipo_id,
          'producto_nombre', pt.nombre,
          'calibre_id', ca.calibre_id,
          'calibre_nombre', cb.nombre,
          'cajas', (SELECT COUNT(*) FROM cajas x WHERE x.carro_id=ca.carro_id AND x.producto_tipo_id=ca.producto_tipo_id AND COALESCE(x.calibre_id,0)=COALESCE(ca.calibre_id,0)),
          'kg',    (SELECT COALESCE(SUM(x.kilos_netos),0) FROM cajas x WHERE x.carro_id=ca.carro_id AND x.producto_tipo_id=ca.producto_tipo_id AND COALESCE(x.calibre_id,0)=COALESCE(ca.calibre_id,0))
        )) AS desglose
      FROM cajas ca
      JOIN carros c  ON c.id=ca.carro_id
      JOIN lotes l   ON l.id=c.lote_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb  ON cb.id=ca.calibre_id
      WHERE ca.carro_id=$1
      GROUP BY ca.carro_id,c.codigo_carro,c.lote_id,l.codigo`,
    [req.params.carro_id]);

    if (!rows.length) return res.status(404).json({error:"Carro no encontrado o sin cajas"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:e.message}); }
});

router.get("/",                 autenticar, c.listar);
router.get("/movimientos",      autenticar, c.listarMovimientos);
router.post("/",                autenticar, audit("crear_inventario"),       c.crear);
router.post("/:id/movimiento",  autenticar, audit("movimiento_inventario"),  c.registrarMovimiento);
router.put("/:id",              autenticar, nivelJefe, audit("ajustar_inventario"), c.ajustar);
module.exports = router;
