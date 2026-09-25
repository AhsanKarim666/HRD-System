require('dotenv').config();
const db = require('../db');

const summarizeEmployeePerformance = async (req, res) => {
  const { employee_id, month, year } = req.body;

  if (!employee_id || !month || !year) {
    return res.status(400).json({
      success: false,
      message: 'Employee ID, bulan, dan tahun wajib diisi!',
    });
  }

  try {
    const employeeRes = await db.query(
      `SELECT e.id, e.nik, e.full_name, d.name AS department_name, p.name AS position_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN positions p ON e.position_id = p.id
       WHERE e.id = $1`,
      [employee_id]
    );

    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan!' });
    }

    const employee = employeeRes.rows[0];

    const attendanceRes = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'Present') AS total_present,
         COUNT(*) FILTER (WHERE status = 'Late') AS total_late,
         COUNT(*) FILTER (WHERE status = 'Absent') AS total_absent
       FROM attendances
       WHERE employee_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [employee_id, month, year]
    );

    const leaveRes = await db.query(
      `SELECT COUNT(*) AS total_leaves
       FROM leaves
       WHERE employee_id = $1
         AND status = 'Approved'
         AND EXTRACT(MONTH FROM start_date) = $2
         AND EXTRACT(YEAR FROM start_date) = $3`,
      [employee_id, month, year]
    );

    const stats = {
      present: Number(attendanceRes.rows[0]?.total_present || 0),
      late: Number(attendanceRes.rows[0]?.total_late || 0),
      absent: Number(attendanceRes.rows[0]?.total_absent || 0),
      leaves: Number(leaveRes.rows[0]?.total_leaves || 0),
    };

    const promptText = `
Anda adalah seorang Senior HR Specialist. Buatkan ringkasan analisis kinerja profesional untuk karyawan berikut:

Nama: ${employee.full_name} (NIK: ${employee.nik})
Divisi: ${employee.department_name || '-'}
Jabatan: ${employee.position_name || '-'}
Periode: Bulan ${month} Tahun ${year}

Metrik Kehadiran:
- Hadir Tepat Waktu: ${stats.present} hari
- Terlambat: ${stats.late} kali
- Tidak Hadir (Alfa): ${stats.absent} hari
- Cuti Disetujui: ${stats.leaves} hari

Format respons dalam bahasa Indonesia yang ringkas dan profesional:
1. Ringkasan Kinerja & Kedisiplinan (1 paragraf)
2. Catatan Evaluasi & Rekomendasi HR (2-3 poin ringkas)
`.trim();

    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyC-vPKfUas0CH7vXGw26wcQX8lJnRvKOZ0';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        success: false,
        message: data.error?.message || 'Gagal menghubungi Gemini API',
      });
    }

    const aiEvaluation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respons yang dihasilkan.';

    res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.full_name,
          department: employee.department_name,
          position: employee.position_name,
        },
        period: { month, year },
        stats,
        ai_evaluation: aiEvaluation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { summarizeEmployeePerformance };