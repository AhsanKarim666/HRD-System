const db = require('../db');

// 1. Ambil Semua Pengajuan Cuti (Bisa difilter status / employee_id)
const getLeaves = async (req, res) => {
  const { status, employee_id } = req.query;
  try {
    let query = `
      SELECT 
        l.id,
        l.employee_id,
        e.nik,
        e.full_name,
        d.name AS department_name,
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

    if (employee_id) {
      params.push(employee_id);
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

  if (!employee_id || !start_date || !end_date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Employee ID, tanggal mulai, dan tanggal selesai wajib diisi!' 
    });
  }

  try {
    const query = `
      INSERT INTO leaves (employee_id, start_date, end_date, reason, status)
      VALUES ($1, $2, $3, $4, 'Pending')
      RETURNING *
    `;
    const values = [employee_id, start_date, end_date, reason || null];

    const result = await db.query(query, values);
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
    const result = await db.query(
      'UPDATE leaves SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pengajuan cuti tidak ditemukan' });
    }

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