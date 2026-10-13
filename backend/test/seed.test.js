const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const db = require('../db');
const { seed } = require('../src/seeders/seed');

after(async () => {
  await db.end();
});

test('automatic seeding skips populated databases and explicit seeding adds 12 employees', async () => {
  const originalConnect = db.connect;
  const clients = [];
  const employeeRows = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    nik: `DEMO-2026-${String(index + 1).padStart(3, '0')}`,
    shift_id: 1,
    status: 'Active',
    full_name: `Dummy ${index + 1}`,
    base_salary: '7000000',
  }));

  db.connect = async () => {
    const calls = [];
    const client = {
      calls,
      async query(query) {
        calls.push(query);
        if (query.includes('SELECT COUNT(*)::int AS total FROM users')) {
          return { rows: [{ total: 1 }] };
        }
        if (query.includes('SELECT e.id, e.nik, e.shift_id')) {
          return { rows: employeeRows };
        }
        return { rows: [] };
      },
      release() {},
    };
    clients.push(client);
    return client;
  };

  try {
    const automatic = await seed();
    assert.deepEqual(automatic, {
      seeded: false,
      message: 'Data pengguna sudah tersedia; seed dummy dilewati.',
    });

    const explicit = await seed({ includeDemoDataInPopulatedDatabase: true });
    assert.equal(explicit.seeded, true);
    assert.equal(explicit.employees, 12);
    assert.equal(clients[1].calls.filter((query) => query.includes('INSERT INTO employees')).length, 12);
    assert.equal(clients[1].calls.filter((query) => query.includes('INSERT INTO payroll')).length, 12);
    assert.ok(clients[1].calls.filter((query) => query.includes('INSERT INTO attendances')).length > 200);
    assert.ok(clients[1].calls.includes('COMMIT'));
  } finally {
    db.connect = originalConnect;
  }
});
