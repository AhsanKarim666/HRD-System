const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');
const { calculateMonthlyPph21 } = require('../utils/tax');

const getPayrolls = async (req, res) => {
  const { month, year, employee_id } = req.query;
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && !userEmployeeId) {
    return res.status(403).json({ success: false, message: 'Akun karyawan belum terhubung ke data karyawan.' });
  }
  if (userEmployeeId && employee_id && String(employee_id) !== String(userEmployeeId)) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk slip gaji sendiri.' });
  }

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
      p.pph21,
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

    const targetEmployeeId = userEmployeeId || employee_id;
    if (targetEmployeeId) {
    params.push(targetEmployeeId);
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
  const { employee_id, month, year, basic_salary, allowances, deductions } = req.body;

  const numericMonth = Number(month);
  const numericYear = Number(year);
  if (!Number.isInteger(Number(employee_id)) || Number(employee_id) < 1 ||
      !Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 ||
      !Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 2100) {
    return res.status(400).json({
      success: false,
      message: 'Karyawan, bulan (1-12), dan tahun (2000-2100) harus valid.',
    });
  }

  const parseAmount = (value, fieldName) => {
    if (value === undefined) return { value: 0 };
    const amount = Number(value);
    if (value === null || String(value).trim() === '' || !Number.isFinite(amount) || amount < 0) {
      return { error: `${fieldName} harus berupa angka nol atau lebih.` };
    }
    return { value: amount };
  };

  const requestedBasicSalary = Number(basic_salary);
  if (basic_salary !== undefined && (basic_salary === null || String(basic_salary).trim() === '' || !Number.isFinite(requestedBasicSalary) || requestedBasicSalary < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Gaji pokok harus berupa angka nol atau lebih.',
    });
  }
  const parsedAllowances = parseAmount(allowances, 'Tunjangan');
  const parsedDeductions = parseAmount(deductions, 'Potongan');
  if (parsedAllowances.error || parsedDeductions.error) {
    return res.status(400).json({
      success: false,
      message: parsedAllowances.error || parsedDeductions.error,
    });
  }

  try {
    const periodValue = `${numericYear}-${String(numericMonth).padStart(2, '0')}-01`;
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

    const basicSalary = basic_salary === undefined
      ? Number(employeeData.rows[0].base_salary) || 0
      : requestedBasicSalary;
    const totalAllowances = parsedAllowances.value;
    const totalDeductions = parsedDeductions.value;
    const estimatedPph21 = calculateMonthlyPph21(basicSalary + totalAllowances);
    if (totalDeductions + estimatedPph21 > basicSalary + totalAllowances) {
      return res.status(400).json({
        success: false,
        message: 'Total potongan lain dan PPh 21 tidak boleh melebihi gaji pokok dan tunjangan.',
      });
    }
    const netSalary = basicSalary + totalAllowances - totalDeductions - estimatedPph21;

    const result = await db.query(
    `INSERT INTO payroll (employee_id, period, basic_salary, allowances, deductions, pph21, net_salary, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Unpaid')
     RETURNING *`,
    [employee_id, periodValue, basicSalary, totalAllowances, totalDeductions, estimatedPph21, netSalary]
    );
    await recordAudit(req, 'payroll.generate', 'payroll', result.rows[0].id, {
      employee_id,
      period: periodValue,
      payment_status: 'Unpaid',
      pph21: estimatedPph21,
    });

    res.status(201).json({
    success: true,
    message: 'Kalkulasi payroll otomatis berhasil dibuat',
    data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Slip gaji periode ini sudah dibuat sebelumnya!' });
    }
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
    await recordAudit(req, 'payroll.payment_status', 'payroll', id, {
      payment_status,
    });

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