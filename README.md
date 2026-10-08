# HRD System

Sistem manajemen sumber daya manusia (HRD) berbasis web yang dirancang untuk membantu pengelolaan data karyawan, kehadiran, cuti, penggajian, serta analisis performa pegawai secara digital.

## Deskripsi Proyek

Proyek ini dibuat sebagai prototype aplikasi HRIS (Human Resource Information System) untuk mempermudah proses administrasi HRD secara terintegrasi dalam satu platform. Aplikasi ini mencakup beberapa modul utama seperti:

- Manajemen karyawan
- Manajemen departemen dan jabatan, termasuk gaji pokok default per jabatan
- Presensi dan kehadiran
- Pengelolaan shift kerja dan presensi berdasarkan jam mulai shift
- Pengajuan dan approval cuti dengan pencegahan jadwal tumpang tindih
- Pengajuan, approval, dan rekap jam lembur harian
- Payroll / gaji karyawan
- Estimasi PPh 21 pada slip payroll
- Riwayat audit untuk perubahan operasional
- Dashboard ringkasan operasional
- Review performa karyawan berbasis AI

## Tujuan

- Mempermudah pengelolaan data karyawan
- Meningkatkan efisiensi proses kehadiran dan cuti
- Memudahkan proses pembayaran gaji
- Menyediakan ringkasan performa harian/bulanan untuk kebutuhan HRD
- Menjadi dasar pengembangan sistem HR digital yang lebih lengkap di masa depan

## Stack Teknologi

### Frontend
- React
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT untuk autentikasi
- bcryptjs untuk hashing password

### Integrasi AI
- Google Gemini API

## Struktur Proyek

```bash
hrd-system/
├── backend/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── db.js
│   ├── index.js
│   ├── initDatabase.js
│   ├── seed.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── README.md
├── README.md
└── .gitignore
```

## Fitur Utama

### 1. Autentikasi
- Login untuk role HRD, Manager, dan Employee
- Token JWT untuk sesi pengguna
- Middleware autentikasi untuk proteksi route

### 2. Manajemen Karyawan
- Data karyawan lengkap
- Relasi dengan departemen dan posisi
- Status karyawan: Active, Probation, Inactive

### 3. Kehadiran
- Input tanggal masuk dan pulang
- Status kehadiran: Present, Late, Absent
- Rekap kehadiran per karyawan

### 4. Cuti
- Pengajuan cuti
- Status approval: Pending, Approved, Rejected
- Data approver untuk keperluan persetujuan

### 5. Payroll
- Rekap gaji dasar, tunjangan, potongan lain, estimasi PPh 21, dan gaji bersih
- Status pembayaran: Paid / Unpaid

### 6. Shift dan lembur
- Shift Reguler (08:30-17:30) disiapkan otomatis; HRD/Manager dapat mengelola shift serta menetapkannya pada karyawan.
- Status terlambat mengikuti jam mulai shift; jika karyawan belum memiliki shift, batas lama 08:30 tetap digunakan.
- Pengajuan lembur memiliki status Pending, Approved, atau Rejected. Total jam harian menghitung pengajuan yang telah disetujui.
- Estimasi PPh 21 memakai tarif progresif tahunan, PTKP TK/0 Rp54.000.000, dan asumsi biaya jabatan 5% (maksimal Rp500.000 per bulan). Nilai pajak tahunan diannualisasi menjadi estimasi bulanan; hasil bukan pengganti perhitungan payroll/pajak resmi.

### 7. Dashboard HR
- Ringkasan performa dan aktivitas utama
- Daftar jumlah karyawan, kehadiran, cuti, dan payroll

### 8. AI Analytics
- Evaluasi performa karyawan berdasarkan bulan dan tahun
- Menggabungkan data absensi dan cuti
- Menyediakan ringkasan evaluasi dalam bahasa Indonesia

## Demo Akun

Akun demo yang dibuat otomatis melalui seeder:

- HRD
  - Email: hrd@hris.corp
  - Password: admin123

- Manager
  - Email: manager@hris.corp
  - Password: manager123

> Akun ini dimaksudkan untuk kebutuhan demo / pengujian awal. Untuk penggunaan produksi, disarankan mengganti password dan mengatur autentikasi yang lebih aman.

## Cara Menjalankan

### 1. Clone repository

```bash
git clone <repository-url>
cd hrd-system
```

### 2. Setup backend

```bash
cd backend
npm install
```

Pastikan file `.env` sudah dibuat sesuai konfigurasi PostgreSQL, contoh:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hrd_system
PORT=5000
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-bytes
JWT_EXPIRES_IN=1d
GEMINI_API_KEY=your_api_key
```

Buat secret JWT lokal dengan perintah berikut, lalu isi hasilnya pada `JWT_SECRET` di `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Jangan commit file `.env` atau membagikan secret yang dihasilkan. Template variabel tersedia di `backend/.env.example`.

Lalu jalankan:

```bash
npm run dev
```

Test backend dapat dijalankan dengan:

```bash
npm test
```

### 3. Setup frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend akan berjalan pada port default Vite, biasanya:

```bash
http://localhost:5173
```

Backend biasanya berjalan di:

```bash
http://localhost:5000
```

## Catatan Pengembangan

- Database PostgreSQL harus aktif sebelum menjalankan backend
- Saat pertama kali dijalankan, backend akan melakukan inisialisasi tabel dan menambahkan data awal (seed)
- Integrasi AI memerlukan API key Gemini yang valid untuk fungsi review kinerja
- Project ini masih bersifat prototype / pengembangan awal dan dapat dikembangkan lebih lanjut untuk kebutuhan produksi

## Status Proyek

Project ini berada dalam tahap pengembangan functional prototype HR information system dengan fitur inti yang sudah dapat digunakan untuk demo, evaluasi, dan kebutuhan presentasi internal.

## Kontribusi

Proyek ini dibuat untuk kebutuhan pembelajaran dan pengembangan sistem informasi HR digital. Untuk pengembangan lebih lanjut, bisa dilakukan penambahan fitur seperti:

- notifikasi email
- export laporan PDF/Excel
- role permission yang lebih kompleks
- audit log
- dashboard dengan grafik interaktif
- integrasi cloud hosting

## Penutup

Sistem ini diharapkan menjadi fondasi awal dalam membangun platform HR yang lebih modern, efisien, dan terintegrasi untuk kebutuhan operasional perusahaan.
# HRD-System
