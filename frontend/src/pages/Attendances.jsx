import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const Attendances = () => {
  const [attendances, setAttendances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Form check-in state
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '08:00',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, empRes] = await Promise.all([
        axiosClient.get(`/attendances?date=${selectedDate}`),
        axiosClient.get('/employees'),
      ]);
      setAttendances(attRes.data.data);
      setEmployees(empRes.data.data);
    } catch (err) {
      console.error('Gagal mengambil data absensi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/attendances/check-in', formData);
      alert('Presensi berhasil dicatat!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat presensi');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <h2>Manajemen Presensi & Absensi</h2>

      {/* Form Input Presensi */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', borderRadius: '6px' }}>
        <h3>Catat Kehadiran Karyawan</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label>Karyawan: </label>
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

          <div>
            <label>Tanggal: </label>
            <input 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Jam Masuk (Check-in): </label>
            <input 
              type="time" 
              name="clock_in" 
              value={formData.clock_in} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '6px' }}
            />
          </div>

          <div>
            <label>Catatan: </label>
            <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#475569' }}>
              Status otomatis ditentukan oleh backend: Present sampai jam 08:30, Late di atas 08:30.
            </div>
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Simpan Presensi
            </button>
          </div>
        </form>
      </div>

      {/* Filter & Tabel Data Absensi */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>Log Absensi Harian</h3>
          <div>
            <label>Filter Tanggal: </label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              style={{ padding: '5px' }}
            />
          </div>
        </div>

        {loading ? (
          <p>Memuat log absensi...</p>
        ) : (
          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#333', color: '#fff' }}>
                <th>NIK</th>
                <th>Nama Karyawan</th>
                <th>Departemen</th>
                <th>Tanggal</th>
                <th>Jam Masuk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan="6" align="center">Tidak ada log absensi pada tanggal ini.</td>
                </tr>
              ) : (
                attendances.map((att) => (
                  <tr key={att.id}>
                    <td>{att.nik}</td>
                    <td>{att.full_name}</td>
                    <td>{att.department_name || '-'}</td>
                    <td>{att.date ? att.date.split('T')[0] : '-'}</td>
                    <td>{att.clock_in || '-'}</td>
                    <td>
                      <b style={{ 
                        color: att.status === 'Present' ? 'green' : att.status === 'Late' ? 'orange' : 'red' 
                      }}>
                        {att.status}
                      </b>
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

export default Attendances;