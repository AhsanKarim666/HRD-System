const bcrypt = require('bcryptjs');
const db = require('../../db');
const { calculateMonthlyPph21 } = require('../../utils/tax');

const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations'];
const positions = [
  { name: 'Software Engineer', baseSalary: 9000000 },
  { name: 'HR Specialist', baseSalary: 7000000 },
  { name: 'Accountant', baseSalary: 8000000 },
  { name: 'Marketing Executive', baseSalary: 6500000 },
  { name: 'Operations Lead', baseSalary: 8500000 },
];
const shifts = [
  { name: 'Reguler', start: '08:30', end: '17:30' },
  { name: 'Pagi', start: '07:00', end: '15:00' },
  { name: 'Siang', start: '13:00', end: '21:00' },
];
const employees = [
  ['DEMO-2026-001', 'Alya Rahma', '081234567801', '2022-01-10', 'IT', 'Software Engineer', 'Reguler', 'Active'],
  ['DEMO-2026-002', 'Budi Santoso', '081234567802', '2021-05-17', 'HR', 'HR Specialist', 'Reguler', 'Active'],
  ['DEMO-2026-003', 'Citra Dewi', '081234567803', '2023-03-06', 'Finance', 'Accountant', 'Pagi', 'Active'],
  ['DEMO-2026-004', 'Dimas Pratama', '081234567804', '2020-11-23', 'Marketing', 'Marketing Executive', 'Reguler', 'Active'],
  ['DEMO-2026-005', 'Eka Putri', '081234567805', '2024-02-12', 'Operations', 'Operations Lead', 'Siang', 'Active'],
  ['DEMO-2026-006', 'Farhan Akbar', '081234567806', '2022-07-04', 'IT', 'Software Engineer', 'Pagi', 'Active'],
  ['DEMO-2026-007', 'Gita Maharani', '081234567807', '2023-09-18', 'HR', 'HR Specialist', 'Reguler', 'Active'],
  ['DEMO-2026-008', 'Hendra Wijaya', '081234567808', '2021-12-01', 'Finance', 'Accountant', 'Siang', 'Active'],
  ['DEMO-2026-009', 'Intan Permata', '081234567809', '2024-04-15', 'Marketing', 'Marketing Executive', 'Pagi', 'Probation'],
  ['DEMO-2026-010', 'Joko Firmansyah', '081234567810', '2020-08-20', 'Operations', 'Operations Lead', 'Reguler', 'Active'],
  ['DEMO-2026-011', 'Kartika Sari', '081234567811', '2022-10-03', 'IT', 'Software Engineer', 'Siang', 'Active'],
  ['DEMO-2026-012', 'Lukman Hakim', '081234567812', '2023-06-26', 'HR', 'HR Specialist', 'Pagi', 'Active'],
];

const dateString = (date) => date.toISOString().slice(0, 10);

const seed = async ({ includeDemoDataInPopulatedDatabase = false } = {}) => {
  const client = await db.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const userCount = await client.query('SELECT COUNT(*)::int AS total FROM users');
    if (Number(userCount.rows[0]?.total || 0) > 0 && !includeDemoDataInPopulatedDatabase) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { seeded: false, message: 'Data pengguna sudah tersedia; seed dummy dilewati.' };
    }

    for (const name of departments) {
      await client.query('INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }
    for (const position of positions) {
      await client.query(
        'INSERT INTO positions (name, base_salary) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [position.name, position.baseSalary]
      );
    }
    for (const shift of shifts) {
      await client.query(
        `INSERT INTO shifts (shift_name, start_time, end_time)
         VALUES ($1, $2, $3)
         ON CONFLICT (shift_name) DO NOTHING`,
        [shift.name, shift.start, shift.end]
      );
    }

    for (const employee of employees) {
      await client.query(
        `INSERT INTO employees (nik, full_name, phone, hire_date, department_id, position_id, shift_id, status)
         SELECT $1, $2, $3, $4, d.id, p.id, s.id, $8
         FROM departments d
         CROSS JOIN positions p
         CROSS JOIN shifts s
         WHERE d.name = $5 AND p.name = $6 AND s.shift_name = $7
         ON CONFLICT (nik) DO NOTHING`,
        employee
      );
    }

    const employeeRows = await client.query(
      `SELECT e.id, e.nik, e.shift_id, e.status, e.full_name, p.base_salary
       FROM employees e
       JOIN positions p ON p.id = e.position_id
       WHERE e.nik = ANY($1::text[])
       ORDER BY e.nik`,
      [employees.map(([nik]) => nik)]
    );

    const hrdHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, employee_id)
       VALUES ('HR Administrator', 'hrd@hris.corp', $1, 'HRD', $2)
       ON CONFLICT DO NOTHING`,
      [hrdHash, employeeRows.rows[0]?.id || null]
    );
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, employee_id)
       VALUES ('Manager', 'manager@hris.corp', $1, 'Manager', $2)
       ON CONFLICT DO NOTHING`,
      [managerHash, employeeRows.rows[1]?.id || null]
    );

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - daysAgo);
      if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
      const attendanceDate = dateString(date);

      for (const [index, employee] of employeeRows.rows.entries()) {
        const attendancePattern = (daysAgo + index) % 20;
        const status = attendancePattern === 0
          ? 'Absent'
          : attendancePattern < 4 ? 'Late' : 'Present';
        const clockIn = status === 'Absent' ? null : status === 'Late' ? '09:05:00' : '08:20:00';
        const clockOut = status === 'Absent' ? null : '17:30:00';
        await client.query(
          `INSERT INTO attendances (employee_id, shift_id, date, clock_in, clock_out, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (employee_id, date) DO NOTHING`,
          [employee.id, employee.shift_id, attendanceDate, clockIn, clockOut, status]
        );
      }
    }

    const currentPeriod = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-01`;
    for (const [index, employee] of employeeRows.rows.entries()) {
      const basicSalary = Number(employee.base_salary) || 0;
      const allowances = 250000 + (index % 4) * 100000;
      const deductions = 50000 + (index % 3) * 25000;
      const pph21 = calculateMonthlyPph21(basicSalary + allowances);
      const netSalary = basicSalary + allowances - deductions - pph21;
      await client.query(
        `INSERT INTO payroll
           (employee_id, period, basic_salary, allowances, deductions, pph21, net_salary, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (employee_id, period) DO NOTHING`,
        [employee.id, currentPeriod, basicSalary, allowances, deductions, pph21, netSalary, index % 2 === 0 ? 'Paid' : 'Unpaid']
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return { seeded: true, employees: employeeRows.rows.length };
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  const { initDatabase } = require('../../initDatabase');
  initDatabase()
    .then(() => seed({ includeDemoDataInPopulatedDatabase: true }))
    .then((result) => {
      console.log(result.message || `Seed berhasil: ${result.employees} karyawan dummy.`);
      return db.end();
    })
    .catch(async (error) => {
      console.error('Seed gagal:', error.message);
      await db.end();
      process.exitCode = 1;
    });
}

module.exports = { seed };
