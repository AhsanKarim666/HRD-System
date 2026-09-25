const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
  getLeaves,
  requestLeave,
  updateLeaveStatus,
} = require('../controllers/leaveController');

router.get('/', verifyToken, getLeaves);
router.post('/', verifyToken, requestLeave);
router.patch('/:id/status', verifyToken, requireRole('HRD', 'Manager'), updateLeaveStatus);

module.exports = router;