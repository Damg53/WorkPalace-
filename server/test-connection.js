import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

console.log('📋 Configuración de conexión:');
console.log('Host:', process.env.DB_HOST);
console.log('Puerto:', process.env.DB_PORT);
console.log('Base de datos:', process.env.DB_NAME);
console.log('Usuario:', process.env.DB_USER);
console.log('---\n');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    console.log('🔍 Intentando conectar a PostgreSQL...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa!');
    console.log('Hora del servidor:', result.rows[0].now);

    // Verificar si la tabla existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Tabla "users" existe');
      
      // Ver estructura de la tabla
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      console.log('📊 Columnas de la tabla users:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Tabla "users" NO existe. Ejecuta server/schema.sql');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
