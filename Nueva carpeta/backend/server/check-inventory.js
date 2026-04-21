const pool = require('./config/db');

(async () => {
  try {
    const inv = await pool.query('SELECT COUNT(*) as count FROM inventario');
    console.log('Inventario records:', inv.rows[0].count);
    
    const cajas = await pool.query('SELECT COUNT(*) as count FROM cajas');
    console.log('Cajas records:', cajas.rows[0].count);
    
    const carros = await pool.query(`SELECT COUNT(*) as count FROM tuneles_carros WHERE estado='congelado'`);
    console.log('Frozen carros:', carros.rows[0].count);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
