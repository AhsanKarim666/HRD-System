const db = require('../db');

const recordAudit = async (req, action, entityType, entityId, details = {}) => {
  if (!req.user?.id) return;

  try {
    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, req.user.role, action, entityType, entityId == null ? null : String(entityId), details]
    );
  } catch (error) {
    console.error('Gagal menulis audit log:', error.message);
  }
};

module.exports = { recordAudit };