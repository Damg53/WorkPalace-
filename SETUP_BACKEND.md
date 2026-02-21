# Setup de WorkPalace - Backend con PostgreSQL

## Requisitos previos
- Docker y Docker Compose ejecutándose
- Node.js y npm instalados

## Pasos de configuración

### 1. Iniciar PostgreSQL con Docker

Ejecuta tu docker-compose.yml:
```bash
docker-compose up -d
```

Esto iniciará PostgreSQL en `localhost:5432` con:
- Usuario: `admin`
- Contraseña: `root`
- Base de datos: `salazarPostgres`

### 2. Crear la tabla de usuarios

Conéctate a PostgreSQL y ejecuta el script SQL:

**Opción A: Usando Docker**
```bash
docker exec -it postgres psql -U admin -d salazarPostgres -f /path/to/server/schema.sql
```

**Opción B: Usando psql localmente**
```bash
psql -h localhost -U admin -d salazarPostgres -f server/schema.sql
```

O copia y pega el contenido de `server/schema.sql` directamente en psql.

### 3. Configuración de .env (ya lista)

El archivo `.env` está configurado con tus credenciales Docker:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=salazarPostgres
DB_USER=admin
DB_PASSWORD=root
PORT=3001
```

### 4. Ejecutar el servidor

```bash
npm run server
```

El servidor debería iniciarse en `http://localhost:3001`

### 5. En otra terminal, ejecutar la aplicación React

```bash
npm run dev
```

## Cómo agregar usuarios manualmente a la base de datos

Si prefieres agregar usuarios directamente en PostgreSQL:

```sql
INSERT INTO users (full_name, email, username, password) 
VALUES ('Nombre Completo', 'email@ejemplo.com', 'usuario', 'contraseña');
```

## Verificar usuarios registrados

```sql
SELECT * FROM users;
```

## Troubleshooting

- **Error de conexión a PostgreSQL**: Verifica que Docker está ejecutándose con `docker-compose up -d`
- **Puerto 3001 en uso**: Cambia el valor de `PORT` en `.env` a otro puerto disponible.
- **Tabla no existe**: Ejecuta el contenido de `server/schema.sql` en psql.
