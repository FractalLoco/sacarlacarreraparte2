#!/usr/bin/env node
const pool = require('./config/db');

/**
 * Script para generar múltiples lotes de demo
 * Uso: node demo-data-bulk.js [cantidad]
 */
const cantidad = parseInt(process.argv[2]) || 5;

async function crearLote(numero) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const codigo = `DEMO-${String(numero).padStart(3, '0')}`;
    const kilos = 1000 + Math.random() * 1000;

    // 1. Crear lote
    const { rows: lotes } = await client.query(
      `INSERT INTO lotes (codigo, fecha_ingreso, kilos_brutos, estado)
       VALUES ($1, NOW() - INTERVAL '${Math.floor(Math.random() * 7)} days', $2, $3)
       RETURNING *`,
      [codigo, kilos, ['pendiente', 'en_proceso', 'cerrado'][Math.floor(Math.random() * 3)]]
    );
    const lote = lotes[0];

    // 2. Crear 2-4 pesajes
    const numPesajes = 2 + Math.floor(Math.random() * 3);
    const kilosPerPesaje = Math.floor(kilos / numPesajes);
    for (let i = 1; i <= numPesajes; i++) {
      await client.query(
        `INSERT INTO pesajes (lote_id, linea_id, producto_tipo_id, calibre_id, kilos, cajas)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [lote.id, (i % 3) + 1, 1, 1, kilosPerPesaje, Math.floor(kilosPerPesaje / 30)]
      );
    }

    // 3. Crear 30-60 cajas
    const numCajas = 30 + Math.floor(Math.random() * 31);
    const cajas = [];
    for (let i = 1; i <= numCajas; i++) {
      const { rows: c } = await client.query(
        `INSERT INTO cajas (lote_id, numero_caja, kilos_netos, producto_tipo_id, calibre_id, fecha_elaboracion)
         VALUES ($1, $2, $3, 1, 1, CURRENT_DATE - INTERVAL '${Math.floor(Math.random() * 3)} days')
         RETURNING id`,
        [lote.id, `${codigo}-${String(i).padStart(3, '0')}`, 25 + Math.random() * 10]
      );
      cajas.push(c[0].id);
    }

    // 4. Crear 2-4 carros
    const numCarros = 2 + Math.floor(Math.random() * 3);
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
    let caja_idx = 0;
    for (let i = 0; i < carros.length; i++) {
      const cajas_por_carro = i === carros.length - 1 ? cajas.length - caja_idx : Math.ceil((cajas.length - caja_idx) / (carros.length - i));
      const cajas_asignar = cajas.slice(caja_idx, caja_idx + cajas_por_carro);
      
      if (cajas_asignar.length > 0) {
        const placeholders = cajas_asignar.map((_, idx) => `$${idx + 2}`).join(',');
        await client.query(
          `UPDATE cajas SET carro_id=$1 WHERE id IN (${placeholders})`,
          [carros[i], ...cajas_asignar]
        );
      }
      caja_idx += cajas_por_carro;
    }

    // 6. Registrar carros en túnel
    for (let i = 0; i < carros.length; i++) {
      const tunel = (i % 4) + 1;
      const estado = Math.random() > 0.5 ? 'en_tunel' : 'completado';
      await client.query(
        `INSERT INTO tuneles_carros (tunel_id, carro_id, estado, temperatura_salida)
         VALUES ($1, $2, $3, $4)`,
        [tunel, carros[i], estado, -18 - Math.random() * 5]
      );
    }

    // 7. Crear registros de inventario
    for (let i = 0; i < carros.length; i++) {
      await client.query(
        `INSERT INTO inventario (lote_id, producto_tipo_id, calibre_id, categoria_inv, kilos_disponibles, num_cajas, ubicacion)
         VALUES ($1, 1, 1, 'producto', $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [lote.id, kilos * 0.85, numCajas * 0.8, `Túnel ${((i % 4) + 1)} - Carro ${i + 1}`]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Lote ${numero}/${cantidad} creado: ${codigo} (${Math.floor(kilos)}kg, ${numCajas} cajas)`);
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`❌ Error en lote ${numero}:`, e.message);
  } finally {
    client.release();
  }
}

(async () => {
  console.log(`\n🦑 TR3S AL MAR — Generando ${cantidad} lotes de prueba...\n`);
  
  for (let i = 2; i <= cantidad + 1; i++) {
    await crearLote(i);
  }
  
  console.log(`\n✅ ${cantidad} lotes generados exitosamente!\n`);
  process.exit(0);
})();
