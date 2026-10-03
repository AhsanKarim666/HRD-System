import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CalendarOff, 
  Wallet, 
  Sparkles,
  LogOut,
  Building2,
  Briefcase,
  ClipboardList,
} from 'lucide-react';
import { getCurrentUser, hasManagementAccess } from '../api/session';

const Sidebar = ({ open, onClose }) => {
  const currentUser = getCurrentUser();
  const canManage = hasManagementAccess(currentUser);
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, adminOnly: true },
    { name: 'Karyawan', path: '/employees', icon: Users, adminOnly: true },
    { name: 'Departemen', path: '/departments', icon: Building2, adminOnly: true },
    { name: 'Jabatan', path: '/positions', icon: Briefcase, adminOnly: true },
    { name: 'Absensi', path: '/attendances', icon: CalendarCheck },
    { name: 'Cuti & Izin', path: '/leaves', icon: CalendarOff },
    { name: 'Payroll', path: '/payrolls', icon: Wallet },
    { name: 'AI Analytics', path: '/ai-analytics', icon: Sparkles, adminOnly: true },
    { name: 'Riwayat Aktivitas', path: '/audit-logs', icon: ClipboardList, hrdOnly: true },
  ];
  const visibleItems = navItems.filter((item) =>
    (!item.adminOnly || canManage) && (!item.hrdOnly || currentUser?.role === 'HRD')
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('hris_session');
    window.location.href = '/login';
  };

  return (
    <aside className="app-sidebar" data-open={open}>
      <div className="sidebar-brand">
        <div className="brand-mark">
          HR
        </div>
        <div>
          <div className="brand-name">HRIS Portal</div>
          <div className="brand-caption">People operations</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navigasi utama">
        <div className="sidebar-section-label">Workspace</div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="logout-button flex items-center gap-3 text-sm font-medium"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;