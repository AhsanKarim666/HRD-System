const dotenvConfig = require('dotenv').config();
const geminiApiKey = process.env.NODE_ENV === 'production'
  ? process.env.GEMINI_API_KEY
  : dotenvConfig.parsed?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
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
            `SELECT e.id, e.nik, e.full_name, e.phone, e.hire_date, e.status,
              d.name AS department_name, p.name AS position_name,
              COALESCE(p.base_salary, 0) AS base_salary
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
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(Date.UTC(Number(year), Number(month), 1)).toISOString().slice(0, 10);

    const attendanceRes = await db.query(
      `SELECT id, date, clock_in, clock_out, status
       FROM attendances
       WHERE employee_id = $1
         AND date >= $2::date
         AND date < $3::date
       ORDER BY date ASC`,
      [employee_id, periodStart, periodEnd]
    );

    const leaveRes = await db.query(
      `SELECT id, leave_type, start_date, end_date, reason, status, created_at
       FROM leaves
       WHERE employee_id = $1
         AND start_date < $3::date
         AND end_date >= $2::date
       ORDER BY start_date ASC`,
      [employee_id, periodStart, periodEnd]
    );

    const payrollRes = await db.query(
      `SELECT id, period, basic_salary, allowances, deductions, net_salary, payment_status, created_at
       FROM payroll
       WHERE employee_id = $1 AND period = $2
       ORDER BY created_at DESC, id DESC`,
      [employee_id, periodStart]
    );

    const stats = {
      present: attendanceRes.rows.filter((record) => record.status === 'Present').length,
      late: attendanceRes.rows.filter((record) => record.status === 'Late').length,
      absent: attendanceRes.rows.filter((record) => record.status === 'Absent').length,
      leaves: leaveRes.rows.filter((record) => record.status === 'Approved').length,
    };

    const analysisData = {
      employee,
      period: { month: Number(month), year: Number(year) },
      attendance: { summary: stats, records: attendanceRes.rows },
      leaves: leaveRes.rows,
      payroll: payrollRes.rows,
    };

    const promptText = `
Anda adalah Senior HR Specialist. Susun analisis kinerja karyawan dari data JSON berikut. Gunakan hanya fakta yang tersedia, jangan mengarang, dan jangan menyimpulkan hal yang tidak didukung data. Tulis seluruh jawaban dalam bahasa Indonesia profesional.

${JSON.stringify(analysisData, null, 2)}

Berikan laporan Markdown tanpa kalimat pembuka, garis pemisah, atau code fence, dengan struktur berikut:
## Ringkasan profil dan kinerja
Ringkas profil relevan dan jelaskan jika metrik kinerja formal tidak tersedia.
## Kehadiran dan cuti
Jelaskan jumlah/status absensi dan cuti serta pola yang benar-benar terlihat. Nyatakan jika data tidak tersedia.
## Payroll
Ringkas gaji pokok, tunjangan, potongan, gaji bersih, dan status pembayaran. Nyatakan jika belum tersedia.
## Catatan dan rekomendasi HR
Pisahkan fakta yang teramati dari rekomendasi. Berikan rekomendasi spesifik dan proporsional; bila data terbatas, sebutkan keterbatasannya.

Gunakan paragraf singkat dan daftar berpoin hanya jika membantu keterbacaan. Jangan memberi diagnosis, memberi label negatif pada karyawan, atau mengarang nilai kinerja.
`.trim();

    const apiKey = geminiApiKey;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY belum dikonfigurasi.',
      });
    }

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

    let apiRes;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      apiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
        }),
      });

      if (apiRes.status !== 503 || attempt === 2) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** attempt)));
    }

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
          nik: employee.nik,
          name: employee.full_name,
          phone: employee.phone,
          hire_date: employee.hire_date,
          status: employee.status,
          department: employee.department_name,
          position: employee.position_name,
          base_salary: employee.base_salary,
        },
        period: { month, year },
        stats,
        attendance: attendanceRes.rows,
        leaves: leaveRes.rows,
        payroll: payrollRes.rows,
        ai_evaluation: aiEvaluation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { summarizeEmployeePerformance };