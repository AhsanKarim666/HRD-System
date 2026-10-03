import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/departments');
      setDepartments(response.data.data || []);
      setErrorMsg('');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal memuat departemen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await axiosClient.put(`/departments/${editingId}`, { name });
      } else {
        await axiosClient.post('/departments', { name });
      }
      setName('');
      setEditingId(null);
      await fetchDepartments();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal menyimpan departemen.');
    }
  };

  const handleDelete = async (department) => {
    if (!window.confirm(`Hapus departemen ${department.name}?`)) return;
    try {
      await axiosClient.delete(`/departments/${department.id}`);
      await fetchDepartments();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal menghapus departemen.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <h2>Manajemen Departemen</h2>
      {errorMsg && <p role="alert" style={{ color: '#b91c1c' }}>{errorMsg}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="Nama departemen"
          aria-label="Nama departemen"
          required
          style={{ flex: 1, minWidth: 0, padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {editingId ? 'Simpan Perubahan' : 'Tambah Departemen'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setName(''); }}>
            Batal
          </button>
        )}
      </form>

      {loading ? <p>Memuat departemen...</p> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#333', color: '#fff' }}>
              <th>Nama Departemen</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr><td colSpan="2" align="center">Belum ada departemen.</td></tr>
            ) : departments.map((department) => (
              <tr key={department.id}>
                <td>{department.name}</td>
                <td style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => { setEditingId(department.id); setName(department.name); }}>
                    Ubah
                  </button>
                  <button type="button" onClick={() => handleDelete(department)}>
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

export default Departments;