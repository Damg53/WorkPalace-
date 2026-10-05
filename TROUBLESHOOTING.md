# Troubleshooting - Problemas de Conexión en Login

## ⚠️ Servidor no disponible

Si ves el mensaje: **"Servidor no disponible. Ejecuta: npm run server"**

### Soluciones:

#### 1. Iniciar PostgreSQL
```bash
docker-compose up -d
```

Verifica que esté corriendo:
```bash
docker ps
```
Deberías ver un contenedor `postgres` corriendo.

#### 2. Iniciar el servidor backend
```bash
npm run server
```

Deberías ver:
```
✅ Base de datos conectada correctamente
🚀 Servidor ejecutándose en puerto 3001
```

#### 3. Verificar que la tabla users existe
```bash
psql -h localhost -U admin -d salazarPostgres -c "SELECT * FROM users LIMIT 1;"
```

Si la tabla no existe, crea la:
```bash
node server/create-table.js
```

#### 4. Crear un usuario de prueba
Opción A - Usar Signup:
- Ve a `http://localhost:5173/signup`
- Completa el formulario de registro
- Los datos se guardarán en PostgreSQL

Opción B - SQL directo:
```sql
-- Primero genera una contraseña hasheada con bcrypt
-- Usa https://bcryptjs.org/ o Python:
-- python -c "import bcrypt; print(bcrypt.hashpw(b'MiPasswordSegura', bcrypt.gensalt(10)).decode())"

INSERT INTO users (full_name, email, username, password) 
VALUES ('Erik Test', 'erik@test.com', 'erik', '$2b$10$...');
```

## 🔍 Verificar la conexión

### Test 1: ¿Funciona la BD?
```bash
node server/test-connection.js
```

Deberías ver:
```
✅ Base de datos conectada correctamente
✅ Tabla "users" existe
```

### Test 2: ¿Hay usuarios en la BD?
```bash
node server/test-login.js
```

Deberías ver usuarios listados.

### Test 3: ¿Funciona el endpoint de login?
Con el servidor corriendo (`npm run server`), en otra terminal:

```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"erik","password":"MiPasswordSegura"}'
```

Deberías recibir:
```json
{
  "message": "✅ Sesión iniciada exitosamente",
  "user": {
    "id": 1,
    "username": "erik",
    "fullName": "Erik Test",
    "email": "erik@test.com"
  }
}
```

## 🛠️ Pasos completos para empezar

1. **Iniciar Docker**
```bash
docker-compose up -d
```

2. **Crear tabla de usuarios**
```bash
node server/create-table.js
```

3. **Iniciar servidor backend**
```bash
npm run server
```

4. **En otra terminal, iniciar React**
```bash
npm run dev
```

5. **Ir a http://localhost:5173** y usar Signup para crear un usuario, o probar login con credenciales existentes.

## 📋 Checklist de validación

- [ ] Docker y PostgreSQL corriendo (`docker ps`)
- [ ] Tabla `users` existe (`psql ... -c "SELECT * FROM users LIMIT 1"`)
- [ ] Servidor backend corriendo en puerto 3001
- [ ] React app corriendo en puerto 5173
- [ ] Hay al menos un usuario en la BD
- [ ] La contraseña está correctamente hasheada con bcrypt

## 💡 Tips

- **Ver logs del servidor:** Habrá mensajes como `📨 POST /api/login`
- **Ver logs de la consola del navegador:** F12 → Console para ver errores
- **Probar conexión:** Visita http://localhost:3001/api/health en el navegador, deberías ver `{"status":"Server is running"}`
- **Ver usuarios registrados:** `node server/test-login.js`
