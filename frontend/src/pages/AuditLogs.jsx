import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const PAGE_SIZE = 50;

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get(`/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`);
        const rows = response.data.data || [];
        setLogs(rows);
        setHasNextPage(rows.length === PAGE_SIZE);
        setErrorMsg('');
      } catch (error) {
        setErrorMsg(error.response?.data?.message || 'Gagal memuat riwayat aktivitas.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [offset]);

  const formatDateTime = (value) => value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '-';

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'left' }}>
      <h2>Riwayat Aktivitas</h2>
      <p>Perubahan penting yang dilakukan pengguna tercatat di sini.</p>
      {errorMsg && <p role="alert" style={{ color: '#b91c1c' }}>{errorMsg}</p>}

      {loading ? <p>Memuat riwayat...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#333', color: '#fff' }}>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Aksi</th>
                <th>Data</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="5" align="center">Belum ada aktivitas tercatat.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{log.actor_role} (ID {log.actor_id || '-'})</td>
                  <td>{log.action}</td>
                  <td>{log.entity_type} #{log.entity_id || '-'}</td>
                  <td style={{ maxWidth: '320px', overflowWrap: 'anywhere' }}>
                    {JSON.stringify(log.details || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
        <button type="button" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
          Sebelumnya
        </button>
        <span>{offset + 1}-{offset + logs.length}</span>
        <button type="button" disabled={!hasNextPage || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>
          Berikutnya
        </button>
      </div>
    </div>
  );
};

export default AuditLogs;