"use strict";
const path=require("path");
const pool=require("../config/db");
const LOGO_PATH=path.join(__dirname,"../assets/logo.jpg");

const listar=async(req,res)=>{
  try{
    const {estado,fecha_desde,fecha_hasta,q}=req.query;
    let sql=`
      SELECT d.*,cl.nombre AS cliente_nombre_reg,cl.rut AS cliente_rut_reg,
        co.nombre AS conductor_nombre,u.nombre AS creado_por_nombre,
        COUNT(di.id)::int AS total_items,
        COALESCE(SUM(di.cantidad_kg),0) AS total_kg,
        COALESCE(SUM(di.cantidad_cajas),0) AS total_cajas
      FROM despachos d
      LEFT JOIN clientes cl ON cl.id=d.cliente_id
      LEFT JOIN conductores co ON co.id=d.conductor_id
      LEFT JOIN usuarios u ON u.id=d.creado_por
      LEFT JOIN despacho_items di ON di.despacho_id=d.id
      WHERE 1=1`;
    const p=[];
    if(estado){p.push(estado);sql+=` AND d.estado=$${p.length}`;}
    if(fecha_desde){p.push(fecha_desde);sql+=` AND d.fecha_despacho>=$${p.length}`;}
    if(fecha_hasta){p.push(fecha_hasta);sql+=` AND d.fecha_despacho<=$${p.length}`;}
    if(q){p.push(`%${q}%`);sql+=` AND (d.numero_guia ILIKE $${p.length} OR COALESCE(d.cliente_nombre,cl.nombre,'') ILIKE $${p.length})`;}
    sql+=" GROUP BY d.id,cl.nombre,cl.rut,co.nombre,u.nombre ORDER BY d.fecha_despacho DESC,d.created_at DESC";
    const {rows}=await pool.query(sql,p);
    return res.json(rows);
  }catch(e){return res.status(500).json({error:"Error: "+e.message});}
};

const obtener=async(req,res)=>{
  try{
    const {rows:d}=await pool.query(`
      SELECT d.*,cl.nombre AS cliente_nombre_reg,cl.rut AS cliente_rut_reg,cl.telefono AS cliente_telefono,
        co.nombre AS conductor_nombre,co.rut AS conductor_rut,u.nombre AS creado_por_nombre
      FROM despachos d
      LEFT JOIN clientes cl ON cl.id=d.cliente_id
      LEFT JOIN conductores co ON co.id=d.conductor_id
      LEFT JOIN usuarios u ON u.id=d.creado_por
      WHERE d.id=$1`,[req.params.id]);
    if(!d.length) return res.status(404).json({error:"Despacho no encontrado"});
    const {rows:items}=await pool.query(`
      SELECT di.*,pt.nombre AS producto_tipo_nombre,cb.nombre AS calibre_nombre,l.codigo AS lote_codigo
      FROM despacho_items di
      LEFT JOIN productos_tipo pt ON pt.id=di.producto_tipo_id
      LEFT JOIN calibres cb ON cb.id=di.calibre_id
      LEFT JOIN lotes l ON l.id=di.lote_id
      WHERE di.despacho_id=$1 ORDER BY di.id ASC`,[req.params.id]);
    return res.json({...d[0],items});
  }catch(e){return res.status(500).json({error:"Error: "+e.message});}
};

const listarClientes=async(req,res)=>{
  try{
    const {rows}=await pool.query("SELECT * FROM clientes WHERE activo=true ORDER BY nombre ASC");
    return res.json(rows);
  }catch(e){return res.status(500).json({error:"Error interno"});}
};

