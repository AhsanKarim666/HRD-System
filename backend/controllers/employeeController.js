const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

const getEmployees = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id,
        e.nik,
        e.full_name,
        e.phone,
        e.hire_date,
        e.status,
        e.department_id,
        d.name AS department_name,
        e.position_id,
        p.name AS position_name,
        p.base_salary,
        e.shift_id,
        s.shift_name,
        s.start_time AS shift_start_time,
        s.end_time AS shift_end_time
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      ORDER BY e.id DESC
    `;
    const result = await db.query(query);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createEmployee = async (req, res) => {
  const { nik, full_name, phone, hire_date, department_id, position_id, shift_id, status } = req.body;

  if (!nik || !full_name || !hire_date) {
    return res.status(400).json({
      success: false,
      message: 'NIK, Nama Lengkap, dan Tanggal Masuk wajib diisi!',
    });
  }

  try {
    const query = `
      INSERT INTO employees (nik, full_name, phone, hire_date, department_id, position_id, shift_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      nik,
      full_name,
      phone || null,
      hire_date,
      department_id || null,
      position_id || null,
      shift_id || null,
      status || 'Active',
    ];

    const result = await db.query(query, values);
    await recordAudit(req, 'employee.create', 'employee', result.rows[0].id, {
      department_id: department_id || null,
      position_id: position_id || null,
      status: status || 'Active',
    });
    res.status(201).json({
      success: true,
      message: 'Karyawan berhasil didaftarkan',
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'NIK sudah terdaftar di sistem!' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { full_name, phone, department_id, position_id, shift_id, status } = req.body;

  try {
    const query = `
      UPDATE employees
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          department_id = COALESCE($3, department_id),
          position_id = COALESCE($4, position_id),
          shift_id = CASE WHEN $5 THEN $6::integer ELSE shift_id END,
          status = COALESCE($7, status)
      WHERE id = $8
      RETURNING *
    `;
    const result = await db.query(query, [
      full_name, phone, department_id, position_id,
      Object.prototype.hasOwnProperty.call(req.body, 'shift_id'),
      shift_id || null, status, id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data karyawan tidak ditemukan' });
    }

    await recordAudit(req, 'employee.update', 'employee', id, {
      changed_fields: Object.keys(req.body || {}),
    });
    res.status(200).json({
      success: true,
      message: 'Data karyawan berhasil diperbarui',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.query('SELECT id FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data karyawan tidak ditemukan' });
    }

    const hasAssociatedRecords = await db.query(
      `SELECT 1 FROM (
         SELECT employee_id FROM attendances WHERE employee_id = $1
         UNION ALL
         SELECT employee_id FROM leaves WHERE employee_id = $1
         UNION ALL
         SELECT employee_id FROM overtimes WHERE employee_id = $1
         UNION ALL
         SELECT employee_id FROM payroll WHERE employee_id = $1
       ) records`,
      [id]
    );

    if (hasAssociatedRecords.rows.length > 0) {
      await db.query(
        `UPDATE employees SET status = 'Inactive' WHERE id = $1 RETURNING *`,
        [id]
      );
      await recordAudit(req, 'employee.deactivate', 'employee', id);
      return res.status(200).json({
        success: true,
        message: 'Karyawan ditandai inactive karena memiliki riwayat terkait.',
      });
    }

    await db.query('DELETE FROM employees WHERE id = $1', [id]);
    await recordAudit(req, 'employee.delete', 'employee', id);
    res.status(200).json({ success: true, message: 'Data karyawan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee };