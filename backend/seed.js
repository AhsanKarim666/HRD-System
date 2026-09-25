const db = require('./db');
const bcrypt = require('bcryptjs');

const departmentSeed = ['IT', 'HR', 'Finance', 'Marketing', 'Operations'];
const positionSeed = [
  { name: 'Software Engineer', base_salary: 9000000 },
  { name: 'HR Specialist', base_salary: 7000000 },
  { name: 'Accountant', base_salary: 8000000 },
  { name: 'Marketing Executive', base_salary: 6500000 },
  { name: 'Operations Lead', base_salary: 8500000 },
];

const employeeSeed = [
  { nik: 'EMP-1001', full_name: 'Alya Rahma', phone: '081234567890', hire_date: '2024-01-15', department_name: 'IT', position_name: 'Software Engineer', status: 'Active' },
  { nik: 'EMP-1002', full_name: 'Budi Santoso', phone: '081298765432', hire_date: '2023-08-10', department_name: 'HR', position_name: 'HR Specialist', status: 'Active' },
  { nik: 'EMP-1003', full_name: 'Citra Dewi', phone: '081255512345', hire_date: '2024-03-05', department_name: 'Finance', position_name: 'Accountant', status: 'Probation' },
];

async function seed() {
  try {
    const userCount = await db.query('SELECT COUNT(*)::int AS total FROM users');
    if (Number(userCount.rows[0]?.total || 0) > 0) {
      return { seeded: false, message: 'Users already exist.' };
    }

    for (const deptName of departmentSeed) {
      const exists = await db.query('SELECT id FROM departments WHERE name = $1 LIMIT 1', [deptName]);
      if (exists.rows.length === 0) {
        await db.query('INSERT INTO departments (name) VALUES ($1)', [deptName]);
      }
    }

    for (const position of positionSeed) {
      const exists = await db.query('SELECT id FROM positions WHERE name = $1 LIMIT 1', [position.name]);
      if (exists.rows.length === 0) {
        await db.query(
          'INSERT INTO positions (name, base_salary) VALUES ($1, $2)',
          [position.name, position.base_salary]
        );
      }
    }

    const deptRows = await db.query('SELECT id, name FROM departments');
    const positionRows = await db.query('SELECT id, name FROM positions');
    const deptMap = new Map(deptRows.rows.map((row) => [row.name, row.id]));
    const posMap = new Map(positionRows.rows.map((row) => [row.name, row.id]));

    for (const employee of employeeSeed) {
      const existing = await db.query('SELECT id FROM employees WHERE nik = $1 LIMIT 1', [employee.nik]);
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO employees (nik, full_name, phone, hire_date, department_id, position_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            employee.nik,
            employee.full_name,
            employee.phone,
            employee.hire_date,
            deptMap.get(employee.department_name),
            posMap.get(employee.position_name),
            employee.status,
          ]
        );
      }
    }

    const employeeRows = await db.query('SELECT id, nik FROM employees ORDER BY id');
    const hrdHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);

    const hrdExists = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', ['hrd@hris.corp']);
    if (hrdExists.rows.length === 0) {
      await db.query(
        'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ($1, $2, $3, $4, $5)',
        ['HR Administrator', 'hrd@hris.corp', hrdHash, 'HRD', employeeRows.rows[0]?.id || null]
      );
    }

    const managerExists = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', ['manager@hris.corp']);
    if (managerExists.rows.length === 0) {
      await db.query(
        'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ($1, $2, $3, $4, $5)',
        ['Manager', 'manager@hris.corp', managerHash, 'Manager', employeeRows.rows[1]?.id || null]
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    for (let i = 0; i < employeeRows.rows.length; i += 1) {
      const workflow = i === 0
        ? { clock_in: '08:15:00', clock_out: '17:30:00', status: 'Present' }
        : { clock_in: '08:45:00', clock_out: '17:45:00', status: 'Late' };

      const attendanceExists = await db.query(
        'SELECT id FROM attendances WHERE employee_id = $1 AND date = $2 LIMIT 1',
        [employeeRows.rows[i].id, today]
      );

      if (attendanceExists.rows.length === 0) {
        await db.query(
          `INSERT INTO attendances (employee_id, date, clock_in, clock_out, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [employeeRows.rows[i].id, today, workflow.clock_in, workflow.clock_out, workflow.status]
        );
      }
    }

    if (employeeRows.rows[0]) {
      const leaveCheck = await db.query(
        'SELECT id FROM leaves WHERE employee_id = $1 AND start_date = $2 AND end_date = $3 LIMIT 1',
        [employeeRows.rows[0].id, today, tomorrow]
      );

      if (leaveCheck.rows.length === 0) {
        await db.query(
          `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
           VALUES ($1, 'Annual', $2, $3, 'Keperluan keluarga', 'Pending')`,
          [employeeRows.rows[0].id, today, tomorrow]
        );
      }
    }

    console.log('Seed data inserted successfully.');
    return { seeded: true, message: 'Seed data inserted successfully.' };
  } catch (error) {
    console.error('Seed failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed };
