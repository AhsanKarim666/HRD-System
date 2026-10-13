import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { getCurrentUser, hasManagementAccess } from '../api/session';

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const Overtimes = () => {
  const currentUser = getCurrentUser();
  const canManage = hasManagementAccess(currentUser);
  const [employees, setEmployees] = useState([]);
  const [overtimes, setOvertimes] = useState([]);
  const [dailyTotals, setDailyTotals] = useState([]);
  const [dateFilter, setDateFilter] = useState(today());
  const [error, setError] = useState('');
  const [form, setForm] = useState({ employee_id: currentUser?.employee_id || '', date: today(), hours: '', reason: '' });

  const fetchData = async () => {
    try {
      const [overtimeResponse, dailyResponse, employeeResponse] = await Promise.all([
        axiosClient.get('/overtimes', { params: canManage ? {} : { employee_id: currentUser?.employee_id } }),
        axiosClient.get('/overtimes/daily-hours', { params: { date: dateFilter, ...(canManage ? {} : { employee_id: currentUser?.employee_id }) } }),
        canManage ? axiosClient.get('/employees') : Promise.resolve({ data: { data: [] } }),
      ]);
      setOvertimes(overtimeResponse.data.data);
      setDailyTotals(dailyResponse.data.data);
      setEmployees(employeeResponse.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data lembur.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await axiosClient.post('/overtimes', {
        ...form,
        employee_id: canManage ? Number(form.employee_id) : currentUser?.employee_id,
        hours: Number(form.hours),
      });
      setForm({ ...form, hours: '', reason: '' });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengajukan lembur.');
    }
  };

  const decide = async (id, status) => {
    try {
      await axiosClient.patch(`/overtimes/${id}/status`, { status });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memperbarui persetujuan lembur.');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto', textAlign: 'left' }}>
      <h2>Pengajuan & Persetujuan Lembur</h2>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: canManage ? '2fr 1fr 1fr 2fr auto' : '1fr 1fr 2fr auto', gap: 10, marginBottom: 24 }}>
        {canManage && (
          <label>
            Karyawan
            <select required value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} style={{ display: 'block', width: '100%', padding: 7 }}>
              <option value="">Pilih karyawan</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nik} - {employee.full_name}</option>)}
            </select>
          </label>
        )}
        <label>
          Tanggal lembur
          <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} style={{ display: 'block', width: '100%', padding: 7 }} />
        </label>
        <label>
          Jam
          <input required type="number" min="0.01" max="24" step="0.01" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} style={{ display: 'block', width: '100%', padding: 7 }} />
        </label>
        <label>
          Alasan
          <input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} style={{ display: 'block', width: '100%', padding: 7 }} />
        </label>
        <button type="submit" style={{ alignSelf: 'end' }}>Ajukan</button>
      </form>

      <h3>Total jam lembur disetujui per hari</h3>
      <label>
        Filter tanggal
        <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} style={{ display: 'block', padding: 7, marginBottom: 10 }} />
      </label>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead><tr style={{ background: '#333', color: 'white' }}><th>Karyawan</th><th>Tanggal</th><th>Total Jam Disetujui</th></tr></thead>
        <tbody>
          {dailyTotals.length === 0 ? <tr><td colSpan="3" align="center">Belum ada lembur disetujui pada tanggal ini.</td></tr> : dailyTotals.map((row) => (
            <tr key={`${row.employee_id}-${row.date}`}><td>{row.full_name} ({row.nik})</td><td>{String(row.date).slice(0, 10)}</td><td>{Number(row.total_hours).toFixed(2)}</td></tr>
          ))}
        </tbody>
      </table>

      <h3>{canManage ? 'Daftar Persetujuan Lembur' : 'Riwayat Pengajuan Lembur'}</h3>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#333', color: 'white' }}><th>Karyawan</th><th>Tanggal</th><th>Jam</th><th>Alasan</th><th>Status</th>{canManage && <th>Aksi</th>}</tr></thead>
        <tbody>
          {overtimes.length === 0 ? <tr><td colSpan={canManage ? 6 : 5} align="center">Belum ada pengajuan lembur.</td></tr> : overtimes.map((row) => (
            <tr key={row.id}>
              <td>{row.full_name} ({row.nik})</td><td>{String(row.date).slice(0, 10)}</td>
              <td>{Number(row.hours).toFixed(2)}</td><td>{row.reason}</td><td>{row.status}</td>
              {canManage && <td>{row.status === 'Pending' ? <><button type="button" onClick={() => decide(row.id, 'Approved')}>Setujui</button>{' '}<button type="button" onClick={() => decide(row.id, 'Rejected')}>Tolak</button></> : '-'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Overtimes;
