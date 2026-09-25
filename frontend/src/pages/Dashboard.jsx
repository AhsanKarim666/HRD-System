import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Users, CalendarCheck, Clock3, Wallet, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    pendingLeaves: 0,
    payrollProjection: 0,
    recentEmployees: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axiosClient.get('/dashboard/stats');
        setStats(res.data.data);
      } catch (err) {
        console.error('Gagal mengambil ringkasan dashboard:', err);
      }
    };

    fetchDashboardData();
  }, []);

  const toCurrency = (value) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const cards = [
    { title: 'Total Karyawan Aktif', value: stats.totalEmployees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Kehadiran Hari Ini', value: stats.presentToday, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Terlambat Hari Ini', value: stats.lateToday, icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Proyeksi Gaji', value: toCurrency(stats.payrollProjection), icon: Wallet, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const shortcuts = [
    { label: 'Karyawan', path: '/employees' },
    { label: 'Presensi', path: '/attendances' },
    { label: 'Cuti & Izin', path: '/leaves' },
    { label: 'Payroll', path: '/payrolls' },
    { label: 'AI Analytics', path: '/ai-analytics' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Executive HR Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Ringkasan operasional SDM dan status positif strategis perusahaan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-2">{card.value}</p>
              </div>
              <div className={`p-3.5 rounded-xl ${card.bg} ${card.color}`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">Karyawan Baru Terakhir</h2>
            <span className="text-sm text-slate-500">{stats.pendingLeaves} pengajuan pending</span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">NIK</th>
                  <th className="px-4 py-3 font-semibold">Departemen</th>
                  <th className="px-4 py-3 font-semibold">Jabatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {stats.recentEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-slate-500">Belum ada data karyawan.</td>
                  </tr>
                ) : (
                  stats.recentEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{employee.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">{employee.nik}</td>
                      <td className="px-4 py-3 text-slate-600">{employee.department_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{employee.position_name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Shortcut Navigasi</h2>
          <div className="space-y-2">
            {shortcuts.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="group flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <span>{item.label}</span>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600" />
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;