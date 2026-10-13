const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const db = require('../db');
const { exportAttendances } = require('../controllers/attendanceController');
const { exportPayrolls } = require('../controllers/payrollController');

after(async () => {
  await db.end();
});

const invokeExport = async (controller, query) => {
  const response = { headers: {}, statusCode: null, body: null };
  const res = {
    set(headers) {
      response.headers = headers;
      return this;
    },
    status(statusCode) {
      response.statusCode = statusCode;
      return this;
    },
    send(body) {
      response.body = body;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
  };
  await controller({ query }, res);
  return response;
};

test('monthly attendance and payroll exports return UTF-8 CSV attachments', async () => {
  const originalQuery = db.query;
  const queries = [];
  db.query = async (query, values) => {
    queries.push({ query, values });
    return {
      rows: query.includes('FROM attendances')
        ? [{ date: '2026-10-02', full_name: 'Alya Rahma', status: 'Present' }]
        : [{ period: '2026-10-01', full_name: 'Alya Rahma', net_salary: '8000000' }],
    };
  };

  try {
    const attendance = await invokeExport(exportAttendances, { month: '10', year: '2026' });
    const payroll = await invokeExport(exportPayrolls, { month: '10', year: '2026' });

    assert.equal(attendance.statusCode, 200);
    assert.equal(attendance.headers['Content-Type'], 'text/csv; charset=utf-8');
    assert.match(attendance.headers['Content-Disposition'], /rekap-presensi-2026-10\.csv/);
    assert.match(attendance.body, /^\uFEFF"Tanggal"/);
    assert.match(attendance.body, /"2026-10-02",""/);

    assert.equal(payroll.statusCode, 200);
    assert.match(payroll.headers['Content-Disposition'], /rekap-penggajian-2026-10\.csv/);
    assert.match(payroll.body, /"2026-10-01",""/);
    assert.deepEqual(queries.map(({ values }) => values), [['2026-10-01'], ['2026-10-01']]);
  } finally {
    db.query = originalQuery;
  }
});

test('monthly CSV exports reject invalid periods without querying the database', async () => {
  const originalQuery = db.query;
  let queryCount = 0;
  db.query = async () => {
    queryCount += 1;
    return { rows: [] };
  };

  try {
    const attendance = await invokeExport(exportAttendances, { month: '13', year: '2026' });
    const payroll = await invokeExport(exportPayrolls, { month: '2', year: '1999' });
    assert.equal(attendance.statusCode, 400);
    assert.equal(payroll.statusCode, 400);
    assert.equal(queryCount, 0);
  } finally {
    db.query = originalQuery;
  }
});
