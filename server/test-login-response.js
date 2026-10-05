import pool from './db.js';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';

dotenv.config();

async function testLogin() {
  try {
    console.log('🧪 Test de Login...\n');

    // 1. Obtener usuario admin
    const result = await pool.query(
      'SELECT id, username, email, password, role FROM users WHERE role = $1',
      ['admin']
    );

    if (result.rows.length === 0) {
      console.log('❌ No hay usuario admin en la BD');
      await pool.end();
      return;
    }

    const adminUser = result.rows[0];
    console.log('👤 Usuario admin encontrado:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Password hash: ${adminUser.password.substring(0, 20)}...\n`);

    // 2. Simular los datos que devolvería en un login exitoso
    console.log('📨 Datos que devolvería el endpoint /api/login:');
    const loginResponse = {
      message: '✅ Sesión iniciada exitosamente',
      user: {
        id: adminUser.id,
        username: adminUser.username,
        fullName: adminUser.full_name,
        email: adminUser.email,
        role: adminUser.role
      }
    };
    console.log(JSON.stringify(loginResponse, null, 2));

    console.log('\n✅ Test completado! El role devuelto es: "' + adminUser.role + '"');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testLogin();
