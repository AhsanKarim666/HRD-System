const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

router.get('/', verifyToken, getEmployees);
router.post('/', verifyToken, requireRole('HRD', 'Manager'), createEmployee);
router.put('/:id', verifyToken, requireRole('HRD', 'Manager'), updateEmployee);
router.delete('/:id', verifyToken, requireRole('HRD'), deleteEmployee);

router.post('/seed-master-data', async (req, res) => {
  try {
    await db.query(`
      INSERT INTO departments (name) VALUES
      ('IT'), ('HR'), ('Finance'), ('Marketing'), ('Operations')
      ON CONFLICT (name) DO NOTHING;
    `);

    await db.query(`
      INSERT INTO positions (name, base_salary) VALUES
      ('Software Engineer', 9000000),
      ('HR Specialist', 7000000),
      ('Accountant', 8000000),
      ('Marketing Executive', 6500000),
      ('Operations Lead', 8500000)
      ON CONFLICT (name) DO NOTHING;
    `);

    res.status(200).json({
      success: true,
      message: 'Master departemen dan jabatan berhasil ditambahkan!',
    });
  } catch (err) {
    console.error('Error seeding data:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menambah data: ' + err.message,
    });
  }
});

module.exports = router;