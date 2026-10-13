import React, { useCallback, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { getCurrentUser, hasManagementAccess } from '../api/session';
import { downloadFile } from '../utils/downloadFile';

const Payrolls = () => {
  const currentUser = getCurrentUser();
  const canManage = hasManagementAccess(currentUser);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const canExport = currentUser?.role === 'HRD';

  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [payRes, empRes] = await Promise.all([
        axiosClient.get('/payrolls'),
        canManage ? axiosClient.get('/employees') : Promise.resolve({ data: { data: [] } }),
      ]);
      setPayrolls(payRes.data.data);
      setEmployees(empRes.data.data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Gagal memuat data payroll.');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      setLoading(true);
      await fetchData();
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

  const downloadPayslip = async (payroll) => {
    setDownloadingSlip(true);
    try {
      const { jsPDF } = await import('jspdf');
      const document = new jsPDF();
      const period = payroll.period ? String(payroll.period).slice(0, 7) : '-';
      const lines = [
        ['Nama Karyawan', payroll.full_name],
        ['NIK', payroll.nik],
        ['Departemen', payroll.department_name || '-'],
        ['Jabatan', payroll.position_name || '-'],
        ['Periode', period],
        ['Gaji Pokok', formatRupiah(payroll.basic_salary)],
        ['Tunjangan', formatRupiah(payroll.allowances)],
        ['Potongan Lain', formatRupiah(payroll.deductions)],
        ['PPh 21 (Estimasi)', formatRupiah(payroll.pph21)],
        ['Total Diterima', formatRupiah(payroll.net_salary)],
        ['Status Pembayaran', payroll.payment_status || 'Unpaid'],
      ];

      document.setFillColor(23, 107, 79);
      document.rect(14, 14, 182, 20, 'F');
      document.setTextColor(255, 255, 255);
      document.setFontSize(16);
      document.text('SLIP GAJI KARYAWAN', 22, 27);
      document.setTextColor(30, 43, 38);
      document.setFontSize(10);

      let y = 48;
      lines.forEach(([label, value], index) => {
        if (index === 9) {
          document.setDrawColor(23, 107, 79);
          document.line(20, y - 6, 190, y - 6);
          document.setFont('helvetica', 'bold');
        } else {
          document.setFont('helvetica', 'normal');
        }
        document.text(String(label), 22, y);
        document.text(String(value ?? '-').replace(/\u00a0/g, ' '), 92, y);
        y += 11;
      });

      document.setFont('helvetica', 'normal');
      document.setFontSize(8);
      document.setTextColor(102, 117, 110);
      document.text('Dokumen ini dihasilkan otomatis oleh HRIS.', 22, y + 8);
      document.save(`slip-gaji-${payroll.nik || payroll.id}-${period}.pdf`);
    } catch (error) {
      console.error('Gagal membuat PDF slip gaji:', error);
      alert('Gagal membuat PDF slip gaji.');
    } finally {
      setDownloadingSlip(false);
    }
  };

  const exportPayrollCsv = async () => {
    setExporting(true);
    try {
      const response = await axiosClient.get('/payroll/export.csv', {
        params: { month: exportMonth, year: exportYear },
        responseType: 'blob',
      });
      const month = String(exportMonth).padStart(2, '0');
      downloadFile(response.data, `rekap-penggajian-${exportYear}-${month}.csv`);
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengunduh rekap penggajian.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="operational-page payroll-page">
      <header className="page-heading operational-heading">
        <div className="dashboard-eyebrow">KOMPENSASI & BENEFIT</div>
        <h1>Penggajian</h1>
        <p>
          PPh 21 ditampilkan terpisah sebagai estimasi bulanan dengan PTKP TK/0 Rp54.000.000 dan tarif progresif.
          Potongan lain tidak mencakup PPh 21.
        </p>
      </header>

      {errorMessage && <p className="operational-error" role="alert">{errorMessage}</p>}

      {canManage && <section className="operational-panel">
        <div className="operational-section-heading">
          <h2>Generate Slip Gaji</h2>
          <p>Lengkapi periode dan komponen penghasilan untuk membuat slip karyawan.</p>
        </div>
        <form className="operational-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="payroll-employee">Pilih Karyawan</label>
            <select
              id="payroll-employee"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleEmployeeChange}
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

          <div>
            <label htmlFor="payroll-month">Bulan</label>
            <select
              id="payroll-month"
              name="month"
              value={formData.month}
              onChange={handleChange}
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
            <label htmlFor="payroll-year">Tahun</label>
            <input
              id="payroll-year"
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="payroll-basic-salary">Gaji Pokok (Rp)</label>
            <input
              id="payroll-basic-salary"
              type="number"
              name="basic_salary"
              min="0"
              step="0.01"
              value={formData.basic_salary}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="payroll-allowances">Tunjangan (Rp)</label>
            <input
              id="payroll-allowances"
              type="number"
              name="allowances"
              value={formData.allowances}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="payroll-deductions">Potongan Lain (Rp)</label>
            <input
              id="payroll-deductions"
              type="number"
              name="deductions"
              value={formData.deductions}
              onChange={handleChange}
            />
          </div>

          <div className="operational-form-actions">
            <button type="submit">
              Hitung & Generate Gaji
            </button>
          </div>
        </form>
      </section>}

      <section className="operational-section">
        <div className="operational-toolbar">
          <div>
            <h2>Daftar Slip Gaji</h2>
            <p>Riwayat penggajian karyawan berdasarkan periode.</p>
          </div>
          {canExport && (
            <div className="operational-export">
              <label htmlFor="payroll-export-month">Periode rekap</label>
              <select
                id="payroll-export-month"
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
                aria-label="Tahun rekap penggajian"
              />
              <button className="operational-primary-button" type="button" disabled={exporting} onClick={exportPayrollCsv}>
                {exporting ? 'Menyiapkan...' : 'Export Rekap Penggajian CSV'}
              </button>
            </div>
          )}
        </div>
        {loading ? <p className="operational-feedback" role="status">Memuat data payroll...</p> : (
          <div className="operational-table-wrap">
            <table className="operational-table">
              <thead>
                <tr>
                  <th>Nama Karyawan</th>
                  <th>Periode</th>
                  <th>Gaji Pokok</th>
                  <th>Tunjangan</th>
                  <th>Potongan Lain</th>
                  <th>PPh 21 (Estimasi)</th>
                  <th>Total Diterima</th>
                  <th>Status</th>
                  <th>Slip</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="operational-empty">Belum ada slip gaji untuk ditampilkan.</td>
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
                        <span className={`operational-status ${p.payment_status === 'Paid' ? 'is-success' : 'is-warning'}`}>
                          {p.payment_status || 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        <button type="button" onClick={() => setSelectedSlip(p)}>Lihat Slip</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selectedSlip && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedSlip(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            background: 'rgba(15, 23, 42, 0.55)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payslip-title"
            style={{ width: 'min(100%, 560px)', padding: '24px', borderRadius: '10px', background: '#fff' }}
          >
            <h3 id="payslip-title">Slip Gaji {selectedSlip.period ? String(selectedSlip.period).slice(0, 7) : ''}</h3>
            <p><strong>{selectedSlip.full_name}</strong> · {selectedSlip.nik}</p>
            <p>{selectedSlip.department_name || '-'} · {selectedSlip.position_name || '-'}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Gaji Pokok', selectedSlip.basic_salary],
                  ['Tunjangan', selectedSlip.allowances],
                  ['Potongan Lain', selectedSlip.deductions],
                  ['PPh 21 (Estimasi)', selectedSlip.pph21],
                  ['Total Diterima', selectedSlip.net_salary],
                ].map(([label, amount]) => (
                  <tr key={label}>
                    <td style={{ padding: '8px 0' }}>{label}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatRupiah(amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Status: <strong>{selectedSlip.payment_status || 'Unpaid'}</strong></p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button type="button" onClick={() => setSelectedSlip(null)}>Tutup</button>
              <button
                type="button"
                disabled={downloadingSlip}
                onClick={() => downloadPayslip(selectedSlip)}
              >
                {downloadingSlip ? 'Menyiapkan PDF...' : 'Download PDF Slip Gaji'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Payrolls;