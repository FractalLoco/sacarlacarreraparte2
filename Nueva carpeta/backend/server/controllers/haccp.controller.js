"use strict";
const pool = require("../config/db");
const PDFDoc = require("pdfkit");

const TIPOS = ['recepcion_mp','monitoreo_temp','empaque','congelacion','despacho'];

// ── LISTAR ───────────────────────────────────────────────────
const listar = async (req,res) => {
  try {
    const {tipo,lote_id,fecha_desde,fecha_hasta,estado} = req.query;
    let q = `
      SELECT h.*, l.codigo AS lote_codigo,
        u.nombre AS registrado_por_nombre,
        a.nombre AS aprobado_por_nombre
      FROM haccp_registros h
      LEFT JOIN lotes l ON l.id=h.lote_id
      LEFT JOIN usuarios u ON u.id=h.registrado_por
      LEFT JOIN usuarios a ON a.id=h.aprobado_por
      WHERE 1=1`;
    const p=[];
    if(tipo)        {p.push(tipo);        q+=` AND h.tipo=$${p.length}`;}
    if(lote_id)     {p.push(lote_id);     q+=` AND h.lote_id=$${p.length}`;}
    if(fecha_desde) {p.push(fecha_desde); q+=` AND h.fecha>=$${p.length}`;}
    if(fecha_hasta) {p.push(fecha_hasta); q+=` AND h.fecha<=$${p.length}`;}
    if(estado)      {p.push(estado);      q+=` AND h.estado=$${p.length}`;}
    q+=" ORDER BY h.created_at DESC LIMIT 100";
    const {rows}=await pool.query(q,p);
    return res.json(rows);
  } catch(e){return res.status(500).json({error:e.message});}
};

const obtener = async (req,res) => {
  try {
    const {rows}=await pool.query(`
      SELECT h.*, l.codigo AS lote_codigo,
        u.nombre AS registrado_por_nombre
      FROM haccp_registros h
      LEFT JOIN lotes l ON l.id=h.lote_id
      LEFT JOIN usuarios u ON u.id=h.registrado_por
      WHERE h.id=$1`,[req.params.id]);
    if(!rows.length) return res.status(404).json({error:"No encontrado"});
    return res.json(rows[0]);
  } catch(e){return res.status(500).json({error:e.message});}
};

