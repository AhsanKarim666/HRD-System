const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const db = require('../db');
const { generatePayroll } = require('../controllers/payrollController');
const { checkIn } = require('../controllers/attendanceController');
const { requestOvertime, updateOvertimeStatus } = require('../controllers/overtimeController');
const { requestLeave, updateLeaveStatus } = require('../controllers/leaveController');
const { calculateAnnualPph21, calculateMonthlyPph21 } = require('../utils/tax');

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
    assert.deepEqual(inserts[0], [1, '2026-10-01', 6000000, 500000, 250000, 83750, 6166250]);

    const excessiveDeduction = await invokeController(generatePayroll, {
      body: { employee_id: 1, month: 11, year: 2026, basic_salary: 500000, deductions: 600000 },
    });
    assert.equal(excessiveDeduction.statusCode, 400);

    const deductionExcludingPph = await invokeController(generatePayroll, {
      body: { employee_id: 1, month: 12, year: 2026, basic_salary: 6000000, deductions: 6000000 },
    });
    assert.equal(deductionExcludingPph.statusCode, 400);
    assert.equal(inserts.length, 1);
  } finally {
    db.query = originalQuery;
  }
});

test('monthly PPh 21 estimate applies TK/0 PTKP and the annual job-expense cap', () => {
  assert.equal(calculateMonthlyPph21(0), 0);
  assert.equal(calculateMonthlyPph21(5000000), 12500);
  assert.equal(calculateMonthlyPph21(6000000), 60000);
  assert.equal(calculateAnnualPph21(100000000), 9000000);
  assert.throws(() => calculateMonthlyPph21(-1), RangeError);
});

test('attendance lateness is measured against the assigned shift start', async () => {
  const originalQuery = db.query;
  let insertValues;
  db.query = async (query, values) => {
    if (query.includes('FROM employees e') && query.includes('LEFT JOIN attendances')) {
      return { rows: [{ attendance_id: null, shift_id: 7, start_time: '09:00:00' }] };
    }
    if (query.includes('INSERT INTO attendances')) {
      insertValues = values;
      return { rows: [{ id: 3, status: values[4], shift_id: values[1] }] };
    }
    throw new Error('Unexpected attendance query');
  };

  try {
    const response = await invokeController(checkIn, {
      user: { role: 'Manager' },
      body: { employee_id: 42, date: '2026-10-08', clock_in: '09:15:00' },
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data.status, 'Late');
    assert.deepEqual(insertValues, [42, 7, '2026-10-08', '09:15:00', 'Late']);
  } finally {
    db.query = originalQuery;
  }
});

test('overtime rejects invalid requests before writing and prevents duplicate approval', async () => {
  const originalQuery = db.query;
  let queryCount = 0;
  db.query = async (query) => {
    queryCount += 1;
    if (query.includes('INSERT INTO overtimes')) return { rows: [{ id: 6, status: 'Pending' }] };
    if (query.includes('UPDATE overtimes')) return { rows: [] };
    if (query.includes('SELECT status FROM overtimes')) return { rows: [{ status: 'Approved' }] };
    throw new Error('Unexpected overtime query');
  };

  try {
    const invalidRequest = await invokeController(requestOvertime, {
      user: { role: 'Employee', employee_id: 7 },
      body: { date: '2026-02-30', hours: 2, reason: 'Rilis' },
    });
    assert.equal(invalidRequest.statusCode, 400);
    assert.equal(queryCount, 0);

    const validRequest = await invokeController(requestOvertime, {
      user: { role: 'Employee', employee_id: 7 },
      body: { date: '2026-02-28', hours: 2.01, reason: 'Rilis' },
    });
    assert.equal(validRequest.statusCode, 201);
    assert.equal(queryCount, 1);

    const duplicateDecision = await invokeController(updateOvertimeStatus, {
      params: { id: '4' },
      body: { status: 'Rejected' },
      user: { id: 2, role: 'HRD' },
    });
    assert.equal(duplicateDecision.statusCode, 409);
    assert.equal(queryCount, 3);
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