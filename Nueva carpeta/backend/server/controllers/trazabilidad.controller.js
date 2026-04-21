"use strict";
const pool = require("../config/db");

const buscarLotes = async (req,res) => {
  try {
    const {codigo,estado,fecha_desde,fecha_hasta,kilos_min,kilos_max,q,proveedor_id,conductor_id,patente}=req.query;
    let query=`
      SELECT l.*,u.nombre AS creado_por_nombre,ur.nombre AS recibido_por_nombre,
        pr.nombre AS proveedor_nombre, pr.rut AS proveedor_rut,
        co.nombre AS conductor_nombre, co.rut AS conductor_rut, co.empresa_transporte,
        COUNT(DISTINCT p.id)::int  AS total_pesajes,
        COUNT(DISTINCT ca.id)::int AS total_cajas,
        COUNT(DISTINCT c.id)::int  AS total_carros,
        COALESCE(SUM(CASE WHEN pt.es_desecho=false THEN p.kilos ELSE 0 END),0) AS kilos_producidos,
        COALESCE(SUM(CASE WHEN pt.es_desecho=true  THEN p.kilos ELSE 0 END),0) AS kilos_desecho
      FROM lotes l
      LEFT JOIN usuarios u   ON u.id=l.creado_por
      LEFT JOIN usuarios ur  ON ur.id=l.recibido_por
      LEFT JOIN proveedores pr ON pr.id=l.proveedor_id
      LEFT JOIN conductores co ON co.id=l.conductor_id
      LEFT JOIN pesajes p    ON p.lote_id=l.id
      LEFT JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      LEFT JOIN carros c     ON c.lote_id=l.id
      LEFT JOIN cajas ca     ON ca.lote_id=l.id
      WHERE 1=1`;
    const params=[];
    if(codigo)     { params.push(`%${codigo}%`); query+=` AND l.codigo ILIKE $${params.length}`; }
    if(estado)     { params.push(estado);         query+=` AND l.estado=$${params.length}`; }
    if(fecha_desde){ params.push(fecha_desde);    query+=` AND l.fecha_ingreso>=$${params.length}`; }
    if(fecha_hasta){ params.push(fecha_hasta);    query+=` AND l.fecha_ingreso<=$${params.length}`; }
    if(kilos_min)  { params.push(kilos_min);      query+=` AND l.kilos_brutos>=$${params.length}`; }
    if(kilos_max)  { params.push(kilos_max);      query+=` AND l.kilos_brutos<=$${params.length}`; }
    if(proveedor_id){ params.push(proveedor_id);  query+=` AND l.proveedor_id=$${params.length}`; }
    if(conductor_id){ params.push(conductor_id);  query+=` AND l.conductor_id=$${params.length}`; }
    if(patente)    { params.push(`%${patente}%`); query+=` AND l.patente_camion ILIKE $${params.length}`; }
    if(q) {
      params.push(`%${q}%`);
      query+=` AND (l.codigo ILIKE $${params.length} OR l.guia_despacho ILIKE $${params.length} OR l.factura_numero ILIKE $${params.length} OR pr.nombre ILIKE $${params.length} OR co.nombre ILIKE $${params.length} OR l.patente_camion ILIKE $${params.length})`;
    }
    query+=" GROUP BY l.id,u.nombre,ur.nombre,pr.nombre,pr.rut,co.nombre,co.rut,co.empresa_transporte ORDER BY l.fecha_ingreso DESC LIMIT 100";
    const {rows}=await pool.query(query,params);
    return res.json(rows);
  } catch(e){console.error("traz.buscarLotes:",e.message);return res.status(500).json({error:"Error interno"});}
};

