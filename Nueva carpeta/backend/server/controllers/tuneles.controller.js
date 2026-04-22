"use strict";
const pool = require("../config/db");

// Listado de túneles con ocupación actual
const listar = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT t.*,
        COUNT(tc.id) FILTER (WHERE tc.estado='en_tunel')::int AS carros_actuales,
        COALESCE(SUM(CASE WHEN tc.estado='en_tunel' THEN
          (SELECT COUNT(*) FROM cajas ca WHERE ca.carro_id=tc.carro_id) ELSE 0 END),0)::int AS cajas_en_tunel
      FROM tuneles t LEFT JOIN tuneles_carros tc ON tc.tunel_id=t.id
      GROUP BY t.id ORDER BY t.nombre ASC`);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const carrosDeTunel = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT tc.*, c.codigo_carro, c.niveles, c.estado AS carro_estado,
        (SELECT string_agg(DISTINCT l2.codigo, ', ' ORDER BY l2.codigo)
         FROM cajas ca2 JOIN lotes l2 ON l2.id=ca2.lote_id
         WHERE ca2.carro_id=c.id) AS lotes_codigos,
        u.nombre AS registrado_por_nombre,
        COUNT(ca.id)::int AS total_cajas,
        COALESCE(SUM(ca.kilos_netos),0) AS kilos_totales
      FROM tuneles_carros tc
      JOIN carros c ON c.id=tc.carro_id
      LEFT JOIN usuarios u ON u.id=tc.registrado_por
      LEFT JOIN cajas ca ON ca.carro_id=c.id
      WHERE tc.tunel_id=$1
      GROUP BY tc.id,c.codigo_carro,c.niveles,c.estado,u.nombre
      ORDER BY tc.fecha_ingreso DESC`,[req.params.id]);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const listarCarros = async (req,res) => {
  try {
    const {lote_id,estado} = req.query;
    let q = `
      SELECT c.*,
        (SELECT string_agg(DISTINCT l2.codigo, ', ' ORDER BY l2.codigo)
         FROM cajas ca2 JOIN lotes l2 ON l2.id=ca2.lote_id
         WHERE ca2.carro_id=c.id) AS lotes_codigos,
        (SELECT json_agg(x ORDER BY x.codigo)
         FROM (SELECT ca2.lote_id, l2.codigo,
                      COUNT(ca2.id)::int AS num_cajas,
                      COALESCE(SUM(ca2.kilos_netos),0) AS kg
               FROM cajas ca2 JOIN lotes l2 ON l2.id=ca2.lote_id
               WHERE ca2.carro_id=c.id
               GROUP BY ca2.lote_id, l2.codigo) x) AS lotes_resumen,
        tc.tunel_id, t.nombre AS tunel_nombre, tc.estado AS estado_tunel,
        tc.fecha_ingreso AS fecha_ingreso_tunel,
        tc.temperatura_ingreso, tc.temperatura_salida, tc.fecha_salida,
        COUNT(ca.id)::int AS total_cajas,
        COALESCE(SUM(ca.kilos_netos),0) AS kilos_totales,
        COUNT(ca.id) FILTER (WHERE ca.en_inventario=true)::int AS cajas_inventariadas
      FROM carros c
      LEFT JOIN tuneles_carros tc ON tc.carro_id=c.id AND tc.estado='en_tunel'
      LEFT JOIN tuneles t ON t.id=tc.tunel_id
      LEFT JOIN cajas ca ON ca.carro_id=c.id
      WHERE 1=1`;
    const p = [];
    if (lote_id) {
      p.push(lote_id);
      q += ` AND c.id IN (SELECT carro_id FROM cajas WHERE lote_id=$${p.length} AND carro_id IS NOT NULL)`;
    }
    if (estado)  { p.push(estado);  q += ` AND c.estado=$${p.length}`; }
    q += " GROUP BY c.id,tc.tunel_id,t.nombre,tc.estado,tc.fecha_ingreso,tc.temperatura_ingreso,tc.temperatura_salida,tc.fecha_salida ORDER BY c.codigo_carro ASC";
    const {rows} = await pool.query(q, p);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const listarCajas = async (req,res) => {
  try {
    const {lote_id,carro_id,sin_asignar} = req.query;
    let q = `
      SELECT ca.*, pt.nombre AS producto_tipo_nombre, cb.nombre AS calibre_nombre,
        l.codigo AS lote_codigo, c.codigo_carro, u.nombre AS registrado_por_nombre,
        p.kilos AS pesaje_kilos, p.linea_id,
        lp.nombre AS linea_nombre
      FROM cajas ca
      JOIN lotes l ON l.id=ca.lote_id
      LEFT JOIN carros c ON c.id=ca.carro_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=ca.calibre_id
      LEFT JOIN usuarios u ON u.id=ca.registrado_por
      LEFT JOIN pesajes p ON p.id=ca.pesaje_id
      LEFT JOIN lineas_produccion lp ON lp.id=p.linea_id
      WHERE 1=1`;
    const p = [];
    if (lote_id)    { p.push(lote_id);    q += ` AND ca.lote_id=$${p.length}`; }
    if (carro_id)   { p.push(carro_id);   q += ` AND ca.carro_id=$${p.length}`; }
    if (sin_asignar==="true") q += " AND ca.carro_id IS NULL";
    q += " ORDER BY ca.numero_caja ASC";
    const {rows} = await pool.query(q, p);
    return res.json(rows);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

// KPIs para dashboard
const estadoCarros = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE estado='cargando')::int  AS cargando,
        COUNT(*) FILTER (WHERE estado='listo')::int     AS listos,
        COUNT(*) FILTER (WHERE estado='en_tunel')::int  AS en_tunel,
        COUNT(*) FILTER (WHERE estado='congelado')::int AS congelados,
        COUNT(*)::int AS total
      FROM carros`);
    const {rows:cajas} = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE carro_id IS NULL)::int       AS sin_asignar,
        COUNT(*) FILTER (WHERE carro_id IS NOT NULL)::int   AS asignadas,
        COUNT(*) FILTER (WHERE en_inventario=true)::int     AS en_inventario,
        COUNT(*)::int AS total
      FROM cajas`);
    return res.json({carros:rows[0], cajas:cajas[0]});
  } catch(e) { return res.status(500).json({error:e.message}); }
};