const crearCliente=async(req,res)=>{
  try{
    const {rut,nombre,contacto,telefono,email,direccion}=req.body;
    if(!nombre) return res.status(400).json({error:"nombre es requerido"});
    const {rows}=await pool.query(
      `INSERT INTO clientes(rut,nombre,contacto,telefono,email,direccion) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [rut||null,nombre,contacto||null,telefono||null,email||null,direccion||null]
    );
    return res.status(201).json(rows[0]);
  }catch(e){return res.status(500).json({error:"Error: "+e.message});}
};

const crear=async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const {
      numero_guia,fecha_despacho,cliente_id,cliente_nombre,cliente_rut,destino,
      conductor_id,patente_camion,empresa_transporte,temperatura_despacho,observacion,
      items // [{inventario_id, cantidad_kg, cantidad_cajas, nombre_item, precio_unitario}]
    }=req.body;
    if(!numero_guia) return res.status(400).json({error:"numero_guia es requerido"});
    if(!items||!items.length) return res.status(400).json({error:"Debe incluir al menos un item"});

    // Crear despacho
    const {rows:d}=await client.query(`
      INSERT INTO despachos(numero_guia,fecha_despacho,cliente_id,cliente_nombre,cliente_rut,destino,
        conductor_id,patente_camion,empresa_transporte,temperatura_despacho,observacion,estado,creado_por)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pendiente',$12) RETURNING *`,
      [numero_guia,fecha_despacho||new Date(),cliente_id||null,cliente_nombre||null,cliente_rut||null,destino||null,
       conductor_id||null,patente_camion||null,empresa_transporte||null,temperatura_despacho||null,observacion||null,req.usuario.id]
    );
    const despacho_id=d[0].id;

    // Procesar items: descontar del inventario
    for(const item of items){
      const kg=parseFloat(item.cantidad_kg||0);
      const cajas=parseInt(item.cantidad_cajas||0);
      if(kg<0||cajas<0) throw new Error("Cantidades no pueden ser negativas");

      // Verificar stock
      const {rows:inv}=await client.query("SELECT * FROM inventario WHERE id=$1 FOR UPDATE",[item.inventario_id]);
      if(!inv.length) throw new Error(`Item de inventario ${item.inventario_id} no encontrado`);
      if(kg>0&&parseFloat(inv[0].kilos_disponibles)<kg) throw new Error(`Stock insuficiente de ${inv[0].producto_tipo_id||inv[0].nombre_material}: ${inv[0].kilos_disponibles} kg disponibles`);
      if(cajas>0&&parseInt(inv[0].num_cajas)<cajas) throw new Error(`Cajas insuficientes: ${inv[0].num_cajas} disponibles`);

      // Descontar inventario
      await client.query(
        "UPDATE inventario SET kilos_disponibles=kilos_disponibles-$1,num_cajas=num_cajas-$2,updated_at=NOW() WHERE id=$3",
        [kg,cajas,item.inventario_id]
      );

      // Registrar movimiento de salida
      await client.query(`
        INSERT INTO inventario_movimientos(inventario_id,tipo,cantidad_kg,cantidad_cajas,motivo,documento,fecha,registrado_por,despacho_id)
        VALUES($1,'salida',$2,$3,'Despacho',$4,CURRENT_DATE,$5,$6)`,
        [item.inventario_id,kg,cajas,numero_guia,req.usuario.id,despacho_id]
      );

      // Item en despacho
      await client.query(`
        INSERT INTO despacho_items(despacho_id,inventario_id,lote_id,producto_tipo_id,calibre_id,nombre_item,cantidad_kg,cantidad_cajas,precio_unitario)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [despacho_id,item.inventario_id,inv[0].lote_id,inv[0].producto_tipo_id,inv[0].calibre_id,
         item.nombre_item||inv[0].nombre_material||null,kg,cajas,item.precio_unitario||null]
      );
    }

    await client.query("UPDATE despachos SET estado='despachado' WHERE id=$1",[despacho_id]);
    await client.query("COMMIT");
    return res.status(201).json({...d[0],estado:'despachado'});
  }catch(e){
    await client.query("ROLLBACK");
    return res.status(400).json({error:e.message});
  }finally{client.release();}
};

const guiaPDF=async(req,res)=>{
  try{
    const PDFDoc=require("pdfkit");
    const despacho=await obtenerCompleto(req.params.id);
    if(!despacho) return res.status(404).json({error:"Despacho no encontrado"});
    const doc=new PDFDoc({size:"A4",margin:35});
    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",`attachment; filename="Guia-Despacho-${despacho.numero_guia}-${new Date().toISOString().slice(0,10)}.pdf"`);
    doc.pipe(res);
    const fmtN=n=>parseFloat(n||0).toLocaleString("es-CL",{minimumFractionDigits:2});
    const fmtF=d=>d?new Date(d).toLocaleDateString("es-CL"):"---";
    const AZUL="#0d2260";
    // Logo
    try{doc.image(LOGO_PATH,35,30,{height:60,fit:[60,60]});}catch(e){}
    // Encabezado
    doc.fontSize(14).font("Helvetica-Bold").fillColor(AZUL).text("PROCESADORA TR3S AL MAR LTDA",110,35,{width:350});
    doc.fontSize(9).font("Helvetica").fillColor("#475569").text("La calidad en tus manos",110,52);
    doc.fontSize(11).font("Helvetica-Bold").fillColor(AZUL).text("GUÍA DE DESPACHO",110,65,{width:350,align:"right"});
    doc.fontSize(18).font("Helvetica-Bold").fillColor(AZUL).text(`N° ${despacho.numero_guia}`,110,78,{width:350,align:"right"});
    let y=110;
    doc.rect(35,y,525,1.5).fill(AZUL);y+=12;
    // Info despacho
    [[`Fecha Despacho:`,fmtF(despacho.fecha_despacho)],[`Cliente:`,despacho.cliente_nombre||despacho.cliente_nombre_reg||"---"],[`RUT Cliente:`,despacho.cliente_rut||despacho.cliente_rut_reg||"---"],[`Destino:`,despacho.destino||"---"],[`Conductor:`,despacho.conductor_nombre||"---"],[`Patente Camión:`,despacho.patente_camion||"---"],[`Empresa Transporte:`,despacho.empresa_transporte||"---"],[`T° Despacho:`,despacho.temperatura_despacho?`${despacho.temperatura_despacho}°C`:"---"]].forEach(([l,v])=>{
      doc.fontSize(9).font("Helvetica-Bold").fillColor(AZUL).text(l,35,y,{width:150});
      doc.font("Helvetica").fillColor("#1e293b").text(v,190,y,{width:370});y+=14;
    });
    y+=10;
    doc.rect(35,y,525,1).fill("#e2e8f0");y+=10;
    // Tabla items
    doc.rect(35,y,525,16).fill(AZUL);
    doc.fillColor("white").fontSize(8.5).font("Helvetica-Bold");
    ["Producto/Item","Lote","Kg","Cajas","Precio"].forEach((h,i)=>{
      const xs=[38,200,280,340,400];const ws=[158,76,56,56,160];
      doc.text(h,xs[i],y+4,{width:ws[i],align:i>1?"center":"left"});
    });y+=16;
    let totalKg=0,totalCajas=0;
    despacho.items.forEach((it,idx)=>{
      doc.rect(35,y,525,14).fill(idx%2===0?"white":"#f0f5ff").stroke("#e2e8f0");
      const nombre=it.nombre_item||(it.producto_tipo_nombre||(it.calibre_nombre?` ${it.calibre_nombre}`:""))||"---";
      doc.fillColor("#1e293b").font("Helvetica").fontSize(8)
        .text(nombre,38,y+3,{width:158})
        .text(it.lote_codigo||"---",200,y+3,{width:76})
        .text(fmtN(it.cantidad_kg),280,y+3,{width:56,align:"center"})
        .text(String(it.cantidad_cajas||0),340,y+3,{width:56,align:"center"})
        .text(it.precio_unitario?`$${fmtN(it.precio_unitario)}`:"-",400,y+3,{width:156,align:"right"});
      totalKg+=parseFloat(it.cantidad_kg||0);totalCajas+=parseInt(it.cantidad_cajas||0);
      y+=14;
    });
    // Totales
    doc.rect(35,y,525,16).fill("#dbeafe").stroke("#93c5fd");
    doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(9)
      .text("TOTALES",38,y+4,{width:158})
      .text(fmtN(totalKg)+" kg",280,y+4,{width:56,align:"center"})
      .text(String(totalCajas)+" cajas",340,y+4,{width:56,align:"center"});
    y+=30;
    if(despacho.observacion){
      doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(8.5).text("Observación:",35,y);
      doc.fillColor("#1e293b").font("Helvetica").text(despacho.observacion,35,y+12,{width:525});
      y+=30;
    }
    // Firmas
    y=doc.page.height-120;
    doc.rect(35,y,240,55).stroke("#94a3b8");
    doc.rect(320,y,240,55).stroke("#94a3b8");
    doc.fillColor("#1e293b").font("Helvetica").fontSize(8)
      .text("Firma Responsable Despacho",35,y+60,{width:240,align:"center"})
      .text("Firma Receptor / Cliente",320,y+60,{width:240,align:"center"});
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7)
      .text(`Generado: ${new Date().toLocaleString("es-CL")} | TR3S AL MAR — Sistema de Producción v5`,35,doc.page.height-30,{width:525,align:"center"});
    doc.end();
  }catch(e){console.error("despacho.guiaPDF:",e.message);return res.status(500).json({error:"Error al generar PDF"});}
};

const obtenerCompleto=async(id)=>{
  const {rows:d}=await pool.query(`
    SELECT d.*,cl.nombre AS cliente_nombre_reg,cl.rut AS cliente_rut_reg,
      co.nombre AS conductor_nombre,u.nombre AS creado_por_nombre
    FROM despachos d LEFT JOIN clientes cl ON cl.id=d.cliente_id
    LEFT JOIN conductores co ON co.id=d.conductor_id
    LEFT JOIN usuarios u ON u.id=d.creado_por WHERE d.id=$1`,[id]);
  if(!d.length) return null;
  const {rows:items}=await pool.query(`
    SELECT di.*,pt.nombre AS producto_tipo_nombre,cb.nombre AS calibre_nombre,l.codigo AS lote_codigo
    FROM despacho_items di
    LEFT JOIN productos_tipo pt ON pt.id=di.producto_tipo_id
    LEFT JOIN calibres cb ON cb.id=di.calibre_id LEFT JOIN lotes l ON l.id=di.lote_id
    WHERE di.despacho_id=$1 ORDER BY di.id`,[id]);
  return {...d[0],items};
};

module.exports={listar,obtener,listarClientes,crearCliente,crear,guiaPDF};