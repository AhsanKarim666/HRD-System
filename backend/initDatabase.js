const db = require('./db');

async function initDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        base_salary NUMERIC(12,2) NOT NULL DEFAULT 0
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        nik VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        hire_date DATE NOT NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Probation', 'Inactive'))
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255),
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('HRD', 'Manager', 'Employee')) DEFAULT 'Employee',
        employee_id INTEGER UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    `);

    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS employee_id INTEGER UNIQUE REFERENCES employees(id) ON DELETE SET NULL;
    `);
    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS name VARCHAR(150);
    `);
    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email VARCHAR(150);
    `);
    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'Employee';
    `);
    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await db.query(`
      UPDATE users
      SET password_hash = COALESCE(password_hash, password)
      WHERE password_hash IS NULL AND password IS NOT NULL;
    `);

    await db.query(`
      UPDATE users
      SET password = COALESCE(password, password_hash)
      WHERE password IS NULL AND password_hash IS NOT NULL;
    `);

    await db.query(`
      UPDATE users
      SET name = COALESCE(name, 'User'),
          email = COALESCE(email, CONCAT('user', id, '@local.test')),
          password_hash = COALESCE(password_hash, ''),
          role = COALESCE(role, 'Employee')
      WHERE name IS NULL OR email IS NULL OR password_hash IS NULL OR role IS NULL;
    `);

    await db.query(`
      ALTER TABLE users
        ALTER COLUMN name SET NOT NULL,
        ALTER COLUMN email SET NOT NULL,
        ALTER COLUMN password_hash SET NOT NULL;
    `);

    await db.query(`
      ALTER TABLE users
        ALTER COLUMN password DROP NOT NULL;
    `);

    const dedupeTableValues = async (tableName, columnName) => {
      await db.query(`
        WITH ranked AS (
          SELECT ctid,
                 ROW_NUMBER() OVER (PARTITION BY ${columnName} ORDER BY id) AS rn
          FROM ${tableName}
        )
        DELETE FROM ${tableName}
        WHERE ctid IN (
          SELECT ctid FROM ranked WHERE rn > 1
        );
      `);
    };

    await dedupeTableValues('departments', 'name');
    await dedupeTableValues('positions', 'name');
    await dedupeTableValues('employees', 'nik');
    await dedupeTableValues('users', 'email');

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS departments_name_unique_idx ON public.departments (name);
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS positions_name_unique_idx ON public.positions (name);
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS employees_nik_unique_idx ON public.employees (nik);
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users (email);
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        clock_in TIME,
        clock_out TIME,
        status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Absent')),
        UNIQUE (employee_id, date)
      );
    `);

    await db.query(`
      ALTER TABLE attendances
        ADD COLUMN IF NOT EXISTS clock_in TIME,
        ADD COLUMN IF NOT EXISTS clock_out TIME;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL DEFAULT 'Annual',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (employee_id, start_date, end_date)
      );
    `);

    await db.query(`
      ALTER TABLE leaves
        ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50) NOT NULL DEFAULT 'Annual';
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        period VARCHAR(20) NOT NULL,
        basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
        allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
        deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
        net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid')),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (employee_id, period)
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
      CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
      CREATE INDEX IF NOT EXISTS idx_attendances_employee_date ON attendances(employee_id, date);
      CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
      CREATE INDEX IF NOT EXISTS idx_payroll_employee_period ON payroll(employee_id, period);
    `);

    console.log('Database schema initialized successfully.');
    return true;
  } catch (error) {
    console.error('Failed to initialize database schema:', error.message);
    throw error;
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initDatabase };
