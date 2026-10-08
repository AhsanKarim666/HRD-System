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
import Departments from './pages/Departments';
import Positions from './pages/Positions';
import AuditLogs from './pages/AuditLogs';
import Shifts from './pages/Shifts';
import Overtimes from './pages/Overtimes';
import { hasManagementAccess } from './api/session';

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
  const canManage = hasManagementAccess(session?.user);
  const isHrd = session?.user?.role === 'HRD';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={setSession} />} />
        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route index element={canManage ? <Dashboard /> : <Navigate to="/attendances" replace />} />
          <Route path="employees" element={canManage ? <Employees /> : <Navigate to="/attendances" replace />} />
          <Route path="departments" element={canManage ? <Departments /> : <Navigate to="/attendances" replace />} />
          <Route path="positions" element={canManage ? <Positions /> : <Navigate to="/attendances" replace />} />
          <Route path="shifts" element={canManage ? <Shifts /> : <Navigate to="/attendances" replace />} />
          <Route path="audit-logs" element={isHrd ? <AuditLogs /> : <Navigate to="/attendances" replace />} />
          <Route path="attendances" element={<Attendances />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="overtimes" element={<Overtimes />} />
          <Route path="payrolls" element={<Payrolls />} />
          <Route path="ai-analytics" element={canManage ? <AiAnalytics /> : <Navigate to="/attendances" replace />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;