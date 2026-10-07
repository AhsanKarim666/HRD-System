# HRD System

Sistem manajemen sumber daya manusia (HRD) berbasis web yang dirancang untuk membantu pengelolaan data karyawan, kehadiran, cuti, penggajian, serta analisis performa pegawai secara digital.

## Deskripsi Proyek

Proyek ini dibuat sebagai prototype aplikasi HRIS (Human Resource Information System) untuk mempermudah proses administrasi HRD secara terintegrasi dalam satu platform. Aplikasi ini mencakup beberapa modul utama seperti:

- Manajemen karyawan
- Manajemen departemen dan jabatan, termasuk gaji pokok default per jabatan
- Presensi dan kehadiran
- Pengajuan dan approval cuti dengan pencegahan jadwal tumpang tindih
- Payroll / gaji karyawan
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
- PostgreSQL (Neon)
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
- Rekap gaji dasar, tunjangan, potongan, dan gaji bersih
- Status pembayaran: Paid / Unpaid

### 6. Dashboard HR
- Ringkasan performa dan aktivitas utama
- Daftar jumlah karyawan, kehadiran, cuti, dan payroll

### 7. AI Analytics
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

Pastikan file `.env` sudah dibuat sesuai konfigurasi PostgreSQL (Neon), contoh:

```env
DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/hrd_system?sslmode=require
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-bytes
JWT_EXPIRES_IN=1d
GEMINI_API_KEY=your_api_key
```

Catatan konfigurasi:
- `DATABASE_URL` adalah koneksi Neon (wajib di production/Vercel). Secara opsional, kamu tetap bisa memakai variabel `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, dan `DB_NAME` untuk koneksi PostgreSQL lokal saat `DATABASE_URL` tidak diisi.
- `JWT_EXPIRES_IN` bersifat opsional dan default-nya `1d`.
- `GEMINI_API_KEY` hanya diperlukan untuk fitur AI analytics (`/api/ai/*`). Tanpa key ini, fitur lain tetap berjalan.

Buat secret JWT lokal dengan perintah berikut, lalu isi hasilnya pada `JWT_SECRET` di `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Jangan commit file `.env` atau membagikan secret yang dihasilkan. Template variabel tersedia di `backend/.env.example`.

### 2.1 Inisialisasi database & seed

Saat pertama kali memakai database baru (termasuk Neon), jalankan migrasi schema dan seed data demo satu kali:

```bash
npm run init-db
npm run seed
```

Kedua perintah membaca `DATABASE_URL` dari `.env`.

Lalu jalankan server:

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

## Deploy ke Vercel

Proyek ini di-deploy sebagai **dua project Vercel terpisah**: satu untuk backend (API) dan satu untuk frontend (static).

### 1. Backend (API)

Root folder: `backend/`

- Entry serverless: `backend/api/index.js` (mengekspor aplikasi Express yang sama).
- `backend/vercel.json` mengarahkan seluruh request ke fungsi tersebut, dengan `maxDuration: 60` untuk endpoint AI.

Environment variables yang perlu diset di Vercel:

| Variabel | Keterangan |
| --- | --- |
| `DATABASE_URL` | Koneksi Neon (wajib) |
| `JWT_SECRET` | Secret minimal 32 karakter (wajib) |
| `JWT_EXPIRES_IN` | Opsional, default `1d` |
| `GEMINI_API_KEY` | Opsional, untuk fitur AI analytics |

Sebelum deploy, jalankan migrasi + seed satu kali ke Neon (lihat bagian 2.1).

### 2. Frontend (static)

Root folder: `frontend/`

- Build command default: `npm run build` (output `dist`).
- `frontend/vercel.json` menyediakan rewrite SPA ke `/index.html` (untuk React Router).

Environment variables yang perlu diset di Vercel:

| Variabel | Keterangan |
| --- | --- |
| `VITE_API_URL` | URL backend, misal `https://<backend-project>.vercel.app/api` |

Nilai `VITE_API_URL` diset setelah project backend selesai di-deploy.

## Catatan Pengembangan

- Database PostgreSQL (Neon) harus aktif sebelum menjalankan backend
- Saat pertama kali memakai database baru, jalankan `npm run init-db` dan `npm run seed` satu kali (lihat bagian 2.1)
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
