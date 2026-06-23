import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Package, ShoppingCart,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'cashier'] },
  { label: 'POS Billing', icon: ShoppingCart, path: '/pos', roles: ['admin', 'cashier'], highlight: true },
];

const managementNav = [
  { label: 'Books', icon: BookOpen, path: '/books', roles: ['admin'] },
  { label: 'Inventory', icon: Package, path: '/inventory', roles: ['admin'] },
  { label: 'Customers', icon: Users, path: '/customers', roles: ['admin', 'cashier'] },
  { label: 'Sales Reports', icon: BarChart3, path: '/sales', roles: ['admin'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'cashier'] },
];

const adminNav = [];

export default function Sidebar({ lowStockCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  const mainItems = navItems.filter(item => item.roles.includes(user?.role));
  const mgmtItems = managementNav.filter(item => item.roles.includes(user?.role));
  const adminItems = adminNav.filter(item => item.roles.includes(user?.role));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Toggle button */}
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle sidebar"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📚</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">BookStore</span>
          <span className="sidebar-logo-subtitle">Point of Sale</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Main */}
        <div className="sidebar-section-label">Main</div>
        {mainItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <item.icon className="nav-icon" size={20} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        {/* Management */}
        {mgmtItems.length > 0 && (
          <>
            <div className="sidebar-section-label">Management</div>
            {mgmtItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <item.icon className="nav-icon" size={20} />
                <span className="nav-label">{item.label}</span>
                {item.path === '/inventory' && (lowStockCount > 0 || (lowStockCount === 0 && localStorage.getItem('showZeroBadge') === 'true')) && (
                  <span className="nav-badge">{lowStockCount}</span>
                )}
              </NavLink>
            ))}
          </>
        )}

        {/* Admin */}
        {isAdmin && adminItems.length > 0 && (
          <>
            <div className="sidebar-section-label" style={{ color: 'var(--color-primary)', opacity: 0.8 }}>Admin</div>
            {adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <item.icon className="nav-icon" size={20} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button
          className="sidebar-nav-item w-full"
          onClick={handleLogout}
          style={{ marginTop: '8px', color: 'var(--color-danger)' }}
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut size={20} className="nav-icon" />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
