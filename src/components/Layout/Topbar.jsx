import { Bell, Search, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Topbar({ title, subtitle, onMenuToggle, sidebarCollapsed }) {
  const { user } = useAuthStore();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className={`topbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="topbar-left">
        <button
          className="btn btn-ghost btn-icon"
          onClick={onMenuToggle}
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-breadcrumb">{subtitle}</div>}
        </div>
      </div>
      <div className="topbar-right">
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{timeStr}</div>
          <div>{dateStr}</div>
        </div>
        <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
