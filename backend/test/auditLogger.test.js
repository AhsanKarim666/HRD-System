const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const db = require('../db');
const { recordAudit } = require('../utils/auditLogger');

after(async () => {
  await db.end();
});

test('operational audit events are written to legacy and activity log tables', async () => {
  const originalQuery = db.query;
  const queries = [];
  db.query = async (query, values) => {
    queries.push({ query, values });
    return { rows: [] };
  };

  try {
    await recordAudit(
      { user: { id: 12, role: 'HRD' } },
      'payroll.generate',
      'payroll',
      81,
      { employee_id: 4, period: '2026-10-01' }
    );

    assert.match(queries[0].query, /INSERT INTO audit_logs/);
    assert.match(queries[1].query, /INSERT INTO activity_logs/);
    assert.deepEqual(queries[1].values.slice(0, 2), [12, 'payroll.generate']);
    assert.deepEqual(JSON.parse(queries[1].values[2]), {
      entity_type: 'payroll',
      entity_id: '81',
      employee_id: 4,
      period: '2026-10-01',
    });
  } finally {
    db.query = originalQuery;
  }
});
