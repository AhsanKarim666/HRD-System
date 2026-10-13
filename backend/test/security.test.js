process.env.JWT_SECRET = 'test-secret-for-hris-security-suite';

const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const jwt = require('jsonwebtoken');
const db = require('../db');
const app = require('../index');
const { getJwtSecret } = require('../middlewares/authMiddleware');
const { getAttendances, checkIn } = require('../controllers/attendanceController');
const { getLeaves, requestLeave } = require('../controllers/leaveController');
const { getPayrolls } = require('../controllers/payrollController');
process.env.JWT_SECRET = 'test-secret-for-hris-security-suite';

after(async () => {
  await db.end();
});

const invokeController = async (controller, req) => {
  const response = {};
  const res = {
    status(statusCode) {
      response.statusCode = statusCode;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
  };

  await controller(req, res);
  return response;
};

test('JWT secret must be at least 32 bytes', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'too-short';
  assert.throws(() => getJwtSecret(), /minimal 32 karakter/);
  process.env.JWT_SECRET = 'x'.repeat(32);
  assert.equal(getJwtSecret().length, 32);
  process.env.JWT_SECRET = originalSecret;
});

test('admin endpoints reject requests without a token', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const checks = [
      ['GET', '/api/departments', 401],
      ['GET', '/api/positions', 401],
      ['GET', '/api/employees', 401],
      ['GET', '/api/attendance', 401],
      ['GET', '/api/leaves', 401],
      ['GET', '/api/payroll', 401],
      ['GET', '/api/dashboard/stats', 401],
      ['GET', '/api/audit-logs', 401],
      ['POST', '/api/auth/register', 401],
      ['POST', '/api/employees/seed-master-data', 404],
    ];

    for (const [method, path, expectedStatus] of checks) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? '{}' : undefined,
      });
      assert.equal(response.status, expectedStatus, `${method} ${path}`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('Employee tokens cannot use management endpoints', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const token = jwt.sign(
    { id: 9, role: 'Employee', employee_id: 42 },
    process.env.JWT_SECRET
  );

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const checks = [
      ['GET', '/api/employees'],
      ['POST', '/api/auth/register'],
      ['POST', '/api/departments'],
      ['POST', '/api/positions'],
      ['GET', '/api/dashboard/stats'],
      ['GET', '/api/audit-logs'],
    ];

    for (const [method, path] of checks) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? '{}' : undefined,
      });
      assert.equal(response.status, 403, `${method} ${path}`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('Employee attendance and leave queries are scoped to the token employee id', async () => {
  const originalQuery = db.query;
  const queries = [];
  db.query = async (query, values) => {
    queries.push({ query, values });
    return { rows: [] };
  };

  try {
    const user = { role: 'Employee', employee_id: 42 };
    await invokeController(getAttendances, { user, query: { date: '2026-10-03' } });
    await invokeController(getLeaves, { user, query: {} });

    assert.match(queries[0].query, /a\.employee_id = \$2/);
    assert.deepEqual(queries[0].values, ['2026-10-03', 42]);
    assert.match(queries[1].query, /l\.employee_id = \$1/);
    assert.deepEqual(queries[1].values, [42]);
  } finally {
    db.query = originalQuery;
  }
});

test('Employee payroll query is scoped and another employee cannot be impersonated', async () => {
  const originalQuery = db.query;
  let observedQuery;
  db.query = async (query, values) => {
    observedQuery = { query, values };
    return { rows: [] };
  };

  try {
    await invokeController(getPayrolls, {
      user: { role: 'Employee', employee_id: 42 },
      query: {},
    });
    assert.match(observedQuery.query, /p\.employee_id = \$1/);
    assert.deepEqual(observedQuery.values, [42]);

    const response = await invokeController(checkIn, {
      user: { role: 'Employee', employee_id: 42 },
      body: { employee_id: 99 },
    });
    assert.equal(response.statusCode, 403);
  } finally {
    db.query = originalQuery;
  }
});

test('Employee check-in uses server date and time instead of request values', async () => {
  const originalQuery = db.query;
  const OriginalDate = global.Date;
  const fixedTimestamp = '2026-10-03T06:12:34.000Z';
  const expectedDate = new OriginalDate(fixedTimestamp).toISOString().slice(0, 10);
  const expectedTime = new OriginalDate(fixedTimestamp).toTimeString().slice(0, 8);
  const queries = [];
  global.Date = class extends OriginalDate {
    constructor(...args) {
      super(...(args.length ? args : [fixedTimestamp]));
    }
  };
  db.query = async (query, values) => {
    queries.push({ query, values });
    return { rows: query.includes('FROM employees e') ? [{ attendance_id: null }] : [{ id: 1 }] };
  };

  try {
    const response = await invokeController(checkIn, {
      user: { role: 'Employee', employee_id: 42 },
      body: { employee_id: 42, date: '1999-01-01', clock_in: '01:02:03' },
    });
    assert.equal(response.statusCode, 201);
    assert.deepEqual(queries[0].values, [42, expectedDate]);
    const expectedStatus = expectedTime > '08:30:00' ? 'Late' : 'Present';
    assert.deepEqual(queries[1].values, [42, null, expectedDate, expectedTime, expectedStatus]);
  } finally {
    db.query = originalQuery;
    global.Date = OriginalDate;
  }
});

test('Employee cannot submit leave for another employee', async () => {
  const originalQuery = db.query;
  let queryCalled = false;
  db.query = async () => {
    queryCalled = true;
    return { rows: [] };
  };

  try {
    const response = await invokeController(requestLeave, {
      user: { role: 'Employee', employee_id: 42 },
      body: {
        employee_id: 99,
        leave_type: 'Annual',
        start_date: '2026-10-05',
        end_date: '2026-10-06',
      },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(queryCalled, false);
  } finally {
    db.query = originalQuery;
  }
});