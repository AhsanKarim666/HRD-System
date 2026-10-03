const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

// 1. Ambil Semua Pengajuan Cuti (Bisa difilter status / employee_id)
const getLeaves = async (req, res) => {
  const { status, employee_id } = req.query;
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && !userEmployeeId) {
    return res.status(403).json({ success: false, message: 'Akun karyawan belum terhubung ke data karyawan.' });
  }
  if (userEmployeeId && employee_id && String(employee_id) !== String(userEmployeeId)) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk pengajuan cuti sendiri.' });
  }
  try {
    let query = `
      SELECT 
        l.id,
        l.employee_id,
        e.nik,
        e.full_name,
        d.name AS department_name,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.reason,
        l.status,
        l.created_at
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND l.status = $${params.length}`;
    }

    const targetEmployeeId = userEmployeeId || employee_id;
    if (targetEmployeeId) {
      params.push(targetEmployeeId);
      query += ` AND l.employee_id = $${params.length}`;
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await db.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Ajukan Cuti Baru
const requestLeave = async (req, res) => {
  const { employee_id, start_date, end_date, reason } = req.body;
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && (!userEmployeeId || (employee_id && String(employee_id) !== String(userEmployeeId)))) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk pengajuan cuti sendiri.' });
  }
  const targetEmployeeId = userEmployeeId || employee_id;
  const leaveType = req.body.leave_type || 'Annual';

  if (!targetEmployeeId || !start_date || !end_date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Employee ID, tanggal mulai, dan tanggal selesai wajib diisi!' 
    });
  }

  const validDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };

  if (!validDate(start_date) || !validDate(end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Tanggal mulai dan selesai harus berupa tanggal yang valid.',
    });
  }

  if (end_date < start_date) {
    return res.status(400).json({
      success: false,
      message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
    });
  }

  if (typeof leaveType !== 'string' || leaveType.trim().length === 0 || leaveType.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Jenis cuti wajib diisi dan maksimal 50 karakter.',
    });
  }

  try {
    const query = `
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'Pending')
      RETURNING *
    `;
    const values = [targetEmployeeId, leaveType.trim(), start_date, end_date, reason || null];

    const overlappingLeave = await db.query(
      `SELECT id FROM leaves
       WHERE employee_id = $1
         AND status IN ('Pending', 'Approved')
         AND start_date <= $3::date
         AND end_date >= $2::date
       LIMIT 1`,
      [targetEmployeeId, start_date, end_date]
    );
    if (overlappingLeave.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Pengajuan cuti bertumpang tindih dengan pengajuan pending atau cuti yang sudah disetujui.',
      });
    }

    const result = await db.query(query, values);
    await recordAudit(req, 'leave.request', 'leave', result.rows[0].id, {
      employee_id: targetEmployeeId,
      leave_type: leaveType.trim(),
      start_date,
      end_date,
    });
    res.status(201).json({
      success: true,
      message: 'Pengajuan cuti berhasil dikirim',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Update Status Approval Cuti (Approved / Rejected)
const updateLeaveStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Approved' atau 'Rejected'

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Status harus bernilai "Approved" atau "Rejected"!' 
    });
  }

  try {
    const existing = await db.query(
      'SELECT id, employee_id, start_date, end_date, status FROM leaves WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pengajuan cuti tidak ditemukan' });
    }
    if (existing.rows[0].status !== 'Pending') {
      return res.status(409).json({ success: false, message: 'Pengajuan ini sudah pernah diputuskan.' });
    }

    if (status === 'Approved') {
      const overlappingLeave = await db.query(
        `SELECT id FROM leaves
         WHERE employee_id = $1
           AND id <> $2
           AND status = 'Approved'
           AND start_date <= $4::date
           AND end_date >= $3::date
         LIMIT 1`,
        [existing.rows[0].employee_id, id, existing.rows[0].start_date, existing.rows[0].end_date]
      );
      if (overlappingLeave.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cuti tidak dapat disetujui karena bertumpang tindih dengan cuti lain yang sudah disetujui.',
        });
      }
    }

    const result = await db.query(
      `UPDATE leaves
       SET status = $1, approver_id = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'Pending'
       RETURNING *`,
      [status, req.user.id, id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Status pengajuan sudah berubah; muat ulang data.' });
    }
    await recordAudit(req, `leave.${status.toLowerCase()}`, 'leave', id, {
      employee_id: existing.rows[0].employee_id,
      status,
    });

    res.status(200).json({
      success: true,
      message: `Pengajuan cuti berhasil di-${status.toLowerCase()}`,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getLeaves, requestLeave, updateLeaveStatus };