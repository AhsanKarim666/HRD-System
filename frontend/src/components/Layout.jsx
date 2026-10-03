import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { getCurrentUser } from '../api/session';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getCurrentUser();
  const initials = (user?.name || user?.email || 'HR')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <div className="app-shell flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <button
        className="sidebar-backdrop"
        data-open={sidebarOpen}
        aria-label="Tutup navigasi"
        onClick={() => setSidebarOpen(false)}
      />
      <div className="app-main flex min-h-screen flex-col">
        <header className="app-header">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="mobile-menu-button"
              type="button"
              aria-label="Buka navigasi"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="header-context">
              <div className="header-eyebrow">HRIS / OPERATIONS</div>
              <div className="header-title">People operations workspace</div>
            </div>
          </div>
          <div className="header-user">
            <div className="header-user-copy text-right">
              <div className="header-user-name">{user?.name || user?.email || 'Pengguna'}</div>
              <div className="header-user-role">{user?.role || 'HRIS'}</div>
            </div>
            <div className="header-user-mark" aria-hidden="true">{initials}</div>
          </div>
        </header>

        <main className="app-content flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;