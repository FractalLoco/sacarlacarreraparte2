"use strict";
const pool = require("../config/db");

const stats = async (req,res) => {
  try {
    const [lotes_res, pesajes_res, carros_res, tuneles_res, inv_res, despacho_res] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado='en_proceso')::int AS en_proceso,
          COUNT(*) FILTER (WHERE estado='pendiente')::int AS pendiente,
          COUNT(*) FILTER (WHERE estado='cerrado')::int AS cerrados,
          COALESCE(SUM(kilos_brutos) FILTER (WHERE fecha_ingreso=CURRENT_DATE),0) AS kg_hoy,
          COALESCE(SUM(kilos_brutos),0) AS kg_total
        FROM lotes`),

      pool.query(`
        SELECT
          COALESCE(SUM(kilos),0) AS kilos_producidos_total,
          COALESCE(SUM(kilos) FILTER (WHERE pt.es_desecho=false),0) AS kilos_neto_total,
          COALESCE(SUM(kilos) FILTER (WHERE pt.es_desecho=false AND p.created_at::date=CURRENT_DATE),0) AS kilos_hoy,
          COALESCE(SUM(cajas),0)::int AS total_cajas_producidas,
          COALESCE(SUM(cajas) FILTER (WHERE p.created_at::date=CURRENT_DATE),0)::int AS cajas_hoy
        FROM pesajes p JOIN productos_tipo pt ON pt.id=p.producto_tipo_id`),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE estado='cargando')::int AS cargando,
          COUNT(*) FILTER (WHERE estado='listo')::int AS listos,
          COUNT(*) FILTER (WHERE estado='en_tunel')::int AS en_tunel,
          COUNT(*) FILTER (WHERE estado='congelado')::int AS congelados,
          COUNT(*)::int AS total
        FROM carros`),

      pool.query(`
        SELECT t.*,
          COUNT(tc.id) FILTER (WHERE tc.estado='en_tunel')::int AS ocupados
        FROM tuneles t LEFT JOIN tuneles_carros tc ON tc.tunel_id=t.id
        GROUP BY t.id ORDER BY t.nombre ASC`),

      pool.query(`
        SELECT
          COALESCE(SUM(kilos_disponibles),0) AS kg_disponibles,
          COALESCE(SUM(num_cajas),0)::int AS cajas_disponibles,
          COUNT(*) FILTER (WHERE categoria_inv='producto')::int AS items_producto,
          COUNT(*) FILTER (WHERE categoria_inv='material')::int AS items_material
        FROM inventario WHERE kilos_disponibles>0 OR num_cajas>0`),

      pool.query(`
        SELECT COUNT(*)::int AS despachos_hoy,
          COALESCE(SUM(di.cantidad_kg),0) AS kg_despachado_hoy,
          COALESCE(SUM(di.cantidad_cajas),0)::int AS cajas_despachadas_hoy
        FROM despachos d JOIN despacho_items di ON di.despacho_id=d.id
        WHERE d.fecha_despacho=CURRENT_DATE AND d.estado='despachado'`),
    ]);

    const cajas_res = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE carro_id IS NULL)::int AS sin_asignar,
        COUNT(*) FILTER (WHERE carro_id IS NOT NULL AND en_inventario=false)::int AS asignadas_pendientes,
        COUNT(*) FILTER (WHERE en_inventario=true)::int AS en_inventario,
        COUNT(*)::int AS total_cajas
      FROM cajas`);

    return res.json({
      lotes: lotes_res.rows[0],
      produccion: pesajes_res.rows[0],
      carros: carros_res.rows[0],
      cajas: cajas_res.rows[0],
      tuneles: tuneles_res.rows,
      inventario: inv_res.rows[0],
      despachos_hoy: despacho_res.rows[0],
    });
  } catch(e) {
    console.error("dashboard.stats:",e.message);
    return res.status(500).json({error:"Error interno"});
  }
};

module.exports = {stats};