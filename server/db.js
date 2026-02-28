
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Pool para conectarse a la BD de sistema (para crear DB)
const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Pool principal
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

// Función para crear la base de datos si no existe
async function createDatabaseIfNotExists() {
  const client = await adminPool.connect();
  try {
    console.log('🔍 Verificando si la base de datos existe...');
    
    // Verificar si la base de datos existe
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Base de datos "${process.env.DB_NAME}" no existe. Creándola...`);
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log(`✅ Base de datos "${process.env.DB_NAME}" creada exitosamente`);
    } else {
      console.log(`✅ Base de datos "${process.env.DB_NAME}" ya existe`);
    }
  } catch (err) {
    console.error('❌ Error al crear la base de datos:', err.message);
    throw err;
  } finally {
    client.release();
    await adminPool.end();
  }
}

// Función para crear las tablas
async function createTablesIfNotExist() {
  try {
    console.log('🔨 Verificando tablas...');

    // Crear tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla "users" verificada/creada');

    // Crear índices
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
    console.log('✅ Índices verificados/creados');

    // ensure role column exists (migration for older installations)
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
    `);
    console.log('✅ Columna role verificada/creada en users');

    // Crear tabla de reservas (estilo Airbnb / hoteles)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hotel VARCHAR(255) NOT NULL,
        tipo_alojamiento VARCHAR(100) NOT NULL,
        ubicacion VARCHAR(255) NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        huespedes INT NOT NULL DEFAULT 1,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);');
    console.log('✅ Tabla "reservations" verificada/creada');

    // Seed inicial de reservas si la tabla está vacía
    const countRes = await pool.query('SELECT COUNT(*) AS total FROM reservations');
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    if (total === 0) {
      const firstUser = await pool.query('SELECT id FROM users ORDER BY id LIMIT 1');
      if (firstUser.rows.length > 0) {
        const uid = firstUser.rows[0].id;
        await pool.query(`
          INSERT INTO reservations (user_id, hotel, tipo_alojamiento, ubicacion, check_in, check_out, huespedes, estado)
          VALUES
            ($1, 'Casa Verde Medellín', 'Casa entera', 'El Poblado, Medellín', '2026-03-15', '2026-03-18', 4, 'confirmada'),
            ($1, 'Loft Ciudad del Río', 'Apartamento', 'Ciudad del Río, Medellín', '2026-03-22', '2026-03-25', 2, 'pendiente'),
            ($1, 'Hotel Boutique Patio', 'Habitación privada', 'Laureles, Medellín', '2026-04-01', '2026-04-05', 2, 'confirmada'),
            ($1, 'Cabaña Santa Elena', 'Casa entera', 'Santa Elena, Medellín', '2026-04-10', '2026-04-12', 6, 'completada'),
            ($1, 'Estudio Laureles', 'Apartamento', 'Laureles, Medellín', '2026-02-20', '2026-02-22', 1, 'cancelada')
        `, [uid]);
        console.log('✅ Datos iniciales de reservas insertados');
      }
    }
  } catch (err) {
    console.error('❌ Error al crear tablas:', err.message);
    throw err;
  }
}

// Inicialización
(async () => {
  try {
    await createDatabaseIfNotExists();
    
    // Esperar un poco para que PostgreSQL procese la creación de la BD
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Base de datos conectada correctamente');
    
    await createTablesIfNotExist();
  } catch (err) {
    console.error('❌ Error al inicializar la base de datos:', err.message);
    process.exit(1);
  }
})();

export default pool;
