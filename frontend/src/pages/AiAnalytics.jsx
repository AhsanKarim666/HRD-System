import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const months = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : '-');

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const statusTones = {
  Present: 'bg-emerald-50 text-emerald-700',
  Late: 'bg-amber-50 text-amber-700',
  Absent: 'bg-rose-50 text-rose-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Pending: 'bg-amber-50 text-amber-700',
  Rejected: 'bg-rose-50 text-rose-700',
  Paid: 'bg-emerald-50 text-emerald-700',
  Unpaid: 'bg-amber-50 text-amber-700',
};

const AiAnalytics = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axiosClient.get('/employees');
        setEmployees(res.data.data || []);
      } catch (err) {
        console.error('Gagal mengambil daftar karyawan:', err);
      }
    };
    fetchEmployees();
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedEmp) {
      alert('Silakan pilih karyawan terlebih dahulu!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResultData(null);

    try {
      const res = await axiosClient.post('/ai/employee-performance', {
        employee_id: parseInt(selectedEmp),
        month: parseInt(month),
        year: parseInt(year),
      });

      setResultData(res.data.data);
    } catch (err) {
      console.error('Error AI:', err.response?.data);
      setErrorMsg(err.response?.data?.message || 'Gagal memproses evaluasi kinerja.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = resultData
    ? [
        { label: 'Hadir', value: `${resultData.stats.present} hari`, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
        { label: 'Terlambat', value: `${resultData.stats.late} kali`, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
        { label: 'Alfa', value: `${resultData.stats.absent} hari`, tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
        { label: 'Cuti disetujui', value: `${resultData.stats.leaves} pengajuan`, tone: 'bg-sky-50 text-sky-700 ring-sky-100' },
      ]
    : [];

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Performance</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Employee Review</h1>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            Updated today
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleAnalyze} className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Karyawan
              </label>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                <option value="">Pilih karyawan</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nik} - {emp.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Bulan
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                {months.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Tahun
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Menganalisa...' : 'Generate Review'}
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMsg}
          </div>
        )}

        {!resultData && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-100/80 px-6 py-12 text-center">
            <p className="text-sm text-slate-500">Pilih karyawan dan bulan untuk melihat review performa.</p>
          </div>
        )}

        {resultData && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Profil karyawan</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">{resultData.employee.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    NIK {resultData.employee.nik} · {resultData.employee.department || '-'} · {resultData.employee.position || '-'}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
                  {months[Number(month) - 1]} {year}
                </span>
              </div>
              <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['ID karyawan', resultData.employee.id],
                  ['Telepon', resultData.employee.phone || '-'],
                  ['Tanggal masuk', formatDate(resultData.employee.hire_date)],
                  ['Status kerja', resultData.employee.status || '-'],
                  ['Departemen', resultData.employee.department || '-'],
                  ['Jabatan', resultData.employee.position || '-'],
                  ['Gaji pokok saat ini', formatCurrency(resultData.employee.base_salary)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <div key={stat.label} className={`rounded-xl p-4 ring-1 ${stat.tone}`}>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] opacity-75">{stat.label}</p>
                  <p className="mt-2 text-lg font-bold">{stat.value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Analisis Gemini</p>
              <div className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {resultData.ai_evaluation}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900">Riwayat absensi</h3>
                <span className="text-xs text-slate-500">{resultData.attendance.length} catatan pada periode ini</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Masuk</th><th className="px-3 py-2">Pulang</th><th className="px-3 py-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultData.attendance.length ? resultData.attendance.map((record) => (
                      <tr key={record.id}>
                        <td className="px-3 py-3">{formatDate(record.date)}</td>
                        <td className="px-3 py-3">{formatTime(record.clock_in)}</td>
                        <td className="px-3 py-3">{formatTime(record.clock_out)}</td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTones[record.status] || 'bg-slate-100 text-slate-700'}`}>{record.status}</span></td>
                      </tr>
                    )) : <tr><td colSpan="4" className="px-3 py-6 text-center text-slate-500">Tidak ada catatan absensi pada periode ini.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900">Riwayat cuti</h3>
                <span className="text-xs text-slate-500">{resultData.leaves.length} pengajuan pada periode ini</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr><th className="px-3 py-2">Jenis</th><th className="px-3 py-2">Mulai</th><th className="px-3 py-2">Selesai</th><th className="px-3 py-2">Alasan</th><th className="px-3 py-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultData.leaves.length ? resultData.leaves.map((leave) => (
                      <tr key={leave.id}>
                        <td className="px-3 py-3">{leave.leave_type}</td>
                        <td className="px-3 py-3">{formatDate(leave.start_date)}</td>
                        <td className="px-3 py-3">{formatDate(leave.end_date)}</td>
                        <td className="max-w-xs whitespace-normal px-3 py-3">{leave.reason || '-'}</td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTones[leave.status] || 'bg-slate-100 text-slate-700'}`}>{leave.status}</span></td>
                      </tr>
                    )) : <tr><td colSpan="5" className="px-3 py-6 text-center text-slate-500">Tidak ada pengajuan cuti yang beririsan dengan periode ini.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900">Payroll periode terpilih</h3>
                <span className="text-xs text-slate-500">{resultData.payroll.length} slip gaji</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Gaji pokok</th><th className="px-3 py-2">Tunjangan</th><th className="px-3 py-2">Potongan</th><th className="px-3 py-2">Gaji bersih</th><th className="px-3 py-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultData.payroll.length ? resultData.payroll.map((payroll) => (
                      <tr key={payroll.id}>
                        <td className="px-3 py-3">{formatDate(payroll.period)}</td>
                        <td className="px-3 py-3">{formatCurrency(payroll.basic_salary)}</td>
                        <td className="px-3 py-3">{formatCurrency(payroll.allowances)}</td>
                        <td className="px-3 py-3">{formatCurrency(payroll.deductions)}</td>
                        <td className="px-3 py-3 font-semibold">{formatCurrency(payroll.net_salary)}</td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTones[payroll.payment_status] || 'bg-slate-100 text-slate-700'}`}>{payroll.payment_status}</span></td>
                      </tr>
                    )) : <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-500">Belum ada payroll untuk periode ini.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAnalytics;