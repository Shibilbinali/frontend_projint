import { useState, useEffect, useCallback } from 'react';
import { Eye, BarChart3 } from 'lucide-react';
import { salesAPI } from '../../api';
import Modal from '../../components/UI/Modal';
import SearchInput from '../../components/UI/SearchInput';
import Badge from '../../components/UI/Badge';
import Spinner from '../../components/UI/Spinner';
import ReceiptModal from '../../components/Receipt/ReceiptModal';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function SalesPage() {
  const [salesData, setSalesData] = useState({ sales: [], total: 0, total_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [viewSale, setViewSale] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);

  const loadSales = useCallback(async () => {
    try {
      const res = await salesAPI.getAll({ start_date: startDate, end_date: endDate, payment_method: paymentFilter });
      setSalesData(res.data);
    } catch {
      toast.error('Failed to load sales.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, paymentFilter]);

  useEffect(() => { setLoading(true); loadSales(); }, [loadSales]);

  const loadSaleDetail = async (sale) => {
    try {
      const res = await salesAPI.getById(sale.id);
      setViewSale(res.data);
    } catch {
      toast.error('Failed to load sale details.');
    }
  };

  const setDateRange = (range) => {
    const end = new Date();
    const start = new Date();
    if (range === 'today') start.setHours(0, 0, 0, 0);
    else if (range === 'week') start.setDate(end.getDate() - 7);
    else if (range === 'month') start.setDate(end.getDate() - 30);
    else if (range === 'year') start.setFullYear(end.getFullYear() - 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const getPaymentBadge = (method) => {
    const types = { cash: 'success', card: 'info', upi: 'primary', other: 'muted' };
    return <Badge type={types[method] || 'muted'}>{method}</Badge>;
  };

  if (loading) return <Spinner text="Loading sales..." />;

  const { sales, total_revenue } = salesData;

  // Build chart data from sales
  const chartMap = {};
  sales.forEach((s) => {
    const d = new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    chartMap[d] = (chartMap[d] || 0) + parseFloat(s.total_amount);
  });
  const chartData = Object.entries(chartMap).map(([date, revenue]) => ({ date, revenue }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sales Reports</h1>
          <p>{sales.length} sales found — Total Revenue: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>₹{parseFloat(total_revenue).toFixed(2)}</span></p>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="filters-bar mb-md">
        {['today', 'week', 'month', 'year'].map((r) => (
          <button key={r} className="btn btn-ghost btn-sm" onClick={() => setDateRange(r)} style={{ textTransform: 'capitalize' }}>{r}</button>
        ))}
        <span style={{ color: 'var(--color-border)', padding: '0 4px' }}>|</span>
        <input type="date" className="input" style={{ width: 160 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span className="text-muted text-sm">to</span>
        <input type="date" className="input" style={{ width: 160 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select className="select" style={{ width: 'auto' }} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
          <option value="">All Payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
        </select>
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <div className="chart-container mb-xl">
          <h3 className="chart-title mb-md">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                formatter={(v) => [`₹${parseFloat(v).toFixed(2)}`, 'Revenue']}
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8rem' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sales Table */}
      {sales.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><BarChart3 size={48} /></div>
          <h3>No sales in this period</h3>
          <p>Try adjusting your date range or filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="font-semibold">{sale.invoice_number || `#${String(sale.id).padStart(6, '0')}`}</td>
                  <td>
                    <div>{new Date(sale.created_at).toLocaleDateString('en-IN')}</div>
                    <div className="text-xs text-muted">{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>{sale.customer_name || <span className="text-muted">Guest</span>}</td>
                  <td>{sale.cashier_name}</td>
                  <td>{sale.item_count} items</td>
                  <td style={{ color: 'var(--color-primary)', fontWeight: 700 }}>₹{parseFloat(sale.total_amount).toFixed(2)}</td>
                  <td>{getPaymentBadge(sale.payment_method)}</td>
                  <td><Badge type={sale.status === 'completed' ? 'success' : sale.status === 'refunded' ? 'danger' : 'warning'} dot>{sale.status}</Badge></td>
                  <td>
                    <div className="flex gap-xs">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => loadSaleDetail(sale)} title="View"><Eye size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sale Detail Modal */}
      <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title={viewSale?.invoice_number ? `Invoice: ${viewSale.invoice_number}` : `Invoice #${String(viewSale?.id || 0).padStart(6, '0')}`} size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setViewSale(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setReceiptSale(viewSale); setViewSale(null); }}>🖨️ Print Receipt</button>
          </>
        }
      >
        {viewSale && (
          <div>
            <div className="grid grid-2 gap-md mb-lg">
              {[
                { label: 'Date', value: new Date(viewSale.created_at).toLocaleString('en-IN') },
                { label: 'Customer', value: viewSale.customer_name || 'Guest' },
                { label: 'Cashier', value: viewSale.cashier_name },
                { label: 'Payment', value: viewSale.payment_method },
              ].map((f, i) => (
                <div key={i}>
                  <div className="text-xs text-muted">{f.label}</div>
                  <div className="font-semibold">{f.value}</div>
                </div>
              ))}
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Book</th><th>Author</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {(viewSale.items || []).map((item, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{item.book_title}</td>
                      <td>{item.book_author}</td>
                      <td>{item.quantity}</td>
                      <td>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                      <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>₹{parseFloat(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <div className="pos-summary-row"><span>Subtotal</span><span>₹{parseFloat(viewSale.subtotal).toFixed(2)}</span></div>
              {viewSale.is_round_off ? (
                <>
                  {(() => {
                    const sub = parseFloat(viewSale.subtotal) || 0;
                    const tax = parseFloat(viewSale.tax) || 0;
                    const gross = sub + tax;
                    const rounded = Math.floor(gross / 10) * 10;
                    const roundOff = Math.round((gross - rounded) * 100) / 100;
                    const manual = (parseFloat(viewSale.discount) || 0) - roundOff;
                    return (
                      <>
                        {roundOff > 0 && (
                          <div className="pos-summary-row" style={{ color: 'var(--color-success)' }}>
                            <span>Round-Off Discount</span>
                            <span>-₹{roundOff.toFixed(2)}</span>
                          </div>
                        )}
                        {manual > 0 && (
                          <div className="pos-summary-row" style={{ color: 'var(--color-success)' }}>
                            <span>Manual Discount</span>
                            <span>-₹{manual.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                parseFloat(viewSale.discount) > 0 && (
                  <div className="pos-summary-row" style={{ color: 'var(--color-success)' }}>
                    <span>Discount</span>
                    <span>-₹{parseFloat(viewSale.discount).toFixed(2)}</span>
                  </div>
                )
              )}
              {parseFloat(viewSale.tax) > 0 && <div className="pos-summary-row"><span>Tax</span><span>₹{parseFloat(viewSale.tax).toFixed(2)}</span></div>}
              <div className="pos-summary-row pos-summary-total"><span>Total</span><span style={{ color: 'var(--color-primary)' }}>₹{parseFloat(viewSale.total_amount).toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </Modal>

      <ReceiptModal isOpen={!!receiptSale} onClose={() => setReceiptSale(null)} sale={receiptSale} />
    </div>
  );
}
