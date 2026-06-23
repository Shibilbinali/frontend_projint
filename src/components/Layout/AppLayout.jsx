import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { dashboardAPI } from '../../api';

export default function AppLayout({ title, subtitle }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  const fetchLowStockCount = useCallback(() => {
    dashboardAPI.getStats()
      .then((res) => {
        const lowStock = parseInt(res.data.stats?.low_stock_count || 0);
        const outOfStock = parseInt(res.data.stats?.out_of_stock_count || 0);
        const count = lowStock + outOfStock;
        console.log(`[Inventory Notification Badge] State updated: low_stock_count = ${lowStock}, out_of_stock_count = ${outOfStock}, combined total = ${count}`);
        setLowStockCount(count);
      })
      .catch((err) => {
        console.error('[Inventory Notification Badge] Failed to fetch stats:', err);
      });
  }, []);

  useEffect(() => {
    fetchLowStockCount();

    window.addEventListener('inventory-updated', fetchLowStockCount);
    return () => {
      window.removeEventListener('inventory-updated', fetchLowStockCount);
    };
  }, [fetchLowStockCount]);

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
