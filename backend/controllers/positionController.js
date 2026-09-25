const db = require('../db');

// Ambil semua data posisi/jabatan
const getPositions = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM positions ORDER BY id ASC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tambah jabatan baru
const createPosition = async (req, res) => {
  const { name, base_salary } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama jabatan wajib diisi!' });
  }

  try {
    const result = await db.query(
      'INSERT INTO positions (name, base_salary) VALUES ($1, $2) RETURNING *',
      [name, base_salary || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPositions, createPosition };