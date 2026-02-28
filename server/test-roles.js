import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRoles() {
  try {
    console.log('🧪 Probando funcionalidad de roles...\n');

    // 1. Verificar estructura de tabla
    console.log('1️⃣ Verificando estructura de la tabla users:');
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    columns.rows.forEach(col => {
      const def = col.column_default ? ` [DEFAULT: ${col.column_default}]` : '';
      console.log(`   ✓ ${col.column_name}: ${col.data_type}${def}`);
    });

    // 2. Verificar que role existe
    const hasRole = columns.rows.some(col => col.column_name === 'role');
    if (hasRole) {
      console.log('   ✅ Columna role encontrada\n');
    } else {
      console.log('   ❌ Columna role NO ENCONTRADA\n');
      await pool.end();
      return;
    }

    // 3. Verificar roles de usuarios actuales
    console.log('2️⃣ Roles de usuarios actuales:');
    const users = await pool.query('SELECT id, username, email, role FROM users');
    
    if (users.rows.length === 0) {
      console.log('   No hay usuarios en la BD\n');
    } else {
      users.rows.forEach(user => {
        console.log(`   ✓ ${user.username} (${user.email}): rol = "${user.role}"`);
      });
      console.log('');
    }

    // 4. Simular login
    if (users.rows.length > 0) {
      console.log('3️⃣ Simulando login con primer usuario:');
      const testUser = users.rows[0];
      console.log(`   Username: ${testUser.username}`);
      console.log(`   Role: ${testUser.role}`);
      console.log(`   Email: ${testUser.email}`);
      console.log('   ✅ Login devolvería:', { username: testUser.username, role: testUser.role });
    }

    console.log('\n✅ ¡Test completado!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testRoles();
