const db = require('../db');

const getAuditLogs = async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const offset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

  try {
    const result = await db.query(
      `SELECT id, actor_id, actor_role, action, entity_type, entity_id, details, created_at
       FROM audit_logs
       ORDER BY id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.status(200).json({ success: true, data: result.rows, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAuditLogs };