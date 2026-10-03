const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
  getPayrolls,
  generatePayroll,
  updatePaymentStatus,
} = require('../controllers/payrollController');

router.get('/', verifyToken, requireRole('HRD', 'Manager', 'Employee'), getPayrolls);
router.post('/', verifyToken, requireRole('HRD', 'Manager'), generatePayroll);
router.post('/generate', verifyToken, requireRole('HRD', 'Manager'), generatePayroll);
router.patch('/:id/status', verifyToken, requireRole('HRD', 'Manager'), updatePaymentStatus);
router.patch('/:id/pay', verifyToken, requireRole('HRD', 'Manager'), updatePaymentStatus);

module.exports = router;