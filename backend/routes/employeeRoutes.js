const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

router.get('/', verifyToken, requireRole('HRD', 'Manager'), getEmployees);
router.post('/', verifyToken, requireRole('HRD', 'Manager'), createEmployee);
router.put('/:id', verifyToken, requireRole('HRD', 'Manager'), updateEmployee);
router.delete('/:id', verifyToken, requireRole('HRD'), deleteEmployee);

module.exports = router;