const trazabilidadLote = async (req,res) => {
  try {
    const {id}=req.params;
    const {rows:lote}=await pool.query(`
      SELECT l.*,
        u.nombre  AS creado_por_nombre, ur.nombre AS recibido_por_nombre,
        pr.nombre AS proveedor_nombre, pr.rut AS proveedor_rut,
        pr.contacto AS proveedor_contacto, pr.telefono AS proveedor_telefono,
        co.nombre AS conductor_nombre, co.rut AS conductor_rut,
        co.telefono AS conductor_telefono, co.empresa_transporte
      FROM lotes l
      LEFT JOIN usuarios u   ON u.id=l.creado_por
      LEFT JOIN usuarios ur  ON ur.id=l.recibido_por
      LEFT JOIN proveedores pr ON pr.id=l.proveedor_id
      LEFT JOIN conductores co ON co.id=l.conductor_id
      WHERE l.id=$1`,[id]);
    if(!lote.length) return res.status(404).json({error:"Lote no encontrado"});

    const {rows:pesajes}=await pool.query(`
      SELECT p.*,pt.nombre AS producto,cb.nombre AS calibre,lp.nombre AS linea,u.nombre AS registrado_por
      FROM pesajes p JOIN productos_tipo pt ON pt.id=p.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=p.calibre_id
      LEFT JOIN lineas_produccion lp ON lp.id=p.linea_id
      LEFT JOIN usuarios u ON u.id=p.registrado_por
      WHERE p.lote_id=$1 ORDER BY p.created_at ASC`,[id]);

    const {rows:carros}=await pool.query(`
      SELECT c.*,u.nombre AS creado_por_nombre,
        COUNT(ca.id)::int AS total_cajas,COALESCE(SUM(ca.kilos_netos),0) AS kilos_totales
      FROM carros c LEFT JOIN cajas ca ON ca.carro_id=c.id
      LEFT JOIN usuarios u ON u.id=c.creado_por
      WHERE c.lote_id=$1 GROUP BY c.id,u.nombre ORDER BY c.codigo_carro ASC`,[id]);

    const {rows:historial_tuneles}=await pool.query(`
      SELECT tc.*,t.nombre AS tunel_nombre,c.codigo_carro,u.nombre AS registrado_por,
        COUNT(ca.id)::int AS cajas_en_carro
      FROM tuneles_carros tc JOIN tuneles t ON t.id=tc.tunel_id
      JOIN carros c ON c.id=tc.carro_id
      LEFT JOIN usuarios u ON u.id=tc.registrado_por
      LEFT JOIN cajas ca ON ca.carro_id=c.id
      WHERE c.lote_id=$1 GROUP BY tc.id,t.nombre,c.codigo_carro,u.nombre
      ORDER BY tc.fecha_ingreso ASC`,[id]);

    const {rows:cajas}=await pool.query(`
      SELECT ca.*,pt.nombre AS producto,cb.nombre AS calibre,c.codigo_carro,u.nombre AS registrado_por
      FROM cajas ca JOIN carros c ON c.id=ca.carro_id
      JOIN productos_tipo pt ON pt.id=ca.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=ca.calibre_id
      LEFT JOIN usuarios u ON u.id=ca.registrado_por
      WHERE ca.lote_id=$1 ORDER BY ca.numero_caja ASC`,[id]);

    // Timeline con info de recepción
    const timeline=[];
    const l=lote[0];
    if(l.hora_llegada) timeline.push({evento:"Llegada del camión",fecha:l.hora_llegada,usuario:l.recibido_por_nombre||l.creado_por_nombre,detalle:`Patente: ${l.patente_camion||"---"} · Conductor: ${l.conductor_nombre||"---"} · Empresa: ${l.empresa_transporte||"---"}`});
    timeline.push({evento:"Ingreso de lote",fecha:l.created_at,usuario:l.creado_por_nombre,detalle:`Lote ${l.codigo} — ${parseFloat(l.kilos_brutos).toLocaleString("es-CL")} kg brutos · Proveedor: ${l.proveedor_nombre||"---"}`});
    if(l.hora_inicio_descarga) timeline.push({evento:"Inicio de descarga",fecha:l.hora_inicio_descarga,usuario:l.recibido_por_nombre||l.creado_por_nombre,detalle:`Temperatura carga: ${l.temperatura_carga||"---"}°C · Estado: ${l.estado_carga||"---"}`});
    if(l.hora_fin_descarga)    timeline.push({evento:"Fin de descarga",fecha:l.hora_fin_descarga,usuario:l.recibido_por_nombre||l.creado_por_nombre,detalle:`Descarga completada`});
    pesajes.forEach(p=>timeline.push({evento:"Pesaje registrado",fecha:p.created_at,usuario:p.registrado_por,detalle:`${p.producto}${p.calibre?" "+p.calibre:""} — ${p.kilos} kg — ${p.linea||""}`}));
    carros.forEach(c=>timeline.push({evento:"Carro creado",fecha:c.created_at,usuario:c.creado_por_nombre,detalle:`Carro ${c.codigo_carro} — ${c.total_cajas} cajas — ${parseFloat(c.kilos_totales).toFixed(2)} kg`}));
    historial_tuneles.forEach(tc=>timeline.push({evento:tc.estado==="completado"?"Carro retirado de túnel":"Carro ingresado a túnel",fecha:tc.fecha_ingreso,usuario:tc.registrado_por,detalle:`${tc.codigo_carro} → ${tc.tunel_nombre}${tc.temperatura_ingreso?" ("+tc.temperatura_ingreso+"°C)":""}`}));
    timeline.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

    return res.json({lote:lote[0],pesajes,carros,historial_tuneles,cajas,timeline});
  } catch(e){console.error("traz.trazabilidadLote:",e.message);return res.status(500).json({error:"Error interno"});}
};

module.exports={buscarLotes,trazabilidadLote};