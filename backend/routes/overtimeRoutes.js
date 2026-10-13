const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
  getOvertimes,
  getDailyOvertimeHours,
  requestOvertime,
  updateOvertimeStatus,
} = require('../controllers/overtimeController');

router.get('/', verifyToken, requireRole('HRD', 'Manager', 'Employee'), getOvertimes);
router.get('/daily-hours', verifyToken, requireRole('HRD', 'Manager', 'Employee'), getDailyOvertimeHours);
router.post('/', verifyToken, requireRole('HRD', 'Manager', 'Employee'), requestOvertime);
router.patch('/:id/status', verifyToken, requireRole('HRD', 'Manager'), updateOvertimeStatus);

module.exports = router;