// Crear carro (código auto global si no se pasa, sin lote fijo)
const crearCarro = async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {codigo_carro,niveles,observacion} = req.body;

    let codigo = codigo_carro?.trim();
    if (!codigo) {
      // Auto global: C-001, C-002, ... basado en el máximo existente
      const {rows:ult} = await client.query(
        "SELECT codigo_carro FROM carros WHERE codigo_carro ~ '^C-[0-9]+$' ORDER BY id DESC LIMIT 1");
      let seq = 1;
      if (ult.length) {
        const n = parseInt(ult[0].codigo_carro.replace(/\D/g,""));
        if (!isNaN(n)) seq = n + 1;
      }
      codigo = `C-${String(seq).padStart(3,"0")}`;
    }

    const dup = await client.query(
      "SELECT id FROM carros WHERE codigo_carro=$1",[codigo]);
    if (dup.rows.length) { await client.query("ROLLBACK"); return res.status(400).json({error:`Carro ${codigo} ya existe`}); }

    const {rows} = await client.query(
      `INSERT INTO carros(codigo_carro,niveles,estado,observacion,creado_por)
       VALUES($1,$2,'cargando',$3,$4) RETURNING *`,
      [codigo,niveles||null,observacion||null,req.usuario.id]
    );
    await client.query("COMMIT");
    return res.status(201).json(rows[0]);
  } catch(e) {
    await client.query("ROLLBACK");
    return res.status(400).json({error:e.message});
  } finally { client.release(); }
};

const editarCarro = async (req,res) => {
  try {
    const {niveles,observacion} = req.body;
    const {rows} = await pool.query(
      "UPDATE carros SET niveles=COALESCE($1,niveles),observacion=COALESCE($2,observacion),updated_at=NOW() WHERE id=$3 RETURNING *",
      [niveles||null,observacion||null,req.params.id]
    );
    if (!rows.length) return res.status(404).json({error:"Carro no encontrado"});
    return res.json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

// Asignar caja a carro (o desasignar poniendo carro_id=null)
const asignarCaja = async (req,res) => {
  try {
    const {carro_id} = req.body;
    const caja_id = req.params.id;
    // Validar que el carro existe y está en estado cargando
    if (carro_id) {
      const {rows:c} = await pool.query("SELECT id,estado FROM carros WHERE id=$1",[carro_id]);
      if (!c.length) return res.status(404).json({error:"Carro no encontrado"});
      if (c[0].estado==="congelado") return res.status(400).json({error:"No se puede asignar cajas a un carro congelado"});
    }
    const {rows} = await pool.query(
      "UPDATE cajas SET carro_id=$1 WHERE id=$2 RETURNING *",
      [carro_id||null, caja_id]
    );
    if (!rows.length) return res.status(404).json({error:"Caja no encontrada"});
    if (carro_id) await pool.query("UPDATE carros SET updated_at=NOW() WHERE id=$1",[carro_id]);
    return res.json(rows[0]);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

// Marcar carro listo (requiere al menos 1 caja asignada)
const marcarListo = async (req,res) => {
  try {
    const {temp1, temp2, temp3} = req.body;

    // Validar que se ingresen las 3 temperaturas pre-túnel
    if (temp1 === undefined || temp1 === null || temp1 === "")
      return res.status(400).json({error:"Temperatura 1 (pre-túnel) es obligatoria"});
    if (temp2 === undefined || temp2 === null || temp2 === "")
      return res.status(400).json({error:"Temperatura 2 (pre-túnel) es obligatoria"});
    if (temp3 === undefined || temp3 === null || temp3 === "")
      return res.status(400).json({error:"Temperatura 3 (pre-túnel) es obligatoria"});

    const {rows:n} = await pool.query(
      "SELECT COUNT(*) AS n FROM cajas WHERE carro_id=$1",[req.params.id]);
    if (parseInt(n[0].n)===0)
      return res.status(400).json({error:"El carro necesita al menos una caja asignada"});

    const {rows} = await pool.query(
      `UPDATE carros SET
         estado='listo',
         temp_pre_tunel_1=$1,
         temp_pre_tunel_2=$2,
         temp_pre_tunel_3=$3,
         temp_pre_tunel_hora=NOW(),
         updated_at=NOW()
       WHERE id=$4 AND estado='cargando' RETURNING *`,
      [parseFloat(temp1), parseFloat(temp2), parseFloat(temp3), req.params.id]
    );
    if (!rows.length) return res.status(400).json({error:"El carro no está en estado 'cargando'"});
    return res.json(rows[0]);
  } catch(e) { return res.status(400).json({error:e.message}); }
};

const ingresarCarroTunel = async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {tunel_id,temperatura_ingreso} = req.body;
    const carro_id = req.params.id;
    if (!tunel_id) return res.status(400).json({error:"tunel_id es requerido"});
    const {rows:c} = await client.query("SELECT id,estado FROM carros WHERE id=$1 FOR UPDATE",[carro_id]);
    if (!c.length) return res.status(404).json({error:"Carro no encontrado"});
    if (c[0].estado !== "listo") return res.status(400).json({error:"El carro debe estar en estado 'listo'"});
    const {rows:cap} = await client.query(
      `SELECT COUNT(tc.id) AS ocupados, t.capacidad_max FROM tuneles_carros tc
       JOIN tuneles t ON t.id=tc.tunel_id WHERE tc.tunel_id=$1 AND tc.estado='en_tunel'
       GROUP BY t.capacidad_max`,[tunel_id]);
    if (cap.length && parseInt(cap[0].ocupados)>=parseInt(cap[0].capacidad_max)) {
      await client.query("ROLLBACK");
      return res.status(400).json({error:`Túnel lleno (máx. ${cap[0].capacidad_max} carros)`});
    }
    const {rows} = await client.query(
      `INSERT INTO tuneles_carros(tunel_id,carro_id,fecha_ingreso,temperatura_ingreso,estado,registrado_por)
       VALUES($1,$2,NOW(),$3,'en_tunel',$4) RETURNING *`,
      [tunel_id,carro_id,temperatura_ingreso||null,req.usuario.id]
    );
    await client.query("UPDATE carros SET estado='en_tunel',updated_at=NOW() WHERE id=$1",[carro_id]);
    await client.query("COMMIT");
    return res.status(201).json(rows[0]);
  } catch(e) {
    await client.query("ROLLBACK");
    return res.status(400).json({error:e.message});
  } finally { client.release(); }
};

// Sacar del túnel → marca como congelado, NO auto-inventario
const sacarCarroTunel = async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {temperatura_salida,observacion} = req.body;
    const carro_id = req.params.id;
    const {rows:tc} = await client.query(
      `UPDATE tuneles_carros SET estado='completado',fecha_salida=NOW(),
       temperatura_salida=$1,observacion=$2
       WHERE carro_id=$3 AND estado='en_tunel' RETURNING *`,
      [temperatura_salida||null,observacion||null,carro_id]
    );
    if (!tc.length) { await client.query("ROLLBACK"); return res.status(404).json({error:"Carro no está en ningún túnel"}); }
    await client.query("UPDATE carros SET estado='congelado',updated_at=NOW() WHERE id=$1",[carro_id]);
    const {rows:cajas} = await client.query(
      "SELECT COUNT(*) AS n FROM cajas WHERE carro_id=$1 AND en_inventario=false",[carro_id]);
    await client.query("COMMIT");
    return res.json({
      ...tc[0],
      cajas_pendientes_inventario: parseInt(cajas[0].n),
      mensaje: parseInt(cajas[0].n)>0 ?
        `Carro congelado. Hay ${cajas[0].n} cajas listas para registrar en inventario.` :
        "Carro congelado correctamente."
    });
  } catch(e) {
    await client.query("ROLLBACK");
    return res.status(500).json({error:e.message});
  } finally { client.release(); }
};

