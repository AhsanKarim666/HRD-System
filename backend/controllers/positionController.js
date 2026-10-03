const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

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
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const baseSalary = req.body.base_salary === undefined ? 0 : Number(req.body.base_salary);
  if (!name || name.length > 100 || !Number.isFinite(baseSalary) || baseSalary < 0) {
    return res.status(400).json({ success: false, message: 'Nama jabatan dan gaji pokok yang valid wajib diisi.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO positions (name, base_salary) VALUES ($1, $2) RETURNING *',
      [name, baseSalary]
    );
    await recordAudit(req, 'position.create', 'position', result.rows[0].id);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama jabatan sudah digunakan.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePosition = async (req, res) => {
  const { name, base_salary } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const baseSalary = Number(base_salary);
  if (!normalizedName || normalizedName.length > 100 || !Number.isFinite(baseSalary) || baseSalary < 0) {
    return res.status(400).json({ success: false, message: 'Nama jabatan dan gaji pokok yang valid wajib diisi.' });
  }

  try {
    const result = await db.query(
      'UPDATE positions SET name = $1, base_salary = $2 WHERE id = $3 RETURNING *',
      [normalizedName, baseSalary, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Jabatan tidak ditemukan.' });
    }
    await recordAudit(req, 'position.update', 'position', req.params.id);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama jabatan sudah digunakan.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePosition = async (req, res) => {
  try {
    const usage = await db.query(
      'SELECT EXISTS (SELECT 1 FROM employees WHERE position_id = $1) AS in_use',
      [req.params.id]
    );
    if (usage.rows[0].in_use) {
      return res.status(409).json({ success: false, message: 'Jabatan masih digunakan oleh karyawan.' });
    }

    const result = await db.query('DELETE FROM positions WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Jabatan tidak ditemukan.' });
    }
    await recordAudit(req, 'position.delete', 'position', req.params.id);
    res.status(200).json({ success: true, message: 'Jabatan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPositions, createPosition, updatePosition, deletePosition };