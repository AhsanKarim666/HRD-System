const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

const isValidTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

const getShifts = async (req, res) => {
  try {
    const result = await db.query('SELECT id, shift_name, start_time, end_time FROM shifts ORDER BY start_time, id');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createShift = async (req, res) => {
  const { shift_name, start_time, end_time } = req.body;
  if (typeof shift_name !== 'string' || !shift_name.trim() || shift_name.trim().length > 100 ||
      !isValidTime(start_time) || !isValidTime(end_time)) {
    return res.status(400).json({
      success: false,
      message: 'Nama shift (maksimal 100 karakter), jam mulai, dan jam selesai yang valid wajib diisi.',
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO shifts (shift_name, start_time, end_time)
       VALUES ($1, $2, $3) RETURNING *`,
      [shift_name.trim(), start_time, end_time]
    );
    await recordAudit(req, 'shift.create', 'shift', result.rows[0].id);
    res.status(201).json({ success: true, message: 'Shift berhasil dibuat.', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama shift sudah digunakan.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShift = async (req, res) => {
  const { id } = req.params;
  const { shift_name, start_time, end_time } = req.body;
  if ((shift_name !== undefined && (typeof shift_name !== 'string' || !shift_name.trim() || shift_name.trim().length > 100)) ||
      (start_time !== undefined && !isValidTime(start_time)) ||
      (end_time !== undefined && !isValidTime(end_time))) {
    return res.status(400).json({ success: false, message: 'Nama atau jam shift tidak valid.' });
  }

  try {
    const result = await db.query(
      `UPDATE shifts
       SET shift_name = COALESCE($1, shift_name),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time)
       WHERE id = $4 RETURNING *`,
      [shift_name === undefined ? null : shift_name.trim(), start_time || null, end_time || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data shift tidak ditemukan.' });
    }
    await recordAudit(req, 'shift.update', 'shift', id);
    res.status(200).json({ success: true, message: 'Shift berhasil diperbarui.', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama shift sudah digunakan.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteShift = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM shifts WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data shift tidak ditemukan.' });
    }
    await recordAudit(req, 'shift.delete', 'shift', req.params.id);
    res.status(200).json({ success: true, message: 'Shift berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getShifts, createShift, updateShift, deleteShift };
