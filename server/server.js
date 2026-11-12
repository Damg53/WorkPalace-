import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import pool, { initializationReady } from './db.js';
import { openApiSpec } from './swagger.js';
import usersRoutes from './modules/users/routes.js';
import verificationRoutes from './modules/verification/routes.js';
import spacesRoutes from './modules/spaces/routes.js';
import searchRoutes from './modules/search/routes.js';
import reservationsRoutes from './modules/reservations/routes.js';
import availabilityRoutes from './modules/availability/routes.js';
import paymentsRoutes from './modules/payments/routes.js';
import passwordResetRoutes from './modules/verification/password-reset.js';
import ownerRoutes from './modules/owners/routes.js';
import reviewRoutes from './modules/reviews/routes.js';
import { completeExpiredReservations } from './modules/availability/service.js';
import { containsProfanityInPayload } from './shared/validation.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGIN || '').split(','),
  ]
    .map((origin) => origin?.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin)
);

app.use(cors({
  origin(origin, callback) {
    const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
      && /^https?:\/\/localhost(?::\d+)?$/.test(origin || '');
    callback(null, !origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin);
  },
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

app.get('/api-docs.json', (_req, res) => {
  res.json(openApiSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'WorkPalace API - Swagger UI',
}));

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug', async (_req, res) => {
    try {
      const users = await pool.query('SELECT id, username, email FROM users LIMIT 3');
      res.json({
        status: 'OK',
        database: 'Connected',
        userCount: users.rows.length,
        users: users.rows
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

app.get('/api/health', (_req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ status: 'starting', database: 'unavailable' });
  }
  res.json({ status: 'ok', database: 'connected' });
});

let databaseReady = false;
app.use('/api', (_req, res, next) => {
  if (!databaseReady) {
    return res.status(503).json({ error: 'La base de datos no está disponible.' });
  }
  next();
});
app.use('/api', (req, res, next) => {
  if (containsProfanityInPayload(req.body)) {
    return res.status(400).json({ error: 'No se permiten palabras ofensivas en los campos de texto.' });
  }
  next();
});

app.use(usersRoutes);
app.use(verificationRoutes);
app.use(passwordResetRoutes);
app.use(spacesRoutes);
app.use(ownerRoutes);
app.use(searchRoutes);
app.use(reservationsRoutes);
app.use(reviewRoutes);
app.use(availabilityRoutes);
app.use(paymentsRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📚 Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});

initializationReady.then(() => {
  databaseReady = true;
  const completeReservations = () => {
    void completeExpiredReservations().catch((error) => {
      console.error('Error completando reservas vencidas:', error);
    });
  };
  completeReservations();
  setInterval(completeReservations, 60_000);
}).catch((error) => {
  console.error(`⚠️ El servidor sigue disponible, pero la base de datos no pudo inicializarse: ${error.message}`);
});
