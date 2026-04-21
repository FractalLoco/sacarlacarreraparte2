"use strict";
const pool = require("../config/db");

const listar = async (req,res) => {
  try {
    const {categoria_inv,lote_id,nombre,producto_tipo_id}=req.query;
    let q=`
      SELECT i.*,
        pt.nombre  AS producto_tipo_nombre,
        c.nombre   AS calibre_nombre,
        l.codigo   AS lote_codigo,
        COALESCE((SELECT SUM(m.cantidad_kg) FILTER(WHERE m.tipo='entrada') FROM inventario_movimientos m WHERE m.inventario_id=i.id),0) AS total_entradas_kg,
        COALESCE((SELECT SUM(m.cantidad_kg) FILTER(WHERE m.tipo='salida')  FROM inventario_movimientos m WHERE m.inventario_id=i.id),0) AS total_salidas_kg,
        COALESCE((SELECT SUM(m.cantidad_cajas) FILTER(WHERE m.tipo='entrada') FROM inventario_movimientos m WHERE m.inventario_id=i.id),0) AS total_entradas_cajas,
        COALESCE((SELECT SUM(m.cantidad_cajas) FILTER(WHERE m.tipo='salida')  FROM inventario_movimientos m WHERE m.inventario_id=i.id),0) AS total_salidas_cajas
      FROM inventario i
      LEFT JOIN productos_tipo pt ON pt.id=i.producto_tipo_id
      LEFT JOIN calibres c        ON c.id=i.calibre_id
      LEFT JOIN lotes l           ON l.id=i.lote_id
      WHERE 1=1`;
    const p=[];
    if(categoria_inv){p.push(categoria_inv);q+=` AND i.categoria_inv=$${p.length}`;}
    if(lote_id)      {p.push(lote_id);      q+=` AND i.lote_id=$${p.length}`;}
    if(nombre)       {p.push(`%${nombre}%`);q+=` AND i.nombre_material ILIKE $${p.length}`;}
    if(producto_tipo_id){p.push(producto_tipo_id);q+=` AND i.producto_tipo_id=$${p.length}`;}
    q+=" ORDER BY i.categoria_inv ASC,i.updated_at DESC";
    const {rows}=await pool.query(q,p);
    return res.json(rows);
  } catch(e){console.error("inv.listar:",e.message);return res.status(500).json({error:"Error interno"});}
};

const listarMovimientos = async (req,res) => {
  try {
    const {inventario_id,tipo,desde,hasta,limite=200}=req.query;
    let q=`
      SELECT m.*,
        i.nombre_material,i.categoria_inv,i.unidad,
        pt.nombre AS producto_tipo_nombre,
        u.nombre  AS registrado_por_nombre,
        d.numero_guia AS despacho_guia
      FROM inventario_movimientos m
      JOIN inventario i ON i.id=m.inventario_id
      LEFT JOIN productos_tipo pt ON pt.id=i.producto_tipo_id
      LEFT JOIN usuarios u ON u.id=m.registrado_por
      LEFT JOIN despachos d ON d.id=m.despacho_id
      WHERE 1=1`;
    const p=[];
    if(inventario_id){p.push(inventario_id);q+=` AND m.inventario_id=$${p.length}`;}
    if(tipo)         {p.push(tipo);         q+=` AND m.tipo=$${p.length}`;}
    if(desde)        {p.push(desde);        q+=` AND m.fecha>=$${p.length}`;}
    if(hasta)        {p.push(hasta);        q+=` AND m.fecha<=$${p.length}`;}
    q+=` ORDER BY m.created_at DESC LIMIT ${parseInt(limite)||200}`;
    const {rows}=await pool.query(q,p);
    return res.json(rows);
  } catch(e){return res.status(500).json({error:"Error interno"});}
};

