const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const db = require('../db');
const { generatePayroll } = require('../controllers/payrollController');
const { requestLeave, updateLeaveStatus } = require('../controllers/leaveController');

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

test('payroll rejects invalid periods and negative amounts before database writes', async () => {
  const originalQuery = db.query;
  let queryCount = 0;
  db.query = async () => {
    queryCount += 1;
    return { rows: [] };
  };

  try {
    const invalidPeriod = await invokeController(generatePayroll, {
      body: { employee_id: 1, month: 13, year: 2026 },
    });
    const negativeAllowance = await invokeController(generatePayroll, {
      body: { employee_id: 1, month: 10, year: 2026, allowances: -1 },
    });

    assert.equal(invalidPeriod.statusCode, 400);
    assert.equal(negativeAllowance.statusCode, 400);
    assert.equal(queryCount, 0);
  } finally {
    db.query = originalQuery;
  }
});

test('payroll uses the submitted salary and rejects deductions above gross pay', async () => {
  const originalQuery = db.query;
  const inserts = [];
  db.query = async (query, values) => {
    if (query.includes('SELECT id FROM payroll')) return { rows: [] };
    if (query.includes('SELECT e.id, pos.base_salary')) return { rows: [{ id: 1, base_salary: 5000000 }] };
    if (query.includes('INSERT INTO payroll')) {
      inserts.push(values);
      return { rows: [{ id: 1, net_salary: values[5] }] };
    }
    throw new Error('Unexpected payroll query');
  };

  try {
    const created = await invokeController(generatePayroll, {
      body: {
        employee_id: 1,
        month: 10,
        year: 2026,
        basic_salary: 6000000,
        allowances: 500000,
        deductions: 250000,
      },
    });
    assert.equal(created.statusCode, 201);
    assert.deepEqual(inserts[0], [1, '2026-10-01', 6000000, 500000, 250000, 6250000]);

    const excessiveDeduction = await invokeController(generatePayroll, {
      body: { employee_id: 1, month: 11, year: 2026, basic_salary: 500000, deductions: 600000 },
    });
    assert.equal(excessiveDeduction.statusCode, 400);
    assert.equal(inserts.length, 1);
  } finally {
    db.query = originalQuery;
  }
});

test('leave requests overlapping pending or approved leave are rejected', async () => {
  const originalQuery = db.query;
  let insertCalled = false;
  db.query = async (query) => {
    if (query.includes('status IN')) return { rows: [{ id: 4 }] };
    if (query.includes('INSERT INTO leaves')) insertCalled = true;
    return { rows: [] };
  };

  try {
    const response = await invokeController(requestLeave, {
      user: { role: 'HRD', id: 1 },
      body: {
        employee_id: 42,
        leave_type: 'Annual',
        start_date: '2026-10-05',
        end_date: '2026-10-07',
      },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(insertCalled, false);
  } finally {
    db.query = originalQuery;
  }
});

test('leave approval stores reviewer and review time, and rejects duplicate decisions', async () => {
  const originalQuery = db.query;
  let updateValues;
  let returnPending = true;
  db.query = async (query, values) => {
    if (query.includes('SELECT id, employee_id, start_date')) {
      return {
        rows: returnPending
          ? [{ id: 5, employee_id: 42, start_date: '2026-10-05', end_date: '2026-10-06', status: 'Pending' }]
          : [{ id: 5, employee_id: 42, start_date: '2026-10-05', end_date: '2026-10-06', status: 'Approved' }],
      };
    }
    if (query.includes("status = 'Approved'")) return { rows: [] };
    if (query.includes('UPDATE leaves')) {
      updateValues = values;
      return { rows: [{ id: 5, status: 'Approved', approver_id: values[1] }] };
    }
    if (query.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error('Unexpected leave query');
  };

  try {
    const approved = await invokeController(updateLeaveStatus, {
      params: { id: '5' },
      body: { status: 'Approved' },
      user: { id: 9, role: 'HRD' },
    });
    assert.equal(approved.statusCode, 200);
    assert.deepEqual(updateValues, ['Approved', 9, '5']);

    returnPending = false;
    const repeated = await invokeController(updateLeaveStatus, {
      params: { id: '5' },
      body: { status: 'Rejected' },
      user: { id: 9, role: 'HRD' },
    });
    assert.equal(repeated.statusCode, 409);
  } finally {
    db.query = originalQuery;
  }
});