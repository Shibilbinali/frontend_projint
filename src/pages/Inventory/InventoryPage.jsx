import { useState, useEffect, useCallback } from 'react';
import { Edit2, AlertTriangle, Package, Info } from 'lucide-react';
import { inventoryAPI } from '../../api';
import Modal from '../../components/UI/Modal';
import SearchInput from '../../components/UI/SearchInput';
import Badge from '../../components/UI/Badge';
import Spinner from '../../components/UI/Spinner';
import toast from 'react-hot-toast';
import BookDetailsModal from '../../components/Books/BookDetailsModal';

export default function InventoryPage() {
  const [inventory, setInventory] = useState({ books: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const [stockForm, setStockForm] = useState({ stock_qty: '', low_stock_threshold: '' });
  const [saving, setSaving] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      const res = await inventoryAPI.getAll({ search, low_stock: showLowStock });
      setInventory(res.data);
    } catch {
      toast.error('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [search, showLowStock]);

  useEffect(() => { setLoading(true); loadInventory(); }, [loadInventory]);

  const openEdit = (book) => {
    setEditModal(book);
    setStockForm({ stock_qty: book.stock_qty, low_stock_threshold: book.low_stock_threshold });
  };

  const handleSaveStock = async () => {
    setSaving(true);
    try {
      await inventoryAPI.updateStock(editModal.id, stockForm);
      toast.success('Stock updated!');
      window.dispatchEvent(new CustomEvent('inventory-updated'));
      setEditModal(null);
      loadInventory();
    } catch {
      toast.error('Failed to update stock.');
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (book) => {
    if (book.stock_qty === 0) return 'out_of_stock';
    if (book.stock_qty <= book.low_stock_threshold) return 'low_stock';
    return 'in_stock';
  };

  const getStockBadge = (status) => {
    if (status === 'out_of_stock') return <Badge type="danger" dot>Out of Stock</Badge>;
    if (status === 'low_stock') return <Badge type="warning" dot>Low Stock</Badge>;
    return <Badge type="success" dot>In Stock</Badge>;
  };

  const getStockPercent = (book) => {
    const max = Math.max(book.low_stock_threshold * 4, 20);
    return Math.min((book.stock_qty / max) * 100, 100);
  };

  const getCoverUrl = (book) => {
    const url = book.cover_image || book.front_cover_url || book.cover_image_url;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    return `${API_URL}${url}`;
  };

  if (loading) return <Spinner text="Loading inventory..." />;
  const { books, summary } = inventory;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Track stock levels and manage book inventory</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-4 mb-xl">
        {[
          { label: 'Total Books', value: summary.total_books || 0, icon: '📚', type: 'info' },
          { label: 'Total Units', value: summary.total_stock || 0, icon: '📦', type: 'success' },
          { label: 'Low Stock', value: summary.low_stock || 0, icon: '⚠️', type: 'warning' },
          { label: 'Out of Stock', value: summary.out_of_stock || 0, icon: '🚫', type: 'danger' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon" style={{ background: `var(--color-${s.type}-bg)` }}>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
            <div className="stat-card-value">{parseInt(s.value).toLocaleString()}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Low stock alert banner */}
      {parseInt(summary.low_stock || 0) > 0 && (
        <div className="alert alert-warning mb-lg">
          <AlertTriangle size={18} />
          <div>
            <strong>{summary.low_stock} books</strong> are running low on stock.
            {parseInt(summary.out_of_stock || 0) > 0 && (
              <> {summary.out_of_stock} books are completely out of stock.</>
            )} Restock them to avoid lost sales.
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <SearchInput value={search} onSearch={setSearch} placeholder="Search books..." />
        <label className="flex items-center gap-sm" style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          Show low stock only
        </label>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {books.length} books
        </div>
      </div>

      {/* Inventory Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Book</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Alert At</th>
              <th>Stock Level</th>
              <th>Selling Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Package size={40} /></div>
                    <h3>No books found</h3>
                  </div>
                </td>
              </tr>
            ) : books.map((book) => {
              const status = getStockStatus(book);
              const pct = getStockPercent(book);
              return (
                <tr key={book.id} style={{ cursor: 'pointer' }} onClick={() => setDetailsBook(book)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      {getCoverUrl(book) ? (
                        <img
                          src={getCoverUrl(book)}
                          alt={book.title}
                          style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: 32, height: 48, background: 'var(--color-surface-3)', borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}>📖</div>
                      )}
                      <div>
                        <div className="font-semibold">{book.title}</div>
                        <div className="text-xs text-muted">{book.author}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {book.category_name
                      ? <Badge type="primary">{book.category_name}</Badge>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    <span style={{
                      fontSize: '1.1rem', fontWeight: 700,
                      color: status === 'out_of_stock'
                        ? 'var(--color-danger)'
                        : status === 'low_stock'
                        ? 'var(--color-warning)'
                        : 'var(--color-success)'
                    }}>
                      {book.stock_qty}
                    </span>
                  </td>
                  <td className="text-muted">{book.low_stock_threshold}</td>
                  <td style={{ width: 120 }}>
                    <div className="stock-bar">
                      <div
                        className={`stock-bar-fill ${status}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted mt-xs">{Math.round(pct)}%</div>
                  </td>
                  <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    {parseFloat(book.price) === 0 ? (
                      <Badge type="success">FREE</Badge>
                    ) : (
                      `₹${parseFloat(book.price).toFixed(2)}`
                    )}
                  </td>
                  <td>{getStockBadge(status)}</td>
                  <td>
                    <div className="flex gap-xs" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setDetailsBook(book)}
                        title="View details"
                      >
                        <Info size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openEdit(book)}
                        title="Update stock"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Stock Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Update Stock"
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveStock} disabled={saving} id="save-stock-btn">
              {saving ? 'Saving...' : 'Update Stock'}
            </button>
          </>
        }
      >
        {editModal && (
          <div>
            <p className="mb-md" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Updating stock for: <strong style={{ color: 'var(--color-text)' }}>{editModal.title}</strong>
            </p>
            <div className="grid grid-2 gap-md">
              <div className="input-group">
                <label className="input-label">New Stock Quantity *</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={stockForm.stock_qty}
                  onChange={(e) => setStockForm({ ...stockForm, stock_qty: e.target.value })}
                  id="stock-qty-input"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Low Stock Threshold</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  value={stockForm.low_stock_threshold}
                  onChange={(e) => setStockForm({ ...stockForm, low_stock_threshold: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Book Details Modal */}
      <BookDetailsModal
        isOpen={!!detailsBook}
        onClose={() => setDetailsBook(null)}
        book={detailsBook}
      />
    </div>
  );}
