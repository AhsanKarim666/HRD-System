import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { getCurrentUser, hasManagementAccess } from '../api/session';

const Payrolls = () => {
  const currentUser = getCurrentUser();
  const canManage = hasManagementAccess(currentUser);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, empRes] = await Promise.all([
        axiosClient.get('/payrolls'),
        canManage ? axiosClient.get('/employees') : Promise.resolve({ data: { data: [] } }),
      ]);
      setPayrolls(payRes.data.data);
      setEmployees(empRes.data.data);
    } catch (err) {
      console.error('Gagal mengambil data payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmployeeChange = (e) => {
    const employee = employees.find((item) => String(item.id) === e.target.value);
    setFormData({
      ...formData,
      employee_id: e.target.value,
      basic_salary: employee?.base_salary ?? 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: parseInt(formData.employee_id),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        basic_salary: Number(formData.basic_salary),
        allowances: parseFloat(formData.allowances) || 0,
        deductions: parseFloat(formData.deductions) || 0,
      };

      await axiosClient.post('/payroll/generate', payload);
      alert('Kalkulasi payroll berhasil digenerate!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal generate payroll');
    }
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <h2>Manajemen Penggajian (Payroll)</h2>
      <p>
        PPh 21 ditampilkan terpisah sebagai estimasi bulanan dengan PTKP TK/0 Rp54.000.000 dan tarif progresif.
        Potongan lain tidak mencakup PPh 21.
      </p>

      {canManage && <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', borderRadius: '6px' }}>
        <h3>Generate Slip Gaji Karyawan</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label>Pilih Karyawan: </label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleEmployeeChange}
              required
              style={{ width: '100%', padding: '6px' }}
            >
              <option value="">-- Pilih Karyawan --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nik} - {emp.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Bulan: </label>
            <select
              name="month"
              value={formData.month}
              onChange={handleChange}
              style={{ width: '100%', padding: '6px' }}
            >
              {[
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Tahun: </label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Gaji Pokok Rp: </label>
            <input
              type="number"
              name="basic_salary"
              min="0"
              step="0.01"
              value={formData.basic_salary}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Tunjangan (Allowances) Rp: </label>
            <input
              type="number"
              name="allowances"
              value={formData.allowances}
              onChange={handleChange}
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Potongan (Deductions) Rp: </label>
            <input
              type="number"
              name="deductions"
              value={formData.deductions}
              onChange={handleChange}
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Hitung & Generate Gaji
            </button>
          </div>
        </form>
      </div>}

      {/* Tabel Riwayat Gaji */}
      <div>
        <h3>Daftar Slip Payroll</h3>
        {loading ? (
          <p>Memuat data payroll...</p>
        ) : (
          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#333', color: '#fff' }}>
                <th>Nama Karyawan</th>
                <th>Periode</th>
                <th>Gaji Pokok</th>
                <th>Tunjangan</th>
                <th>Potongan Lain</th>
                <th>PPh 21 (Estimasi)</th>
                <th>Total Diterima</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan="8" align="center">Belum ada slip gaji yang digenerate.</td>
                </tr>
              ) : (
                payrolls.map((p) => (
                  <tr key={p.id}>
                    <td>{p.full_name}</td>
                    <td>{p.period ? p.period.slice(0, 7) : '-'}</td>
                    <td>{formatRupiah(p.basic_salary)}</td>
                    <td>{formatRupiah(p.allowances)}</td>
                    <td>{formatRupiah(p.deductions)}</td>
                    <td>{formatRupiah(p.pph21)}</td>
                    <td><b>{formatRupiah(p.net_salary)}</b></td>
                    <td>
                      <span style={{ color: p.payment_status === 'Paid' ? 'green' : 'orange' }}>
                        {p.payment_status || 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Payrolls;