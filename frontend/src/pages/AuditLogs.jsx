import React, { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const PAGE_SIZE = 50;
const actionLabels = {
  'user.register': 'Tambah pengguna',
  'employee.create': 'Tambah karyawan',
  'employee.update': 'Ubah data karyawan',
  'employee.deactivate': 'Nonaktifkan karyawan',
  'employee.delete': 'Hapus karyawan',
  'attendance.check_in': 'Catat check-in',
  'attendance.check_out': 'Catat check-out',
  'leave.request': 'Ajukan cuti',
  'leave.approved': 'Setujui cuti',
  'leave.rejected': 'Tolak cuti',
  'payroll.generate': 'Buat payroll',
  'payroll.payment_status': 'Ubah status pembayaran',
  'department.create': 'Tambah departemen',
  'department.update': 'Ubah departemen',
  'department.delete': 'Hapus departemen',
  'position.create': 'Tambah jabatan',
  'position.update': 'Ubah jabatan',
  'position.delete': 'Hapus jabatan',
};
const entityLabels = {
  user: 'Pengguna',
  employee: 'Karyawan',
  attendance: 'Absensi',
  leave: 'Cuti',
  payroll: 'Payroll',
  department: 'Departemen',
  position: 'Jabatan',
};
const detailLabels = {
  role: 'Role',
  employee_id: 'Karyawan',
  department_id: 'Departemen',
  position_id: 'Jabatan',
  status: 'Status kerja',
  payment_status: 'Pembayaran',
  leave_type: 'Jenis cuti',
  start_date: 'Mulai',
  end_date: 'Selesai',
  period: 'Periode',
  changed_fields: 'Kolom diubah',
};
const valueLabels = {
  Active: 'Aktif',
  Probation: 'Probasi',
  Inactive: 'Nonaktif',
  Paid: 'Sudah dibayar',
  Unpaid: 'Belum dibayar',
  Annual: 'Tahunan',
  Sick: 'Sakit',
  Personal: 'Keperluan pribadi',
  Maternity: 'Melahirkan',
  Other: 'Lainnya',
};
const fieldLabels = {
  full_name: 'Nama',
  phone: 'Telepon',
  department_id: 'Departemen',
  position_id: 'Jabatan',
  status: 'Status kerja',
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [directory, setDirectory] = useState({ employees: {}, departments: {}, positions: {} });

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const [response, employeesResponse, departmentsResponse, positionsResponse] = await Promise.all([
          axiosClient.get(`/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`),
          axiosClient.get('/employees').catch(() => null),
          axiosClient.get('/departments').catch(() => null),
          axiosClient.get('/positions').catch(() => null),
        ]);
        const rows = response.data.data || [];
        const total = Number(response.data.pagination?.total || 0);
        setLogs(rows);
        setTotalRecords(total);
        setHasNextPage(offset + rows.length < total);
        setDirectory({
          employees: Object.fromEntries((employeesResponse?.data.data || []).map((item) => [String(item.id), item.full_name])),
          departments: Object.fromEntries((departmentsResponse?.data.data || []).map((item) => [String(item.id), item.name])),
          positions: Object.fromEntries((positionsResponse?.data.data || []).map((item) => [String(item.id), item.name])),
        });
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
  const formatDate = (value) => {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };
  const formatDetailValue = (key, value) => {
    if (Array.isArray(value)) return value.map((field) => fieldLabels[field] || field).join(', ');
    const directoryKey = {
      employee_id: 'employees',
      department_id: 'departments',
      position_id: 'positions',
    }[key];
    if (directoryKey) return directory[directoryKey][String(value)] || 'Nama tidak tersedia';
    if (key === 'start_date' || key === 'end_date') return formatDate(value);
    if (key === 'period') return formatDate(value);
    return valueLabels[value] || String(value);
  };
  const formatDetailLabel = (key) => detailLabels[key]
    || key.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(Math.floor(offset / PAGE_SIZE) + 1, totalPages);

  return (
    <div className="audit-page">
      <div className="page-heading audit-heading">
        <div className="dashboard-eyebrow">SECURITY & COMPLIANCE</div>
        <h1>Riwayat Aktivitas</h1>
        <p>Perubahan operasional yang dilakukan pengguna.</p>
      </div>
      {errorMsg && <p role="alert" style={{ color: '#b91c1c' }}>{errorMsg}</p>}

      {loading ? <p>Memuat riwayat...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Aksi</th>
                <th>Data</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="audit-empty">
                    <ClipboardList size={22} aria-hidden="true" />
                    <span>Belum ada aktivitas yang tercatat.</span>
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{log.actor_role} (ID {log.actor_id || '-'})</td>
                  <td><span className="audit-action">{actionLabels[log.action] || log.action}</span></td>
                  <td>{entityLabels[log.entity_type] || log.entity_type} #{log.entity_id || '-'}</td>
                  <td>
                    <div className="audit-details">
                      {Object.entries(log.details || {}).length === 0 ? 'Tidak ada detail tambahan.' : (
                        Object.entries(log.details || {}).map(([key, value]) => (
                          <span className="audit-detail-item" key={key}>
                            <strong>{formatDetailLabel(key)}</strong>
                            <span>{formatDetailValue(key, value)}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          title="Lihat catatan yang lebih baru"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          Sebelumnya
        </button>
        <span className="audit-pagination-label">
          Halaman {currentPage} dari {totalPages}
        </span>
        <button
          type="button"
          aria-label="Halaman berikutnya"
          title="Lihat catatan yang lebih lama"
          disabled={!hasNextPage || loading}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
};

export default AuditLogs;