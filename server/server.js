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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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

app.get('/api/debug', async (req, res) => {
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'Server is running' });
});

app.use(usersRoutes);
app.use(verificationRoutes);
app.use(passwordResetRoutes);
app.use(spacesRoutes);
app.use(searchRoutes);
app.use(reservationsRoutes);
app.use(availabilityRoutes);
app.use(paymentsRoutes);

initializationReady.then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📚 Swagger UI disponible en http://localhost:${PORT}/api-docs`);
  });
});