// ── CREAR ────────────────────────────────────────────────────
const crear = async (req,res) => {
  try {
    const {tipo,lote_id,folio,fecha,hora_inicio,hora_fin,monitor_nombre,
           id_termometro,datos,estado,observaciones} = req.body;
    if(!tipo||!TIPOS.includes(tipo))
      return res.status(400).json({error:"tipo inválido"});

    // Auto-folio si no se provee
    const folioFinal = folio || await generarFolio(tipo);

    const {rows}=await pool.query(`
      INSERT INTO haccp_registros
        (tipo,lote_id,folio,fecha,hora_inicio,hora_fin,monitor_nombre,
         id_termometro,datos,estado,observaciones,registrado_por)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [tipo,lote_id||null,folioFinal,fecha||new Date(),
       hora_inicio||null,hora_fin||null,monitor_nombre||null,
       id_termometro||null,JSON.stringify(datos||{}),
       estado||'borrador',observaciones||null,req.usuario.id]
    );
    return res.status(201).json(rows[0]);
  } catch(e){return res.status(500).json({error:e.message});}
};

// ── ACTUALIZAR ───────────────────────────────────────────────
const actualizar = async (req,res) => {
  try {
    const {hora_inicio,hora_fin,monitor_nombre,id_termometro,
           datos,estado,observaciones,lote_id,fecha} = req.body;
    const {rows}=await pool.query(`
      UPDATE haccp_registros SET
        hora_inicio=COALESCE($1,hora_inicio),
        hora_fin=COALESCE($2,hora_fin),
        monitor_nombre=COALESCE($3,monitor_nombre),
        id_termometro=COALESCE($4,id_termometro),
        datos=COALESCE($5,datos),
        estado=COALESCE($6,estado),
        observaciones=COALESCE($7,observaciones),
        lote_id=COALESCE($8,lote_id),
        fecha=COALESCE($9,fecha),
        updated_at=NOW()
      WHERE id=$10 RETURNING *`,
      [hora_inicio||null,hora_fin||null,monitor_nombre||null,
       id_termometro||null,datos?JSON.stringify(datos):null,
       estado||null,observaciones||null,lote_id||null,
       fecha||null,req.params.id]
    );
    if(!rows.length) return res.status(404).json({error:"No encontrado"});
    return res.json(rows[0]);
  } catch(e){return res.status(500).json({error:e.message});}
};

// ── ELIMINAR ─────────────────────────────────────────────────
const eliminar = async (req,res) => {
  try {
    const {rows}=await pool.query(
      "DELETE FROM haccp_registros WHERE id=$1 RETURNING *",[req.params.id]);
    if(!rows.length) return res.status(404).json({error:"No encontrado"});
    return res.json({ok:true});
  } catch(e){return res.status(500).json({error:e.message});}
};

// ── IMPRIMIR formulario HACCP como HTML ─────────────────────
const imprimir = async (req,res) => {
  try {
    const {rows}=await pool.query(`
      SELECT h.*, l.codigo AS lote_codigo, l.kilos_brutos,
        u.nombre AS registrado_por_nombre
      FROM haccp_registros h
      LEFT JOIN lotes l ON l.id=h.lote_id
      LEFT JOIN usuarios u ON u.id=h.registrado_por
      WHERE h.id=$1`,[req.params.id]);
    if(!rows.length) return res.status(404).json({error:"No encontrado"});

    const r = rows[0];
    const d = r.datos||{};
    const TITULOS = {
      recepcion_mp:   "PCC1 — RECEPCIÓN DE MATERIA PRIMA",
      monitoreo_temp: "MONITOREO DE TEMPERATURA EN LÍNEA DE PROCESO",
      empaque:        "EMPAQUE Y REEMPAQUE CEFALÓPODOS CONGELADOS",
      congelacion:    "CONGELACIÓN Y ENFRIADO CEFALÓPODOS CONGELADOS",
      despacho:       "DESPACHO CEFALÓPODOS ENFRIADOS-REFRIGERADOS Y CONGELADOS",
    };
    const fFecha = dt => dt ? new Date(dt).toLocaleDateString("es-CL") : "___/___/______";
    const fHora  = t  => t  || "__:__";

    const estilos = `
      @page{size:A4 landscape;margin:10mm}
      *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif;font-size:9pt}
      body{color:#000;background:#fff}
      .cabecera{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
      .empresa{font-size:8pt;color:#555}
      .folio{font-size:11pt;font-weight:700;border:2px solid #000;padding:3px 12px}
      h1{font-size:12pt;font-weight:900;text-align:center;text-transform:uppercase;margin:6px 0}
      .fila-datos{display:grid;gap:4px 16px;margin:6px 0}
      .campo{display:flex;gap:4px;border-bottom:1px solid #000;padding-bottom:1px;font-size:8.5pt}
      .label{font-weight:700;white-space:nowrap}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      th{background:#1e3a6e;color:#fff;padding:4px 6px;text-align:center;font-size:8pt;border:1px solid #1e3a6e}
      td{padding:4px 6px;border:1px solid #999;text-align:center;font-size:8pt;min-height:20px}
      tr:nth-child(even) td{background:#f5f7ff}
      .firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:14px}
      .firma-box{border-top:1.5px solid #000;padding-top:5px;text-align:center;font-size:8pt;color:#444}
      .noprint{margin-bottom:8px}
      @media print{.noprint{display:none}}
    `;

    // Generar tabla de mediciones según el tipo
    let tablaHTML = "";

    if(r.tipo==="recepcion_mp") {
      const muestras = d.muestras||[];
      tablaHTML = `
        <table>
          <thead><tr>
            <th>Hora</th><th>Muestra n°</th><th>Aspecto externo</th><th>Olor</th>
            <th>Temperatura</th><th>Carne</th><th>Tentáculos</th><th>Contaminación Q.</th>
            <th>A/R</th><th>A.C.</th>
          </tr></thead>
          <tbody>
            ${(muestras.length?muestras:Array(5).fill({})).map((m,i)=>`
            <tr>
              <td>${m.hora||""}</td>
              <td>${i+1}</td>
              <td>${m.aspecto_externo||""}</td>
              <td>${m.olor||""}</td>
              <td>${m.temperatura||""}°C</td>
              <td>${m.carne||""}</td>
              <td>${m.tentaculos||""}</td>
              <td>${m.contaminacion||""}</td>
              <td style="font-weight:700;color:${m.ar==="R"?"#dc2626":"#15803d"}">${m.ar||""}</td>
              <td>${m.ac||""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <p style="font-size:7.5pt;margin-top:4px">C: cumple · NC: no cumple · A: ausencia · P: presencia · A: acepto · R: rechazo · A.C: Acción correctiva</p>`;

    } else if(r.tipo==="monitoreo_temp") {
      const registros = d.registros||[];
      tablaHTML = `
        <table>
          <thead>
            <tr>
              <th rowspan="2">Hora</th><th rowspan="2">Etapa</th><th rowspan="2">Producto</th>
              <th rowspan="2">Lote</th>
              <th colspan="3">Mediciones</th>
              <th rowspan="2">ID Termómetro</th>
              <th rowspan="2">A/R</th><th rowspan="2">A.C.</th>
            </tr>
            <tr><th>M1</th><th>M2</th><th>M3</th></tr>
          </thead>
          <tbody>
            ${(registros.length?registros:Array(10).fill({})).map(m=>`
            <tr>
              <td>${m.hora||""}</td>
              <td>${m.etapa||""}</td>
              <td>${m.producto||""}</td>
              <td>${m.lote||""}</td>
              <td>${m.m1||""}</td><td>${m.m2||""}</td><td>${m.m3||""}</td>
              <td>${m.id_termometro||""}</td>
              <td style="font-weight:700;color:${m.ar==="R"?"#dc2626":"#15803d"}">${m.ar||""}</td>
              <td>${m.ac||""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <p style="font-size:7.5pt;margin-top:4px">Monitoreo: cada 2 horas · Plan muestreo n=3; A=0; R=1</p>`;

    } else if(r.tipo==="empaque") {
      const registros = d.registros||[];
      tablaHTML = `
        <table>
          <thead><tr>
            <th>Hora Control</th><th>N° Cajas</th><th>Peso</th><th>Lote</th>
            <th>Fecha Elaboración</th><th>Fecha Vencimiento</th>
            <th>Palabra CHILE</th><th>N° Planta</th><th>Forma Consumo</th>
            <th>T° Mantención</th><th>A/R</th>
          </tr></thead>
          <tbody>
            ${(registros.length?registros:Array(12).fill({})).map(m=>`
            <tr>
              <td>${m.hora||""}</td>
              <td>${m.num_cajas||""}</td>
              <td>${m.peso||""}</td>
              <td>${m.lote||""}</td>
              <td>${m.fecha_elaboracion||""}</td>
              <td>${m.fecha_vencimiento||""}</td>
              <td>${m.palabra_chile||""}</td>
              <td>${m.num_planta||""}</td>
              <td>${m.forma_consumo||""}</td>
              <td>${m.t_mantencion||""}</td>
              <td style="font-weight:700;color:${m.ar==="R"?"#dc2626":"#15803d"}">${m.ar||""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <p style="font-size:7.5pt;margin-top:4px">A: Acepta · R: Rechaza · Frecuencia: Al inicio y cada 1 hora</p>`;

    } else if(r.tipo==="congelacion") {
      const registros = d.registros||[];
      tablaHTML = `
        <table>
          <thead><tr>
            <th>Túnel</th><th>Producto</th><th>Calibre</th><th>Lote</th>
            <th>Hora Inicio</th><th>Fecha Término</th><th>Hora Término</th>
            <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>A/R</th>
          </tr></thead>
          <tbody>
            ${(registros.length?registros:Array(6).fill({})).map(m=>`
            <tr>
              <td>${m.tunel||""}</td>
              <td>${m.producto||""}</td>
              <td>${m.calibre||""}</td>
              <td>${m.lote||""}</td>
              <td>${m.hora_inicio||""}</td>
              <td>${m.fecha_termino||""}</td>
              <td>${m.hora_termino||""}</td>
              <td>${m.t1||""}</td><td>${m.t2||""}</td><td>${m.t3||""}</td>
              <td>${m.t4||""}</td><td>${m.t5||""}</td>
              <td style="font-weight:700;color:${m.ar==="R"?"#dc2626":"#15803d"}">${m.ar||""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <p style="font-size:7.5pt;margin-top:4px">L.C: Temperatura mínima -18°C · Permanencia máxima 36h · Plan NCh44 Of 78 S1 (n=5; A=0; R=1; AQL=2.5)</p>`;

    } else if(r.tipo==="despacho") {
      const pallets = d.pallets||[];
      tablaHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:8px">
          <div class="campo"><span class="label">Cliente:</span> ${d.cliente||""}</div>
          <div class="campo"><span class="label">Destino:</span> ${d.destino||""}</div>
          <div class="campo"><span class="label">N° Guía:</span> ${d.num_guia||""}</div>
          <div class="campo"><span class="label">N° Contenedor:</span> ${d.num_contenedor||""}</div>
          <div class="campo"><span class="label">Nombre Chofer:</span> ${d.nombre_chofer||""}</div>
          <div class="campo"><span class="label">RUT Chofer:</span> ${d.rut_chofer||""}</div>
          <div class="campo"><span class="label">Patente Camión:</span> <strong style="font-family:monospace">${d.patente_camion||""}</strong></div>
          <div class="campo"><span class="label">Patente Rampla:</span> <strong style="font-family:monospace">${d.patente_rampla||""}</strong></div>
          <div class="campo"><span class="label">N° Sello Cliente:</span> ${d.sello_cliente||""}</div>
          <div class="campo"><span class="label">N° Sello Interno:</span> ${d.sello_interno||""}</div>
          <div class="campo" style="grid-column:span 2"><span class="label">Limpieza y condición del transporte (C/NC):</span> ${d.limpieza_condicion||""}</div>
        </div>
        <table>
          <thead><tr>
            <th>Hora</th><th>N° Pallet</th><th>N° Cajas</th><th>Lote</th>
            <th>Clave Elaboración</th><th>T°1</th><th>T°2</th><th>T°3</th>
          </tr></thead>
          <tbody>
            ${(pallets.length?pallets:Array(10).fill({})).map(m=>`
            <tr>
              <td>${m.hora||""}</td>
              <td>${m.num_pallet||""}</td>
              <td>${m.num_cajas||""}</td>
              <td>${m.lote||""}</td>
              <td>${m.clave_elaboracion||""}</td>
              <td>${m.t1||""}</td><td>${m.t2||""}</td><td>${m.t3||""}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;
    }

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>HACCP — ${TITULOS[r.tipo]||r.tipo}</title>
<style>${estilos}</style></head><body>
<div class="noprint">
  <button onclick="window.print()" style="padding:7px 16px;background:#1e3a6e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px">🖨️ Imprimir Formulario HACCP</button>
  <span style="font-size:11px;color:#64748b;margin-left:10px">Programa de Aseguramiento de Calidad — HACCP</span>
</div>

<div class="cabecera">
  <div>
    <div style="font-size:9pt;font-weight:700;color:#1e3a6e">TR3S AL MAR LTDA</div>
    <div class="empresa">Av. Océano Pacífico 3630, Parque Industrial, Coronel</div>
    <div class="empresa">PROGRAMA DE ASEGURAMIENTO DE CALIDAD BASADO EN LA METODOLOGÍA HACCP · Versión 01 · ${new Date().toLocaleDateString("es-CL",{year:"numeric",month:"long"})}</div>
  </div>
  <div class="folio">N° FOLIO: ${r.folio||"_________"}</div>
</div>

<h1>${TITULOS[r.tipo]||r.tipo.toUpperCase()}</h1>

<div class="fila-datos" style="grid-template-columns:1fr 1fr 1fr 1fr">
  <div class="campo"><span class="label">Nombre Monitor:</span> ${r.monitor_nombre||""}</div>
  <div class="campo"><span class="label">Fecha:</span> ${fFecha(r.fecha)}</div>
  <div class="campo"><span class="label">Hora inicio:</span> ${fHora(r.hora_inicio)}</div>
  <div class="campo"><span class="label">Hora término:</span> ${fHora(r.hora_fin)}</div>
  <div class="campo"><span class="label">ID Termómetro:</span> ${r.id_termometro||""}</div>
  <div class="campo"><span class="label">Lote N°:</span> ${r.lote_codigo||""}</div>
  <div class="campo"><span class="label">Estado:</span> <strong>${r.estado.toUpperCase()}</strong></div>
</div>

${tablaHTML}

${r.observaciones?`<div style="margin-top:8px;padding:6px 10px;border:1px solid #999;border-radius:4px"><strong>Observaciones / Acciones Correctivas:</strong> ${r.observaciones}</div>`:""}

<div class="firmas">
  <div class="firma-box">Firma Monitor de Calidad<br><br><br>${r.monitor_nombre||""}</div>
  <div class="firma-box">Firma Encargado Programa de Aseguramiento de Calidad<br><br><br></div>
</div>
</body></html>`;

    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.send(html);
  } catch(e){return res.status(500).json({error:e.message});}
};

// Helper: generar folio automático
async function generarFolio(tipo) {
  const prefijo = {recepcion_mp:"RMP",monitoreo_temp:"MON",empaque:"EMP",congelacion:"CON",despacho:"DSP"};
  const p = prefijo[tipo]||"HAC";
  const {rows}=await pool.query(
    "SELECT COUNT(*)+1 AS n FROM haccp_registros WHERE tipo=$1 AND fecha=CURRENT_DATE",[tipo]);
  const n = String(rows[0].n).padStart(3,"0");
  const hoy = new Date().toISOString().slice(0,10).replace(/-/g,"");
  return `${p}-${hoy}-${n}`;
}

module.exports = {listar,obtener,crear,actualizar,eliminar,imprimir};
