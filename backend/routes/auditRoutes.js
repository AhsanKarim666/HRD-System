const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { getAuditLogs } = require('../controllers/auditController');

router.get('/', verifyToken, requireRole('HRD'), getAuditLogs);

module.exports = router;