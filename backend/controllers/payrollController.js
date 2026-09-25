const db = require('../db');

const getPayrolls = async (req, res) => {
  const { month, year, employee_id } = req.query;

  try {
    let query = `
    SELECT 
      p.id,
      p.employee_id,
      e.nik,
      e.full_name,
      d.name AS department_name,
      pos.name AS position_name,
      p.period,
      p.basic_salary,
      p.allowances,
      p.deductions,
      p.net_salary,
      p.payment_status,
      p.created_at
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions pos ON e.position_id = pos.id
    WHERE 1 = 1
    `;
    const params = [];

    if (month) {
    params.push(month);
    query += ` AND EXTRACT(MONTH FROM CAST(p.period AS DATE)) = $${params.length}`;
    }

    if (year) {
    params.push(year);
    query += ` AND EXTRACT(YEAR FROM CAST(p.period AS DATE)) = $${params.length}`;
    }

    if (employee_id) {
    params.push(employee_id);
    query += ` AND p.employee_id = $${params.length}`;
    }

    query += ' ORDER BY p.created_at DESC, p.id DESC';

    const result = await db.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generatePayroll = async (req, res) => {
  const { employee_id, month, year, allowances = 0, deductions = 0 } = req.body;

  if (!employee_id || !month || !year) {
    return res.status(400).json({
    success: false,
    message: 'Employee ID, bulan, dan tahun wajib diisi!',
    });
  }

  try {
    const periodValue = `${year}-${String(month).padStart(2, '0')}-01`;
    const existingPayroll = await db.query(
    'SELECT id FROM payroll WHERE employee_id = $1 AND period = $2',
    [employee_id, periodValue]
    );

    if (existingPayroll.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Slip gaji periode ini sudah dibuat sebelumnya!',
    });
    }

    const employeeData = await db.query(
    `SELECT e.id, pos.base_salary
     FROM employees e
     LEFT JOIN positions pos ON e.position_id = pos.id
     WHERE e.id = $1`,
    [employee_id]
    );

    if (employeeData.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan!' });
    }

    const basicSalary = Number(employeeData.rows[0].base_salary) || 0;
    const totalAllowances = Number(allowances) || 0;
    const totalDeductions = Number(deductions) || 0;
    const netSalary = basicSalary + totalAllowances - totalDeductions;

    const result = await db.query(
    `INSERT INTO payroll (employee_id, period, basic_salary, allowances, deductions, net_salary, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Unpaid')
     RETURNING *`,
    [employee_id, periodValue, basicSalary, totalAllowances, totalDeductions, netSalary]
    );

    res.status(201).json({
    success: true,
    message: 'Kalkulasi payroll otomatis berhasil dibuat',
    data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;

  if (!['Paid', 'Unpaid'].includes(payment_status)) {
    return res.status(400).json({
    success: false,
    message: 'Status harus bernilai "Paid" atau "Unpaid"!',
    });
  }

  try {
    const result = await db.query(
    `UPDATE payroll
     SET payment_status = $1
     WHERE id = $2
     RETURNING *`,
    [payment_status, id]
    );

    if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Data payroll tidak ditemukan' });
    }

    res.status(200).json({
    success: true,
    message: `Status pembayaran diubah menjadi ${payment_status}`,
    data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPayrolls, generatePayroll, updatePaymentStatus };