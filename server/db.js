
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
        profile_image_url TEXT,
        phone VARCHAR(20),
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

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    `);
    console.log('✅ Columna profile_image_url verificada/creada en users');

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    console.log('✅ Columna phone verificada/creada en users');

    // columna active para desactivar usuarios sin borrarlos
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    console.log('✅ Columna active verificada/creada en users');

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    console.log('✅ Columna two_factor_enabled verificada/creada en users');

    // Crear tabla de espacios antes de crear la referencia desde reservations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS places (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        barrio VARCHAR(255),
        ciudad VARCHAR(255),
        capacidad VARCHAR(255),
        precio_hora INT,
        modalidad VARCHAR(255),
        caracteristicas TEXT,
        nivel_ruido VARCHAR(100),
        image_url TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla "places" verificada/creada');

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
        coupon_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_user_coupon ON reservations(user_id, coupon_code);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);');
    console.log('✅ Tabla "reservations" verificada/creada');

    // columna active para desactivar reservas sin borrarlas
    await pool.query(`
      ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    console.log('✅ Columna active verificada/creada en reservations');

    // columna place_id para rastrear qué lugar está reservado
    await pool.query(`
      ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS place_id INT REFERENCES places(id) ON DELETE SET NULL;
    `);
    console.log('✅ Columna place_id verificada/creada en reservations');

    // Seed inicial de places si la tabla está vacía
    const countPlaces = await pool.query('SELECT COUNT(*) AS total FROM places');
    const totalPlaces = parseInt(countPlaces.rows[0]?.total || '0', 10);
    if (totalPlaces === 0) {
      await pool.query(`
        INSERT INTO places (name, tipo, barrio, ciudad, capacidad, precio_hora, modalidad, caracteristicas, nivel_ruido)
        VALUES
          ('Studio 404', 'Estudio de grabación', 'El Poblado', 'Medellín', 'Hasta 4 personas', 45000,
           'Por hora / media jornada',
           'Cabina tratada acústicamente, Interfaz de audio, Micrófonos profesionales, Aire acondicionado',
           'Aislado'),
          ('Cocina Clouds', 'Cocina oculta', 'Laureles', 'Medellín', 'Hasta 6 personas', 60000,
           'Media jornada / jornada completa',
           'Campana industrial, Horno convector, Utensilios básicos, Área de empaque',
           'Uso gastronómico'),
          ('WoodLab', 'Taller de carpintería', 'Belén', 'Medellín', 'Hasta 3 personas', 50000,
           'Jornada completa',
           'Sierra de mesa, Lijadora de banda, Prensas y bancos de trabajo, Extractor de polvo',
           'Alto (ideal para proyectos)');
      `);
      console.log('✅ Datos iniciales de places insertados');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL,
        discount INT NOT NULL CHECK (discount > 0 AND discount <= 100),
        max_uses INT CHECK (max_uses IS NULL OR max_uses > 0),
        used_count INT NOT NULL DEFAULT 0,
        starts_at DATE,
        ends_at DATE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_blocks (
        id SERIAL PRIMARY KEY,
        place_id INT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        starts_at DATE NOT NULL,
        ends_at DATE NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (ends_at >= starts_at)
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_place_blocks_place_dates ON place_blocks(place_id, starts_at, ends_at);');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id INT NOT NULL,
        place_name VARCHAR(255) NOT NULL,
        place_city VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, place_id)
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        detail TEXT NOT NULL,
        tone VARCHAR(20) NOT NULL DEFAULT 'info',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id, created_at DESC);');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_user_id INT REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC);');
    console.log('✅ Tablas admin verificadas/creadas');

    await pool.query(`
      UPDATE places
      SET active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT place_id FROM reservations
        WHERE place_id IS NOT NULL AND estado IN ('completada', 'cancelada')
      )
      AND NOT EXISTS (
        SELECT 1 FROM reservations current_reservation
        WHERE current_reservation.place_id = places.id
          AND current_reservation.active = TRUE
          AND current_reservation.estado IN ('pendiente', 'confirmada')
      );
    `);

  } catch (err) {
    console.error('❌ Error al crear tablas:', err.message);
    throw err;
  }
}

// Inicialización compartida para que el servidor pueda esperar las tablas.
export const initializationReady = (async () => {
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