// ── CREAR ENTRADA DE INVENTARIO ──────────────────────────────
// Si viene con carro_id: los kg y cajas se calculan EXACTAMENTE
// desde la base de datos (suma real de cajas del carro).
// Si viene sin carro_id: usa lo que el operador ingresó.
const crear = async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      carro_id,
      lote_id, producto_tipo_id, calibre_id,
      nombre_material, unidad, categoria_inv,
      kilos_disponibles, num_cajas, ubicacion,
    } = req.body;

    let kg_final   = parseFloat(kilos_disponibles || 0);
    let cajas_final = parseInt(num_cajas || 0);
    let lote_final  = lote_id;

    // ── Si viene de un carro: recalcular kg y cajas EXACTOS desde las cajas reales
    if (carro_id) {
      // Kg exactos = suma de kilos_netos de todas las cajas del carro
      const {rows: resKg} = await client.query(
        `SELECT COALESCE(SUM(kilos_netos),0)::numeric AS kg_real,
                COUNT(*)::int AS cajas_real,
                MIN(lote_id)  AS lote_id_real
         FROM cajas WHERE carro_id = $1`,
        [carro_id]
      );
      if (!resKg.length || resKg[0].cajas_real === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({error:"El carro no tiene cajas registradas"});
      }
      kg_final    = parseFloat(resKg[0].kg_real);
      cajas_final = parseInt(resKg[0].cajas_real);
      lote_final  = lote_final || resKg[0].lote_id_real;

      // Marcar todas las cajas del carro como en_inventario = true
      await client.query(
        "UPDATE cajas SET en_inventario=true WHERE carro_id=$1",
        [carro_id]
      );
    }

    if (kg_final < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({error:"Los kg no pueden ser negativos"});
    }

    let inventario_id;

    if (categoria_inv === "producto" && lote_final && producto_tipo_id) {
      const {rows} = await client.query(
        `INSERT INTO inventario(lote_id,producto_tipo_id,calibre_id,kilos_disponibles,num_cajas,categoria_inv,unidad,ubicacion)
         VALUES($1,$2,$3,$4,$5,'producto','kg',$6)
         ON CONFLICT(lote_id,producto_tipo_id,calibre_id)
         DO UPDATE SET
           kilos_disponibles = inventario.kilos_disponibles + EXCLUDED.kilos_disponibles,
           num_cajas         = inventario.num_cajas + EXCLUDED.num_cajas,
           updated_at        = NOW()
         RETURNING *`,
        [lote_final, producto_tipo_id, calibre_id||null, kg_final, cajas_final, ubicacion||null]
      );
      inventario_id = rows[0].id;

      // Registrar movimiento de entrada
      if (kg_final > 0 || cajas_final > 0) {
        const motivo = carro_id
          ? `Ingreso de carro #${carro_id} (${cajas_final} cajas, ${kg_final.toFixed(2)} kg exactos)`
          : "Ingreso manual";
        await client.query(
          `INSERT INTO inventario_movimientos
             (inventario_id,tipo,cantidad_kg,cantidad_cajas,motivo,fecha,registrado_por,carro_id)
           VALUES($1,'entrada',$2,$3,$4,CURRENT_DATE,$5,$6)`,
          [inventario_id, kg_final, cajas_final, motivo, req.usuario.id, carro_id||null]
        );
      }

      await client.query("COMMIT");
      return res.status(201).json({...rows[0], kg_ingresado: kg_final, cajas_ingresadas: cajas_final});

    } else {
      // Material u otro
      if (!nombre_material) {
        await client.query("ROLLBACK");
        return res.status(400).json({error:"nombre_material es requerido para materiales"});
      }
      const {rows} = await client.query(
        `INSERT INTO inventario(nombre_material,unidad,categoria_inv,kilos_disponibles,num_cajas,ubicacion)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [nombre_material, unidad||'unid', categoria_inv||'material', kg_final, cajas_final, ubicacion||null]
      );
      inventario_id = rows[0].id;
      if (kg_final > 0 || cajas_final > 0) {
        await client.query(
          `INSERT INTO inventario_movimientos
             (inventario_id,tipo,cantidad_kg,cantidad_cajas,motivo,fecha,registrado_por)
           VALUES($1,'entrada',$2,$3,'Ingreso inicial',CURRENT_DATE,$4)`,
          [inventario_id, kg_final, cajas_final, req.usuario.id]
        );
      }
      await client.query("COMMIT");
      return res.status(201).json(rows[0]);
    }
  } catch(e) {
    await client.query("ROLLBACK");
    console.error("inv.crear:", e.message);
    return res.status(500).json({error:"Error interno: "+e.message});
  } finally { client.release(); }
};

const registrarMovimiento = async (req,res) => {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const {tipo,cantidad_kg,cantidad_cajas,motivo,documento,fecha}=req.body;
    const id=req.params.id;
    if(!tipo) return res.status(400).json({error:"tipo requerido"});
    if(!["entrada","salida"].includes(tipo)) return res.status(400).json({error:"tipo debe ser entrada o salida"});
    const kg=parseFloat(cantidad_kg||0);
    const cajas=parseInt(cantidad_cajas||0);
    if(kg<0||cajas<0) return res.status(400).json({error:"Las cantidades no pueden ser negativas"});
    if(kg===0&&cajas===0) return res.status(400).json({error:"Debe especificar al menos kg o cajas"});
    const {rows:item}=await client.query("SELECT * FROM inventario WHERE id=$1 FOR UPDATE",[id]);
    if(!item.length) return res.status(404).json({error:"Item no encontrado"});
    const actual_kg=parseFloat(item[0].kilos_disponibles);
    const actual_cajas=parseInt(item[0].num_cajas);
    if(tipo==="salida"){
      if(kg>0&&actual_kg<kg)
        return res.status(400).json({error:`Kg insuficientes. Disponible: ${parseFloat(actual_kg).toFixed(2)} kg`});
      if(cajas>0&&actual_cajas<cajas)
        return res.status(400).json({error:`Cajas insuficientes. Disponibles: ${actual_cajas}`});
    }
    const nuevo_kg    = tipo==="entrada" ? actual_kg+kg    : actual_kg-kg;
    const nuevo_cajas = tipo==="entrada" ? actual_cajas+cajas : actual_cajas-cajas;
    await client.query(
      "UPDATE inventario SET kilos_disponibles=$1,num_cajas=$2,updated_at=NOW() WHERE id=$3",
      [nuevo_kg, nuevo_cajas, id]
    );
    const {rows}=await client.query(
      `INSERT INTO inventario_movimientos
         (inventario_id,tipo,cantidad_kg,cantidad_cajas,motivo,documento,fecha,registrado_por)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id,tipo,kg,cajas,motivo||null,documento||null,fecha||new Date(),req.usuario.id]
    );
    await client.query("COMMIT");
    return res.status(201).json(rows[0]);
  } catch(e){
    await client.query("ROLLBACK");
    return res.status(500).json({error:"Error: "+e.message});
  } finally{client.release();}
};

const ajustar = async (req,res) => {
  try {
    const {kilos_disponibles,num_cajas,ubicacion,observacion,nombre_material,unidad}=req.body;
    const {rows}=await pool.query(
      `UPDATE inventario SET kilos_disponibles=$1,num_cajas=$2,ubicacion=$3,observacion=$4,
       nombre_material=COALESCE($5,nombre_material),unidad=COALESCE($6,unidad),updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [kilos_disponibles,num_cajas||0,ubicacion,observacion,nombre_material||null,unidad||null,req.params.id]
    );
    if(!rows.length) return res.status(404).json({error:"Item no encontrado"});
    return res.json(rows[0]);
  } catch(e){return res.status(500).json({error:"Error interno"});}
};

module.exports={listar,listarMovimientos,crear,registrarMovimiento,ajustar};
