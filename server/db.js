
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool:', err);
});

pool.on('connect', () => {
  console.log('✅ Cliente conectado al pool');
});

// Test de conexión al iniciar
(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Base de datos conectada correctamente');
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
})();

export default pool;
