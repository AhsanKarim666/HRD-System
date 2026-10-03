import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axiosClient.post('/auth/login', form);
      const session = {
        token: response.data.token,
        user: response.data.user,
      };

      localStorage.setItem('token', session.token);
      localStorage.setItem('user', JSON.stringify(session.user));
      localStorage.setItem('hris_session', JSON.stringify(session));

      if (onLogin) {
        onLogin(session);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Silakan cek kredensial Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-aside" aria-label="HRIS Portal">
        <div className="login-brand">
          <div className="brand-mark">
            HR
          </div>
          <div>
            <div className="brand-name">HRIS Portal</div>
            <div className="brand-caption">People operations</div>
          </div>
        </div>

        <div className="login-aside-copy">
          <div className="login-aside-kicker">INTERNAL PEOPLE SYSTEM</div>
          <h2>Urus tim dengan lebih teratur.</h2>
          <p>Absensi, cuti, dan penggajian dalam satu ruang kerja yang jelas.</p>
          <div className="login-aside-rule" />
        </div>

        <div className="login-aside-foot">HRIS Portal · Workspace internal</div>
      </section>

      <section className="login-main">
        <div className="login-form-wrap">
          <div className="login-eyebrow">AKSES WORKSPACE</div>
          <h1>Selamat datang</h1>
          <p className="login-form-subtitle">Masuk dengan akun perusahaan Anda.</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="username"
              placeholder="nama@perusahaan.id"
              required
            />
          </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
              <div className="inline-alert" role="alert">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
              className="login-submit"
          >
              {loading ? <><LockKeyhole size={16} /> Memeriksa kredensial...</> : <>Masuk ke sistem <ArrowRight size={16} /></>}
          </button>
          </form>

          <div className="login-help">
            <Mail size={13} aria-hidden="true" />
            <span>Gunakan email dan password yang diberikan administrator.</span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;