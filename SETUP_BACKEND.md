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
# SMS OTP con Twilio (necesario en producción)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

El celular se guarda en formato internacional colombiano (`+57` seguido de 10 dígitos). En desarrollo, si no se configuran las variables de Twilio, el código se muestra en la consola del servidor; en producción el envío falla de forma explícita hasta configurar Twilio.

### Recuperación de contraseña con Resend

Configura estas variables en el `.env` del backend. Usa una API key válida de Resend y un remitente permitido por tu cuenta. Para pruebas limitadas puedes usar el remitente de prueba de Resend; para entregar correos a cualquier destinatario necesitas un dominio verificado y un remitente de ese dominio:

```env
RESEND_API_KEY=re_tu_api_key
RESEND_FROM_EMAIL=WorkPalace <no-reply@tu-dominio-verificado.com>
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_TEST_MODE=true
```

Con `PASSWORD_RESET_TEST_MODE=true`, el sistema envía todos los enlaces al correo autorizado de pruebas `diego.moralesg@comunidad.iush.edu.co`. El token sigue asociado en PostgreSQL al `id` de la cuenta que solicitó el cambio; el destinatario del correo no determina qué contraseña se actualiza. Este modo está pensado solo para desarrollo y el backend se niega a iniciar si `NODE_ENV=production` y el modo está activado. Para el envío normal configura `PASSWORD_RESET_TEST_MODE=false` (o no la definas).

Para enviar a los correos reales, verifica un dominio en Resend y configura `RESEND_FROM_EMAIL` con una dirección de ese dominio. En producción, `FRONTEND_URL` debe ser el origen HTTPS de la aplicación web. Si el frontend usa un backend remoto, configura también `VITE_API_URL` en el entorno de compilación del frontend con la URL del backend. No uses una variable `VITE_` para la API key: las variables con ese prefijo se envían al navegador. No publiques ni incluyas la clave en Git.

Al iniciar el backend, se crea automáticamente la tabla existente `password_reset_tokens` si no existe; no se requiere una migración adicional. La tabla guarda el hash del token y el `user_id` asociado, no el token original. Los enlaces vencen en 15 minutos, son de un solo uso y una solicitud nueva invalida enlaces anteriores tras enviarse correctamente. Se limita el endpoint a 5 solicitudes por IP cada 15 minutos y a una solicitud por cuenta cada 60 segundos. La respuesta del formulario no revela si el correo está registrado; los errores del proveedor se registran solo en el servidor.

Para comprobar la asociación segura con dos cuentas:
1. En desarrollo, confirma `PASSWORD_RESET_TEST_MODE=true` y arranca el backend con `npm run server`.
2. Desde “Recuperar contraseña”, solicita un enlace para la cuenta A. Debe llegar al buzón autorizado de pruebas.
3. Abre el enlace y cambia la contraseña. Inicia sesión en A con la nueva contraseña y confirma que la contraseña anterior ya no funciona.
4. Comprueba que la cuenta B conserva su contraseña original. Repite el flujo solicitando un enlace para B para probar también esa cuenta.
5. Intenta reutilizar un enlace ya consumido o uno vencido: debe rechazarse sin modificar contraseñas.

El archivo `.env.example` contiene los nombres de variables y valores ilustrativos, nunca credenciales reales. Copia sus valores necesarios a `.env` y reemplaza los placeholders localmente.

### 4. Ejecutar el servidor

```bash
npm run server
```

El servidor debería iniciarse en `http://localhost:3001`

### 5. Documentación interactiva de la API (Swagger)

Con el backend ejecutándose, abre Swagger UI en:

```text
http://localhost:3001/api-docs
```

La especificación OpenAPI en formato JSON está disponible en `http://localhost:3001/api-docs.json`. Si cambias `PORT` en `.env`, utiliza ese puerto en ambas direcciones. El servidor también imprime la dirección de Swagger al iniciar.

### 6. En otra terminal, ejecutar la aplicación React

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
