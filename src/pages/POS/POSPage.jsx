import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, ShoppingCart, Trash2, User, ChevronDown, CheckCircle,
  Info, Lock, Plus, Minus, X, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { booksAPI, customersAPI, salesAPI } from '../../api';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import ReceiptModal from '../../components/Receipt/ReceiptModal';
import BookDetailsModal from '../../components/Books/BookDetailsModal';
import Badge from '../../components/UI/Badge';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────
   MODULE-LEVEL COMPONENTS
   All components are defined here, OUTSIDE of POSPage(), so
   React sees a stable component identity on every render and
   never unmounts/remounts them. This prevents focus loss.
───────────────────────────────────────────────────────────── */

/* Cart Items List — used in both desktop panel and mobile drawer */
function CartItemList({ items, recentlyAddedId, getCoverUrl, updateQuantity, removeItem, getItemTax }) {
  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 20px' }}>
        <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🛒</div>
        <p>Add books from the left to start a sale</p>
      </div>
    );
  }
  return items.map((item) => {
    const itemTax = getItemTax(item);
    const itemTotal = item.unit_price * item.quantity + itemTax;
    const isNew = recentlyAddedId === item.id;
    const coverUrl = getCoverUrl(item);
    return (
      <div
        key={item.id}
        className={`pos-cart-card${isNew ? ' recently-added' : ''}`}
        id={`cart-item-${item.id}`}
      >
        <div className="pos-cart-thumb">
          {coverUrl
            ? <img src={coverUrl} alt={item.title} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = '📖'; }} />
            : '📖'}
        </div>
        <div className="pos-cart-item-info">
          <div className="pos-cart-item-title" title={item.title}>{item.title}</div>
          {item.isbn && <div className="pos-cart-item-isbn">ISBN: {item.isbn}</div>}
          <div className="pos-cart-item-price">₹{item.unit_price.toFixed(2)} each</div>
          {item.tax_rate > 0 && <div className="pos-cart-item-gst">GST {item.tax_rate}%</div>}
          <div className="pos-cart-item-row">
            <div className="quantity-control">
              <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease">
                <Minus size={12} />
              </button>
              <span className="qty-display">{item.quantity}</span>
              <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock_qty} aria-label="Increase">
                <Plus size={12} />
              </button>
            </div>
            <span className="pos-cart-line-total">₹{itemTotal.toFixed(2)}</span>
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: 26, height: 26, padding: 0, flexShrink: 0 }}
              onClick={() => removeItem(item.id)}
              aria-label="Remove item"
            >
              <Trash2 size={13} color="var(--color-danger)" />
            </button>
          </div>
        </div>
      </div>
    );
  });
}

/* Step Indicator — stepper at top of billing panel */
function StepIndicator({ step }) {
  return (
    <div className="pos-stepper">
      <div className={`pos-step${step === 'cart' ? ' pos-step-active' : ' pos-step-done'}`}>
        <div className="pos-step-circle">
          {step === 'checkout' ? <CheckCircle size={13} /> : '1'}
        </div>
        <span className="pos-step-label">Cart</span>
      </div>
      <div className="pos-step-line" />
      <div className={`pos-step${step === 'checkout' ? ' pos-step-active' : ''}`}>
        <div className="pos-step-circle">2</div>
        <span className="pos-step-label">Checkout</span>
      </div>
    </div>
  );
}

