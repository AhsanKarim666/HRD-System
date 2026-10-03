const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
	getDepartments,
	createDepartment,
	updateDepartment,
	deleteDepartment,
} = require('../controllers/departmentController');

router.get('/', verifyToken, requireRole('HRD', 'Manager'), getDepartments);
router.post('/', verifyToken, requireRole('HRD', 'Manager'), createDepartment);
router.put('/:id', verifyToken, requireRole('HRD', 'Manager'), updateDepartment);
router.delete('/:id', verifyToken, requireRole('HRD', 'Manager'), deleteDepartment);

module.exports = router;