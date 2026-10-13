const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getOvertimes = async (req, res) => {
  const { status, employee_id, date } = req.query;
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && !userEmployeeId) {
    return res.status(403).json({ success: false, message: 'Akun karyawan belum terhubung ke data karyawan.' });
  }
  if (userEmployeeId && employee_id && String(employee_id) !== String(userEmployeeId)) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk pengajuan lembur sendiri.' });
  }

  try {
    let query = `
      SELECT o.id, o.employee_id, e.nik, e.full_name, o.date, o.hours, o.reason, o.status,
             o.approver_id, o.reviewed_at, o.created_at,
             SUM(o.hours) FILTER (WHERE o.status = 'Approved')
               OVER (PARTITION BY o.employee_id, o.date) AS daily_total_hours
      FROM overtimes o
      JOIN employees e ON e.id = o.employee_id
      WHERE 1 = 1`;
    const params = [];
    const targetEmployeeId = userEmployeeId || employee_id;
    if (targetEmployeeId) {
      params.push(targetEmployeeId);
      query += ` AND o.employee_id = $${params.length}`;
    }
    if (status) {
      if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Filter status lembur tidak valid.' });
      }
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    if (date) {
      if (!validDate(date)) return res.status(400).json({ success: false, message: 'Tanggal tidak valid.' });
      params.push(date);
      query += ` AND o.date = $${params.length}`;
    }
    query += ' ORDER BY o.date DESC, o.created_at DESC';
    const result = await db.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDailyOvertimeHours = async (req, res) => {
  const { date, employee_id } = req.query;
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && !userEmployeeId) {
    return res.status(403).json({ success: false, message: 'Akun karyawan belum terhubung ke data karyawan.' });
  }
  if (date && !validDate(date)) return res.status(400).json({ success: false, message: 'Tanggal tidak valid.' });
  if (userEmployeeId && employee_id && String(employee_id) !== String(userEmployeeId)) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk data lembur sendiri.' });
  }

  try {
    const params = [];
    let query = `
      SELECT o.employee_id, e.nik, e.full_name, o.date, SUM(o.hours) AS total_hours
      FROM overtimes o JOIN employees e ON e.id = o.employee_id
      WHERE o.status = 'Approved'`;
    const targetEmployeeId = userEmployeeId || employee_id;
    if (targetEmployeeId) {
      params.push(targetEmployeeId);
      query += ` AND o.employee_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND o.date = $${params.length}`;
    }
    query += ' GROUP BY o.employee_id, e.nik, e.full_name, o.date ORDER BY o.date DESC, e.full_name';
    const result = await db.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const requestOvertime = async (req, res) => {
  const { employee_id, date, hours, reason } = req.body;
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && (!userEmployeeId || (employee_id && String(employee_id) !== String(userEmployeeId)))) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk pengajuan lembur sendiri.' });
  }
  const targetEmployeeId = userEmployeeId || employee_id;
  const numberOfHours = Number(hours);
  const validPrecision = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(hours));
  if (!Number.isInteger(Number(targetEmployeeId)) || Number(targetEmployeeId) < 1 ||
      !validDate(date) || !Number.isFinite(numberOfHours) ||
      numberOfHours <= 0 || numberOfHours > 24 || !validPrecision ||
      typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Karyawan, tanggal valid, jam lembur (lebih dari 0 sampai 24, maksimal 2 desimal), dan alasan wajib diisi.',
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO overtimes (employee_id, date, hours, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [targetEmployeeId, date, numberOfHours, reason.trim()]
    );
    await recordAudit(req, 'overtime.request', 'overtime', result.rows[0].id, {
      employee_id: targetEmployeeId,
      date,
      hours: numberOfHours,
    });
    res.status(201).json({ success: true, message: 'Pengajuan lembur berhasil dikirim.', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ success: false, message: 'Data karyawan tidak ditemukan.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOvertimeStatus = async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status harus bernilai "Approved" atau "Rejected".' });
  }

  try {
    const result = await db.query(
      `UPDATE overtimes
       SET status = $1, approver_id = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'Pending'
       RETURNING *`,
      [status, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) {
      const existing = await db.query('SELECT status FROM overtimes WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Data pengajuan lembur tidak ditemukan.' });
      }
      return res.status(409).json({ success: false, message: 'Pengajuan ini sudah pernah diputuskan.' });
    }
    await recordAudit(req, `overtime.${status.toLowerCase()}`, 'overtime', req.params.id, {
      employee_id: result.rows[0].employee_id,
      status,
    });
    res.status(200).json({
      success: true,
      message: `Pengajuan lembur berhasil di-${status.toLowerCase()}.`,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getOvertimes, getDailyOvertimeHours, requestOvertime, updateOvertimeStatus };
