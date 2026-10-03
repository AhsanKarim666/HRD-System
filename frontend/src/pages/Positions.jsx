import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const Positions = () => {
  const [positions, setPositions] = useState([]);
  const [formData, setFormData] = useState({ name: '', base_salary: '0' });
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/positions');
      setPositions(response.data.data || []);
      setErrorMsg('');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal memuat jabatan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const resetForm = () => {
    setFormData({ name: '', base_salary: '0' });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...formData, base_salary: Number(formData.base_salary) };
    try {
      if (editingId) {
        await axiosClient.put(`/positions/${editingId}`, payload);
      } else {
        await axiosClient.post('/positions', payload);
      }
      resetForm();
      await fetchPositions();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal menyimpan jabatan.');
    }
  };

  const handleDelete = async (position) => {
    if (!window.confirm(`Hapus jabatan ${position.name}?`)) return;
    try {
      await axiosClient.delete(`/positions/${position.id}`);
      await fetchPositions();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal menghapus jabatan.');
    }
  };

  const formatRupiah = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <h2>Manajemen Jabatan</h2>
      {errorMsg && <p role="alert" style={{ color: '#b91c1c' }}>{errorMsg}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', margin: '20px 0' }}>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          maxLength={100}
          placeholder="Nama jabatan"
          aria-label="Nama jabatan"
          required
          style={{ minWidth: 0, padding: '8px' }}
        />
        <input
          name="base_salary"
          type="number"
          value={formData.base_salary}
          onChange={handleChange}
          min="0"
          step="0.01"
          aria-label="Gaji pokok default"
          required
          style={{ minWidth: 0, padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {editingId ? 'Simpan Perubahan' : 'Tambah Jabatan'}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} style={{ gridColumn: '1 / -1', justifySelf: 'start' }}>
            Batal
          </button>
        )}
      </form>

      {loading ? <p>Memuat jabatan...</p> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#333', color: '#fff' }}>
              <th>Nama Jabatan</th>
              <th>Gaji Pokok Default</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr><td colSpan="3" align="center">Belum ada jabatan.</td></tr>
            ) : positions.map((position) => (
              <tr key={position.id}>
                <td>{position.name}</td>
                <td>{formatRupiah(position.base_salary)}</td>
                <td style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => {
                    setEditingId(position.id);
                    setFormData({ name: position.name, base_salary: String(position.base_salary) });
                  }}>
                    Ubah
                  </button>
                  <button type="button" onClick={() => handleDelete(position)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Positions;