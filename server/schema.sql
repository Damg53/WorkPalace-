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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columna role si no existe (para migración)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' NOT NULL;

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);

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

-- Datos de ejemplo para places (puedes ejecutar este script completo en tu DB)
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
