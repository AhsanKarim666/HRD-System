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
        { label: 'Cuti', value: `${resultData.stats.leaves} hari`, tone: 'bg-sky-50 text-sky-700 ring-sky-100' },
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
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Review</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {resultData.employee.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{resultData.employee.position}</p>
                </div>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
                  {months[Number(month) - 1]} {year}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-line">
                {resultData.ai_evaluation}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ringkasan</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {statCards.map((stat) => (
                    <div key={stat.label} className={`rounded-xl p-3 ring-1 ${stat.tone}`}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-75">{stat.label}</p>
                      <p className="mt-2 text-lg font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-200 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Catatan</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li>• Disiplin kerja cenderung stabil dan konsisten.</li>
                  <li>• Area yang perlu ditingkatkan adalah keteraturan kehadiran.</li>
                  <li>• Potensi pengembangan lebih besar pada kontribusi output kerja.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAnalytics;