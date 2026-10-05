import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function createTable() {
  try {
    console.log('🔨 Creando tabla "users"...\n');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log('✅ Tabla "users" creada exitosamente\n');

    // Agregar columna role si no existe (para migración)
    console.log('🔨 Verificando/agregando columna role...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT \'user\' NOT NULL;');
      console.log('✅ Columna role agregada\n');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('✅ Columna role ya existe\n');
      } else {
        throw e;
      }
    }

    // Crear índices
    console.log('🔨 Creando índices...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
    console.log('✅ Índices creados\n');

    // Verificar estructura
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Estructura de la tabla:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      console.log(`  ✓ ${col.column_name}: ${col.data_type} ${nullable}`);
    });

    console.log('\n✅ ¡Tabla lista para usar!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error al crear tabla:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTable();
