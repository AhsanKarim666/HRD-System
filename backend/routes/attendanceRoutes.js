const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
  getAttendances,
  getTodayAttendance,
  checkIn,
  checkOut,
} = require('../controllers/attendanceController');

router.get('/', verifyToken, requireRole('HRD', 'Manager', 'Employee'), getAttendances);
router.get('/today', verifyToken, requireRole('HRD', 'Manager', 'Employee'), getTodayAttendance);
router.post('/check-in', verifyToken, requireRole('HRD', 'Manager', 'Employee'), checkIn);
router.post('/clock-in', verifyToken, requireRole('HRD', 'Manager', 'Employee'), checkIn);
router.post('/check-out', verifyToken, requireRole('HRD', 'Manager', 'Employee'), checkOut);
router.post('/clock-out', verifyToken, requireRole('HRD', 'Manager', 'Employee'), checkOut);

module.exports = router;