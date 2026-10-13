const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseReportPeriod, toCsv } = require('../utils/csv');

test('CSV export escapes quoted fields and neutralizes spreadsheet formulas', () => {
  const csv = toCsv(
    [
      { key: 'name', label: 'Nama' },
      { key: 'note', label: 'Catatan' },
    ],
    [{ name: '=2+3', note: 'HR, "Payroll"' }]
  );

  assert.equal(csv, '"Nama","Catatan"\r\n"\'=2+3","HR, ""Payroll"""');
});

test('monthly report period accepts valid month and year only', () => {
  assert.deepEqual(parseReportPeriod('2', '2026'), {
    month: 2,
    year: 2026,
    startDate: '2026-02-01',
  });
  assert.equal(parseReportPeriod('13', '2026'), null);
  assert.equal(parseReportPeriod('1', '1999'), null);
  assert.equal(parseReportPeriod('1.5', '2026'), null);
});
