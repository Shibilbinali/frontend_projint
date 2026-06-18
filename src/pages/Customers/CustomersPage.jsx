import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Users } from 'lucide-react';
import { customersAPI, salesAPI } from '../../api';
import Modal from '../../components/UI/Modal';
import SearchInput from '../../components/UI/SearchInput';
import Spinner from '../../components/UI/Spinner';
import Badge from '../../components/UI/Badge';
import toast from 'react-hot-toast';
import ReceiptModal from '../../components/Receipt/ReceiptModal';

function CustomerFormModal({ isOpen, onClose, customer, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || ''
      });
    } else {
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    }
  }, [customer, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (customer) {
        await customersAPI.update(customer.id, form);
        toast.success('Customer updated!');
      } else {
        await customersAPI.create(form);
        toast.success('Customer added!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} id="save-customer-btn">
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-2 gap-md">
          <div className="input-group">
            <label className="input-label">Full Name *</label>
            <input type="text" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="customer-name-input" />
          </div>
          <div className="input-group">
            <label className="input-label">Phone</label>
            <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Address</label>
            <input type="text" className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Notes</label>
            <textarea className="input" placeholder="Internal notes or preferences..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 80 }} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CustomerDetailModal({ isOpen, onClose, customer }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Filters State
  const [searchTitle, setSearchTitle] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [searchInvoice, setSearchInvoice] = useState('');

  if (!customer) return null;

  // Extract categories & cashiers dynamically from history for filter dropdowns
  const categories = Array.from(new Set((customer.purchase_history || []).map(item => item.category_name).filter(Boolean)));
  const cashiers = Array.from(new Set((customer.purchase_history || []).map(item => item.cashier_name).filter(Boolean)));

  const formatInvoiceDate = (item) => {
    if (item.invoice_date) {
      const [y, m, d] = item.invoice_date.split('-');
      if (y && m && d) return `${d}/${m}/${y.slice(-2)}`;
      return new Date(item.invoice_date).toLocaleDateString('en-GB');
    }
    return new Date(item.purchase_date_time).toLocaleDateString('en-GB');
  };

  const formatInvoiceTime = (item) => {
    if (item.invoice_time) {
      const parts = item.invoice_time.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
      }
      return item.invoice_time;
    }
    return new Date(item.purchase_date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Filtered History
  const filteredHistory = (customer.purchase_history || []).filter(item => {
    // Book Title filter
    if (searchTitle && !item.book_title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
    // Category filter
    if (filterCategory && item.category_name !== filterCategory) return false;
    // Status filter
    if (filterStatus && item.order_status !== filterStatus) return false;
    // Cashier filter
    if (filterCashier && item.cashier_name !== filterCashier) return false;
    // Payment Method filter
    if (filterPayment && item.payment_method !== filterPayment) return false;
    // Invoice Number filter
    if (searchInvoice && !(item.invoice_number && item.invoice_number.toLowerCase().includes(searchInvoice.toLowerCase())) && !String(item.order_id).includes(searchInvoice)) return false;
    // Date Range filter
    if (startDate) {
      const start = new Date(startDate);
      const purchaseDate = new Date(item.purchase_date_time);
      if (purchaseDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const purchaseDate = new Date(item.purchase_date_time);
      if (purchaseDate > end) return false;
    }
    return true;
  });

  const handleOrderClick = async (orderId) => {
    setLoadingOrder(true);
    try {
      const res = await salesAPI.getById(orderId);
      setSelectedOrder(res.data);
    } catch {
      toast.error('Failed to load order details.');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer Purchase Report - ${customer.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 30px; color: #333; }
            h2 { color: #8B4513; margin-bottom: 5px; }
            .header-info { margin-bottom: 30px; font-size: 0.9rem; line-height: 1.6; color: #555; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; text-align: center; background: #f8fafc; }
            .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .stat-value { font-size: 1.4rem; font-weight: bold; margin-top: 5px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85rem; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
            .badge-success { background-color: #dcfce7; color: #15803d; }
            .badge-primary { background-color: #dbeafe; color: #1d4ed8; }
            .badge-warning { background-color: #fef9c3; color: #a16207; }
            .badge-danger { background-color: #fee2e2; color: #b91c1c; }
          </style>
        </head>
        <body>
          <h2>Customer Purchase Report</h2>
          <div class="header-info">
            <strong>Customer Name:</strong> ${customer.name}<br/>
            <strong>Customer ID:</strong> #${customer.id}<br/>
            <strong>Email:</strong> ${customer.email || '—'}<br/>
            <strong>Phone:</strong> ${customer.phone || '—'}<br/>
            <strong>Address:</strong> ${customer.address || '—'}<br/>
            <strong>Notes:</strong> ${customer.notes || '—'}<br/>
            <strong>Registration Date:</strong> ${new Date(customer.created_at).toLocaleDateString('en-IN')}<br/>
            <strong>Report Generated:</strong> ${new Date().toLocaleString('en-IN')}
          </div>
          <h3>Statistics Summary</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Spending</div>
              <div class="stat-value">₹${customer.stats?.total_amount_spent ? customer.stats.total_amount_spent.toFixed(2) : '0.00'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Orders</div>
              <div class="stat-value">${customer.stats?.total_orders || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Books Purchased</div>
              <div class="stat-value">${customer.stats?.total_books_purchased || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Favorite Category</div>
              <div class="stat-value">${customer.stats?.favorite_category || '—'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Most Purchased Book</div>
              <div class="stat-value" style="font-size: 0.95rem; line-height: 1.2; margin-top: 8px;">${customer.stats?.most_purchased_book || '—'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Average Order Value</div>
              <div class="stat-value">₹${customer.stats?.average_order_value ? customer.stats.average_order_value.toFixed(2) : '0.00'}</div>
            </div>
          </div>
          <h3>Purchase Items History</h3>
          <table>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Time</th>
                <th>Book Title</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Tax</th>
                <th>Discount</th>
                <th>Final Total</th>
                <th>Cashier</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              ${filteredHistory.map(item => `
                <tr>
                  <td>${item.invoice_number || `#${String(item.order_id).padStart(6, '0')}`}</td>
                  <td>${formatInvoiceDate(item)}</td>
                  <td>${formatInvoiceTime(item)}</td>
                  <td><strong>${item.book_title}</strong><br/><small style="color: #64748b">by ${item.book_author}</small></td>
                  <td>${item.quantity}</td>
                  <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td>₹${parseFloat(item.tax_amount).toFixed(2)}</td>
                  <td>₹${parseFloat(item.discount_applied || 0).toFixed(2)}</td>
                  <td>₹${parseFloat(item.final_price).toFixed(2)}</td>
                  <td>${item.cashier_name || '—'}</td>
                  <td style="text-transform: capitalize">${item.payment_method}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleExportExcel = () => {
    const headers = ['Invoice Number', 'Date', 'Time', 'Book Title', 'Author', 'Category', 'Quantity', 'Price (INR)', 'Tax Amount (INR)', 'Discount Applied (INR)', 'Final Total (INR)', 'Cashier', 'Payment Method'];
    const rows = filteredHistory.map(item => [
      item.invoice_number || `#${String(item.order_id).padStart(6, '0')}`,
      formatInvoiceDate(item),
      formatInvoiceTime(item),
      `"${item.book_title.replace(/"/g, '""')}"`,
      `"${item.book_author.replace(/"/g, '""')}"`,
      item.category_name || '—',
      item.quantity,
      item.unit_price,
      parseFloat(item.tax_amount || 0).toFixed(2),
      parseFloat(item.discount_applied || 0).toFixed(2),
      parseFloat(item.final_price || 0).toFixed(2),
      item.cashier_name || '—',
      item.payment_method
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customer_purchase_history_${customer.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Customer Profile: ${customer.name}`} size="lg">
        <style>{`
          .profile-container {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
          }
          .tabs-header {
            display: flex;
            border-bottom: 1px solid var(--color-border);
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-sm);
          }
          .tab-btn {
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            color: var(--color-text-secondary);
            padding: var(--spacing-sm) var(--spacing-md);
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .tab-btn.active {
            border-bottom-color: var(--color-primary);
            color: var(--color-primary);
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-md);
          }
          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 480px) {
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
          .stat-card {
            background: var(--color-surface-2);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: var(--spacing-md);
            display: flex;
            flex-direction: column;
            gap: 4px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }
          .stat-label {
            font-size: 0.7rem;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          .stat-value {
            font-size: 1.25rem;
            font-weight: bold;
            font-family: var(--font-display);
            color: var(--color-text);
          }
          .profile-details-card {
            background: var(--color-surface-3);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: var(--spacing-lg);
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-md);
          }
          .detail-field {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .detail-label {
            font-size: 0.75rem;
            color: var(--color-text-muted);
            text-transform: uppercase;
          }
          .detail-val {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--color-text);
          }
          .date-inputs {
            display: flex;
            gap: var(--spacing-xs);
            align-items: center;
          }
          .date-input {
            padding: 6px 10px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--color-border);
            background: var(--color-surface-2);
            color: var(--color-text);
            font-size: 0.8rem;
            flex: 1;
          }
          .order-link {
            color: var(--color-primary);
            font-weight: 600;
            text-decoration: underline;
            cursor: pointer;
          }
          .order-link:hover {
            color: var(--color-primary-dark, var(--color-primary));
          }
          .actions-row {
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-sm);
          }
        `}</style>

        <div className="profile-container">
          <div className="tabs-header">
            <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Statistics</button>
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Purchase History ({filteredHistory.length})</button>
          </div>

          {activeTab === 'profile' && (
            <div className="profile-details-card">
              <div className="detail-field">
                <span className="detail-label">Customer Name</span>
                <span className="detail-val">{customer.name}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Customer ID</span>
                <span className="detail-val">#{customer.id}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Phone Number</span>
                <span className="detail-val">{customer.phone || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Email Address</span>
                <span className="detail-val">{customer.email || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Registration Date</span>
                <span className="detail-val">{new Date(customer.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Total Orders</span>
                <span className="detail-val">{customer.stats?.total_orders || 0}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Total Books Purchased</span>
                <span className="detail-val">{customer.stats?.total_books_purchased || 0} units</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Total Amount Spent</span>
                <span className="detail-val" style={{ color: 'var(--color-primary)' }}>₹{customer.stats?.total_amount_spent ? customer.stats.total_amount_spent.toFixed(2) : '0.00'}</span>
              </div>
              <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                <span className="detail-label">Last Purchase Date</span>
                <span className="detail-val">
                  {customer.stats?.last_purchase_date 
                    ? `${new Date(customer.stats.last_purchase_date).toLocaleDateString('en-IN')} ${new Date(customer.stats.last_purchase_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                    : 'No purchases yet'}
                </span>
              </div>
              {customer.address && (
                <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                  <span className="detail-label">Address</span>
                  <span className="detail-val">{customer.address}</span>
                </div>
              )}
              {customer.notes && (
                <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                  <span className="detail-label">Notes</span>
                  <span className="detail-val" style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>{customer.notes}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Spend</span>
                <span className="stat-value" style={{ color: 'var(--color-primary)' }}>₹{customer.stats?.total_amount_spent ? customer.stats.total_amount_spent.toFixed(2) : '0.00'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Orders</span>
                <span className="stat-value">{customer.stats?.total_orders || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Books Purchased</span>
                <span className="stat-value">{customer.stats?.total_books_purchased || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Favorite Category</span>
                <span className="stat-value" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{customer.stats?.favorite_category || '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Most Purchased Book</span>
                <span className="stat-value" style={{ fontSize: '0.9rem', lineHeight: '1.2', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={customer.stats?.most_purchased_book}>{customer.stats?.most_purchased_book || '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Avg Order Value</span>
                <span className="stat-value">₹{customer.stats?.average_order_value ? customer.stats.average_order_value.toFixed(2) : '0.00'}</span>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {/* Export and action row */}
              <div className="actions-row">
                <button className="btn btn-secondary btn-sm" onClick={handlePrintReport}>Print Report</button>
                <button className="btn btn-secondary btn-sm" onClick={handlePrintReport}>Export PDF</button>
                <button className="btn btn-primary btn-sm" onClick={handleExportExcel}>Export Excel</button>
              </div>

              {/* Filtering Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)', background: 'var(--color-surface-2)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--spacing-md)' }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Book Title</label>
                    <input type="text" className="input" style={{ fontSize: '0.8rem', padding: '6px 10px' }} placeholder="Search book..." value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Invoice Number</label>
                    <input type="text" className="input" style={{ fontSize: '0.8rem', padding: '6px 10px' }} placeholder="Search invoice..." value={searchInvoice} onChange={(e) => setSearchInvoice(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Category</label>
                    <select className="select" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                      <option value="">All Categories</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Cashier</label>
                    <select className="select" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={filterCashier} onChange={(e) => setFilterCashier(e.target.value)}>
                      <option value="">All Cashiers</option>
                      {cashiers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Payment</label>
                    <select className="select" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
                      <option value="">All Payments</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Status</label>
                    <select className="select" style={{ fontSize: '0.8rem', padding: '6px 10px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Date Range</label>
                  <div className="date-inputs">
                    <input type="date" className="date-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>to</span>
                    <input type="date" className="date-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    {(startDate || endDate || searchTitle || searchInvoice || filterCategory || filterCashier || filterPayment || filterStatus) && (
                      <button className="btn btn-ghost btn-xs" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setSearchTitle('');
                        setSearchInvoice('');
                        setFilterCategory('');
                        setFilterCashier('');
                        setFilterPayment('');
                        setFilterStatus('');
                      }}>Clear All Filters</button>
                    )}
                  </div>
                </div>
              </div>

              {/* History Table */}
              {filteredHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>No books match the selected filters.</p>
                </div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice Number</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Book Title</th>
                        <th style={{ textAlign: 'center' }}>Quantity</th>
                        <th>Price</th>
                        <th>Tax</th>
                        <th>Discount</th>
                        <th>Final Total</th>
                        <th>Cashier</th>
                        <th>Payment Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className="order-link" onClick={() => handleOrderClick(item.order_id)}>
                              {item.invoice_number || `#${String(item.order_id).padStart(6, '0')}`}
                            </span>
                          </td>
                          <td>{formatInvoiceDate(item)}</td>
                          <td>{formatInvoiceTime(item)}</td>
                          <td>
                            <div className="font-semibold">{item.book_title}</div>
                            <div className="text-xs text-muted">by {item.book_author}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                          <td>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                          <td>₹{parseFloat(item.tax_amount).toFixed(2)}</td>
                          <td>₹{parseFloat(item.discount_applied || 0).toFixed(2)}</td>
                          <td style={{ color: 'var(--color-primary)', fontWeight: 700 }}>₹{parseFloat(item.final_price).toFixed(2)}</td>
                          <td>{item.cashier_name || '—'}</td>
                          <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{item.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <ReceiptModal 
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        sale={selectedOrder}
      />
    </>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await customersAPI.getAll({ search });
      setCustomers(res.data.customers || []);
    } catch {
      toast.error('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { setLoading(true); loadCustomers(); }, [loadCustomers]);

  const handleDelete = async () => {
    try {
      await customersAPI.delete(deleteModal.id);
      toast.success('Customer deleted.');
      setDeleteModal(null);
      loadCustomers();
    } catch {
      toast.error('Failed to delete customer.');
    }
  };

  const loadCustomerDetail = async (customer) => {
    try {
      const res = await customersAPI.getById(customer.id);
      setViewCustomer(res.data);
    } catch {
      toast.error('Failed to load customer details.');
    }
  };

  if (loading) return <Spinner text="Loading customers..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>{customers.length} registered customers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditCustomer(null); setModalOpen(true); }} id="add-customer-btn">
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="filters-bar">
        <SearchInput value={search} onSearch={setSearch} placeholder="Search by name, phone, or email..." />
      </div>

      {customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={48} /></div>
          <h3>No customers yet</h3>
          <p>Add your first customer to get started.</p>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Customer</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Total Purchases</th>
                <th>Total Spent</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="sidebar-avatar" style={{ width: 34, height: 34, fontSize: '0.8rem', flexShrink: 0 }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="font-semibold">{c.name}</div>
                    </div>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td><Badge type="info">{c.total_purchases} orders</Badge></td>
                  <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>₹{parseFloat(c.total_spent || 0).toFixed(2)}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className="flex gap-xs">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => loadCustomerDetail(c)} title="View details"><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditCustomer(c); setModalOpen(true); }} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => setDeleteModal(c)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CustomerFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditCustomer(null); }} customer={editCustomer} onSaved={loadCustomers} />
      <CustomerDetailModal isOpen={!!viewCustomer} onClose={() => setViewCustomer(null)} customer={viewCustomer} />
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Customer" size="sm"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete} id="confirm-delete-customer-btn">Delete</button></>}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Delete customer <strong style={{ color: 'var(--color-text)' }}>"{deleteModal?.name}"</strong>? Their purchase history will remain but they'll be unlinked from sales.</p>
      </Modal>
    </div>
  );
}
