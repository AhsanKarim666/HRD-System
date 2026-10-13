import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const emptyForm = { shift_name: '', start_time: '08:30', end_time: '17:30' };

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/shifts');
      setShifts(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data shift.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await axiosClient.put(`/shifts/${editingId}`, form);
      } else {
        await axiosClient.post('/shifts', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      fetchShifts();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan shift.');
    }
  };

  const edit = (shift) => {
    setEditingId(shift.id);
    setForm({
      shift_name: shift.shift_name,
      start_time: String(shift.start_time).slice(0, 5),
      end_time: String(shift.end_time).slice(0, 5),
    });
  };

  const remove = async (shift) => {
    if (!window.confirm(`Hapus shift ${shift.shift_name}? Karyawan yang menggunakannya akan menjadi tanpa shift.`)) return;
    try {
      await axiosClient.delete(`/shifts/${shift.id}`);
      fetchShifts();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus shift.');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto', textAlign: 'left' }}>
      <h2>Pengelolaan Shift Kerja</h2>
      <p>Jam masuk presensi dinilai terlambat jika melewati jam mulai shift karyawan.</p>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, marginBottom: 24 }}>
        <label>
          Nama shift
          <input
            required
            maxLength="100"
            value={form.shift_name}
            onChange={(event) => setForm({ ...form, shift_name: event.target.value })}
            style={{ display: 'block', width: '100%', padding: 7 }}
          />
        </label>
        <label>
          Jam mulai
          <input
            required
            type="time"
            value={form.start_time}
            onChange={(event) => setForm({ ...form, start_time: event.target.value })}
            style={{ display: 'block', width: '100%', padding: 7 }}
          />
        </label>
        <label>
          Jam selesai
          <input
            required
            type="time"
            value={form.end_time}
            onChange={(event) => setForm({ ...form, end_time: event.target.value })}
            style={{ display: 'block', width: '100%', padding: 7 }}
          />
        </label>
        <div style={{ alignSelf: 'end', display: 'flex', gap: 6 }}>
          <button type="submit">{editingId ? 'Perbarui' : 'Tambah Shift'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Batal</button>}
        </div>
      </form>
      {loading ? <p>Memuat shift...</p> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#333', color: 'white' }}>
              <th>Nama Shift</th><th>Jam Mulai</th><th>Jam Selesai</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr><td colSpan="4" align="center">Belum ada shift.</td></tr>
            ) : shifts.map((shift) => (
              <tr key={shift.id}>
                <td>{shift.shift_name}</td>
                <td>{String(shift.start_time).slice(0, 5)}</td>
                <td>{String(shift.end_time).slice(0, 5)}</td>
                <td>
                  <button type="button" onClick={() => edit(shift)}>Edit</button>{' '}
                  <button type="button" onClick={() => remove(shift)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Shifts;
