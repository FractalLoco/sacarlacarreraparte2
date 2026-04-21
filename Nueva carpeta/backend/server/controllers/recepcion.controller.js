"use strict";
const pool = require("../config/db");
const path = require("path");
const fs   = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── LISTAR archivos de un lote ───────────────────────────────
const listarArchivos = async (req,res) => {
  try {
    const { lote_id } = req.params;
    const {rows} = await pool.query(`
      SELECT a.*, u.nombre AS subido_por_nombre
      FROM recepcion_archivos a
      LEFT JOIN usuarios u ON u.id=a.subido_por
      WHERE a.lote_id=$1
      ORDER BY a.created_at DESC`, [lote_id]);
    return res.json(rows);
  } catch(e){ return res.status(500).json({error:e.message}); }
};

// ── SUBIR archivo ────────────────────────────────────────────
const subirArchivo = async (req,res) => {
  try {
    if (!req.file) return res.status(400).json({error:"No se recibió ningún archivo"});
    const { lote_id } = req.params;
    const { categoria="documento", descripcion="" } = req.body;

    const {rows} = await pool.query(
      `INSERT INTO recepcion_archivos
         (lote_id,nombre_original,nombre_archivo,tipo_mime,tamanio_bytes,categoria,descripcion,subido_por)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [lote_id, req.file.originalname, req.file.filename,
       req.file.mimetype, req.file.size, categoria, descripcion||null, req.usuario.id]
    );
    return res.status(201).json(rows[0]);
  } catch(e){
    // Borrar archivo si falló el registro en BD
    if (req.file?.path) fs.unlink(req.file.path, ()=>{});
    return res.status(500).json({error:e.message});
  }
};

// ── DESCARGAR archivo ────────────────────────────────────────
const descargarArchivo = async (req,res) => {
  try {
    const {rows} = await pool.query(
      "SELECT * FROM recepcion_archivos WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Archivo no encontrado"});

    const filePath = path.join(UPLOAD_DIR, rows[0].nombre_archivo);
    if (!fs.existsSync(filePath))
      return res.status(404).json({error:"Archivo no encontrado en disco"});

    res.setHeader("Content-Disposition", `attachment; filename="${rows[0].nombre_original}"`);
    res.setHeader("Content-Type", rows[0].tipo_mime || "application/octet-stream");
    return res.sendFile(filePath);
  } catch(e){ return res.status(500).json({error:e.message}); }
};

// ── VER archivo inline (para imágenes en browser) ───────────
const verArchivo = async (req,res) => {
  try {
    const {rows} = await pool.query(
      "SELECT * FROM recepcion_archivos WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({error:"Archivo no encontrado"});

    const filePath = path.join(UPLOAD_DIR, rows[0].nombre_archivo);
    if (!fs.existsSync(filePath))
      return res.status(404).json({error:"Archivo no encontrado en disco"});

    res.setHeader("Content-Type", rows[0].tipo_mime || "application/octet-stream");
    return res.sendFile(filePath);
  } catch(e){ return res.status(500).json({error:e.message}); }
};

// ── ELIMINAR archivo ─────────────────────────────────────────
const eliminarArchivo = async (req,res) => {
  try {
    const {rows} = await pool.query(
      "DELETE FROM recepcion_archivos WHERE id=$1 RETURNING *", [req.params.id]);
    if (!rows.length) return res.status(404).json({error:"No encontrado"});

    const filePath = path.join(UPLOAD_DIR, rows[0].nombre_archivo);
    if (fs.existsSync(filePath)) fs.unlink(filePath, ()=>{});

    return res.json({ok:true});
  } catch(e){ return res.status(500).json({error:e.message}); }
};

// ── IMPRIMIR comprobante de recepción del camión ─────────────
const imprimirRecepcion = async (req,res) => {
  try {
    const {rows:lote} = await pool.query(`
      SELECT l.*,
        p.nombre AS proveedor_nombre, p.rut AS proveedor_rut,
        c.nombre AS conductor_nombre, c.rut AS conductor_rut,
        c.empresa_transporte,
        u.nombre AS recibido_por_nombre
      FROM lotes l
      LEFT JOIN proveedores p ON p.id=l.proveedor_id
      LEFT JOIN conductores c ON c.id=l.conductor_id
      LEFT JOIN usuarios u ON u.id=l.recibido_por
      WHERE l.id=$1`, [req.params.lote_id]);

    if (!lote.length) return res.status(404).json({error:"Lote no encontrado"});
    const l = lote[0];

    const {rows:archivos} = await pool.query(
      "SELECT * FROM recepcion_archivos WHERE lote_id=$1 ORDER BY created_at", [req.params.lote_id]);

    const f  = d => d ? new Date(d).toLocaleDateString("es-CL"):"—";
    const ft = d => d ? new Date(d).toLocaleString("es-CL"):"—";

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Recepción Camión — Lote ${l.codigo}</title>
<style>
  @page{size:A4;margin:15mm}
  *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}
  body{color:#1e293b;font-size:10pt}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #0a1a4a}
  .header-titulo{font-size:14pt;font-weight:900;color:#0a1a4a}
  .header-sub{font-size:9pt;color:#64748b;margin-top:3px}
  .folio{font-size:12pt;font-weight:700;color:#0a1a4a;border:2px solid #0a1a4a;padding:4px 12px;border-radius:4px}
  h2{font-size:11pt;font-weight:700;color:#0a1a4a;background:#f0f5ff;padding:5px 10px;margin:12px 0 6px;border-left:4px solid #0a1a4a}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:8px}
  .campo{display:flex;gap:6px;align-items:baseline;font-size:9.5pt}
  .label{font-weight:700;color:#3d5080;min-width:100px;flex-shrink:0}
  .valor{border-bottom:1px solid #bfcffe;flex:1;padding-bottom:1px}
  .tabla{width:100%;border-collapse:collapse;margin-top:8px;font-size:9pt}
  .tabla th{background:#0a1a4a;color:white;padding:4px 8px;text-align:left;font-size:8.5pt}
  .tabla td{padding:4px 8px;border-bottom:1px solid #e2e8f0}
  .tabla tr:nth-child(even) td{background:#f0f5ff}
  .firmas{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}
  .firma-box{border-top:1.5px solid #0a1a4a;padding-top:6px;text-align:center;font-size:9pt;color:#3d5080}
  .noprint{margin-bottom:12px}
  @media print{.noprint{display:none}}
</style></head><body>
<div class="noprint">
  <button onclick="window.print()" style="padding:8px 18px;background:#0a1a4a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;margin-right:8px">🖨️ Imprimir</button>
  <span style="font-size:11px;color:#64748b">Documento oficial de recepción de camión</span>
</div>

<div class="header">
  <div>
    <div class="header-titulo">TR3S AL MAR LTDA — RECEPCIÓN DE CAMIÓN</div>
    <div class="header-sub">Av. Océano Pacífico 3630, Parque Industrial, Coronel</div>
    <div class="header-sub">Generado: ${new Date().toLocaleString("es-CL")}</div>
  </div>
  <div class="folio">Lote: ${l.codigo}</div>
</div>

<h2>Datos del Lote</h2>
<div class="grid">
  <div class="campo"><span class="label">Código:</span><span class="valor">${l.codigo}</span></div>
  <div class="campo"><span class="label">Fecha ingreso:</span><span class="valor">${f(l.fecha_ingreso)}</span></div>
  <div class="campo"><span class="label">Kg brutos:</span><span class="valor">${parseFloat(l.kilos_brutos||0).toFixed(2)} kg</span></div>
  <div class="campo"><span class="label">Guía despacho:</span><span class="valor">${l.guia_despacho||"—"}</span></div>
  <div class="campo"><span class="label">N° Factura:</span><span class="valor">${l.factura_numero||"—"}</span></div>
  <div class="campo"><span class="label">Estado carga:</span><span class="valor">${l.estado_carga||"—"}</span></div>
  <div class="campo"><span class="label">Temperatura:</span><span class="valor">${l.temperatura_carga!=null?l.temperatura_carga+"°C":"—"}</span></div>
  <div class="campo"><span class="label">Proveedor:</span><span class="valor">${l.proveedor_nombre||"—"} ${l.proveedor_rut?"("+l.proveedor_rut+")":""}</span></div>
</div>

<h2>Datos del Vehículo y Conductor</h2>
<div class="grid">
  <div class="campo"><span class="label">Conductor:</span><span class="valor">${l.conductor_nombre||"—"}</span></div>
  <div class="campo"><span class="label">RUT conductor:</span><span class="valor">${l.conductor_rut||"—"}</span></div>
  <div class="campo"><span class="label">Patente camión:</span><span class="valor" style="font-family:monospace;font-weight:700">${l.patente_camion||"—"}</span></div>
  <div class="campo"><span class="label">Patente rampla:</span><span class="valor" style="font-family:monospace;font-weight:700">${l.patente_rampla||"—"}</span></div>
  <div class="campo"><span class="label">Empresa:</span><span class="valor">${l.empresa_transporte||l.conductor_empresa||"—"}</span></div>
</div>

<h2>Horarios de Recepción</h2>
<div class="grid">
  <div class="campo"><span class="label">Hora llegada:</span><span class="valor">${ft(l.hora_llegada)}</span></div>
  <div class="campo"><span class="label">Inicio descarga:</span><span class="valor">${ft(l.hora_inicio_descarga)}</span></div>
  <div class="campo"><span class="label">Fin descarga:</span><span class="valor">${ft(l.hora_fin_descarga)}</span></div>
  <div class="campo"><span class="label">Recibido por:</span><span class="valor">${l.recibido_por_nombre||"—"}</span></div>
</div>

${l.observacion_recepcion?`<h2>Observaciones</h2><p style="padding:6px 10px;background:#f8faff;border-radius:4px;font-size:9.5pt">${l.observacion_recepcion}</p>`:""}

${archivos.length>0?`
<h2>Documentación Recibida (${archivos.length} archivo${archivos.length>1?"s":""})</h2>
<table class="tabla">
  <thead><tr><th>#</th><th>Nombre</th><th>Categoría</th><th>Descripción</th><th>Fecha</th></tr></thead>
  <tbody>
    ${archivos.map((a,i)=>`<tr>
      <td>${i+1}</td>
      <td>${a.nombre_original}</td>
      <td style="text-transform:capitalize">${a.categoria}</td>
      <td>${a.descripcion||"—"}</td>
      <td>${new Date(a.created_at).toLocaleDateString("es-CL")}</td>
    </tr>`).join("")}
  </tbody>
</table>`:""}

<div class="firmas">
  <div class="firma-box">Firma Monitor de Calidad<br><br><br>${l.recibido_por_nombre||""}</div>
  <div class="firma-box">Firma Conductor / Representante<br><br><br>${l.conductor_nombre||""}</div>
</div>
</body></html>`;

    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.send(html);
  } catch(e){ return res.status(500).json({error:e.message}); }
};

module.exports = { listarArchivos, subirArchivo, descargarArchivo, verArchivo, eliminarArchivo, imprimirRecepcion };
