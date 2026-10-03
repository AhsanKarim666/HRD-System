import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { getCurrentUser, hasManagementAccess } from '../api/session';

const Leaves = () => {
  const currentUser = getCurrentUser();
  const isEmployee = currentUser?.role === 'Employee';
  const canManage = hasManagementAccess(currentUser);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: currentUser?.employee_id || '',
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaveRes, empRes] = await Promise.all([
        axiosClient.get('/leaves'),
        isEmployee ? Promise.resolve({ data: { data: [] } }) : axiosClient.get('/employees'),
      ]);
      setLeaves(leaveRes.data.data);
      setEmployees(empRes.data.data);
    } catch (err) {
      console.error('Gagal mengambil data cuti:', err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/leaves', {
        ...formData,
        employee_id: isEmployee ? currentUser.employee_id : formData.employee_id,
      });
      alert('Pengajuan cuti berhasil dikirim!');
      setFormData({
        employee_id: currentUser?.employee_id || '',
        leave_type: 'Annual',
        start_date: '',
        end_date: '',
        reason: '',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengajukan cuti');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axiosClient.patch(`/leaves/${id}/status`, { status: newStatus });
      alert(`Pengajuan cuti berhasil di-${newStatus.toLowerCase()}!`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status cuti');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <h2>Manajemen Cuti & Izin</h2>

      {/* Form Pengajuan Cuti */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', borderRadius: '6px' }}>
        <h3>Formulir Pengajuan Cuti</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {isEmployee ? (
            <p style={{ gridColumn: 'span 2' }}>Pengajuan untuk {currentUser?.name || 'akun Anda'}.</p>
          ) : (
          <div style={{ gridColumn: 'span 2' }}>
            <label>Pilih Karyawan: </label>
            <select 
              name="employee_id" 
              value={formData.employee_id} 
              onChange={handleChange} 
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
          )}

          <div style={{ gridColumn: 'span 2' }}>
            <label>Jenis Cuti: </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '6px' }}
            >
              <option value="Annual">Cuti tahunan</option>
              <option value="Sick">Sakit</option>
              <option value="Personal">Keperluan pribadi</option>
              <option value="Maternity">Cuti melahirkan</option>
              <option value="Other">Lainnya</option>
            </select>
          </div>

          <div>
            <label>Tanggal Mulai: </label>
            <input 
              type="date" 
              name="start_date" 
              value={formData.start_date} 
              onChange={handleChange} 
              max={formData.end_date || undefined}
              required 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Tanggal Selesai: </label>
            <input 
              type="date" 
              name="end_date" 
              value={formData.end_date} 
              onChange={handleChange} 
              min={formData.start_date || undefined}
              required 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label>Alasan Cuti / Keterangan: </label>
            <textarea 
              name="reason" 
              value={formData.reason} 
              onChange={handleChange} 
              rows="3" 
              style={{ width: '100%', padding: '6px' }}
              placeholder="Contoh: Keperluan keluarga mendesak / Istirahat medis"
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Kirim Pengajuan Cuti
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Pengajuan Cuti */}
      <div>
        <h3>Daftar Pengajuan Cuti</h3>
        {loading ? (
          <p>Memuat pengajuan cuti...</p>
        ) : (
          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#333', color: '#fff' }}>
                <th>Nama Karyawan</th>
                <th>Departemen</th>
                <th>Jenis Cuti</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Alasan</th>
                <th>Status</th>
                {canManage && <th>Aksi Approval</th>}
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} align="center">Belum ada pengajuan cuti.</td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id}>
                    <td>{l.full_name}</td>
                    <td>{l.department_name || '-'}</td>
                    <td>{l.leave_type || '-'}</td>
                    <td>{l.start_date ? l.start_date.split('T')[0] : '-'}</td>
                    <td>{l.end_date ? l.end_date.split('T')[0] : '-'}</td>
                    <td>{l.reason || '-'}</td>
                    {canManage && <td>
                      <b style={{
                        color: l.status === 'Approved' ? 'green' : l.status === 'Rejected' ? 'red' : 'orange'
                      }}>
                        {l.status}
                      </b>
                    </td>}
                    <td>
                      {l.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            onClick={() => handleUpdateStatus(l.id, 'Approved')}
                            style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(l.id, 'Rejected')}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#666' }}>Selesai</span>
                      )}
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

export default Leaves;