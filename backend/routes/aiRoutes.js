const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { summarizeEmployeePerformance } = require('../controllers/aiController');

router.post('/employee-performance', verifyToken, requireRole('HRD', 'Manager'), summarizeEmployeePerformance);
router.post('/evaluate', verifyToken, requireRole('HRD', 'Manager'), summarizeEmployeePerformance);

module.exports = router;