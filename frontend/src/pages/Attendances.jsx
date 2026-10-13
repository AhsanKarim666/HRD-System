import React, { useCallback, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { getCurrentUser } from '../api/session';
import { downloadFile } from '../utils/downloadFile';

const Attendances = () => {
  const currentUser = getCurrentUser();
  const isEmployee = currentUser?.role === 'Employee';
  const [attendances, setAttendances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [clockingOutId, setClockingOutId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const canExport = currentUser?.role === 'HRD';

  // Form check-in state
  const [formData, setFormData] = useState({
    employee_id: currentUser?.employee_id || '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '08:00',
  });

  const fetchData = useCallback(async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        axiosClient.get(`/attendances?date=${selectedDate}`),
        isEmployee ? Promise.resolve({ data: { data: [] } }) : axiosClient.get('/employees'),
      ]);
      setAttendances(attRes.data.data);
      setEmployees(empRes.data.data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Gagal memuat data presensi.');
    } finally {
      setLoading(false);
    }
  }, [isEmployee, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/attendances/check-in', {
        ...formData,
        employee_id: isEmployee ? currentUser.employee_id : formData.employee_id,
      });
      alert('Presensi berhasil dicatat!');
      setLoading(true);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat presensi');
    }
  };

  const handleClockOut = async (attendance) => {
    setClockingOutId(attendance.id);
    try {
      await axiosClient.post('/attendances/check-out', {
        employee_id: attendance.employee_id,
        date: attendance.date ? attendance.date.split('T')[0] : selectedDate,
      });
      setLoading(true);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat jam pulang');
    } finally {
      setClockingOutId(null);
    }
  };

  const exportAttendanceCsv = async () => {
    setExporting(true);
    try {
      const response = await axiosClient.get('/attendances/export.csv', {
        params: { month: exportMonth, year: exportYear },
        responseType: 'blob',
      });
      const month = String(exportMonth).padStart(2, '0');
      downloadFile(response.data, `rekap-presensi-${exportYear}-${month}.csv`);
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengunduh rekap presensi.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="operational-page attendance-page">
      <header className="page-heading operational-heading">
        <div className="dashboard-eyebrow">KEHADIRAN KARYAWAN</div>
        <h1>Presensi</h1>
        <p>Pencatatan kehadiran dan rekap jam kerja karyawan.</p>
      </header>
      {errorMessage && <p className="operational-error" role="alert">{errorMessage}</p>}

      <section className="operational-panel">
        <div className="operational-section-heading">
          <h2>Catat Kehadiran</h2>
          <p>Status terlambat dihitung berdasarkan jam mulai shift karyawan.</p>
        </div>
        <form className="operational-form" onSubmit={handleSubmit}>
          {isEmployee ? (
            <p className="operational-note">Absensi untuk {currentUser?.name || 'akun Anda'}.</p>
          ) : (
            <div>
              <label htmlFor="attendance-employee">Karyawan</label>
              <select
                id="attendance-employee"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                required
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

          {!isEmployee && (
            <div>
              <label htmlFor="attendance-form-date">Tanggal</label>
              <input
                id="attendance-form-date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {!isEmployee && (
            <div>
              <label htmlFor="attendance-form-clock-in">Jam Masuk</label>
              <input
                id="attendance-form-clock-in"
                type="time"
                name="clock_in"
                value={formData.clock_in}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div>
            <label>Ketentuan</label>
            <p className="operational-note">
              Karyawan tanpa shift mengikuti jam mulai default Reguler pukul 08.30.
            </p>
          </div>

          <div className="operational-form-actions">
            <button type="submit">
              Simpan Presensi
            </button>
          </div>
        </form>
      </section>

      <section className="operational-section">
        <div className="operational-toolbar">
          <div>
            <h2>Log Presensi Harian</h2>
            <p>Data check-in, check-out, dan status kehadiran.</p>
          </div>
          <div className="operational-date-filter">
            <label htmlFor="attendance-date">Tanggal</label>
            <input 
              id="attendance-date"
              type="date" 
              value={selectedDate} 
              onChange={(event) => {
                setLoading(true);
                setSelectedDate(event.target.value);
              }}
            />
          </div>
        </div>
        {canExport && (
          <div className="operational-export operational-export-row">
            <label htmlFor="attendance-export-month">Periode rekap</label>
            <select
              id="attendance-export-month"
              value={exportMonth}
              onChange={(event) => setExportMonth(Number(event.target.value))}
            >
              {[
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
            <input
              type="number"
              min="2000"
              max="2100"
              value={exportYear}
              onChange={(event) => setExportYear(event.target.value)}
              aria-label="Tahun rekap presensi"
            />
            <button className="operational-primary-button" type="button" disabled={exporting} onClick={exportAttendanceCsv}>
              {exporting ? 'Menyiapkan...' : 'Export Rekap Presensi CSV'}
            </button>
          </div>
        )}

        {loading ? <p className="operational-feedback" role="status">Memuat log presensi...</p> : (
          <div className="operational-table-wrap">
            <table className="operational-table">
              <thead>
                <tr>
                  <th>NIK</th>
                  <th>Nama Karyawan</th>
                  <th>Departemen</th>
                  <th>Shift</th>
                  <th>Tanggal</th>
                  <th>Jam Masuk</th>
                  <th>Jam Keluar</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="operational-empty">Tidak ada presensi pada tanggal ini.</td>
                  </tr>
                ) : (
                  attendances.map((att) => (
                    <tr key={att.id}>
                      <td>{att.nik}</td>
                      <td>{att.full_name}</td>
                      <td>{att.department_name || '-'}</td>
                      <td>{att.shift_name ? `${att.shift_name} (${String(att.shift_start_time).slice(0, 5)}-${String(att.shift_end_time).slice(0, 5)})` : '-'}</td>
                      <td>{att.date ? att.date.split('T')[0] : '-'}</td>
                      <td>{att.clock_in || '-'}</td>
                      <td>{att.clock_out || '-'}</td>
                      <td>
                        <b className={`operational-status ${
                          att.status === 'Present' ? 'is-success' : att.status === 'Late' ? 'is-warning' : 'is-danger'
                        }`}>
                          {att.status}
                        </b>
                      </td>
                      <td>
                        {att.clock_out ? (
                          'Selesai'
                        ) : (
                          <button
                            type="button"
                            disabled={clockingOutId === att.id}
                            onClick={() => handleClockOut(att)}
                          >
                            {clockingOutId === att.id ? 'Menyimpan...' : 'Check-out'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Attendances;