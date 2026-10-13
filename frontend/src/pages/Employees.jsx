import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nik: '',
    full_name: '',
    phone: '',
    hire_date: '',
    department_id: '',
    position_id: '',
    shift_id: '',
    status: 'Active',
  });

  // Ambil data karyawan, departemen, dan posisi
  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, posRes, shiftRes] = await Promise.all([
        axiosClient.get('/employees'),
        axiosClient.get('/departments'),
        axiosClient.get('/positions'),
        axiosClient.get('/shifts'),
      ]);
      setEmployees(empRes.data.data);
      setDepartments(deptRes.data.data);
      setPositions(posRes.data.data);
      setShifts(shiftRes.data.data);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data');
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
      await axiosClient.post('/employees', formData);
      alert('Karyawan berhasil didaftarkan!');
      setFormData({
        nik: '',
        full_name: '',
        phone: '',
        hire_date: '',
        department_id: '',
        position_id: '',
        shift_id: '',
        status: 'Active',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan karyawan');
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await axiosClient.put(`/employees/${id}`, { status: nextStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status karyawan');
    }
  };

  const handleShiftChange = async (id, nextShiftId) => {
    try {
      await axiosClient.put(`/employees/${id}`, { shift_id: nextShiftId || null });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah shift karyawan');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <h2>Manajemen Karyawan</h2>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      {/* Form Tambah Karyawan */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', borderRadius: '6px' }}>
        <h3>Tambah Karyawan Baru</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label>NIK: </label>
            <input 
              type="text" 
              name="nik" 
              value={formData.nik} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Nama Lengkap: </label>
            <input 
              type="text" 
              name="full_name" 
              value={formData.full_name} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Nomor Telepon: </label>
            <input 
              type="text" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Tanggal Masuk: </label>
            <input 
              type="date" 
              name="hire_date" 
              value={formData.hire_date} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Departemen: </label>
            <select 
              name="department_id" 
              value={formData.department_id} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '6px' }}
            >
              <option value="">-- Pilih Departemen --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Jabatan / Posisi: </label>
            <select 
              name="position_id" 
              value={formData.position_id} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '6px' }}
            >
              <option value="">-- Pilih Jabatan --</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Shift Kerja: </label>
            <select
              name="shift_id"
              value={formData.shift_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '6px' }}
            >
              <option value="">-- Tanpa Shift --</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.shift_name} ({String(shift.start_time).slice(0, 5)}-{String(shift.end_time).slice(0, 5)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Simpan Karyawan
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Data Karyawan */}
      <div>
        <h3>Daftar Karyawan Terdaftar</h3>
        {loading ? (
          <p>Memuat data...</p>
        ) : (
          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#333', color: '#fff' }}>
                <th>NIK</th>
                <th>Nama</th>
                <th>Departemen</th>
                <th>Jabatan</th>
                <th>Shift</th>
                <th>No. Telp</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="8" align="center">Belum ada data karyawan.</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.nik}</td>
                    <td>{emp.full_name}</td>
                    <td>{emp.department_name || '-'}</td>
                    <td>{emp.position_name || '-'}</td>
                    <td>
                      <select
                        value={emp.shift_id || ''}
                        onChange={(e) => handleShiftChange(emp.id, e.target.value)}
                        aria-label={`Shift ${emp.full_name}`}
                        style={{ padding: '4px 6px' }}
                      >
                        <option value="">Tanpa Shift</option>
                        {shifts.map((shift) => (
                          <option key={shift.id} value={shift.id}>{shift.shift_name}</option>
                        ))}
                      </select>
                    </td>
                    <td>{emp.phone || '-'}</td>
                    <td>{emp.status}</td>
                    <td>
                      <select
                        value={emp.status}
                        onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                        style={{ padding: '4px 6px' }}
                      >
                        <option value="Active">Active</option>
                        <option value="Probation">Probation</option>
                        <option value="Inactive">Inactive</option>
                      </select>
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

export default Employees;