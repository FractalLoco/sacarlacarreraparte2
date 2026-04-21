"use strict";
const pool = require("../config/db");

// Genera numero de caja: LOT-PROD-SEQ  ej: JIB7524-F-001
async function siguienteNumeroCaja(client, lote_id, producto_tipo_id) {
  const {rows:lote} = await client.query("SELECT codigo FROM lotes WHERE id=$1",[lote_id]);
  const {rows:prod} = await client.query("SELECT nombre FROM productos_tipo WHERE id=$1",[producto_tipo_id]);
  const prefix = (lote[0]?.codigo||"L") + "-" + (prod[0]?.nombre?.charAt(0)||"X");
  const {rows:ult} = await client.query(
    "SELECT numero_caja FROM cajas WHERE lote_id=$1 AND producto_tipo_id=$2 ORDER BY created_at DESC LIMIT 1",
    [lote_id, producto_tipo_id]
  );
  let seq = 1;
  if (ult.length) {
    const parts = ult[0].numero_caja.split("-");
    const n = parseInt(parts[parts.length-1]);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}-${String(seq).padStart(3,"0")}`;
}

const listar = async (req,res) => {
  try {
    const {lote_id,linea_id,producto_tipo_id} = req.query;
    let q = `
      SELECT p.*,
        pt.nombre AS producto_tipo_nombre, pt.es_desecho,
        cb.nombre AS calibre_nombre,
        lp.nombre AS linea_nombre,
        u.nombre  AS registrado_por_nombre,
        (SELECT COUNT(*) FROM cajas ca WHERE ca.pesaje_id=p.id)::int AS cajas_generadas
      FROM pesajes p
      JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=p.calibre_id
      LEFT JOIN lineas_produccion lp ON lp.id=p.linea_id
      LEFT JOIN usuarios u ON u.id=p.registrado_por
      WHERE 1=1`;
    const params = [];
    if (lote_id)          { params.push(lote_id);          q += ` AND p.lote_id=$${params.length}`; }
    if (linea_id)         { params.push(linea_id);         q += ` AND p.linea_id=$${params.length}`; }
    if (producto_tipo_id) { params.push(producto_tipo_id); q += ` AND p.producto_tipo_id=$${params.length}`; }
    q += " ORDER BY p.created_at DESC";
    const {rows} = await pool.query(q, params);
    return res.json(rows);
  } catch(e) { console.error("pesajes.listar:",e.message); return res.status(500).json({error:"Error interno"}); }
};

const tipos    = async (_req,res) => { try { const {rows}=await pool.query("SELECT * FROM productos_tipo WHERE activo=true ORDER BY orden,nombre"); return res.json(rows); } catch(e){return res.status(500).json({error:"Error"});} };
const calibres = async (req,res)  => {
  try {
    const {producto_tipo_id} = req.query;
    let q="SELECT * FROM calibres WHERE activo=true";const p=[];
    if(producto_tipo_id){p.push(producto_tipo_id);q+=` AND producto_tipo_id=$${p.length}`;}
    q+=" ORDER BY nombre";
    const {rows}=await pool.query(q,p); return res.json(rows);
  } catch(e){return res.status(500).json({error:"Error"});}
};
const lineas   = async (_req,res) => { try { const {rows}=await pool.query("SELECT * FROM lineas_produccion WHERE activa=true ORDER BY nombre"); return res.json(rows); } catch(e){return res.status(500).json({error:"Error"});} };

// CREAR PESAJE → genera cajas automáticamente si cajas > 0
const crear = async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {lote_id,linea_id,producto_tipo_id,calibre_id,kilos,cajas,bandejas,fecha_elaboracion,turno_id,observacion} = req.body;
    if (!lote_id||!linea_id||!producto_tipo_id||!kilos)
      return res.status(400).json({error:"lote_id, linea_id, producto_tipo_id y kilos son requeridos"});
    const kg = parseFloat(kilos);
    if (kg <= 0) return res.status(400).json({error:"Los kilos deben ser mayores a cero"});
    const numCajas = parseInt(cajas||0);
    if (numCajas < 0) return res.status(400).json({error:"Las cajas no pueden ser negativas"});

    // ── VALIDACIÓN: No exceder kilos_brutos del lote ──
    const {rows:[loteDatos]} = await client.query(
      "SELECT kilos_brutos, (SELECT COALESCE(SUM(kilos),0) FROM pesajes WHERE lote_id=$1) AS kilos_registrados FROM lotes WHERE id=$1",
      [lote_id]
    );
    if (!loteDatos) {
      await client.query("ROLLBACK");
      return res.status(404).json({error:"Lote no encontrado"});
    }
    const kgBrutos = parseFloat(loteDatos.kilos_brutos);
    const kgYaRegistrados = parseFloat(loteDatos.kilos_registrados || 0);
    const kgTotal = kgYaRegistrados + kg;
    
    if (kgTotal > kgBrutos) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `No puedes registrar ${kg}kg. Ya hay ${kgYaRegistrados}kg registrados. Máximo disponible: ${(kgBrutos - kgYaRegistrados).toFixed(2)}kg`
      });
    }

    // Calcular kg por caja
    const kilosPorCaja = numCajas > 0 ? parseFloat((kg / numCajas).toFixed(4)) : null;

    // Insertar pesaje
    const {rows:[pesaje]} = await client.query(
      `INSERT INTO pesajes(lote_id,linea_id,producto_tipo_id,calibre_id,kilos,cajas,bandejas,kilos_por_caja,fecha_elaboracion,turno_id,observacion,registrado_por)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [lote_id,linea_id,producto_tipo_id,calibre_id||null,kg,numCajas,bandejas||null,kilosPorCaja,
       fecha_elaboracion||new Date(),turno_id||null,observacion||null,req.usuario.id]
    );

    // Generar cajas automáticamente
    const cajasCreadas = [];
    if (numCajas > 0) {
      // Calcular kg por caja con distribución equitativa
      const kgBase = parseFloat((kg / numCajas).toFixed(2));
      const kgUltima = parseFloat((kg - kgBase * (numCajas - 1)).toFixed(2));

      for (let i = 0; i < numCajas; i++) {
        const numCaja = await siguienteNumeroCaja(client, lote_id, producto_tipo_id);
        const kgEsta = i === numCajas-1 ? kgUltima : kgBase;
        const {rows:[caja]} = await client.query(
          `INSERT INTO cajas(lote_id,pesaje_id,numero_caja,producto_tipo_id,calibre_id,kilos_netos,fecha_elaboracion,registrado_por)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [lote_id,pesaje.id,numCaja,producto_tipo_id,calibre_id||null,kgEsta>0?kgEsta:kgBase,
           fecha_elaboracion||new Date(),req.usuario.id]
        );
        cajasCreadas.push(caja);
      }
    }

    await client.query("COMMIT");
    return res.status(201).json({...pesaje, cajas_generadas: cajasCreadas});
  } catch(e) {
    await client.query("ROLLBACK");
    console.error("pesajes.crear:",e.message);
    return res.status(500).json({error:"Error: "+e.message});
  } finally { client.release(); }
};

const actualizar = async (req,res) => {
  try {
    const {kilos,cajas,bandejas,calibre_id,observacion} = req.body;
    const {rows} = await pool.query(
      `UPDATE pesajes SET kilos=COALESCE($1,kilos),cajas=COALESCE($2,cajas),bandejas=COALESCE($3,bandejas),
       calibre_id=COALESCE($4,calibre_id),observacion=COALESCE($5,observacion),updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [kilos||null,cajas!==undefined?cajas:null,bandejas!==undefined?bandejas:null,calibre_id||null,observacion||null,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Pesaje no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:"Error interno"}); }
};

const eliminar = async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Solo se puede eliminar si las cajas no están asignadas a carro
    const {rows:cajasAsig} = await client.query(
      "SELECT COUNT(*) AS n FROM cajas WHERE pesaje_id=$1 AND carro_id IS NOT NULL",[req.params.id]);
    if (parseInt(cajasAsig[0].n) > 0)
      return res.status(400).json({error:"No se puede eliminar: hay cajas de este pesaje asignadas a carros"});
    await client.query("DELETE FROM cajas WHERE pesaje_id=$1",[req.params.id]);
    const {rows} = await client.query("DELETE FROM pesajes WHERE id=$1 RETURNING *",[req.params.id]);
    if (!rows.length) { await client.query("ROLLBACK"); return res.status(404).json({error:"Pesaje no encontrado"}); }
    await client.query("COMMIT");
    return res.json({ok:true});
  } catch(e) {
    await client.query("ROLLBACK");
    return res.status(500).json({error:"Error: "+e.message});
  } finally { client.release(); }
};

module.exports = {listar, tipos, calibres, lineas, crear, actualizar, eliminar};
