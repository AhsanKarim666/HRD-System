const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

const getDepartments = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM departments ORDER BY id ASC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDepartment = async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 100) {
    return res.status(400).json({ success: false, message: 'Nama departemen wajib diisi!' });
  }

  try {
    const result = await db.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING *',
      [name]
    );
    await recordAudit(req, 'department.create', 'department', result.rows[0].id);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama departemen sudah digunakan.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDepartment = async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 100) {
    return res.status(400).json({ success: false, message: 'Nama departemen wajib diisi.' });
  }

  try {
    const result = await db.query(
      'UPDATE departments SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Departemen tidak ditemukan.' });
    }
    await recordAudit(req, 'department.update', 'department', req.params.id);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama departemen sudah digunakan.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const usage = await db.query(
      'SELECT EXISTS (SELECT 1 FROM employees WHERE department_id = $1) AS in_use',
      [req.params.id]
    );
    if (usage.rows[0].in_use) {
      return res.status(409).json({ success: false, message: 'Departemen masih digunakan oleh karyawan.' });
    }

    const result = await db.query('DELETE FROM departments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Departemen tidak ditemukan.' });
    }
    await recordAudit(req, 'department.delete', 'department', req.params.id);
    res.status(200).json({ success: true, message: 'Departemen berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };