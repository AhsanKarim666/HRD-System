const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

const normalizeDate = (value) => value || new Date().toISOString().slice(0, 10);

const getAttendances = async (req, res) => {
  const { date, employee_id } = req.query;
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && !userEmployeeId) {
    return res.status(403).json({ success: false, message: 'Akun karyawan belum terhubung ke data karyawan.' });
  }
  if (userEmployeeId && employee_id && String(employee_id) !== String(userEmployeeId)) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk data absensi sendiri.' });
  }
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
        a.shift_id,
        s.shift_name,
        s.start_time AS shift_start_time,
        s.end_time AS shift_end_time,
        a.clock_in,
        a.clock_out,
        a.status
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON a.shift_id = s.id
      WHERE 1 = 1
    `;
    const params = [];

    if (targetDate) {
      params.push(targetDate);
      query += ` AND a.date = $${params.length}`;
    }

    const targetEmployeeId = userEmployeeId || employee_id;
    if (targetEmployeeId) {
      params.push(targetEmployeeId);
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
  const userEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : null;
  if (req.user.role === 'Employee' && !userEmployeeId) {
    return res.status(403).json({ success: false, message: 'Akun karyawan belum terhubung ke data karyawan.' });
  }
  try {
    const values = [today];
    const employeeFilter = userEmployeeId ? ` AND a.employee_id = $${values.push(userEmployeeId)}` : '';
    const result = await db.query(
      `SELECT a.*, e.nik, e.full_name, d.name AS department_name,
              s.shift_name, s.start_time AS shift_start_time, s.end_time AS shift_end_time
       FROM attendances a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN shifts s ON s.id = a.shift_id
       WHERE a.date = $1${employeeFilter}
       ORDER BY a.clock_in ASC NULLS LAST`,
      values
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const checkIn = async (req, res) => {
  const { employee_id, date, clock_in } = req.body;
  const targetEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : employee_id;
  const isEmployee = req.user.role === 'Employee';
  const today = isEmployee ? new Date().toISOString().slice(0, 10) : normalizeDate(date);
  const currentTime = isEmployee ? new Date().toTimeString().slice(0, 8) : clock_in || new Date().toTimeString().slice(0, 8);

  if (req.user.role === 'Employee' && (!targetEmployeeId || (employee_id && String(employee_id) !== String(targetEmployeeId)))) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk absensi sendiri.' });
  }

  if (!targetEmployeeId) {
    return res.status(400).json({ success: false, message: 'Employee ID wajib disertakan!' });
  }

  try {
    const existing = await db.query(
      `SELECT a.id AS attendance_id, e.shift_id, s.start_time
       FROM employees e
       LEFT JOIN shifts s ON s.id = e.shift_id
       LEFT JOIN attendances a ON a.employee_id = e.id AND a.date = $2
       WHERE e.id = $1`,
      [targetEmployeeId, today]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data karyawan tidak ditemukan!' });
    }
    if (existing.rows[0].attendance_id) {
      return res.status(400).json({ success: false, message: 'Karyawan sudah melakukan check-in hari ini!' });
    }

    const assignedShiftId = existing.rows[0]?.shift_id || null;
    const scheduledStart = existing.rows[0]?.start_time;
    const shiftStartTime = scheduledStart
      ? String(scheduledStart).slice(0, 8)
      : '08:30:00';
    const status = currentTime > shiftStartTime ? 'Late' : 'Present';

    const result = await db.query(
      `INSERT INTO attendances (employee_id, shift_id, date, clock_in, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [targetEmployeeId, assignedShiftId, today, currentTime, status]
    );
    await recordAudit(req, 'attendance.check_in', 'attendance', result.rows[0].id, {
      employee_id: targetEmployeeId,
      date: today,
      status,
    });

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
  const targetEmployeeId = req.user.role === 'Employee' ? req.user.employee_id : employee_id;
  const isEmployee = req.user.role === 'Employee';
  const today = isEmployee ? new Date().toISOString().slice(0, 10) : normalizeDate(date);
  const currentTime = isEmployee ? new Date().toTimeString().slice(0, 8) : clock_out || new Date().toTimeString().slice(0, 8);

  if (req.user.role === 'Employee' && (!targetEmployeeId || (employee_id && String(employee_id) !== String(targetEmployeeId)))) {
    return res.status(403).json({ success: false, message: 'Akses hanya diizinkan untuk absensi sendiri.' });
  }

  if (!targetEmployeeId) {
    return res.status(400).json({ success: false, message: 'Employee ID wajib disertakan!' });
  }

  try {
    const existing = await db.query(
      'SELECT * FROM attendances WHERE employee_id = $1 AND date = $2',
      [targetEmployeeId, today]
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
      [currentTime, targetEmployeeId, today]
    );
    await recordAudit(req, 'attendance.check_out', 'attendance', result.rows[0].id, {
      employee_id: targetEmployeeId,
      date: today,
    });

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