/* Customer Selector dropdown */
function CustomerSelector({ customer, setCustomer, customers, onNewCustomer }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          onClick={() => setOpen(!open)}
          id="select-customer-btn"
        >
          <User size={14} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
            {customer ? customer.name : 'Guest'}
          </span>
          <ChevronDown size={12} style={{ flexShrink: 0 }} />
        </button>
        {open && (
          <div style={{
            position: 'absolute', left: 0, top: '100%', marginTop: 4,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '8px', zIndex: 50,
            width: 230, maxHeight: 240, overflow: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <input
              type="text"
              className="input"
              style={{ marginBottom: 8, fontSize: '0.8rem', padding: '6px 10px' }}
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div
              className="pos-book-item"
              onClick={() => { setCustomer(null); setOpen(false); }}
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >Guest (No customer)</div>
            {filtered.map((c) => (
              <div
                key={c.id}
                className="pos-book-item"
                onClick={() => { setCustomer(c); setOpen(false); setSearch(''); }}
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
        onClick={onNewCustomer}
        title="Create New Customer"
        id="quick-add-customer-btn"
        style={{ padding: '6px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        + New
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CartStepFooter — Step 1 sticky bottom bar
   Defined at MODULE LEVEL — stable identity, no focus issues.
   Reads cart store directly.
───────────────────────────────────────────────────────────── */
function CartStepFooter({ onProceed }) {
  const { getSubtotal, getItemCount, items } = useCartStore();
  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  return (
    <div className="pos-cart-footer">
      <div className="pos-cart-subtotal-row">
        <span>Subtotal ({itemCount} unit{itemCount !== 1 ? 's' : ''})</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>
      <button
        className="btn btn-primary w-full"
        style={{ marginTop: 'var(--spacing-sm)', padding: '11px 20px' }}
        onClick={onProceed}
        disabled={items.length === 0}
        id="proceed-to-checkout-btn"
      >
        Proceed to Checkout <ArrowRight size={16} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CheckoutPanelContent — Step 2 checkout form
   Defined at MODULE LEVEL — stable identity, no focus issues.
   Reads cart store and auth store directly so it never needs
   to be re-created, even when discount state changes.
───────────────────────────────────────────────────────────── */
function CheckoutPanelContent({ onBack, onComplete, processingCheckout, idSuffix = '' }) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const {
    items, customer, discount, paymentMethod, isRoundOff,
    setDiscount, setPaymentMethod, setIsRoundOff,
    getSubtotal, getCartTax, getAutoDiscountAmount, getTotal, getItemCount,
  } = useCartStore();

  const subtotal = getSubtotal();
  const cartTax = getCartTax();
  const total = getTotal();
  const autoDiscount = getAutoDiscountAmount();

  return (
    <div className="pos-checkout-view">
      {/* Customer banner */}
      {customer && (
        <div className="pos-customer-banner">
          <User size={14} />
          <span>{customer.name}</span>
          {customer.phone && <span className="pos-customer-phone">{customer.phone}</span>}
        </div>
      )}

      {/* Order summary preview */}
      <div className="pos-checkout-summary-preview">
        <div className="pos-checkout-summary-label">
          {items.length} item{items.length !== 1 ? 's' : ''} · {getItemCount()} unit{getItemCount() !== 1 ? 's' : ''}
        </div>
        {items.slice(0, 3).map(item => (
          <div key={item.id} className="pos-checkout-item-preview">
            <span className="pos-checkout-item-preview-qty">×{item.quantity}</span>
            <span className="pos-checkout-item-preview-title">{item.title}</span>
            <span className="pos-checkout-item-preview-price">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        {items.length > 3 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 2 }}>
            +{items.length - 3} more item{items.length - 3 !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="pos-checkout-divider" />

      {/* Discount & Tax — controlled inputs that keep focus */}
      <div className="grid grid-2 gap-sm mb-sm">
        <div className="input-group">
          <label className="input-label" htmlFor={`discount-input${idSuffix}`}>Discount (₹)</label>
          <input
            id={`discount-input${idSuffix}`}
            type="number"
            className="input"
            min="0"
            step="0.01"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Tax (₹) {!isAdmin && <Lock size={11} color="var(--color-text-muted)" />}
          </label>
          <input
            id={`tax-display${idSuffix}`}
            type="number"
            className="input"
            min="0"
            style={{ fontSize: '0.8rem', padding: '6px 10px', background: 'var(--color-surface-3)', cursor: 'not-allowed', color: 'var(--color-text-secondary)' }}
            value={cartTax.toFixed(2)}
            readOnly
            disabled
          />
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 1 }}>Auto-calculated</div>
        </div>
      </div>

      {/* Round-Off */}
      <div className="flex items-center gap-sm mb-sm">
        <input
          type="checkbox"
          id={`round-off${idSuffix}`}
          checked={isRoundOff}
          onChange={(e) => setIsRoundOff(e.target.checked)}
          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
        />
        <label
          htmlFor={`round-off${idSuffix}`}
          style={{ fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
        >
          Auto Round-Off Discount
        </label>
      </div>

      {/* Payment Method */}
      <div className="input-group mb-sm">
        <label className="input-label" htmlFor={`payment-method${idSuffix}`}>Payment Method</label>
        <select
          id={`payment-method${idSuffix}`}
          className="select"
          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
          <option value="upi">📱 UPI</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="pos-checkout-divider" />

      {/* Totals */}
      {isRoundOff ? (
        <>
          <div className="pos-summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="pos-summary-row" style={{ color: cartTax > 0 ? 'var(--color-warning)' : 'inherit' }}>
            <span>GST Tax</span><span>₹{cartTax.toFixed(2)}</span>
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
          <div className="pos-summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="pos-summary-row" style={{ color: discount > 0 ? 'var(--color-success)' : 'inherit' }}>
            <span>Discount</span>
            <span>{discount > 0 ? `-₹${parseFloat(discount).toFixed(2)}` : '₹0.00'}</span>
          </div>
          <div className="pos-summary-row" style={{ color: cartTax > 0 ? 'var(--color-warning)' : 'inherit' }}>
            <span>GST Tax</span><span>₹{cartTax.toFixed(2)}</span>
          </div>
        </>
      )}
      <div className="pos-summary-row pos-summary-total">
        <span>Total</span>
        <span style={{ color: 'var(--color-primary)' }}>₹{total.toFixed(2)}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
        <button
          className="btn btn-primary w-full btn-lg"
          onClick={onComplete}
          disabled={processingCheckout || items.length === 0}
          id={`checkout-btn${idSuffix}`}
        >
          {processingCheckout
            ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Processing...</>
            : <><CheckCircle size={18} /> Complete Sale — ₹{total.toFixed(2)}</>}
        </button>
        <button
          className="btn btn-ghost w-full"
          onClick={onBack}
          id={`back-to-cart${idSuffix}`}
          style={{ fontSize: '0.82rem' }}
        >
          <ArrowLeft size={15} /> Back to Cart
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════ */
export default function POSPage() {
  const [books, setBooks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerNotes, setNewCustomerNotes] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Two-step flow: 'cart' | 'checkout'
  const [billingStep, setBillingStep] = useState('cart');
  const [drawerStep, setDrawerStep] = useState('cart');

  const recentlyAddedTimer = useRef(null);

  const resetNewCustomerForm = () => {
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setNewCustomerAddress('');
    setNewCustomerNotes('');
  };

  const handleSaveQuickCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!newCustomerName.trim()) { toast.error('Customer name is required.'); return; }
    if (!newCustomerPhone.trim()) { toast.error('Phone number is required.'); return; }
    const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
    if (!phoneRegex.test(newCustomerPhone.trim())) {
      toast.error('Invalid phone number format. Must be between 10 and 15 digits.');
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await customersAPI.create({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        email: newCustomerEmail.trim() || null,
        address: newCustomerAddress.trim() || null,
        notes: newCustomerNotes.trim() || null,
      });
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

  const {
    items, customer, addItem, removeItem, updateQuantity, setCustomer,
    clearCart, getItemTax, discount, paymentMethod, isRoundOff,
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
      toast.error(book.stock_qty <= 0 ? 'This book is out of stock.' : 'Cannot add more than available stock.');
    } else {
      toast.success(`Added "${book.title}" to cart`, { duration: 1200 });
      if (recentlyAddedTimer.current) clearTimeout(recentlyAddedTimer.current);
      setRecentlyAddedId(book.id);
      recentlyAddedTimer.current = setTimeout(() => setRecentlyAddedId(null), 1500);
    }
  };

  const handleClearCart = () => {
    clearCart();
    setBillingStep('cart');
    setDrawerStep('cart');
  };

  const handleCheckout = async () => {
    if (items.length === 0) { toast.error('Cart is empty. Add some books first.'); return; }
    setProcessingCheckout(true);
    try {
      const payload = {
        customer_id: customer?.id || null,
        items: items.map((i) => ({ book_id: i.id, quantity: i.quantity, unit_price: i.unit_price })),
        discount,
        payment_method: paymentMethod,
        is_round_off: isRoundOff,
      };
      const res = await salesAPI.create(payload);
      setReceipt(res.data);
      clearCart();
      setBillingStep('cart');
      setDrawerStep('cart');
      setMobileDrawerOpen(false);
      toast.success(`Sale completed!\nInvoice: ${res.data.invoice_number || '#' + res.data.id}`, { icon: '🎉', duration: 5000 });
      window.dispatchEvent(new CustomEvent('inventory-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process sale.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const getCoverUrl = useCallback((book) => {
    const url = book.cover_image || book.front_cover_url || book.cover_image_url;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    return `${API_URL}${url}`;
  }, []);

  const handleProceedToCheckout = useCallback(() => {
    if (items.length === 0) { toast.error('Add books to proceed.'); return; }
    setBillingStep('checkout');
  }, [items.length]);

  const handleDrawerProceed = useCallback(() => {
    if (items.length === 0) { toast.error('Add books to proceed.'); return; }
    setDrawerStep('checkout');
  }, [items.length]);

  return (
    <div>
      <div className="page-header mb-lg">
        <div>
          <h1>POS Billing</h1>
          <p>Search books and create a new sale</p>
        </div>
        {items.length > 0 && (
          <button className="btn btn-ghost" onClick={handleClearCart}>
            <Trash2 size={16} /> Clear Cart
          </button>
        )}
      </div>

      <div className="pos-layout">
        {/* ── Left: Books Panel ── */}
        <div className="pos-books-panel">
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
                      style={{ position: 'absolute', right: 4, top: 4, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: 24, height: 24, padding: 0, border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
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
                      {parseFloat(book.price) === 0
                        ? <Badge type="success">FREE</Badge>
                        : `₹${parseFloat(book.price).toFixed(2)}`}
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

        {/* ── Right: Billing Panel (two-step) ── */}
        <div className="pos-cart-panel">
          <div className="pos-cart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} color="var(--color-primary)" />
              {items.length > 0 && (
                <span style={{
                  background: 'var(--color-primary)', color: 'white',
                  borderRadius: '50%', width: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                }}>{items.length}</span>
              )}
            </div>
            <StepIndicator step={billingStep} />
            <CustomerSelector
              customer={customer}
              setCustomer={setCustomer}
              customers={customers}
              onNewCustomer={() => setShowQuickCustomerModal(true)}
            />
          </div>

          {/* Sliding step viewport */}
          <div className="pos-step-viewport">
            {/* Step 1: Cart */}
            <div className={`pos-step-panel${billingStep === 'cart' ? ' pos-step-panel-active' : ' pos-step-panel-exit-left'}`}>
              <div className="pos-cart-items">
                <CartItemList
                  items={items}
                  recentlyAddedId={recentlyAddedId}
                  getCoverUrl={getCoverUrl}
                  updateQuantity={updateQuantity}
                  removeItem={removeItem}
                  getItemTax={getItemTax}
                />
              </div>
              <CartStepFooter onProceed={handleProceedToCheckout} />
            </div>

            {/* Step 2: Checkout */}
            <div className={`pos-step-panel${billingStep === 'checkout' ? ' pos-step-panel-active' : ' pos-step-panel-enter-right'}`}>
              <div className="pos-checkout-scroll">
                <CheckoutPanelContent
                  onBack={() => setBillingStep('cart')}
                  onComplete={handleCheckout}
                  processingCheckout={processingCheckout}
                  idSuffix="-desktop"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: Floating Cart Toggle ── */}
      <button
        className="pos-cart-drawer-toggle"
        onClick={() => setMobileDrawerOpen(true)}
        id="open-cart-drawer-btn"
      >
        <ShoppingCart size={18} />
        Cart
        {items.length > 0 && (
          <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-full)', padding: '2px 8px', fontSize: '0.8rem', fontWeight: 700 }}>
            {items.length}
          </span>
        )}
      </button>

      {/* ── Mobile: Drawer Overlay ── */}
      <div className={`pos-cart-drawer-overlay${mobileDrawerOpen ? ' open' : ''}`} onClick={() => setMobileDrawerOpen(false)} />

      {/* ── Mobile: Cart Drawer (two-step) ── */}
      <div className={`pos-cart-panel drawer-mode${mobileDrawerOpen ? ' drawer-open' : ''}`}>
        <div className="pos-cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <ShoppingCart size={16} color="var(--color-primary)" />
            {items.length > 0 && (
              <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{items.length}</span>
            )}
            <StepIndicator step={drawerStep} />
          </div>
          <button className="btn btn-ghost btn-icon" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setMobileDrawerOpen(false)} aria-label="Close cart">
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <CustomerSelector
            customer={customer}
            setCustomer={setCustomer}
            customers={customers}
            onNewCustomer={() => { setMobileDrawerOpen(false); setShowQuickCustomerModal(true); }}
          />
        </div>

        <div className="pos-step-viewport">
          {/* Drawer Step 1 */}
          <div className={`pos-step-panel${drawerStep === 'cart' ? ' pos-step-panel-active' : ' pos-step-panel-exit-left'}`}>
            <div className="pos-cart-items">
              <CartItemList
                items={items}
                recentlyAddedId={recentlyAddedId}
                getCoverUrl={getCoverUrl}
                updateQuantity={updateQuantity}
                removeItem={removeItem}
                getItemTax={getItemTax}
              />
            </div>
            <CartStepFooter onProceed={handleDrawerProceed} />
          </div>
          {/* Drawer Step 2 */}
          <div className={`pos-step-panel${drawerStep === 'checkout' ? ' pos-step-panel-active' : ' pos-step-panel-enter-right'}`}>
            <div className="pos-checkout-scroll">
              <CheckoutPanelContent
                onBack={() => setDrawerStep('cart')}
                onComplete={handleCheckout}
                processingCheckout={processingCheckout}
                idSuffix="-mobile"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReceiptModal isOpen={!!receipt} onClose={() => setReceipt(null)} sale={receipt} />
      <BookDetailsModal isOpen={!!detailsBook} onClose={() => setDetailsBook(null)} book={detailsBook} />

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
              >×</button>
            </div>
            <form onSubmit={handleSaveQuickCustomer}>
              <div className="flex flex-col gap-md">
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-name">Full Name *</label>
                  <input type="text" id="new-cust-name" className="input" placeholder="Enter customer name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} required autoComplete="off" />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-phone">Phone Number *</label>
                  <input type="tel" id="new-cust-phone" className="input" placeholder="e.g. +91 9876543210" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} required autoComplete="off" />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-email">Email Address</label>
                  <input type="email" id="new-cust-email" className="input" placeholder="customer@example.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} autoComplete="off" />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-address">Address</label>
                  <input type="text" id="new-cust-address" className="input" placeholder="Enter address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} autoComplete="off" />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="new-cust-notes">Notes</label>
                  <textarea id="new-cust-notes" className="input" placeholder="Internal notes/preferences..." value={newCustomerNotes} onChange={(e) => setNewCustomerNotes(e.target.value)} style={{ minHeight: 80 }} autoComplete="off" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowQuickCustomerModal(false); resetNewCustomerForm(); }} disabled={savingCustomer}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingCustomer} id="save-quick-customer-btn">
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
