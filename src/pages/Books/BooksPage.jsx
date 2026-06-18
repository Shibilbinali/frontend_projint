import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Info } from 'lucide-react';
import { booksAPI, categoriesAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/UI/Modal';
import SearchInput from '../../components/UI/SearchInput';
import Badge from '../../components/UI/Badge';
import Spinner from '../../components/UI/Spinner';
import toast from 'react-hot-toast';
import BookDetailsModal from '../../components/Books/BookDetailsModal';

function BookFormModal({ isOpen, onClose, book, categories, onSaved }) {
  const [form, setForm] = useState({
    title: '', author: '', isbn: '', category_id: '', price: '',
    cost_price: '', stock_qty: '', low_stock_threshold: '5',
    publisher: '', published_year: '', description: '', cover_image_url: '',
    front_cover_url: '', back_cover_url: '', cover_source: 'None', edition: '', tax_rate: '',
    reading_age: 'All Ages', price_type: 'Premium', tags: '', page_count: '0', format: 'Printed'
  });
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title || '', author: book.author || '',
        isbn: book.isbn || '', category_id: book.category_id || '',
        price: book.price || '', cost_price: book.cost_price || '',
        stock_qty: book.stock_qty || '', low_stock_threshold: book.low_stock_threshold || '5',
        publisher: book.publisher || '', published_year: book.published_year || '',
        description: book.description || '', cover_image_url: book.cover_image_url || '',
        front_cover_url: book.front_cover_url || '', back_cover_url: book.back_cover_url || '',
        cover_source: book.cover_source || 'None', edition: book.edition || '',
        tax_rate: book.tax_rate !== undefined ? String(parseFloat(book.tax_rate) || 0) : '0',
        reading_age: book.reading_age || 'All Ages',
        price_type: book.price_type || 'Premium',
        tags: book.tags || '',
        page_count: book.page_count !== undefined ? String(book.page_count) : '0',
        format: book.format || 'Printed'
      });
    } else {
      setForm({
        title: '', author: '', isbn: '', category_id: '', price: '', cost_price: '', stock_qty: '', low_stock_threshold: '5',
        publisher: '', published_year: '', description: '', cover_image_url: '',
        front_cover_url: '', back_cover_url: '', cover_source: 'None', edition: '', tax_rate: '',
        reading_age: 'All Ages', price_type: 'Premium', tags: '', page_count: '0', format: 'Printed'
      });
    }
  }, [book, isOpen]);

  const handleUploadCover = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WEBP formats are allowed.');
      return;
    }

    // Validate image quality/dimensions (minimum 100x100)
    const _URL = window.URL || window.webkitURL;
    const img = new Image();
    img.src = _URL.createObjectURL(file);
    img.onload = async function() {
      if (this.width < 100 || this.height < 100) {
        toast.error(`Image resolution is too low (${this.width}x${this.height}). Minimum is 100x100 pixels.`);
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      const toastId = toast.loading('Uploading cover...');
      try {
        const res = await booksAPI.upload(formData);
        const url = res.data.url;
        setForm((prev) => ({
          ...prev,
          [type === 'front' ? 'front_cover_url' : 'back_cover_url']: url,
          ...(type === 'front' && { cover_image_url: url }),
          ...(type === 'front' && { cover_source: 'Uploaded' })
        }));
        toast.success('Cover uploaded successfully!', { id: toastId });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload cover.', { id: toastId });
      }
    };
  };

  const handleFetchWebMetadata = async () => {
    if (!form.isbn && !form.title) {
      toast.error('Please enter an ISBN or Title to fetch metadata.');
      return;
    }
    setFetching(true);
    const toastId = toast.loading('Querying trusted book APIs...');
    try {
      const res = await booksAPI.fetchMetadata({
        isbn: form.isbn,
        title: form.title,
        author: form.author
      });
      const data = res.data;
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        author: data.author || prev.author,
        isbn: data.isbn || prev.isbn,
        publisher: data.publisher || prev.publisher,
        published_year: data.published_year || prev.published_year,
        description: data.description || prev.description,
        front_cover_url: data.front_cover_url || prev.front_cover_url,
        cover_image_url: data.front_cover_url || prev.cover_image_url,
        cover_source: data.cover_source || prev.cover_source,
        edition: data.edition || prev.edition,
        page_count: data.page_count !== undefined ? String(data.page_count) : prev.page_count
      }));
      toast.success(`Metadata resolved from ${data.cover_source}!`, { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch book metadata.', { id: toastId });
    } finally {
      setFetching(false);
    }
  };

  const handleRefreshMetadata = async () => {
    if (!book) return;
    setFetching(true);
    const toastId = toast.loading('Refreshing book metadata from web...');
    try {
      const res = await booksAPI.refreshMetadata(book.id);
      const data = res.data;
      setForm({
        title: data.title || '',
        author: data.author || '',
        isbn: data.isbn || '',
        category_id: data.category_id || '',
        price: data.price || '',
        cost_price: data.cost_price || '',
        stock_qty: data.stock_qty || '',
        low_stock_threshold: data.low_stock_threshold || '5',
        publisher: data.publisher || '',
        published_year: data.published_year || '',
        description: data.description || '',
        cover_image_url: data.cover_image_url || '',
        front_cover_url: data.front_cover_url || '',
        back_cover_url: data.back_cover_url || '',
        cover_source: data.cover_source || 'None',
        edition: data.edition || '',
        tax_rate: data.tax_rate !== undefined ? String(parseFloat(data.tax_rate) || 0) : '0',
        reading_age: data.reading_age || 'All Ages',
        price_type: data.price_type || 'Premium',
        tags: data.tags || '',
        page_count: data.page_count !== undefined ? String(data.page_count) : '0',
        format: data.format || 'Printed'
      });
      toast.success('Book metadata successfully refreshed!', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to refresh metadata.', { id: toastId });
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.author || !form.category_id) {
      toast.error('Title, author, and category are required.');
      return;
    }
    if (form.price !== '' && parseFloat(form.price) < 0) {
      toast.error('Price cannot be negative.');
      return;
    }
    if (form.price_type === 'Premium' && form.price !== '' && parseFloat(form.price) <= 0) {
      toast.error('Price must be greater than zero for premium books.');
      return;
    }
    if (form.tax_rate !== '' && (parseFloat(form.tax_rate) < 0 || isNaN(parseFloat(form.tax_rate)))) {
      toast.error('Invalid tax rate.');
      return;
    }
    setSaving(true);
    try {
      if (book) {
        await booksAPI.update(book.id, form);
        toast.success('Book updated successfully!');
      } else {
        await booksAPI.create(form);
        toast.success('Book added successfully!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save book.');
    } finally {
      setSaving(false);
    }
  };

  const inp = (key, label, type = 'text', required = false, placeholder = '') => (
    <div className="input-group">
      <label className="input-label">{label}{required ? ' *' : ''}</label>
      <input
        type={type}
        className="input"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={required}
        min={type === 'number' ? 0 : undefined}
        placeholder={placeholder}
      />
    </div>
  );

  const renderCoverControl = (type, label) => {
    const key = type === 'front' ? 'front_cover_url' : 'back_cover_url';
    const currentUrl = form[key];
    
    const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    const resolvedUrl = currentUrl && !currentUrl.startsWith('http') ? `${API_URL}${currentUrl}` : currentUrl;

    return (
      <div className="cover-upload-control" style={{ flex: 1 }}>
        <label className="input-label">{label}</label>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginTop: 6 }}>
          <div style={{
            width: 70, height: 105,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            background: 'var(--color-surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {currentUrl ? (
              <img src={resolvedUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>📖</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '4px 8px' }}>
              {currentUrl ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadCover(e, type)}
                style={{ display: 'none' }}
              />
            </label>
            {currentUrl && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => setForm((prev) => ({ ...prev, [key]: '', ...(type === 'front' && { cover_source: 'None' }) }))}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={book ? 'Edit Book' : 'Add New Book'}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {book && (
            <button className="btn btn-secondary" onClick={handleRefreshMetadata} disabled={fetching || saving}>
              Refresh from Web
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || fetching} id="save-book-btn">
            {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : 'Save Book'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-2 gap-md">
          {inp('title', 'Title', 'text', true)}
          {inp('author', 'Author', 'text', true)}
          
          <div className="input-group">
            <label className="input-label">ISBN</label>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
              <input
                type="text"
                className="input"
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                placeholder="e.g. 9780743273565"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0 12px' }}
                onClick={handleFetchWebMetadata}
                disabled={fetching}
              >
                Fetch Web Metadata
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              className="select"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {inp('price', 'Selling Price (₹)', 'number', false, 'Leave blank to auto-calculate')}
          {inp('cost_price', 'Cost Price (₹)', 'number')}
          {inp('stock_qty', 'Stock Quantity', 'number')}
          {inp('low_stock_threshold', 'Low Stock Alert At', 'number')}
          {inp('publisher', 'Publisher')}
          {inp('published_year', 'Published Year', 'number')}
          {inp('edition', 'Edition')}

          <div className="input-group">
            <label className="input-label">Tax Rate (GST %)</label>
            <select
              className="select"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
            >
              <option value="">Auto-Calculate (GST %)</option>
              <option value="0">0% — Tax Exempt</option>
              <option value="5">5% — GST 5%</option>
              <option value="12">12% — GST 12%</option>
              <option value="18">18% — GST 18%</option>
              <option value="28">28% — GST 28%</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Cover Source</label>
            <input
              type="text"
              className="input"
              value={form.cover_source}
              disabled
              style={{ background: 'var(--color-surface-3)', cursor: 'not-allowed', textTransform: 'capitalize' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Price Type</label>
            <select
              className="select"
              value={form.price_type}
              onChange={(e) => {
                const isFree = e.target.value === 'Free';
                setForm({
                  ...form,
                  price_type: e.target.value,
                  price: isFree ? '0.00' : (form.price === '0.00' ? '' : form.price)
                });
              }}
            >
              <option value="Premium">Premium</option>
              <option value="Free">Free</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Format *</label>
            <select
              className="select"
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              required
            >
              <option value="Printed">Printed</option>
              <option value="Digital">Digital</option>
            </select>
          </div>
          {inp('page_count', 'Page Count', 'number')}
          {inp('reading_age', 'Reading Age')}
          {inp('tags', 'Category Tags (Comma separated)')}
        </div>

        {/* Cover uploads */}
        <div className="flex gap-md mt-md" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
          {renderCoverControl('front', 'Front Cover Image')}
          {renderCoverControl('back', 'Back Cover Image')}
        </div>

        <div className="input-group mt-md">
          <label className="input-label">Description</label>
          <textarea
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}

function AuditReportModal({ isOpen, onClose, report, loading, running, onRunAudit }) {
  const [activeTab, setActiveTab] = useState('missing');

  if (!isOpen) return null;

  const stats = report?.stats || null;
  const missingInfo = report?.missingInfo || [];
  const updatedPrices = report?.updatedPrices || [];
  const updatedTaxes = report?.updatedTaxes || [];
  const timestamp = report?.timestamp || null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catalog Price & Tax Audit Report"
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span className="text-xs text-muted">
            {timestamp ? `Last Ran: ${new Date(timestamp).toLocaleString()}` : 'No audit history'}
          </span>
          <div className="flex gap-sm">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button
              className="btn btn-primary"
              onClick={onRunAudit}
              disabled={running}
            >
              {running ? 'Running Audit...' : 'Run New Audit'}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--spacing-2xl) 0' }}>
          <Spinner text="Loading audit report..." />
        </div>
      ) : !report || !stats ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
          <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>No audit report found for the catalog.</p>
          <button className="btn btn-primary" onClick={onRunAudit} disabled={running}>
            {running ? 'Running Audit...' : 'Run Audit Now'}
          </button>
        </div>
      ) : (
        <div>
          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <div style={{ background: 'var(--color-surface-2)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{stats.totalBooks}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Books Scanned</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: stats.totalUpdated > 0 ? 'var(--color-success)' : 'inherit' }}>{stats.totalUpdated}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Books Updated</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{stats.updatedPricesCount}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Prices Auto-set</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{stats.updatedTaxesCount}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Taxes Auto-set</div>
            </div>
            <div style={{
              background: 'var(--color-surface-2)',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              border: stats.missingInfoCount > 0 ? '1px solid rgba(224, 82, 82, 0.3)' : '1px solid var(--color-border)',
              backgroundColor: stats.missingInfoCount > 0 ? 'rgba(224, 82, 82, 0.05)' : 'var(--color-surface-2)'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: stats.missingInfoCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{stats.missingInfoCount}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Missing Info</div>
            </div>
          </div>

          {/* Tabs header */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 'var(--spacing-md)',
            gap: 'var(--spacing-md)'
          }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'missing' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'missing' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: 'var(--spacing-sm) var(--spacing-sm)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('missing')}
            >
              Missing Fields ({missingInfo.length})
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'prices' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'prices' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: 'var(--spacing-sm) var(--spacing-sm)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('prices')}
            >
              Price Auto-sets ({updatedPrices.length})
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'taxes' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'taxes' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: 'var(--spacing-sm) var(--spacing-sm)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('taxes')}
            >
              Tax Rate Auto-sets ({updatedTaxes.length})
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: 'var(--spacing-xs)' }}>
            {activeTab === 'missing' && (
              missingInfo.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-success)' }}>
                  🎉 Excellent! No books have missing fields in the catalog.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Author</th>
                        <th>Missing Fields</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingInfo.map(item => (
                        <tr key={item.id}>
                          <td className="font-semibold">{item.title || 'Untitled'}</td>
                          <td className="text-secondary">{item.author || 'Unknown'}</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {item.missingFields.map(f => (
                                <Badge key={f} type="danger" style={{ fontSize: '0.65rem' }}>{f}</Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === 'prices' && (
              updatedPrices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
                  No price updates were performed during the last audit run.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Author</th>
                        <th>Price Type</th>
                        <th>Old Price</th>
                        <th>New Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updatedPrices.map(item => (
                        <tr key={item.id}>
                          <td className="font-semibold">{item.title}</td>
                          <td className="text-secondary">{item.author}</td>
                          <td>
                            <Badge type={item.priceType === 'Free' ? 'success' : 'primary'}>
                              {item.priceType}
                            </Badge>
                          </td>
                          <td className="text-muted">₹{parseFloat(item.oldPrice || 0).toFixed(2)}</td>
                          <td className="font-semibold text-primary">₹{parseFloat(item.newPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === 'taxes' && (
              updatedTaxes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
                  No tax rate updates were performed during the last audit run.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Author</th>
                        <th>Old Tax</th>
                        <th>New Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updatedTaxes.map(item => (
                        <tr key={item.id}>
                          <td className="font-semibold">{item.title}</td>
                          <td className="text-secondary">{item.author}</td>
                          <td className="text-muted">{parseFloat(item.oldTax || 0).toFixed(1)}%</td>
                          <td className="font-semibold text-primary">{parseFloat(item.newTax).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [runningAudit, setRunningAudit] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchAuditReport = async () => {
    setLoadingReport(true);
    try {
      const res = await booksAPI.getAuditReport();
      setAuditReport(res.data);
    } catch (err) {
      toast.error('Failed to load last audit report.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleRunAudit = async () => {
    setRunningAudit(true);
    const toastId = toast.loading('Running catalog price/tax audit...');
    try {
      const res = await booksAPI.auditBooks();
      setAuditReport(res.data);
      toast.success('Audit completed successfully!', { id: toastId });
      loadData();
    } catch (err) {
      toast.error('Failed to run audit.', { id: toastId });
    } finally {
      setRunningAudit(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [booksRes, catsRes] = await Promise.all([
        booksAPI.getAll({ search, category_id: selectedCategory }),
        categoriesAPI.getAll()
      ]);
      setBooks(booksRes.data.books || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      toast.error('Failed to load books.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  const handleDelete = async () => {
    try {
      await booksAPI.delete(deleteModal.id);
      toast.success('Book deleted successfully!');
      setDeleteModal(null);
      loadData();
    } catch {
      toast.error('Failed to delete book.');
    }
  };

  const getStockBadge = (book) => {
    if (book.stock_qty === 0) return <Badge type="danger" dot>Out of Stock</Badge>;
    if (book.stock_qty <= book.low_stock_threshold) return <Badge type="warning" dot>Low Stock</Badge>;
    return <Badge type="success" dot>In Stock</Badge>;
  };

  const getCoverUrl = (book) => {
    const url = book.front_cover_url || book.cover_image_url;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    return `${API_URL}${url}`;
  };

  if (loading) return <Spinner text="Loading books..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Books Management</h1>
          <p>{books.length} books in catalog</p>
        </div>
        {isAdmin && (
          <div className="page-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setAuditModalOpen(true);
                fetchAuditReport();
              }}
              id="run-audit-btn"
            >
              🛡️ Catalog Audit
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setEditBook(null); setModalOpen(true); }}
              id="add-book-btn"
            >
              <Plus size={18} /> Add Book
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <SearchInput value={search} onSearch={setSearch} placeholder="Search books..." />
        <select
          className="select"
          style={{ width: 'auto', minWidth: 160 }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.book_count || 0})</option>
          ))}
        </select>
        <div className="flex gap-xs" style={{ marginLeft: 'auto' }}>
          <button
            className={`btn btn-ghost btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >⊞</button>
          <button
            className={`btn btn-ghost btn-icon ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table view"
          >☰</button>
        </div>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><BookOpen size={48} /></div>
          <h3>No books found</h3>
          <p>Try adjusting your search or add a new book.</p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add First Book
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="book-grid">
          {books.map((book) => (
            <div
              key={book.id}
              className="book-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setDetailsBook(book)}
            >
              <div className="book-cover">
                {getCoverUrl(book) ? (
                  <img src={getCoverUrl(book)} alt={book.title} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="book-cover-placeholder">📖</div>
                )}
                <div className="book-cover-overlay">
                  <div className="flex gap-xs">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); setEditBook(book); setModalOpen(true); }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteModal(book); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="book-card-body">
                <div className="book-card-title">{book.title}</div>
                <div className="book-card-author">{book.author}</div>
                {book.category_name && (
                  <Badge type="primary" style={{ fontSize: '0.65rem' }}>{book.category_name}</Badge>
                )}
                <div className="book-card-footer">
                  <span className="book-card-price">
                    {parseFloat(book.price) === 0 ? (
                      <Badge type="success">FREE</Badge>
                    ) : (
                      `₹${parseFloat(book.price).toFixed(2)}`
                    )}
                  </span>
                  {getStockBadge(book)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Author</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
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
                        {book.isbn && <div className="text-xs text-muted">ISBN: {book.isbn}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{book.author}</td>
                  <td>
                    {book.category_name
                      ? <Badge type="primary">{book.category_name}</Badge>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {parseFloat(book.price) === 0 ? (
                      <Badge type="success">FREE</Badge>
                    ) : (
                      `₹${parseFloat(book.price).toFixed(2)}`
                    )}
                  </td>
                  <td>{book.stock_qty}</td>
                  <td>{getStockBadge(book)}</td>
                  <td>
                    <div className="flex gap-xs">
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setDetailsBook(book)}
                        title="View Details"
                      >
                        <Info size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => { setEditBook(book); setModalOpen(true); }}
                        title="Edit book"
                      >
                        <Edit2 size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => setDeleteModal(book)}
                          title="Delete book"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Form Modal */}
      <BookFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditBook(null); }}
        book={editBook}
        categories={categories}
        onSaved={loadData}
      />

      {/* Book Details Modal */}
      <BookDetailsModal
        isOpen={!!detailsBook}
        onClose={() => setDetailsBook(null)}
        book={detailsBook}
      />

      {/* Audit Report Modal */}
      <AuditReportModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        report={auditReport}
        loading={loadingReport}
        running={runningAudit}
        onRunAudit={handleRunAudit}
      />

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Book"
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} id="confirm-delete-btn">Delete</button>
          </>
        }
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--color-text)' }}>"{deleteModal?.title}"</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
