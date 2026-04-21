#!/usr/bin/env node
const pool = require('./config/db');

/**
 * Script simple para generar múltiples lotes de demo
 * Uso: node demo-data-simple.js [cantidad] [comenzar_desde]
 */
const cantidad = parseInt(process.argv[2]) || 5;
const inicio = parseInt(process.argv[3]) || 2;

async function crearLote(numero) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const codigo = `DEMO-${String(numero).padStart(3, '0')}`;
    const kilos = Math.floor(1000 + Math.random() * 1500);
    const numCajas = Math.floor(30 + Math.random() * 40);
    const numCarros = 2 + Math.floor(Math.random() * 2);
    const estado = ['pendiente', 'en_proceso', 'cerrado'][Math.floor(Math.random() * 3)];

    // 1. Crear lote
    const { rows: lotes } = await client.query(
      `INSERT INTO lotes (codigo, fecha_ingreso, kilos_brutos, estado)
       VALUES ($1, NOW() - INTERVAL '${Math.floor(Math.random() * 10)} days', $2, $3)
       RETURNING *`,
      [codigo, kilos, estado]
    );
    const lote = lotes[0];

    // 2. Crear 2-3 pesajes
    const numPesajes = 2 + Math.floor(Math.random() * 2);
    const kilosPerPesaje = Math.floor(kilos / numPesajes);
    const cajasPerPesaje = Math.floor(numCajas / numPesajes);
    
    for (let i = 1; i <= numPesajes; i++) {
      await client.query(
        `INSERT INTO pesajes (lote_id, linea_id, producto_tipo_id, calibre_id, kilos, cajas)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [lote.id, (i % 3) + 1, 1, 1, kilosPerPesaje, cajasPerPesaje]
      );
    }

    // 3. Crear cajas
    const cajas = [];
    for (let i = 1; i <= numCajas; i++) {
      const { rows: c } = await client.query(
        `INSERT INTO cajas (lote_id, numero_caja, kilos_netos, producto_tipo_id, calibre_id, fecha_elaboracion)
         VALUES ($1, $2, $3, 1, 1, CURRENT_DATE)
         RETURNING id`,
        [lote.id, `${codigo}-${String(i).padStart(3, '0')}`, Math.floor(kilos / numCajas)]
      );
      cajas.push(c[0].id);
    }

    // 4. Crear carros
    const carros = [];
    for (let i = 1; i <= numCarros; i++) {
      const { rows: c } = await client.query(
        `INSERT INTO carros (lote_id, codigo_carro, niveles, estado)
         VALUES ($1, $2, 3, $3)
         RETURNING id`,
        [lote.id, `${codigo}-C${i}`, ['cargando', 'en_tunel', 'congelado'][Math.floor(Math.random() * 3)]]
      );
      carros.push(c[0].id);
    }

    // 5. Asignar cajas a carros
    let cajaIdx = 0;
    for (let i = 0; i < carros.length; i++) {
      const cajasXcarro = i === carros.length - 1 ? cajas.length - cajaIdx : Math.floor(cajas.length / numCarros);
      const cajasAsignar = cajas.slice(cajaIdx, cajaIdx + cajasXcarro);
      
      if (cajasAsignar.length > 0) {
        const placeholders = cajasAsignar.map((_, idx) => `$${idx + 2}`).join(',');
        await client.query(
          `UPDATE cajas SET carro_id=$1 WHERE id IN (${placeholders})`,
          [carros[i], ...cajasAsignar]
        );
      }
      cajaIdx += cajasXcarro;
    }

    // 6. Registrar en túneles
    for (let i = 0; i < carros.length; i++) {
      const tunel = (i % 4) + 1;
      const tuneEstado = Math.random() > 0.5 ? 'en_tunel' : 'completado';
      await client.query(
        `INSERT INTO tuneles_carros (tunel_id, carro_id, estado, temperatura_salida)
         VALUES ($1, $2, $3, $4)`,
        [tunel, carros[i], tuneEstado, Math.floor((Math.random() * 5 - 20) * 10) / 10]
      );
    }

    // 7. Crear inventario
    await client.query(
      `INSERT INTO inventario (lote_id, producto_tipo_id, calibre_id, categoria_inv, kilos_disponibles, num_cajas, ubicacion)
       VALUES ($1, 1, 1, 'producto', $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [lote.id, Math.floor(kilos * 0.9), Math.floor(numCajas * 0.9), `Túnel ${(Math.floor(Math.random() * 4) + 1)}`]
    );

    await client.query('COMMIT');
    console.log(`✅ ${numero}/${cantidad}: ${codigo} (${kilos}kg, ${numCajas} cajas, ${numCarros} carros)`);
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`❌ Error ${numero}: ${e.message.substring(0, 60)}`);
  } finally {
    client.release();
  }
}

(async () => {
  console.log(`\n🦑 Generando ${cantidad} lotes (${inicio} al ${inicio + cantidad - 1})...\n`);
  
  for (let i = 0; i < cantidad; i++) {
    await crearLote(inicio + i);
  }
  
  console.log(`\n✅ Completado!\n`);
  process.exit(0);
})();
