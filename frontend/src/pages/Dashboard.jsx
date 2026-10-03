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
    { title: 'Karyawan aktif', value: stats.totalEmployees, icon: Users, tone: 'mint' },
    { title: 'Hadir hari ini', value: stats.presentToday, icon: CalendarCheck, tone: 'sage' },
    { title: 'Terlambat', value: stats.lateToday, icon: Clock3, tone: 'amber' },
    { title: 'Proyeksi gaji', value: toCurrency(stats.payrollProjection), icon: Wallet, tone: 'copper' },
  ];

  const shortcuts = [
    { label: 'Karyawan', path: '/employees' },
    { label: 'Presensi', path: '/attendances' },
    { label: 'Cuti & Izin', path: '/leaves' },
    { label: 'Payroll', path: '/payrolls' },
    { label: 'AI Analytics', path: '/ai-analytics' },
  ];

  return (
    <div className="dashboard-page space-y-6">
      <div className="page-heading dashboard-heading">
        <div>
          <div className="dashboard-eyebrow">PEOPLE OPERATIONS</div>
          <h1>Ringkasan HR</h1>
          <p>Gambaran operasional tim hari ini.</p>
        </div>
        <div className="dashboard-date">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}</div>
      </div>

      <div className="dashboard-kpi-grid">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`dashboard-kpi ${card.tone}`}>
              <div>
                <p className="dashboard-kpi-label">{card.title}</p>
                <p className="dashboard-kpi-value">{card.value}</p>
              </div>
              <div className="dashboard-kpi-icon">
                <Icon size={19} strokeWidth={1.8} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-lower-grid">
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <div className="dashboard-eyebrow">PEOPLE</div>
              <h2>Karyawan terbaru</h2>
            </div>
            <NavLink className="dashboard-inline-link" to="/leaves">
              {stats.pendingLeaves} cuti menunggu
            </NavLink>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">NIK</th>
                  <th className="px-4 py-3 font-semibold">Departemen</th>
                  <th className="px-4 py-3 font-semibold">Jabatan</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="dashboard-empty">Belum ada data karyawan.</td>
                  </tr>
                ) : (
                  stats.recentEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="employee-name">{employee.full_name}</td>
                      <td>{employee.nik}</td>
                      <td>{employee.department_name || '-'}</td>
                      <td>{employee.position_name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-section dashboard-shortcuts">
          <div className="dashboard-section-heading">
            <div>
              <div className="dashboard-eyebrow">QUICK ACCESS</div>
              <h2>Akses cepat</h2>
            </div>
          </div>
          <div className="shortcut-list">
            {shortcuts.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="shortcut-link"
              >
                <span>{item.label}</span>
                <ArrowRight size={15} />
              </NavLink>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;