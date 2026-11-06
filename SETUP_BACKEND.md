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

### Usar Neon

El backend también puede conectarse a Neon con `DATABASE_URL`. Cuando esta variable está presente, tiene prioridad sobre `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`; el servidor no intenta crear una base de datos porque Neon ya la provisiona. Si `DATABASE_URL` no está definida, se conserva la conexión local por Docker.

Después de enlazar el proyecto y ejecutar `neon deploy`, Neon guarda en `.env` la conexión de PostgreSQL y las variables de los servicios declarados. `.env` está excluido de Git: no publiques ni compartas sus valores. Para Render, configura las variables requeridas en el panel privado del servicio; el `.env` local no se copia automáticamente al despliegue.

Las fotos de perfil se guardan en el bucket privado `assets`, no en PostgreSQL. El backend necesita las variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3` y `AWS_REGION` que entrega Neon. Se aceptan imágenes JPEG, PNG y WebP de hasta 5 MB; el servidor entrega URLs firmadas de corta duración. No expongas las credenciales `AWS_*` en variables `VITE_*`.

### Desplegar el backend en Render

El archivo `render.yaml` define un servicio web de Node.js con `npm ci`, `npm run server` y el health check `/api/health`. En Render, crea un Blueprint desde este repositorio y selecciona ese archivo. Si creas el servicio manualmente, usa la raíz del repositorio como **Root Directory**, `npm ci` como **Build Command** y `npm run server` como **Start Command**. Render asigna `PORT`; no lo configures manualmente.

Completa las variables privadas solicitadas por el Blueprint en Render:

| Variable | Configuración |
| --- | --- |
| `DATABASE_URL` | URL pooled (`-pooler`) de Neon para producción; no uses la conexión local de Docker. |
| `FRONTEND_URL` | El Blueprint ya usa `https://work-palace.vercel.app`. También se usa como origen CORS y para construir los enlaces de recuperación. |
| `RESEND_API_KEY` | API key de Resend para habilitar la recuperación por correo. |
| `RESEND_FROM_EMAIL` | Remitente permitido/verificado en Resend. |
| `NODE_ENV` | El Blueprint fija `production`. |
| `PASSWORD_RESET_TEST_MODE` | El Blueprint fija `false`; no lo cambies a `true` en producción. |

Si necesitas permitir más de un origen web, añade `CORS_ORIGIN` con una lista separada por comas en Render. Para habilitar TOTP, agrega `TOTP_ENCRYPTION_KEY` con una clave hexadecimal persistente de 64 caracteres. Para fotos de perfil, agrega las cuatro variables `AWS_*` indicadas arriba; para Neon Realtime, agrega `NEON_REALTIME_URL` y `NEON_REALTIME_SECRET`. Estos valores son privados y no deben llevar prefijo `VITE_`.

Después del primer despliegue, comprueba `https://<servicio>.onrender.com/api/health`: debe responder `{"status":"ok","database":"connected"}`. Si responde 503, revisa `DATABASE_URL` y los registros de Render; el health check no considera listo el servicio mientras la base de datos se inicializa. Configura la URL del backend en el despliegue del frontend mediante `VITE_API_URL` (no en el backend). Las solicitudes desde el frontend solo reciben CORS cuando su origen coincide con `FRONTEND_URL` o `CORS_ORIGIN`.

### Autenticación de dos pasos con Microsoft Authenticator

WorkPalace usa TOTP estándar (códigos de seis dígitos que cambian cada 30 segundos). Microsoft Authenticator acepta este formato mediante un QR `otpauth://`; no se necesita una API, cuenta ni credencial de Microsoft. El mismo QR también funciona con otras aplicaciones compatibles con TOTP.

Configura `TOTP_ENCRYPTION_KEY` en el entorno privado del backend como una clave hexadecimal de 64 caracteres (32 bytes). Puedes generar una con:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Usa una clave persistente y distinta por entorno. Si se pierde o se cambia, los secretos TOTP cifrados ya guardados no podrán descifrarse y esas cuentas necesitarán recuperar acceso. No la pongas en una variable `VITE_*`, ni la publiques o compartas.

En “Mi perfil”, la persona confirma su contraseña, escanea el QR con Microsoft Authenticator y escribe el primer código para verificar y activar la función. A partir de entonces, el inicio de sesión exige el código actual. La desactivación también requiere la contraseña y un código válido. Los secretos se cifran en PostgreSQL; los códigos no se envían a Microsoft ni se imprimen en los registros. Las cuentas antiguas que tenían activado el OTP simulado se migran como desactivadas, porque ese flujo no tenía una clave de Authenticator asociada.

WorkPalace aún no genera códigos de recuperación. Si se pierde el acceso a la aplicación, será necesaria asistencia administrativa para recuperar la cuenta.

Las rutas para integrar este flujo son `POST /api/users/{id}/totp/setup`, `POST /api/users/{id}/totp/verify-setup` y `POST /api/users/{id}/totp/disable`; el inicio de sesión verifica mediante `POST /api/login/otp/verify`. El backend genera y valida los códigos localmente, sin API externa.

Neon Realtime entrega actualizaciones de disponibilidad en `/api/realtime/places`; el endpoint devuelve una consulta sellada y el secreto permanece en el backend. Configura `NEON_REALTIME_URL` y `NEON_REALTIME_SECRET` en Render para que funcione en producción. Neon Auth está provisionado, pero WorkPalace conserva su flujo de autenticación actual. Neon Functions también está provisionado; el backend de la aplicación continúa siendo Express en Render.

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

El servidor inicia en `http://localhost:3001`. PostgreSQL (por ejemplo, el contenedor Docker) es necesario para las operaciones de la API que usan la base de datos, pero no para consultar Swagger. Si la base de datos no está disponible al arrancar, esas operaciones responden con `503`; al encenderla, reinicia el backend para inicializar las tablas.

### 5. Documentación interactiva de la API (Swagger)

Con el backend ejecutándose, incluso si PostgreSQL está apagado, abre Swagger UI en:

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
