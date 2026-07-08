import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useState } from 'react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/live', icon: '📹', label: 'Cámara en Vivo' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => setOpen(!open);
  const closeSidebar = () => setOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${open ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      {/* Mobile menu button (rendered via CSS display:none on desktop) */}
      <button className="menu-toggle mobile-menu-btn" onClick={toggleSidebar}
        style={{ position: 'fixed', top: 16, left: 16, zIndex: 101, display: 'none' }}>
        ☰
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">🛡️</div>
          <h2>SafeVision</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div className="nav-spacer" />

          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Cerrar Sesión
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="user-details">
              <div className="name">{user?.full_name || user?.username || 'Admin'}</div>
              <div className="role">{user?.role || 'admin'}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
