import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

async function testLogin() {
  try {
    console.log('🔍 Probando conexión de login...\n');

    // Verificar que hay usuarios en la BD
    const users = await pool.query('SELECT username, email FROM users LIMIT 5');
    
    if (users.rows.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      console.log('\nCrea un usuario primero con Signup o SQL:');
      console.log('INSERT INTO users (full_name, email, username, password) VALUES (\'Test\', \'test@email.com\', \'testuser\', \'password123\');');
      await pool.end();
      return;
    }

    console.log('✅ Usuarios encontrados en la BD:');
    users.rows.forEach(user => {
      console.log(`  - Username: ${user.username}, Email: ${user.email}`);
    });

    console.log('\n📌 API endpoint: http://localhost:3001/api/login');
    console.log('📌 Método: POST');
    console.log('📌 Body:');
    console.log(JSON.stringify({
      username: users.rows[0].username,
      password: 'tu_contraseña_aqui'
    }, null, 2));

    console.log('\n💡 Usa Postman o curl para probar:');
    console.log(`curl -X POST http://localhost:3001/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"${users.rows[0].username}","password":"tu_contraseña"}'`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testLogin();
