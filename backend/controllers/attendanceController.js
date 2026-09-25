const db = require('../db');

const normalizeDate = (value) => value || new Date().toISOString().slice(0, 10);

const getAttendances = async (req, res) => {
  const { date, employee_id } = req.query;
  const targetDate = normalizeDate(date);

  try {
    let query = `
      SELECT 
        a.id,
        a.employee_id,
        e.nik,
        e.full_name,
        d.name AS department_name,
        a.date,
        a.clock_in,
        a.clock_out,
        a.status
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1 = 1
    `;
    const params = [];

    if (targetDate) {
      params.push(targetDate);
      query += ` AND a.date = $${params.length}`;
    }

    if (employee_id) {
      params.push(employee_id);
      query += ` AND a.employee_id = $${params.length}`;
    }

    query += ' ORDER BY a.date DESC, a.clock_in DESC NULLS LAST';

    const result = await db.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayAttendance = async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const result = await db.query(
      `SELECT a.*, e.nik, e.full_name, d.name AS department_name
       FROM attendances a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE a.date = $1
       ORDER BY a.clock_in ASC NULLS LAST`,
      [today]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const checkIn = async (req, res) => {
  const { employee_id, date, clock_in } = req.body;
  const today = normalizeDate(date);
  const currentTime = clock_in || new Date().toTimeString().slice(0, 8);

  if (!employee_id) {
    return res.status(400).json({ success: false, message: 'Employee ID wajib disertakan!' });
  }

  try {
    const existing = await db.query(
      'SELECT * FROM attendances WHERE employee_id = $1 AND date = $2',
      [employee_id, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Karyawan sudah melakukan check-in hari ini!' });
    }

    const status = currentTime > '08:30:00' ? 'Late' : 'Present';

    const result = await db.query(
      `INSERT INTO attendances (employee_id, date, clock_in, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [employee_id, today, currentTime, status]
    );

    res.status(201).json({
      success: true,
      message: 'Check-in berhasil dicatat',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const checkOut = async (req, res) => {
  const { employee_id, date, clock_out } = req.body;
  const today = normalizeDate(date);
  const currentTime = clock_out || new Date().toTimeString().slice(0, 8);

  if (!employee_id) {
    return res.status(400).json({ success: false, message: 'Employee ID wajib disertakan!' });
  }

  try {
    const existing = await db.query(
      'SELECT * FROM attendances WHERE employee_id = $1 AND date = $2',
      [employee_id, today]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data check-in hari ini tidak ditemukan!' });
    }

    if (existing.rows[0].clock_out) {
      return res.status(400).json({ success: false, message: 'Karyawan sudah melakukan check-out hari ini!' });
    }

    const result = await db.query(
      `UPDATE attendances
       SET clock_out = $1
       WHERE employee_id = $2 AND date = $3
       RETURNING *`,
      [currentTime, employee_id, today]
    );

    res.status(200).json({
      success: true,
      message: 'Check-out berhasil dicatat',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAttendances, getTodayAttendance, checkIn, checkOut };