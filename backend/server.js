const { initDatabase } = require('./initDatabase');
const { seed } = require('./seed');
const app = require('./index');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDatabase();
    await seed();
    app.listen(PORT, () => {
      console.log(`Server aktif berjalan di http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Gagal menjalankan server karena init database gagal:', error.message);
    process.exit(1);
  }
};

startServer();