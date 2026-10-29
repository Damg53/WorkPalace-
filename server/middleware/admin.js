import pool from '../db.js';

export async function requireAdmin(req, res, next) {
  try {
    const userId = Number.parseInt(req.header('x-user-id') || '', 10);
    if (!Number.isNaN(userId)) {
      const result = await pool.query('SELECT role, active FROM users WHERE id = $1', [userId]);
      if (result.rows[0]?.role === 'admin' && result.rows[0]?.active !== false) {
        req.adminUserId = userId;
        return next();
      }
    }

    if (process.env.NODE_ENV !== 'production' && (req.header('x-user-role') || req.body?.role) === 'admin') {
      req.adminUserId = null;
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: admin only' });
  } catch (error) {
    console.error('Error validando permisos admin:', error);
    return res.status(500).json({ error: 'No se pudieron validar los permisos' });
  }
}

export async function logAdminAction(req, action, entityType, entityId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [req.adminUserId || null, action, entityType, entityId || null, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error guardando auditoría admin:', error);
  }
}
