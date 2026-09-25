import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendances from './pages/Attendances';
import Leaves from './pages/Leaves';
import Payrolls from './pages/Payrolls';
import AiAnalytics from './pages/AiAnalytics';

const getSession = () => {
  try {
    const raw = localStorage.getItem('hris_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.user) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('hris_session');
      return null;
    }
    localStorage.setItem('token', session.token);
    localStorage.setItem('user', JSON.stringify(session.user));
    return session;
  } catch (error) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('hris_session');
    return null;
  }
};

function App() {
  const [session, setSession] = useState(() => getSession());
  const isAuthenticated = !!session?.token;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={setSession} />} />
        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="attendances" element={<Attendances />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="payrolls" element={<Payrolls />} />
          <Route path="ai-analytics" element={<AiAnalytics />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;