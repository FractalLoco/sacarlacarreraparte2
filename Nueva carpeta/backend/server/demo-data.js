const pool = require('./config/db');

/**
 * Script para generar datos de demo
 * Crea: 1 lote → 3 pesajes (auto-cajas) → asignar a carros → registros en tuneles_carros
 */
(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear lote
    const { rows: lotes } = await client.query(
      `INSERT INTO lotes (codigo, fecha_ingreso, kilos_brutos, estado)
       VALUES ($1, NOW(), $2, 'en_proceso')
       RETURNING *`,
      ['DEMO-001', 1500]
    );
    const lote = lotes[0];
    console.log('✓ Lote creado:', lote.codigo);

    // 2. Crear 3 pesajes (500 kg cada uno)
    for (let i = 1; i <= 3; i++) {
      await client.query(
        `INSERT INTO pesajes (lote_id, linea_id, producto_tipo_id, calibre_id, kilos, cajas)
         VALUES ($1, 1, 1, 1, 500, 10)`,
        [lote.id]
      );
    }
    console.log('✓ 3 pesajes creados (500kg cada uno)');

    // 3. Crear 50 cajas manualmente
    const cajas = [];
    for (let i = 1; i <= 50; i++) {
      const { rows: c } = await client.query(
        `INSERT INTO cajas (lote_id, numero_caja, kilos_netos, producto_tipo_id, calibre_id, fecha_elaboracion)
         VALUES ($1, $2, 30, 1, 1, CURRENT_DATE)
         RETURNING id`,
        [lote.id, `DEMO-001-${String(i).padStart(3, '0')}`]
      );
      cajas.push(c[0].id);
    }
    console.log(`✓ ${cajas.length} cajas generadas (30kg cada una)`);

    // 4. Crear 3 carros
    const carros = [];
    for (let i = 1; i <= 3; i++) {
      const { rows: c } = await client.query(
        `INSERT INTO carros (lote_id, codigo_carro, niveles, estado)
         VALUES ($1, $2, 3, 'cargando')
         RETURNING id`,
        [lote.id, `DEMO-C-${i.toString().padStart(3, '0')}`]
      );
      carros.push(c[0].id);
    }
    console.log(`✓ ${carros.length} carros creados`);

    // 5. Asignar cajas a carros (16-17 cajas por carro)
    let caja_idx = 0;
    for (let i = 0; i < carros.length; i++) {
      const cajas_por_carro = i === carros.length - 1 ? cajas.length - caja_idx : 16;
      const cajas_asignar = cajas.slice(caja_idx, caja_idx + cajas_por_carro);
      
      const ids = cajas_asignar;
      const placeholders = ids.map((_, idx) => `$${idx + 2}`).join(',');
      
      await client.query(
        `UPDATE cajas SET carro_id=$1 WHERE id IN (${placeholders})`,
        [carros[i], ...ids]
      );
      
      console.log(`✓ Carro ${i + 1}: ${cajas_asignar.length} cajas asignadas`);
      caja_idx += cajas_por_carro;
    }

    // 6. Registrar carros en túnel (para tracking de temperatura)
    for (let i = 0; i < carros.length; i++) {
      await client.query(
        `INSERT INTO tuneles_carros (tunel_id, carro_id, estado, temperatura_salida)
         VALUES (1, $1, 'completado', -18.5)`,
        [carros[i]]
      );
    }
    console.log(`✓ ${carros.length} carros registrados en tunel_carros`);

    // 7. Crear registros de inventario (cuando se congelan carros)
    for (let i = 0; i < carros.length; i++) {
      await client.query(
        `INSERT INTO inventario (lote_id, producto_tipo_id, calibre_id, categoria_inv, kilos_disponibles, num_cajas, ubicacion)
         VALUES ($1, 1, 1, 'producto', 480, 16, $2)
         ON CONFLICT DO NOTHING`,
        [lote.id, `Túnel 1 - Carro ${i + 1}`]
      );
    }
    console.log(`✓ ${carros.length} registros de inventario creados`);

    await client.query('COMMIT');
    console.log('\n✅ DEMO DATA CREADO EXITOSAMENTE\n');
    console.log('Puedes ahora:');
    console.log('  1. Ver lote DEMO-001 en "Lotes"');
    console.log('  2. Ver pesajes en "Pesajes"');
    console.log('  3. Ver cajas en "Imprimir Etiquetas"');
    console.log('  4. Ver carros congelados en "Cargar Carros"');
    console.log('  5. Ver inventario en "Inventario"');
    
    process.exit(0);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    client.release();
  }
})();
