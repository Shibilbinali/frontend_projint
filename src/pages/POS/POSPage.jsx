import { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, Trash2, User, ChevronDown, CheckCircle, Info, Lock } from 'lucide-react';
import { booksAPI, customersAPI, salesAPI } from '../../api';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import ReceiptModal from '../../components/Receipt/ReceiptModal';
import BookDetailsModal from '../../components/Books/BookDetailsModal';
import Badge from '../../components/UI/Badge';
import toast from 'react-hot-toast';

export default function POSPage() {
  const [books, setBooks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');        // committed — triggers API
  const [searchDraft, setSearchDraft] = useState(''); // typed — never triggers API
  const [loading, setLoading] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerNotes, setNewCustomerNotes] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  const resetNewCustomerForm = () => {
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setNewCustomerAddress('');
    setNewCustomerNotes('');
  };

  const handleSaveQuickCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!newCustomerName.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!newCustomerPhone.trim()) {
      toast.error('Phone number is required.');
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
    if (!phoneRegex.test(newCustomerPhone.trim())) {
      toast.error('Invalid phone number format. Must be between 10 and 15 digits.');
      return;
    }

    setSavingCustomer(true);
    try {
      const payload = {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        email: newCustomerEmail.trim() || null,
        address: newCustomerAddress.trim() || null,
        notes: newCustomerNotes.trim() || null,
      };

      const res = await customersAPI.create(payload);
      const newCust = res.data;

      setCustomers((prev) => [newCust, ...prev]);
      setCustomer(newCust);
      setShowQuickCustomerModal(false);
      resetNewCustomerForm();
      toast.success('Customer created and selected successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const {
    items, customer, discount, paymentMethod, isRoundOff,
    addItem, removeItem, updateQuantity, setCustomer,
    setDiscount, setPaymentMethod, clearCart, setIsRoundOff,
    getSubtotal, getCartTax, getItemTax, getAutoDiscountAmount, getTotal, getItemCount
  } = useCartStore();

  const loadBooks = useCallback(async () => {
    try {
      const res = await booksAPI.getAll({ search, limit: 100 });
      setBooks(res.data.books || []);
    } catch { /* silent */ }
  }, [search]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  const performSearch = () => setSearch(searchDraft);

  useEffect(() => {
    customersAPI.getAll({ limit: 100 })
      .then((res) => setCustomers(res.data.customers || []))
      .catch(() => {});
  }, []);

  const handleAddToCart = (book) => {
    const added = addItem(book);
    if (!added) {
      if (book.stock_qty <= 0) {
        toast.error('This book is out of stock.');
      } else {
        toast.error('Cannot add more than available stock.');
      }
    } else {
      toast.success(`Added "${book.title}" to cart`, { duration: 1200 });
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty. Add some books first.');
      return;
    }
    setProcessingCheckout(true);
    try {
      const payload = {
        customer_id: customer?.id || null,
        items: items.map((i) => ({ book_id: i.id, quantity: i.quantity, unit_price: i.unit_price })),
        discount,
        payment_method: paymentMethod,
        is_round_off: isRoundOff,
        // Do NOT send tax — server computes it from book tax_rate
      };
      const res = await salesAPI.create(payload);
      setReceipt(res.data);
      clearCart();
      toast.success(`Sale completed successfully!\nInvoice: ${res.data.invoice_number || '#' + res.data.id}`, { icon: '🎉', duration: 5000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process sale.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const getCoverUrl = (book) => {
    const url = book.front_cover_url || book.cover_image_url;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    return `${API_URL}${url}`;
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const subtotal = getSubtotal();
  const cartTax = getCartTax();
  const total = getTotal();
  const autoDiscount = getAutoDiscountAmount();

  return (
    <div>
      <div className="page-header mb-lg">
        <div>
          <h1>POS Billing</h1>
          <p>Search books and create a new sale</p>
        </div>
        {items.length > 0 && (
          <button className="btn btn-ghost" onClick={clearCart}>
            <Trash2 size={16} /> Clear Cart
          </button>
        )}
      </div>

      <div className="pos-layout">
        {/* ── Left: Books Panel ── */}
        <div className="pos-books-panel">
          {/* Search */}
          <div className="input-wrapper">
            <span className="input-icon"><Search size={16} /></span>
            <input
              type="text"
              className="input"
              placeholder="Search books by title, author, or ISBN..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); performSearch(); } }}
              id="pos-search-input"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={performSearch}
              title="Search"
              style={{
                position: 'absolute', right: 6,
                background: 'var(--color-primary)', border: 'none',
                borderRadius: 'var(--radius-sm)', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', width: 28, height: 28, flexShrink: 0,
              }}
            >
              <Search size={13} />
            </button>
          </div>

          {/* Books grid */}
          {books.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No books found</h3>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <div className="pos-books-list">
              {books.map((book) => (
                <div
                  key={book.id}
                  className={`pos-book-item ${book.stock_qty <= 0 ? 'out-of-stock' : ''}`}
                  onClick={() => book.stock_qty > 0 && handleAddToCart(book)}
                  id={`book-item-${book.id}`}
                >
                  <div style={{ position: 'relative' }}>
                    {getCoverUrl(book) ? (
                      <img
                        src={getCoverUrl(book)}
                        alt={book.title}
                        style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: 100, background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 8, fontSize: '1.5rem', border: '1px solid var(--color-border)' }}>📖</div>
                    )}
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{
                        position: 'absolute', right: 4, top: 4,
                        background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
                        width: 24, height: 24, padding: 0, border: 'none',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10
                      }}
                      onClick={(e) => { e.stopPropagation(); setDetailsBook(book); }}
                      title="View Details"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <div className="pos-book-title">{book.title}</div>
                  <div className="pos-book-author">{book.author}</div>
                  <div className="flex items-center justify-between mt-xs">
                    <span className="pos-book-price">
                      {parseFloat(book.price) === 0 ? (
                        <Badge type="success">FREE</Badge>
                      ) : (
                        `₹${parseFloat(book.price).toFixed(2)}`
                      )}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      {parseFloat(book.tax_rate) > 0 && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                          GST {parseFloat(book.tax_rate)}%
                        </span>
                      )}
                      <span className={`text-xs ${book.stock_qty <= 0 ? 'text-danger' : book.stock_qty <= book.low_stock_threshold ? 'text-warning' : 'text-muted'}`}>
                        {book.stock_qty <= 0 ? 'Out' : `Qty: ${book.stock_qty}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Cart Panel ── */}
        <div className="pos-cart-panel">
          {/* Cart header */}
          <div className="pos-cart-header">
            <div className="flex items-center gap-sm">
              <ShoppingCart size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1rem' }}>Cart</h3>
              {items.length > 0 && (
                <span style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '50%',
                  width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700
                }}>
                  {getItemCount()}
                </span>
              )}
            </div>

            {/* Customer selector */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  id="select-customer-btn"
                >
                  <User size={14} />
                  {customer ? customer.name : 'Guest'}
                  <ChevronDown size={12} />
                </button>
                {showCustomerDropdown && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 4,
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', padding: '8px', zIndex: 50,
                    width: 220, maxHeight: 240, overflow: 'auto',
                    boxShadow: 'var(--shadow-lg)'
                  }}>
                    <input
                      type="text"
                      className="input"
                      style={{ marginBottom: 8, fontSize: '0.8rem', padding: '6px 10px' }}
                      placeholder="Search customer..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    <div
                      className="pos-book-item"
                      onClick={() => { setCustomer(null); setShowCustomerDropdown(false); }}
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                      Guest (No customer)
                    </div>
                    {filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        className="pos-book-item"
                        onClick={() => { setCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.phone && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{c.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowQuickCustomerModal(true)}
                title="Create New Customer"
                id="quick-add-customer-btn"
                style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}
              >
                + New Customer
              </button>
            </div>
          </div>

          {/* Cart items */}
          <div className="pos-cart-items">
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🛒</div>
                <p>Add books from the left to start a sale</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>Book</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 600 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Tax</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Total</th>
                    <th style={{ width: 28 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const itemTax = getItemTax(item);
                    const itemTotal = item.unit_price * item.quantity + itemTax;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ fontWeight: 600, lineHeight: 1.3, maxWidth: 130 }}>{item.title}</div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>₹{item.unit_price.toFixed(2)} ea</div>
                          {item.tax_rate > 0 && (
                            <div style={{ color: 'var(--color-warning)', fontSize: '0.7rem', fontWeight: 600 }}>
                              GST {item.tax_rate}%
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                          <div className="quantity-control" style={{ justifyContent: 'center' }}>
                            <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                            <span className="qty-display">{item.quantity}</span>
                            <button
                              className="qty-btn"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock_qty}
                            >+</button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          ₹{(item.unit_price * item.quantity).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', whiteSpace: 'nowrap', color: itemTax > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                          {itemTax > 0 ? `₹${itemTax.toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                          ₹{itemTotal.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 4px' }}>
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ width: 24, height: 24, padding: 0 }}
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 size={12} color="var(--color-danger)" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Cart footer */}
          <div className="pos-cart-footer">
            {/* Discount & Tax row */}
            <div className="grid grid-2 gap-sm mb-md">
              <div className="input-group">
                <label className="input-label">Discount (₹)</label>
                <input
                  type="number" className="input" min="0" step="0.01"
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  id="discount-input"
                />
              </div>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Tax (₹)
                  {!isAdmin && <Lock size={11} color="var(--color-text-muted)" />}
                </label>
                <input
                  type="number" className="input" min="0"
                  style={{
                    fontSize: '0.8rem', padding: '6px 10px',
                    background: 'var(--color-surface-3)',
                    cursor: 'not-allowed',
                    color: 'var(--color-text-secondary)',
                  }}
                  value={cartTax.toFixed(2)}
                  readOnly
                  disabled
                  title={isAdmin ? 'Tax is auto-calculated from each book\'s GST rate' : 'Tax is set by the system and cannot be edited by cashiers'}
                  id="tax-display"
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Auto-calculated per book
                </div>
              </div>
            </div>

            {/* Auto Round-Off switch */}
            <div className="flex items-center gap-sm mb-md">
              <input
                type="checkbox"
                id="auto-round-off-checkbox"
                checked={isRoundOff}
                onChange={(e) => setIsRoundOff(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
              />
              <label
                htmlFor="auto-round-off-checkbox"
                style={{ fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
              >
                Auto Round-Off Discount
              </label>
            </div>

            {/* Payment method */}
            <div className="input-group mb-md">
              <label className="input-label">Payment Method</label>
              <select
                className="select"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                id="payment-method-select"
              >
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="upi">📱 UPI</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Summary */}
            {isRoundOff ? (
              <>
                <div className="pos-summary-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="pos-summary-row" style={{ color: cartTax > 0 ? 'var(--color-warning)' : 'inherit' }}>
                  <span>GST Tax</span>
                  <span>₹{cartTax.toFixed(2)}</span>
                </div>
                <div className="pos-summary-row" style={{ color: 'var(--color-success)' }}>
                  <span>Round-Off Discount</span>
                  <span>{autoDiscount > 0 ? `-₹${autoDiscount.toFixed(2)}` : '₹0.00'}</span>
                </div>
                <div className="pos-summary-row" style={{ color: discount > 0 ? 'var(--color-success)' : 'inherit' }}>
                  <span>Manual Discount</span>
                  <span>{discount > 0 ? `-₹${parseFloat(discount).toFixed(2)}` : '₹0.00'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="pos-summary-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="pos-summary-row" style={{ color: discount > 0 ? 'var(--color-success)' : 'inherit' }}>
                  <span>Discount</span>
                  <span>{discount > 0 ? `-₹${parseFloat(discount).toFixed(2)}` : '₹0.00'}</span>
                </div>
                <div className="pos-summary-row" style={{ color: cartTax > 0 ? 'var(--color-warning)' : 'inherit' }}>
                  <span>GST Tax</span>
                  <span>₹{cartTax.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="pos-summary-row pos-summary-total">
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>₹{total.toFixed(2)}</span>
            </div>

            {/* Checkout button */}
            <button
              className="btn btn-primary w-full btn-lg"
              style={{ marginTop: 'var(--spacing-md)' }}
              onClick={handleCheckout}
              disabled={processingCheckout || items.length === 0}
              id="checkout-btn"
            >
              {processingCheckout ? (
                <><div className="spinner" style={{ width: 18, height: 18 }} /> Processing...</>
              ) : (
                <><CheckCircle size={18} /> Complete Sale — ₹{total.toFixed(2)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        sale={receipt}
      />

      {/* Book Details Modal */}
      <BookDetailsModal
        isOpen={!!detailsBook}
        onClose={() => setDetailsBook(null)}
        book={detailsBook}
      />

      {/* Quick Customer Modal */}
      {showQuickCustomerModal && (
        <div className="modal-overlay" onClick={() => { setShowQuickCustomerModal(false); resetNewCustomerForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Customer</h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowQuickCustomerModal(false); resetNewCustomerForm(); }}
                style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveQuickCustomer}>
              <div className="flex flex-col gap-md">
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-name">Full Name *</label>
                  <input
                    type="text"
                    id="new-cust-name"
                    className="input"
                    placeholder="Enter customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="new-cust-phone"
                    className="input"
                    placeholder="e.g. +91 9876543210"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-email">Email Address</label>
                  <input
                    type="email"
                    id="new-cust-email"
                    className="input"
                    placeholder="customer@example.com"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-address">Address</label>
                  <input
                    type="text"
                    id="new-cust-address"
                    className="input"
                    placeholder="Enter address"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-notes">Notes</label>
                  <textarea
                    id="new-cust-notes"
                    className="input"
                    placeholder="Internal notes/preferences..."
                    value={newCustomerNotes}
                    onChange={(e) => setNewCustomerNotes(e.target.value)}
                    style={{ minHeight: 80 }}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowQuickCustomerModal(false); resetNewCustomerForm(); }}
                  disabled={savingCustomer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingCustomer}
                  id="save-quick-customer-btn"
                >
                  {savingCustomer ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
