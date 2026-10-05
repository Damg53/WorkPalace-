-- Script para crear la tabla de usuarios en PostgreSQL
-- Ejecutar en la base de datos: salazarPostgres

-- Crear tabla de usuarios (si no existe)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' NOT NULL,
  profile_image_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columna role si no existe (para migración)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Ver la tabla creada
SELECT * FROM users;

-- Tabla de reservas (estilo Airbnb / hoteles)
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

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_user_coupon ON reservations(user_id, coupon_code);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);

-- Cupones administrables desde el panel
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

-- Registro de acciones administrativas
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC);

-- Tabla de espacios (places) publicados en la plataforma
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
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columna active si no existe (para migración)
ALTER TABLE places ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Agregar columna image_url si no existe (para migración)
ALTER TABLE places ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Bloqueos manuales de disponibilidad por espacio
CREATE TABLE IF NOT EXISTS place_blocks (
  id SERIAL PRIMARY KEY,
  place_id INT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_place_blocks_place_dates ON place_blocks(place_id, starts_at, ends_at);

-- Datos de ejemplo para places (puedes ejecutar este script completo en tu DB)

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);