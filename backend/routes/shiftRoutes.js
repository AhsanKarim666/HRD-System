const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { getShifts, createShift, updateShift, deleteShift } = require('../controllers/shiftController');

router.get('/', verifyToken, requireRole('HRD', 'Manager'), getShifts);
router.post('/', verifyToken, requireRole('HRD', 'Manager'), createShift);
router.put('/:id', verifyToken, requireRole('HRD', 'Manager'), updateShift);
router.delete('/:id', verifyToken, requireRole('HRD', 'Manager'), deleteShift);

module.exports = router;
