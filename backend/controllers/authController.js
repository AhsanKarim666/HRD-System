const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../middlewares/authMiddleware');
const { recordAudit } = require('../utils/auditLogger');

const register = async (req, res) => {
  const { name, email, password, role, employee_id } = req.body;
  const assignedRole = role || 'Employee';

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi!' });
  }

  if (!['HRD', 'Manager', 'Employee'].includes(assignedRole)) {
    return res.status(400).json({ success: false, message: 'Role pengguna tidak valid!' });
  }

  try {
    const userExist = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, employee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, employee_id`,
      [name, email, hashedPassword, assignedRole, employee_id || null]
    );
    await recordAudit(req, 'user.register', 'user', result.rows[0].id, {
      role: assignedRole,
      employee_id: employee_id || null,
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi pengguna berhasil',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi!' });
  }

  try {
    const query = `
      SELECT u.*, e.full_name AS employee_name
      FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      WHERE LOWER(u.email) = LOWER($1)
    `;

    const userResult = await db.query(query, [email.trim()]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid!' });
    }

    const storedHash = user.password_hash || user.password;
    let isValid = false;

    if (storedHash) {
      if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        isValid = await bcrypt.compare(password, storedHash).catch(() => false);
      } else {
        isValid = password === storedHash;
      }
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid!' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        employee_id: user.employee_id,
      },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name || user.employee_name,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login };