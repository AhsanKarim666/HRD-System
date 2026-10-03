const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
  getLeaves,
  requestLeave,
  updateLeaveStatus,
} = require('../controllers/leaveController');

router.get('/', verifyToken, requireRole('HRD', 'Manager', 'Employee'), getLeaves);
router.post('/', verifyToken, requireRole('HRD', 'Manager', 'Employee'), requestLeave);
router.patch('/:id/status', verifyToken, requireRole('HRD', 'Manager'), updateLeaveStatus);

module.exports = router;