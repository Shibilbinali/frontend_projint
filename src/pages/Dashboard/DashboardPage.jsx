import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, BookOpen, Package, AlertTriangle, ShoppingBag, IndianRupee } from 'lucide-react';
import { dashboardAPI } from '../../api';
import Spinner from '../../components/UI/Spinner';
import Badge from '../../components/UI/Badge';

const COLORS = ['#C8732A', '#E8934A', '#F4C27A', '#4CAF72', '#5B9BD5', '#9B59B6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        fontSize: '0.8rem',
      }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
          ₹{parseFloat(payload[0].value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner text="Loading dashboard..." />;
  if (!data) return (
    <div className="empty-state">
      <div className="empty-state-icon">📊</div>
      <h3>Could not load dashboard</h3>
      <p>Make sure the backend is running and the database is set up.</p>
    </div>
  );

  const { stats, daily_revenue, low_stock_books, top_categories } = data;

  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const fmtNum = (n) => parseInt(n || 0).toLocaleString('en-IN');

  const statCards = [
    {
      icon: '💰', label: "Today's Revenue", value: `₹${fmt(stats.today_revenue)}`,
      change: `${fmtNum(stats.today_sales)} sales today`,
      bg: 'rgba(200, 115, 42, 0.12)', color: 'var(--color-primary)',
    },
    {
      icon: '🧾', label: "Today's Invoices", value: fmtNum(stats.today_invoice_count),
      change: `Generated today`,
      bg: 'rgba(155, 89, 182, 0.12)', color: 'var(--color-primary)',
    },
    {
      icon: '📈', label: 'Total Revenue', value: `₹${fmt(stats.total_revenue)}`,
      change: `${fmtNum(stats.total_sales)} total sales`,
      bg: 'rgba(91, 155, 213, 0.12)', color: 'var(--color-info)',
    },
    {
      icon: '📚', label: 'Total Books', value: fmtNum(stats.total_books),
      change: `${fmtNum(stats.total_stock)} units in stock`,
      bg: 'rgba(76, 175, 114, 0.12)', color: 'var(--color-success)',
    },
    {
      icon: '⚠️', label: 'Low Stock Alerts', value: fmtNum(stats.low_stock_count),
      change: `${fmtNum(stats.out_of_stock_count)} out of stock`,
      bg: 'rgba(224, 82, 82, 0.12)', color: 'var(--color-danger)',
    },
  ];

  const chartData = daily_revenue.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(d.revenue),
    sales: parseInt(d.sales_count),
  }));

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening at your bookstore.</p>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-5 mb-xl">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon" style={{ background: card.bg }}>
              <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
            </div>
            <div className="stat-card-value">{card.value}</div>
            <div className="stat-card-label">{card.label}</div>
            <div className="stat-card-change" style={{ color: card.color }}>
              {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-2 mb-xl" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Revenue Chart */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-md">
            <h3 className="chart-title">Revenue — Last 30 Days</h3>
            <Badge type="primary">Daily</Badge>
          </div>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">📈</div>
              <p>No sales data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'var(--color-primary-light)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Categories */}
        <div className="chart-container">
          <h3 className="chart-title mb-md">Top Categories</h3>
          {top_categories.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">📂</div>
              <p>No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={top_categories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(v) => [`₹${parseFloat(v).toFixed(2)}`, 'Revenue']}
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {top_categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {low_stock_books.length > 0 && (
        <div className="card mb-xl" style={{ borderColor: 'rgba(244, 162, 97, 0.3)' }}>
          <div className="flex items-center gap-sm mb-md">
            <AlertTriangle size={18} color="var(--color-warning)" />
            <h3 style={{ fontSize: '1rem' }}>Low Stock Alerts</h3>
            <Badge type="warning">{low_stock_books.length} books</Badge>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {low_stock_books.map((book) => (
                  <tr key={book.id}>
                    <td className="font-semibold">{book.title}</td>
                    <td className="text-muted">{book.author}</td>
                    <td>
                      <span style={{ color: book.stock_qty === 0 ? 'var(--color-danger)' : 'var(--color-warning)', fontWeight: 700 }}>
                        {book.stock_qty}
                      </span>
                    </td>
                    <td className="text-muted">{book.low_stock_threshold}</td>
                    <td>₹{parseFloat(book.price).toFixed(2)}</td>
                    <td>
                      <Badge type={book.stock_qty === 0 ? 'danger' : 'warning'} dot>
                        {book.stock_qty === 0 ? 'Out of Stock' : 'Low Stock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
