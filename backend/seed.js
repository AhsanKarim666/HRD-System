const seeder = require('./src/seeders/seed');

if (require.main === module) {
  const { initDatabase } = require('./initDatabase');
  initDatabase()
    .then(() => seeder.seed({ includeDemoDataInPopulatedDatabase: true }))
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed gagal:', error.message);
      process.exit(1);
    });
}

module.exports = seeder;
