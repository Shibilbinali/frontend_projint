import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { dashboardAPI } from '../../api';

export default function AppLayout({ title, subtitle }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    dashboardAPI.getStats()
      .then((res) => setLowStockCount(parseInt(res.data.stats?.low_stock_count || 0)))
      .catch(() => {});
  }, []);

  return (
    <div className="app-layout">
      <Sidebar lowStockCount={lowStockCount} />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Topbar
          title={title}
          subtitle={subtitle}
          sidebarCollapsed={sidebarCollapsed}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="page-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
