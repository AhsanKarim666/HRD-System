const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { getActivityLogs } = require('../controllers/activityController');

router.get('/', verifyToken, requireRole('HRD'), getActivityLogs);

module.exports = router;