const etiquetaCarro = async (req,res) => {
  try {
    const {rows:c} = await pool.query(`
      SELECT c.*,
        (SELECT string_agg(DISTINCT l2.codigo, ', ' ORDER BY l2.codigo)
         FROM cajas ca2 JOIN lotes l2 ON l2.id=ca2.lote_id
         WHERE ca2.carro_id=c.id) AS lotes_codigos,
        COUNT(ca.id)::int AS total_cajas, COALESCE(SUM(ca.kilos_netos),0) AS kilos_totales,
        u.nombre AS creado_por_nombre,
        t.nombre AS tunel_nombre, tc.fecha_ingreso AS fecha_tunel,
        tc.temperatura_ingreso, tc.temperatura_salida, tc.fecha_salida
      FROM carros c
      LEFT JOIN cajas ca ON ca.carro_id=c.id
      LEFT JOIN usuarios u ON u.id=c.creado_por
      LEFT JOIN tuneles_carros tc ON tc.carro_id=c.id
      LEFT JOIN tuneles t ON t.id=tc.tunel_id
      WHERE c.id=$1
      GROUP BY c.id,u.nombre,t.nombre,tc.fecha_ingreso,tc.temperatura_ingreso,tc.temperatura_salida,tc.fecha_salida
      ORDER BY tc.created_at DESC LIMIT 1`,[req.params.id]);
    if (!c.length) return res.status(404).json({error:"Carro no encontrado"});
    const {rows:cajas} = await pool.query(`
      SELECT ca.*, pt.nombre AS producto, cb.nombre AS calibre
      FROM cajas ca JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=ca.calibre_id
      WHERE ca.carro_id=$1 ORDER BY ca.numero_caja ASC`,[req.params.id]);
    const carro=c[0];
    const f=d=>d?new Date(d).toLocaleDateString("es-CL"):"---";
    const ft=d=>d?new Date(d).toLocaleString("es-CL"):"---";
    const fn=n=>parseFloat(n||0).toLocaleString("es-CL",{minimumFractionDigits:2,maximumFractionDigits:2});
    const ESTADOS={cargando:"En Carga",listo:"Listo",en_tunel:"En Túnel",congelado:"✅ Congelado"};
    const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Carro ${carro.codigo_carro}</title>
<style>@page{size:A5 landscape;margin:6mm}*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{background:white;color:#1e293b}.card{border:2.5px solid #0d2260;border-radius:8px;padding:10px}.header{background:#0d2260;color:white;padding:8px 12px;border-radius:5px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.title{font-size:15px;font-weight:900}.badge{background:#2563ff;border-radius:4px;padding:4px 14px;font-size:16px;font-weight:900;letter-spacing:2px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.field{background:#f0f5ff;border-radius:5px;padding:5px 7px}.label{font-size:8px;font-weight:700;color:#3d5080;text-transform:uppercase;letter-spacing:.4px}.value{font-size:13px;font-weight:800;color:#0d2260;margin-top:1px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#0d2260;color:white;padding:3px 5px;text-align:left}td{padding:3px 5px;border-bottom:1px solid #e2e8f0}tr:nth-child(even)td{background:#f0f5ff}.footer{margin-top:6px;font-size:8px;color:#64748b;text-align:center;border-top:1px solid #e2e8f0;padding-top:5px}.noprint{margin-bottom:8px}@media print{.noprint{display:none}}</style></head><body>
<button class="noprint" onclick="window.print()" style="padding:7px 14px;background:#0d2260;color:white;border:none;border-radius:5px;cursor:pointer">🖨️ Imprimir</button>
<div class="card">
<div class="header"><div><div class="title">TR3S AL MAR LTDA</div><div style="font-size:9px;opacity:.6">Sistema de Producción v5</div></div><div class="badge">${carro.codigo_carro}</div></div>
<div class="grid">
<div class="field"><div class="label">Carro</div><div class="value">${carro.codigo_carro}</div></div>
<div class="field" style="grid-column:span 2"><div class="label">Lotes</div><div class="value" style="font-size:11px">${carro.lotes_codigos||'—'}</div></div>
<div class="field"><div class="label">Estado</div><div class="value">${ESTADOS[carro.estado]||carro.estado}</div></div>
<div class="field"><div class="label">Total Cajas</div><div class="value">${carro.total_cajas}</div></div>
<div class="field"><div class="label">Kilos Totales</div><div class="value">${fn(carro.kilos_totales)} kg</div></div>
<div class="field"><div class="label">Niveles</div><div class="value">${carro.niveles||"---"}</div></div>
<div class="field"><div class="label">Túnel</div><div class="value">${carro.tunel_nombre||"---"}</div></div>
<div class="field" style="grid-column:span 2"><div class="label">Ingreso al Túnel</div><div class="value" style="font-size:11px">${ft(carro.fecha_tunel)}</div></div>
<div class="field"><div class="label">T° Ingreso</div><div class="value">${carro.temperatura_ingreso!=null?carro.temperatura_ingreso+"°C":"---"}</div></div>
<div class="field"><div class="label">T° Salida</div><div class="value">${carro.temperatura_salida!=null?carro.temperatura_salida+"°C":"---"}</div></div>
</div>
<table><thead><tr><th>N° Caja</th><th>Producto</th><th>Calibre</th><th>Kilos Netos</th><th>Fecha Elab.</th><th>Inventario</th></tr></thead><tbody>
${cajas.map(ca=>`<tr><td><strong>${ca.numero_caja}</strong></td><td>${ca.producto}</td><td>${ca.calibre||"---"}</td><td>${fn(ca.kilos_netos)} kg</td><td>${f(ca.fecha_elaboracion)}</td><td>${ca.en_inventario?"✅":"⏳"}</td></tr>`).join("")}
</tbody></table>
<div class="footer">Generado: ${new Date().toLocaleString("es-CL")} | TR3S AL MAR — Sistema Producción v5</div></div></body></html>`;
    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.send(html);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const etiquetaCaja = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT ca.*, pt.nombre AS producto, cb.nombre AS calibre,
        l.codigo AS lote_codigo, c.codigo_carro, u.nombre AS registrado_por_nombre
      FROM cajas ca JOIN lotes l ON l.id=ca.lote_id
      LEFT JOIN carros c ON c.id=ca.carro_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=ca.calibre_id
      LEFT JOIN usuarios u ON u.id=ca.registrado_por
      WHERE ca.id=$1`,[req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Caja no encontrada"});
    const ca=rows[0];
    const f=d=>d?new Date(d).toLocaleDateString("es-CL"):"---";
    const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Caja ${ca.numero_caja}</title>
<style>@page{size:100mm 65mm;margin:3mm}*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{background:white}.card{border:2px solid #0d2260;border-radius:5px;padding:6px}.header{background:#0d2260;color:white;padding:4px 8px;border-radius:3px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.f{background:#f0f5ff;border-radius:3px;padding:3px 5px}.l{font-size:7px;font-weight:700;color:#3d5080;text-transform:uppercase}.v{font-size:12px;font-weight:800;color:#0d2260}.footer{margin-top:4px;font-size:7px;color:#64748b;text-align:center}@media print{.noprint{display:none}}</style></head><body>
<button class="noprint" onclick="window.print()" style="margin-bottom:6px;padding:5px 10px;background:#0d2260;color:white;border:none;border-radius:3px;cursor:pointer">🖨️ Imprimir</button>
<div class="card">
<div class="header"><span style="font-size:9px;font-weight:700">TR3S AL MAR</span><span style="font-size:15px;font-weight:900">${ca.numero_caja}</span></div>
<div class="grid">
<div class="f"><div class="l">Lote</div><div class="v">${ca.lote_codigo}</div></div>
<div class="f"><div class="l">Carro</div><div class="v">${ca.codigo_carro||"Sin asignar"}</div></div>
<div class="f"><div class="l">Producto</div><div class="v">${ca.producto}</div></div>
<div class="f"><div class="l">Calibre</div><div class="v">${ca.calibre||"---"}</div></div>
<div class="f"><div class="l">Kilos Netos</div><div class="v">${parseFloat(ca.kilos_netos||0).toFixed(2)} kg</div></div>
<div class="f"><div class="l">Fecha Elab.</div><div class="v">${f(ca.fecha_elaboracion)}</div></div>
</div>
<div class="footer">${ca.registrado_por_nombre||"---"} | ${ca.en_inventario?"✅ En inventario":"⏳ Pendiente inventario"}</div>
</div></body></html>`;
    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.send(html);
  } catch(e) { return res.status(500).json({error:e.message}); }
};

const exportarCarrosExcel = async (req,res) => {
  try {
    const ExcelJS = require("exceljs");
    const {lote_id} = req.query;
    let qc=`SELECT c.*,
        (SELECT string_agg(DISTINCT l2.codigo, ', ' ORDER BY l2.codigo)
         FROM cajas ca2 JOIN lotes l2 ON l2.id=ca2.lote_id
         WHERE ca2.carro_id=c.id) AS lotes_codigos,
        t.nombre AS tunel_nombre,
        COUNT(ca.id)::int AS total_cajas,COALESCE(SUM(ca.kilos_netos),0) AS kilos_totales
      FROM carros c
      LEFT JOIN tuneles_carros tc ON tc.carro_id=c.id AND tc.estado='en_tunel'
      LEFT JOIN tuneles t ON t.id=tc.tunel_id
      LEFT JOIN cajas ca ON ca.carro_id=c.id WHERE 1=1`;
    const pc=[]; if(lote_id){pc.push(lote_id);qc+=` AND c.id IN (SELECT carro_id FROM cajas WHERE lote_id=$${pc.length} AND carro_id IS NOT NULL)`;}
    qc+=" GROUP BY c.id,t.nombre ORDER BY c.codigo_carro ASC";
    const {rows:carros}=await pool.query(qc,pc);
    let qca=`SELECT ca.*,pt.nombre AS producto,cb.nombre AS calibre,l.codigo AS lote_codigo,c.codigo_carro
      FROM cajas ca JOIN lotes l ON l.id=ca.lote_id LEFT JOIN carros c ON c.id=ca.carro_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id LEFT JOIN calibres cb ON cb.id=ca.calibre_id WHERE 1=1`;
    const pca=[]; if(lote_id){pca.push(lote_id);qca+=` AND ca.lote_id=$${pca.length}`;}
    qca+=" ORDER BY c.codigo_carro ASC,ca.numero_caja ASC";
    const {rows:cajas}=await pool.query(qca,pca);
    const wb=new ExcelJS.Workbook(); wb.creator="TR3S AL MAR";
    const ws1=wb.addWorksheet("Carros");
    ws1.addRow(["Carro","Lote","Estado","Niveles","Cajas","Kg Totales","Túnel"]).eachCell(c=>{
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0D2260"}};
      c.font={bold:true,color:{argb:"FFFFFFFF"}};
    });
    carros.forEach(r=>ws1.addRow([r.codigo_carro,r.lotes_codigos||"---",r.estado,r.niveles||"---",r.total_cajas,parseFloat(r.kilos_totales),r.tunel_nombre||"---"]));
    ws1.columns=[{width:12},{width:12},{width:12},{width:10},{width:10},{width:14},{width:12}];
    const ws2=wb.addWorksheet("Cajas");
    ws2.addRow(["N° Caja","Lote","Carro","Producto","Calibre","Kilos Netos","Fecha Elab.","En Inventario"]).eachCell(c=>{
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0D2260"}};
      c.font={bold:true,color:{argb:"FFFFFFFF"}};
    });
    cajas.forEach(r=>ws2.addRow([r.numero_caja,r.lote_codigo,r.codigo_carro||"Sin asignar",r.producto,r.calibre||"---",parseFloat(r.kilos_netos),r.fecha_elaboracion?new Date(r.fecha_elaboracion).toLocaleDateString("es-CL"):"---",r.en_inventario?"Sí":"No"]));
    ws2.columns=[{width:18},{width:12},{width:12},{width:16},{width:14},{width:14},{width:18},{width:14}];
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",`attachment; filename="carros-cajas-${new Date().toISOString().slice(0,10)}.xlsx"`);
    await wb.xlsx.write(res); res.end();
  } catch(e) { return res.status(500).json({error:e.message}); }
};

// ── ETIQUETA ZEBRA 10×10 cm — individual ────────────────────
const etiquetaZebra = async (req,res) => {
  try {
    const {rows} = await pool.query(`
      SELECT ca.*, pt.nombre AS producto, cb.nombre AS calibre,
        l.codigo AS lote_codigo, c.codigo_carro
      FROM cajas ca
      JOIN lotes l ON l.id=ca.lote_id
      LEFT JOIN carros c ON c.id=ca.carro_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=ca.calibre_id
      WHERE ca.id=$1`,[req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Caja no encontrada"});
    const ca = rows[0];
    const cliente = req.query.cliente || null;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Etiqueta ${ca.numero_caja}</title>
<style>${CSS_ETIQUETA}</style></head><body>
<div class="noprint">
  <button onclick="window.print()" style="padding:5px 14px;background:#0a1a4a;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">Imprimir Zebra 10x10</button>
</div>
${htmlEtiqueta(ca, { cliente })}
</body></html>`;

    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.send(html);
  } catch(e){ return res.status(500).json({error:e.message}); }
};

// ── Constantes de empresa (actualizar RUT_EMPRESA con el real) ──
const EMPRESA     = "TR3S AL MAR LTDA";
const RUT_EMPRESA = "76.XXX.XXX-X"; // <- Reemplazar con RUT real
const NRO_PLANTA  = "8476";
const RESOLUCION  = "2105";

// ── Nombres de producto bilingüe ─────────────────────────────
const PROD_ES = {
  "Filete":      "FILETE DE JIBIA CONGELADO",
  "Aleta":       "ALETA DE JIBIA CONGELADA",
  "Tentaculo":   "TENTACULO DE JIBIA CONGELADO",
  "Tentáculos":  "TENTACULOS DE JIBIA CONGELADOS",
  "Reproductor": "REPRODUCTOR DE JIBIA CONGELADO",
  "Manto":       "MANTO DE JIBIA CONGELADO",
  "Desecho":     "DESECHO DE JIBIA",
};
const PROD_EN = {
  "Filete":      "FROZEN JUMBO FLYING SQUID FILLET",
  "Aleta":       "FROZEN JUMBO FLYING SQUID FIN",
  "Tentaculo":   "FROZEN JUMBO FLYING SQUID TENTACLES",
  "Tentáculos":  "FROZEN JUMBO FLYING SQUID TENTACLES",
  "Reproductor": "FROZEN JUMBO FLYING SQUID MANTLE",
  "Manto":       "FROZEN JUMBO FLYING SQUID MANTLE",
  "Desecho":     "JUMBO FLYING SQUID WASTE",
};

// ── Helper: HTML de una etiqueta 10×10 (sin head/body) ──────
// opts: { cliente: string|null }
function htmlEtiqueta(ca, opts = {}) {
  const { cliente = null } = opts;
  const productoES = PROD_ES[ca.producto] || `${(ca.producto||"").toUpperCase()} DE JIBIA CONGELADO`;
  const productoEN = PROD_EN[ca.producto] || `FROZEN JUMBO FLYING SQUID ${(ca.producto||"").toUpperCase()}`;
  const fechaElab  = ca.fecha_elaboracion ? new Date(ca.fecha_elaboracion) : new Date();
  const fechaVenc  = new Date(fechaElab); fechaVenc.setFullYear(fechaVenc.getFullYear()+2);
  const fmt2 = d => {
    const dd=String(d.getDate()).padStart(2,"0");
    const mm=String(d.getMonth()+1).padStart(2,"0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  };
  const calibreStr = ca.calibre || "";
  const kg = parseFloat(ca.kilos_netos||0).toFixed(2);
  const filaCliente = cliente
    ? `<div class="fila"><span class="lbl">Cliente / Customer:</span><span class="val">${cliente}</span></div>`
    : "";

  return `
<div class="etiqueta">
  <div class="bloque">
    <div class="titulo">${productoES}</div>
    <div class="subtitulo">CALIBRE ${calibreStr}</div>
  </div>
  <div style="padding:1mm 1.5mm;flex-shrink:0">
    <div class="fila"><span class="lbl">Nombre científico:</span><span class="val"><i>Dosidicus gigas</i></span></div>
    <div class="fila"><span class="lbl">Peso Neto:</span><span class="val">${kg} Kg</span></div>
    <div class="fila"><span class="lbl">Planta elaboradora:</span><span class="val">${EMPRESA} &nbsp;·&nbsp; RUT: ${RUT_EMPRESA}</span></div>
    <div class="fila"><span class="lbl">Nro planta / Res.:</span><span class="val">${NRO_PLANTA} &nbsp;·&nbsp; ${RESOLUCION}</span></div>
    <div class="fila"><span class="lbl">Fecha elaboración:</span><span class="val">${fmt2(fechaElab)}</span></div>
    <div class="fila"><span class="lbl">Fecha vencimiento:</span><span class="val">${fmt2(fechaVenc)}</span></div>
    <div class="fila"><span class="lbl">Lote:</span><span class="val">${ca.lote_codigo}</span></div>
    ${filaCliente}
    <div style="font-size:6pt;text-align:center;margin-top:0.5mm">Mantener congelado a -18°C &nbsp;·&nbsp; Consumir cocido</div>
    <div class="pais">CHILE</div>
  </div>
  <div class="sep"></div>
  <div class="bloque">
    <div class="titulo">${productoEN}</div>
    <div class="subtitulo">CALIBER ${calibreStr}</div>
  </div>
  <div style="padding:1mm 1.5mm;flex-shrink:0">
    <div class="fila"><span class="lbl">Scientific name:</span><span class="val"><i>Dosidicus gigas</i></span></div>
    <div class="fila"><span class="lbl">Net weight:</span><span class="val">${kg} Kg</span></div>
    <div class="fila"><span class="lbl">Processing plant:</span><span class="val">${EMPRESA} &nbsp;·&nbsp; RUT: ${RUT_EMPRESA}</span></div>
    <div class="fila"><span class="lbl">Plant N° / San.Res.:</span><span class="val">${NRO_PLANTA} &nbsp;·&nbsp; ${RESOLUCION}</span></div>
    <div class="fila"><span class="lbl">Production date:</span><span class="val">${fmt2(fechaElab)}</span></div>
    <div class="fila"><span class="lbl">Expiry date:</span><span class="val">${fmt2(fechaVenc)}</span></div>
    <div class="fila"><span class="lbl">Lot:</span><span class="val">${ca.lote_codigo}</span></div>
    ${filaCliente}
    <div style="font-size:6pt;text-align:center;margin-top:0.5mm">Keep frozen at -18°C &nbsp;·&nbsp; Consume cooked</div>
    <div class="pais">CHILE</div>
  </div>
  <div class="num">${ca.numero_caja}</div>
</div>`;
}

// ── CSS compartido para etiquetas ────────────────────────────
const CSS_ETIQUETA = `
  *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}
  body{background:#fff;color:#000}
  .etiqueta{width:100mm;height:100mm;padding:1.5mm;display:flex;flex-direction:column;page-break-after:always;page-break-inside:avoid;break-after:page;overflow:hidden}
  .etiqueta:last-child{page-break-after:auto;break-after:auto}
  .bloque{border:1px solid #000;padding:1.2mm 2mm;flex-shrink:0}
  .titulo{font-size:8.5pt;font-weight:900;text-align:center;text-transform:uppercase;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .subtitulo{font-size:7.5pt;font-weight:700;text-align:center;text-transform:uppercase}
  .sep{border-top:1px solid #000;margin:0.8mm 0;flex-shrink:0}
  .fila{display:flex;gap:1.5mm;font-size:6.5pt;line-height:1.32}
  .lbl{font-weight:700;min-width:27mm;flex-shrink:0}
  .val{flex:1;overflow:hidden}
  .num{font-size:8pt;font-weight:900;text-align:center;background:#000;color:#fff;padding:0.5mm 2mm;letter-spacing:1px;margin-top:0.8mm;flex-shrink:0}
  .pais{font-size:10pt;font-weight:900;text-align:center;margin-top:0.3mm}
  .noprint{padding:8px;background:#f0f5ff;border-bottom:1px solid #bfcffe}
  @media print{
    @page{size:100mm 100mm;margin:0}
    .noprint{display:none}
    .etiqueta{border:none}
  }
`;

// ── BATCH: todas las etiquetas de un carro ───────────────────
const etiquetasZebraCarro = async (req,res) => {
  try {
    const cliente = req.query.cliente || null;
    const {rows} = await pool.query(`
      SELECT ca.*, pt.nombre AS producto, cb.nombre AS calibre,
        l.codigo AS lote_codigo, c.codigo_carro
      FROM cajas ca
      JOIN lotes l ON l.id=ca.lote_id
      LEFT JOIN carros c ON c.id=ca.carro_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=ca.calibre_id
      WHERE ca.carro_id=$1
      ORDER BY ca.numero_caja ASC`, [req.params.carro_id]);

    if (!rows.length) return res.status(404).json({error:"Este carro no tiene cajas"});

    const totalKg = rows.reduce((s,r)=>s+parseFloat(r.kilos_netos||0),0).toFixed(2);

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Etiquetas Carro ${rows[0].codigo_carro} — ${rows.length} cajas</title>
<style>${CSS_ETIQUETA}</style></head><body>
<div class="noprint">
  <button onclick="window.print()" style="padding:8px 20px;background:#0a1a4a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;margin-right:12px">
    Imprimir todas (${rows.length} etiquetas)
  </button>
  <span style="font-size:12px;color:#64748b">
    Carro: <strong>${rows[0].codigo_carro}</strong> &nbsp;·&nbsp;
    Lote: <strong>${rows[0].lote_codigo}</strong> &nbsp;·&nbsp;
    ${rows.length} cajas &nbsp;·&nbsp; ${totalKg} kg totales
    ${cliente ? `&nbsp;·&nbsp; Cliente: <strong>${cliente}</strong>` : ""}
  </span>
</div>
${rows.map(ca => htmlEtiqueta(ca, { cliente })).join("")}
</body></html>`;

    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.send(html);
  } catch(e){ return res.status(500).json({error:e.message}); }
};

// ── BATCH: todas las etiquetas de un lote ────────────────────
const etiquetasZebraLote = async (req,res) => {
  try {
    const cliente = req.query.cliente || null;
    const {rows} = await pool.query(`
      SELECT ca.*, pt.nombre AS producto, cb.nombre AS calibre,
        l.codigo AS lote_codigo, c.codigo_carro
      FROM cajas ca
      JOIN lotes l ON l.id=ca.lote_id
      LEFT JOIN carros c ON c.id=ca.carro_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=ca.calibre_id
      WHERE ca.lote_id=$1
      ORDER BY c.codigo_carro ASC, ca.numero_caja ASC`, [req.params.lote_id]);

    if (!rows.length) return res.status(404).json({error:"Este lote no tiene cajas"});

    const totalKg = rows.reduce((s,r)=>s+parseFloat(r.kilos_netos||0),0).toFixed(2);
    const lote_codigo = rows[0].lote_codigo;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Etiquetas Lote ${lote_codigo} — ${rows.length} cajas</title>
<style>${CSS_ETIQUETA}</style></head><body>
<div class="noprint">
  <button onclick="window.print()" style="padding:8px 20px;background:#0a1a4a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;margin-right:12px">
    Imprimir todas (${rows.length} etiquetas)
  </button>
  <span style="font-size:12px;color:#64748b">
    Lote: <strong>${lote_codigo}</strong> &nbsp;·&nbsp;
    ${rows.length} cajas &nbsp;·&nbsp; ${totalKg} kg totales
    ${cliente ? `&nbsp;·&nbsp; Cliente: <strong>${cliente}</strong>` : ""}
  </span>
  <div style="margin-top:6px;font-size:11px;color:#64748b">
    Impresora Zebra ZT411 — tamaño de etiqueta: 100x100mm
  </div>
</div>
${rows.map(ca => htmlEtiqueta(ca, { cliente })).join("")}
</body></html>`;

    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.send(html);
  } catch(e){ return res.status(500).json({error:e.message}); }
};

/**
 * ========== FLUJO SIMPLIFICADO ==========
 * Asignar cajas a carros de forma simple
 */

// Obtener carros en túnel (para flujo de carga)
const carrosVaciosDeTunel = async (req, res) => {
  try {
    const { tunel_id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.id, c.codigo_carro AS numero_carro, c.estado,
              tc.id AS tc_id, t.nombre AS tunel_nombre,
              COUNT(ca.id)::int AS cajas_actuales,
              COALESCE(SUM(ca.kilos_netos), 0) AS kg_actuales,
              (SELECT json_agg(x ORDER BY x.codigo)
               FROM (SELECT ca2.lote_id, l2.codigo,
                            COUNT(ca2.id)::int AS num_cajas,
                            COALESCE(SUM(ca2.kilos_netos),0) AS kg
                     FROM cajas ca2 JOIN lotes l2 ON l2.id=ca2.lote_id
                     WHERE ca2.carro_id=c.id
                     GROUP BY ca2.lote_id, l2.codigo) x) AS lotes_resumen
       FROM tuneles_carros tc
       JOIN carros c ON c.id = tc.carro_id
       JOIN tuneles t ON t.id = tc.tunel_id
       LEFT JOIN cajas ca ON ca.carro_id = c.id
       WHERE tc.tunel_id = $1 AND tc.estado = 'en_tunel'
       GROUP BY c.id, tc.id, t.nombre, t.id
       ORDER BY c.codigo_carro ASC`,
      [tunel_id]
    );
    return res.json(rows);
  } catch (e) {
    console.error("carrosVaciosDeTunel:", e.message);
    return res.status(500).json({ error: e.message });
  }
};

// Obtener cajas sin asignar de un lote
const cajasLibresDeLote = async (req, res) => {
  try {
    const { lote_id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.*, l.codigo as lote_codigo
       FROM cajas c
       JOIN lotes l ON l.id=c.lote_id
       WHERE c.lote_id=$1 AND c.carro_id IS NULL
       ORDER BY c.numero_caja ASC`,
      [lote_id]
    );
    return res.json(rows);
  } catch (e) {
    console.error("cajasLibresDeLote:", e.message);
    return res.status(500).json({ error: e.message });
  }
};

// Asignar múltiples cajas a un carro
const asignarCajasAlCarro = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { carro_id } = req.params;
    const { caja_ids } = req.body;

    if (!Array.isArray(caja_ids) || caja_ids.length === 0) {
      return res.status(400).json({ error: "Selecciona al menos una caja" });
    }

    // Validar carro
    const { rows: carros } = await client.query(
      "SELECT * FROM carros WHERE id=$1",
      [carro_id]
    );
    if (!carros.length) return res.status(404).json({ error: "Carro no encontrado" });
    if (carros[0].estado === "congelado")
      return res.status(400).json({ error: "No se pueden asignar cajas a un carro congelado" });

    // Asignar cajas
    const placeholders = caja_ids.map((_, i) => `$${i + 2}`).join(",");
    await client.query(
      `UPDATE cajas SET carro_id=$1 WHERE id IN (${placeholders})`,
      [carro_id, ...caja_ids]
    );

    // Obtener estado del carro
    const { rows: estado } = await client.query(
      `SELECT c.id, c.codigo_carro AS numero_carro, COUNT(ca.id)::int as cajas,
              COALESCE(SUM(ca.kilos_netos), 0) as kg
       FROM carros c
       LEFT JOIN cajas ca ON ca.carro_id = c.id
       WHERE c.id=$1
       GROUP BY c.id`,
      [carro_id]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      carro: estado[0],
      cajas_asignadas: caja_ids.length,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("asignarCajasAlCarro:", e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// Marcar carro como LLENO y CONGELADO
const congelarCarro = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { carro_id } = req.params;
    const { temperatura_salida } = req.body;

    // Obtener carro con sus cajas y su entrada en tuneles_carros
    const { rows: carros } = await client.query(
      `SELECT c.id, c.codigo_carro AS numero_carro, c.lote_id,
              tc.id AS tc_id, tc.tunel_id, t.nombre AS tunel_nombre,
              COUNT(ca.id)::int AS cajas, COALESCE(SUM(ca.kilos_netos), 0) AS kg
       FROM carros c
       JOIN tuneles_carros tc ON tc.carro_id = c.id AND tc.estado = 'en_tunel'
       JOIN tuneles t ON t.id = tc.tunel_id
       LEFT JOIN cajas ca ON ca.carro_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, tc.id, t.nombre, t.id`,
      [carro_id]
    );

    if (!carros.length) return res.status(404).json({ error: "Carro no encontrado o no está en ningún túnel activo" });

    const carro = carros[0];
    if (parseInt(carro.cajas) === 0)
      return res.status(400).json({ error: "Carro vacío, no se puede congelar" });

    // Marcar tuneles_carros como completado
    await client.query(
      `UPDATE tuneles_carros
       SET estado='completado', temperatura_salida=$1, fecha_salida=NOW()
       WHERE id=$2`,
      [temperatura_salida || null, carro.tc_id]
    );

    // Marcar el carro como congelado
    await client.query(
      `UPDATE carros SET estado='congelado', updated_at=NOW() WHERE id=$1`,
      [carro_id]
    );

    // Registrar en inventario por grupo (lote + producto_tipo + calibre) desde las cajas reales
    const { rows: grupos } = await client.query(
      `SELECT ca.lote_id, l.codigo AS lote_codigo,
              ca.producto_tipo_id, ca.calibre_id,
              COUNT(ca.id)::int AS num_cajas,
              COALESCE(SUM(ca.kilos_netos), 0) AS kg_total
       FROM cajas ca
       JOIN lotes l ON l.id=ca.lote_id
       WHERE ca.carro_id=$1
       GROUP BY ca.lote_id, l.codigo, ca.producto_tipo_id, ca.calibre_id`,
      [carro_id]
    );

    const ubicacion = `Túnel ${carro.tunel_nombre} - Carro ${carro.numero_carro}`;
    for (const g of grupos) {
      await client.query(
        `INSERT INTO inventario
         (lote_id, producto_tipo_id, calibre_id, categoria_inv, kilos_disponibles, num_cajas, ubicacion, updated_at)
         VALUES ($1, $2, $3, 'producto', $4, $5, $6, NOW())
         ON CONFLICT (lote_id, producto_tipo_id, calibre_id) DO UPDATE
         SET kilos_disponibles = inventario.kilos_disponibles + EXCLUDED.kilos_disponibles,
             num_cajas = inventario.num_cajas + EXCLUDED.num_cajas,
             ubicacion = EXCLUDED.ubicacion,
             updated_at = NOW()`,
        [g.lote_id, g.producto_tipo_id, g.calibre_id, g.kg_total, g.num_cajas, ubicacion]
      );
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      mensaje: `✓ Carro ${carro.numero_carro} CONGELADO con ${carro.cajas} cajas`,
      carro: { ...carro, estado: "congelado", temperatura_salida },
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("congelarCarro:", e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

module.exports = {
  listar, carrosDeTunel, listarCarros, listarCajas, estadoCarros,
  crearCarro, editarCarro, asignarCaja, marcarListo,
  ingresarCarroTunel, sacarCarroTunel,
  etiquetaCarro, etiquetaCaja, exportarCarrosExcel, etiquetaZebra,
  etiquetasZebraCarro, etiquetasZebraLote,
  // Flujo simplificado
  carrosVaciosDeTunel, cajasLibresDeLote, asignarCajasAlCarro, congelarCarro,
};
