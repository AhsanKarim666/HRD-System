const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  getAttendances,
  getTodayAttendance,
  checkIn,
  checkOut,
} = require('../controllers/attendanceController');

router.get('/', verifyToken, getAttendances);
router.get('/today', verifyToken, getTodayAttendance);
router.post('/check-in', verifyToken, checkIn);
router.post('/clock-in', verifyToken, checkIn);
router.post('/check-out', verifyToken, checkOut);
router.post('/clock-out', verifyToken, checkOut);

module.exports = router;