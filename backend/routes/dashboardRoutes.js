const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { getDashboardStats } = require('../controllers/dashboardController');

router.get('/stats', verifyToken, requireRole('HRD', 'Manager'), getDashboardStats);

module.exports = router;