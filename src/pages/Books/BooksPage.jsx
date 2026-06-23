import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Info, Upload, Download, ClipboardList, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { booksAPI, categoriesAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/UI/Modal';
import SearchInput from '../../components/UI/SearchInput';
import Badge from '../../components/UI/Badge';
import Spinner from '../../components/UI/Spinner';
import toast from 'react-hot-toast';
import BookDetailsModal from '../../components/Books/BookDetailsModal';

function BookFormModal({ isOpen, onClose, book, categories, onSaved }) {
  const [importMode, setImportMode] = useState('single'); // 'single' or 'bulk'
  const [bulkTab, setBulkTab] = useState('import'); // 'import' or 'history'
  
  // Single mode state
  const [form, setForm] = useState({
    title: '', author: '', isbn: '', category_id: '', price: '',
    cost_price: '', stock_qty: '', low_stock_threshold: '5',
    publisher: '', published_year: '', description: '', cover_image_url: '',
    front_cover_url: '', back_cover_url: '', cover_source: 'None', edition: '', tax_rate: '',
    reading_age: 'All Ages', price_type: 'Premium', tags: '', page_count: '0', format: 'Printed'
  });
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [frontCoverPreview, setFrontCoverPreview] = useState(null);
  const [backCoverPreview, setBackCoverPreview] = useState(null);

  // Bulk mode state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [session, setSession] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState('skip');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef();
  const pollingRef = useRef();

  useEffect(() => {
    setFrontCoverPreview(null);
    setBackCoverPreview(null);
    if (book) {
      setImportMode('single');
      setForm({
        title: book.title || '', author: book.author || '',
        isbn: book.isbn || '', category_id: book.category_id || '',
        price: book.price || '', cost_price: book.cost_price || '',
        stock_qty: book.stock_qty || '', low_stock_threshold: book.low_stock_threshold || '5',
        publisher: book.publisher || '', published_year: book.published_year || '',
        description: book.description || '', cover_image_url: book.cover_image_url || '',
        front_cover_url: book.front_cover_url || book.cover_image || '', back_cover_url: book.back_cover_url || '',
        cover_source: book.cover_source || 'None', edition: book.edition || '',
        tax_rate: book.tax_rate !== undefined ? String(parseFloat(book.tax_rate) || 0) : '0',
        reading_age: book.reading_age || 'All Ages',
        price_type: book.price_type || 'Premium',
        tags: book.tags || '',
        page_count: book.page_count !== undefined ? String(book.page_count) : '0',
        format: book.format || 'Printed'
      });
    } else {
      setImportMode('single');
      setForm({
        title: '', author: '', isbn: '', category_id: '', price: '', cost_price: '', stock_qty: '', low_stock_threshold: '5',
        publisher: '', published_year: '', description: '', cover_image_url: '',
        front_cover_url: '', back_cover_url: '', cover_source: 'None', edition: '', tax_rate: '',
        reading_age: 'All Ages', price_type: 'Premium', tags: '', page_count: '0', format: 'Printed'
      });
      setFile(null);
      setPreview(null);
      setSession(null);
    }
  }, [book, isOpen]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await booksAPI.getImportHistory();
      setHistory(res.data);
    } catch {
      toast.error('Failed to load import history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && importMode === 'bulk' && bulkTab === 'history') {
      fetchHistory();
    }
  }, [isOpen, importMode, bulkTab]);

  const handleDownloadTemplate = async (format) => {
    try {
      const res = await booksAPI.downloadTemplate(format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `books_import_template.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template.');
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setFetching(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await booksAPI.preview(fd, (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed.');
    } finally {
      setFetching(false);
      setUploadProgress(0);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setSaving(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await booksAPI.import(fd, duplicateMode, (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });
      
      const summary = res.data.summary;
      toast.success(
        <div>
          <strong>Import Completed</strong><br/>
          Total Books: {summary.total_rows}<br/>
          Imported Successfully: {summary.imported_rows}<br/>
          Duplicate/Skipped: {summary.duplicate_rows}<br/>
          Failed Records: {summary.failed_rows}
        </div>,
        { duration: 5000 }
      );
      
      setFile(null);
      setPreview(null);
      setSession(null);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadErrors = (sess) => {
    const errors = sess.errors || [];
    if (!errors.length) {
      toast.error('No errors to download.');
      return;
    }
    const lines = [
      'row,title,isbn,error',
      ...errors.map(e => `"${e.row}","${(e.title || '').replace(/"/g, '""')}","${(e.isbn || '').replace(/"/g, '""')}","${(e.error || '').replace(/"/g, '""')}"`)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `book_import_errors_session_${sess.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

    const _URL = window.URL || window.webkitURL;
    const img = new Image();
    const objectUrl = _URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = async function() {
      if (this.width < 100 || this.height < 100) {
        toast.error(`Image resolution is too low (${this.width}x${this.height}). Minimum is 100x100 pixels.`);
        return;
      }

      // Immediately set the cover preview and hide the old cover
      if (type === 'front') {
        setFrontCoverPreview(objectUrl);
      } else {
        setBackCoverPreview(objectUrl);
      }

      const formData = new FormData();
      formData.append('image', file);

      const toastId = toast.loading('Uploading cover...');
      setUploadProgress(0);

      try {
        let url = '';
        if (book) {
          // Existing book: PATCH replacement
          const res = await booksAPI.updateCoverImage(book.id, formData, type, (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          });
          url = res.data.url;
          toast.success('Cover image updated successfully.', { id: toastId });
        } else {
          // New book: POST upload
          const res = await booksAPI.upload(formData, (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          });
          url = res.data.url;
          toast.success('Cover uploaded successfully!', { id: toastId });
        }

        // Update form state with the new URL path
        setForm((prev) => ({
          ...prev,
          [type === 'front' ? 'front_cover_url' : 'back_cover_url']: url,
          ...(type === 'front' && { cover_image_url: url }),
          ...(type === 'front' && { cover_source: 'Uploaded' })
        }));
      } catch (err) {
        // Reset preview if upload failed
        if (type === 'front') {
          setFrontCoverPreview(null);
        } else {
          setBackCoverPreview(null);
        }
        toast.error(err.response?.data?.message || 'Failed to upload cover.', { id: toastId });
      } finally {
        setUploadProgress(0);
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
    const previewUrl = type === 'front' ? frontCoverPreview : backCoverPreview;
    
    const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    
    // Use previewUrl if available, otherwise use resolved url
    let resolvedUrl = '';
    if (previewUrl) {
      resolvedUrl = previewUrl;
    } else if (currentUrl) {
      const separator = currentUrl.includes('?') ? '&' : '?';
      const timestamp = book?.updated_at ? new Date(book.updated_at).getTime() : Date.now();
      resolvedUrl = currentUrl.startsWith('http') 
        ? `${currentUrl}${separator}v=${timestamp}` 
        : `${API_URL}${currentUrl}${separator}v=${timestamp}`;
    }

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
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative'
          }}>
            {resolvedUrl ? (
              <img src={resolvedUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>📖</span>
            )}
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.7)', padding: '2px',
                fontSize: '0.65rem', color: '#fff', textAlign: 'center'
              }}>
                {uploadProgress}%
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.75rem', padding: '4px 8px' }}>
              {resolvedUrl ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadCover(e, type)}
                style={{ display: 'none' }}
              />
            </label>
            {resolvedUrl && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                onClick={() => {
                  if (type === 'front') setFrontCoverPreview(null);
                  else setBackCoverPreview(null);
                  setForm((prev) => ({ ...prev, [key]: '', ...(type === 'front' && { cover_source: 'None' }) }));
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getFooter = () => {
    if (importMode === 'single') {
      return (
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
      );
    }

    if (bulkTab === 'history') {
      return <button className="btn btn-secondary" onClick={onClose}>Close</button>;
    }

    if (session) {
      if (session.status === 'processing') {
        return <button className="btn btn-primary" disabled>Importing...</button>;
      }
      return <button className="btn btn-secondary" onClick={onClose}>Close</button>;
    }

    if (preview) {
      return (
        <>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setPreview(null);
              setFile(null);
            }}
            disabled={saving}
          >
            Cancel Preview
          </button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={saving || preview.invalid_rows > 0 || preview.preview.some(r => r.status === 'Warning' || r.status === 'Error')}
          >
            {saving ? (uploadProgress > 0 && uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Importing...') : 'Import All Books'}
          </button>
        </>
      );
    }

    return (
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={handlePreview}
          disabled={fetching || !file}
        >
          {fetching ? (uploadProgress > 0 && uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Generating Preview...') : 'Preview Data'}
        </button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={book ? 'Edit Book' : 'Add New Book'}
      size="lg"
      footer={getFooter()}
    >
      {/* Mode Selector Toggle (only when creating a new book) */}
      {!book && (
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', background: 'var(--color-surface-2)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', width: 'fit-content' }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: importMode === 'single' ? 'var(--color-primary)' : 'none',
              color: importMode === 'single' ? 'white' : 'var(--color-text-secondary)',
              fontWeight: importMode === 'single' ? 600 : 500,
              border: 'none',
              boxShadow: importMode === 'single' ? 'var(--shadow-sm)' : 'none',
              padding: '6px 12px'
            }}
            onClick={() => setImportMode('single')}
          >
            Single Book
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: importMode === 'bulk' ? 'var(--color-primary)' : 'none',
              color: importMode === 'bulk' ? 'white' : 'var(--color-text-secondary)',
              fontWeight: importMode === 'bulk' ? 600 : 500,
              border: 'none',
              boxShadow: importMode === 'bulk' ? 'var(--shadow-sm)' : 'none',
              padding: '6px 12px'
            }}
            onClick={() => setImportMode('bulk')}
          >
            Bulk Import
          </button>
        </div>
      )}

      {importMode === 'bulk' ? (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--spacing-md)' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: bulkTab === 'import' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: bulkTab === 'import' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: '10px 15px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
              onClick={() => setBulkTab('import')}
              disabled={saving}
            >
              <Upload size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Upload & Import
            </button>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: bulkTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: bulkTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: '10px 15px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
              onClick={() => setBulkTab('history')}
              disabled={saving}
            >
              <ClipboardList size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Import History
            </button>
          </div>

          {bulkTab === 'import' ? (
            <div>
              {/* Importing state (Progress Bar) */}
              {session && session.status === 'processing' ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg) 0' }}>
                  <div className="spinner spin" style={{ width: 36, height: 36, margin: '0 auto 15px' }} />
                  <p style={{ fontWeight: 600, marginBottom: 5 }}>Importing books...</p>
                  {(() => {
                    const total = session.total_rows || 1;
                    const processed = session.success_count + session.updated_count + session.skipped_count + session.failed_count;
                    const pct = Math.min(100, Math.round((processed / total) * 100));
                    return (
                      <div style={{ maxWidth: 400, margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 5 }}>
                          <span>{pct}%</span>
                          <span>{processed} / {total} completed</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--color-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.2s ease' }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : session && (session.status === 'completed' || session.status === 'failed') ? (
                /* Results Screen */
                <div style={{ background: 'var(--color-surface-2)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                    <CheckCircle size={24} color="var(--color-success)" />
                    <h3 style={{ margin: 0, fontWeight: 700 }}>Books Bulk Import Finished</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{session.success_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Books Imported</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{session.updated_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Books Updated</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{session.skipped_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Duplicates Skipped</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: session.failed_count > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{session.failed_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Failed Rows</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{session.covers_imported_count || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Covers Imported</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center', border: (session.failed_covers_count || 0) > 0 ? '1px solid rgba(239,68,68,0.2)' : 'none' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: (session.failed_covers_count || 0) > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{session.failed_covers_count || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Failed Covers</div>
                    </div>
                  </div>

                  {session.failed_count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>Some rows failed to import due to database or verification constraints.</span>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDownloadErrors(session)}>
                        Download Error Report
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setSession(null);
                      }}
                    >
                      Import Another File
                    </button>
                  </div>
                </div>
              ) : preview ? (
                /* Preview Data Panel */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 15 }}>
                    <div style={{ background: 'var(--color-surface-3)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{preview.total_rows}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Rows</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{preview.valid_rows}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Valid Rows</div>
                    </div>
                    <div style={{
                      background: 'var(--color-surface-3)',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      border: preview.invalid_rows > 0 ? '1px solid rgba(224,82,82,0.3)' : 'none',
                      backgroundColor: preview.invalid_rows > 0 ? 'rgba(224,82,82,0.05)' : 'var(--color-surface-3)'
                    }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: preview.invalid_rows > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{preview.invalid_rows}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Invalid Rows</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{preview.duplicate_isbn_count}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Duplicate ISBNs</div>
                    </div>
                  </div>

                  {preview.invalid_rows > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 15 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <AlertTriangle color="var(--color-danger)" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-danger)', fontSize: '0.85rem' }}>File contains validation errors.</p>
                          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Please fix all validation errors in your CSV/XLSX sheet and upload it again. Import is disabled until all rows are valid.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>Row Preview (First 50 Rows)</h4>
                  <div className="table-wrapper" style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 15, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <table className="table" style={{ fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Title</th>
                          <th>Imported Category</th>
                          <th>Matched Category</th>
                          <th>Match Type</th>
                          <th>Confidence</th>
                          <th>Errors / Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.map((row, ridx) => {
                          const rowErrObj = preview.errors.find(e => e.row === row._row);
                          const hasErr = !!rowErrObj;
                          const hasWarning = row.status === 'Warning';
                          
                          return (
                            <tr key={row._row} style={{ background: hasErr ? 'rgba(239,68,68,0.04)' : (hasWarning ? 'rgba(245,158,11,0.04)' : 'none') }}>
                              <td>{row._row}</td>
                              <td style={{ fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>{row.title || '—'}</td>
                              <td>{row.category || '—'}</td>
                              <td style={{ fontWeight: 600 }}>{row.matched_category || '—'}</td>
                              <td>
                                <Badge variant={row.match_type === 'Exact Match' ? 'success' : (row.match_type === 'Alias Match' ? 'info' : (row.match_type === 'New Category' ? 'primary' : 'warning'))}>
                                  {row.match_type}
                                </Badge>
                              </td>
                              <td>
                                <span style={{ color: row.confidence >= 90 ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
                                  {row.confidence}%
                                </span>
                              </td>
                              <td>
                                {hasErr ? (
                                  <div style={{ color: 'var(--color-danger)', fontSize: '0.7rem' }}>
                                    {rowErrObj.errors.join('; ')}
                                  </div>
                                ) : hasWarning ? (
                                  <div style={{ color: 'var(--color-warning)', fontSize: '0.7rem', fontWeight: 600 }}>
                                    {row.warning_message}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Valid</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Duplicate Handling Option */}
                  {preview.duplicate_isbn_count > 0 && (
                    <div style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 15 }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label" style={{ fontWeight: 700 }}>Duplicate ISBN Handling Option</label>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '2px 0 8px' }}>
                          We detected {preview.duplicate_isbn_count} books in this sheet with ISBNs already existing in the system or duplicated in the sheet. Select how you want to handle them:
                        </p>
                        <select
                          className="select"
                          value={duplicateMode}
                          onChange={(e) => setDuplicateMode(e.target.value)}
                          style={{ maxWidth: 260 }}
                        >
                          <option value="skip">Skip duplicates</option>
                          <option value="update">Update existing book details</option>
                          <option value="import_new">Import as new book copy</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Upload State */
                <div>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: 15 }}>
                    Select a CSV or XLSX spreadsheet containing your catalog books list. Ensure all columns match the template.
                  </p>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownloadTemplate('csv')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={14} /> CSV Template
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownloadTemplate('xlsx')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={14} /> XLSX Template
                    </button>
                  </div>

                  <div
                    className={`dm-drop-zone ${file ? 'dm-drop-zone-filled' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--color-border)',
                      padding: '40px 20px',
                      borderRadius: 'var(--radius-lg)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--color-surface-2)',
                      transition: 'all 0.2s',
                      marginBottom: 15
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) {
                          setFile(f);
                          setPreview(null);
                        }
                      }}
                    />
                    <Upload size={32} color="var(--color-primary)" style={{ margin: '0 auto 10px' }} />
                    {file ? (
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>{file.name}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          Click to browse or drag & drop file
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          CSV or XLSX spreadsheets. Maximum 50MB limit.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Import History List Panel */
            <div>
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                  <div className="spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)' }}>
                  No bulk book import session records found.
                </div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 350, overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>File Name</th>
                        <th>User</th>
                        <th>Rows</th>
                        <th>Success</th>
                        <th>Updated</th>
                        <th>Skipped</th>
                        <th>Failed</th>
                        <th>Covers</th>
                        <th>Failed Covers</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((sess) => (
                        <tr key={sess.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(sess.created_at).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td style={{ fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sess.file_name}>
                            {sess.file_name}
                          </td>
                          <td>{sess.imported_by_name || '—'}</td>
                          <td>{sess.total_rows}</td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{sess.success_count}</td>
                          <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{sess.updated_count}</td>
                          <td>{sess.skipped_count}</td>
                          <td style={{ color: sess.failed_count > 0 ? 'var(--color-danger)' : 'inherit', fontWeight: sess.failed_count > 0 ? 600 : 500 }}>
                            {sess.failed_count}
                          </td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{sess.covers_imported_count || 0}</td>
                          <td style={{ color: (sess.failed_covers_count || 0) > 0 ? 'var(--color-danger)' : 'inherit', fontWeight: (sess.failed_covers_count || 0) > 0 ? 600 : 500 }}>{sess.failed_covers_count || 0}</td>
                          <td>
                            <Badge type={sess.status === 'completed' ? 'success' : (sess.status === 'processing' ? 'warning' : 'danger')}>
                              {sess.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
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
      )}
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
  const [isFetching, setIsFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const { user } = useAuthStore();

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);
  const isAdmin = user?.role === 'admin';

  // FIX #1: Use refs so we can read detailsBook inside loadData without
  //         adding it to useCallback deps (which caused an infinite loop).
  // FIX #6: mountedRef prevents setState calls after the component unmounts.
  const mountedRef = useRef(false);
  const isInitialLoad = useRef(true);
  const detailsBookIdRef = useRef(null);

  // Keep detailsBookIdRef in sync with state without adding detailsBook to loadData deps
  useEffect(() => {
    detailsBookIdRef.current = detailsBook?.id ?? null;
  }, [detailsBook]);

  // Track mounted state for async safety
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [runningAudit, setRunningAudit] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchAuditReport = async () => {
    setLoadingReport(true);
    try {
      const res = await booksAPI.getAuditReport();
      if (!mountedRef.current) return;
      setAuditReport(res.data);
    } catch (err) {
      if (!mountedRef.current) return;
      toast.error('Failed to load last audit report.');
    } finally {
      if (mountedRef.current) setLoadingReport(false);
    }
  };

  const handleRunAudit = async () => {
    setRunningAudit(true);
    const toastId = toast.loading('Running catalog price/tax audit...');
    try {
      const res = await booksAPI.auditBooks();
      if (!mountedRef.current) return;
      setAuditReport(res.data);
      toast.success('Audit completed successfully!', { id: toastId });
      loadData();
    } catch (err) {
      if (!mountedRef.current) return;
      toast.error('Failed to run audit.', { id: toastId });
    } finally {
      if (mountedRef.current) setRunningAudit(false);
    }
  };

  const [error, setError] = useState(false);

  // FIX #1: detailsBook REMOVED from deps — was causing an infinite re-render
  //         loop: detailsBook → loadData rebuilds → useEffect fires → API call
  //         → setDetailsBook(freshDetails) → detailsBook changes → loop.
  //         Now we read detailsBook via detailsBookIdRef (a stable ref).
  // FIX #6: mountedRef guards all setState calls to prevent memory leaks.
  // FIX #8/#15: isInitialLoad ref distinguishes first load (full spinner) from
  //             subsequent filter changes (no spinner flicker).
  const loadData = useCallback(async () => {
    const firstLoad = isInitialLoad.current;
    if (firstLoad) {
      setLoading(true);
    } else {
      setIsFetching(true);
    }
    try {
      setError(false);
      const [booksRes, catsRes] = await Promise.all([
        booksAPI.getAll({ search, category_id: selectedCategory, page, limit: 12 }),
        categoriesAPI.getAll()
      ]);

      // FIX #6: bail out if the component unmounted while the request was in flight
      if (!mountedRef.current) return;

      const fetchedBooks = booksRes.data.books || [];
      setBooks(fetchedBooks);
      setTotalPages(booksRes.data.totalPages || 1);
      setTotalBooks(booksRes.data.total || 0);
      setCategories(catsRes.data || []);

      // FIX #1: use ref instead of state — no re-render triggered, no dep loop
      if (detailsBookIdRef.current) {
        const freshDetails = fetchedBooks.find(b => b.id === detailsBookIdRef.current);
        if (freshDetails) setDetailsBook(freshDetails);
      }

      window.dispatchEvent(new CustomEvent('inventory-updated'));
    } catch (err) {
      if (!mountedRef.current) return;
      // FIX #9: always set error state, even when hasGlobalToast suppresses the toast
      setError(true);
      if (!err.hasGlobalToast) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to load books';
        toast.error(`Failed to load books: ${errMsg}`);
      }
      console.error('📚 [Books Page Load Data Error]');
      console.error(`- Request URL: ${err.config ? `${err.config.baseURL || ''}${err.config.url}` : 'N/A'}`);
      console.error(`- Response Status: ${err.response?.status || 'Network Error / Timeout / CORS'}`);
      console.error(`- Response Body:`, err.response?.data);
      console.error(`- Error Stack Trace:`, err.stack);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setIsFetching(false);
      isInitialLoad.current = false;
    }
  }, [search, selectedCategory, page]); // ← detailsBook intentionally NOT here

  useEffect(() => { loadData(); }, [loadData]);

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

  // FIX #4: null guards — stock_qty or low_stock_threshold can be null from DB
  const getStockBadge = (book) => {
    const qty = book.stock_qty ?? 0;
    const threshold = book.low_stock_threshold ?? 5;
    if (qty === 0) return <Badge type="danger" dot>Out of Stock</Badge>;
    if (qty <= threshold) return <Badge type="warning" dot>Low Stock</Badge>;
    return <Badge type="success" dot>In Stock</Badge>;
  };

  const getCoverUrl = (book) => {
    const url = book.front_cover_url || book.cover_image || book.cover_image_url;
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = book.updated_at ? new Date(book.updated_at).getTime() : Date.now();
    if (url.startsWith('http')) return `${url}${separator}v=${timestamp}`;
    const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    return `${API_URL}${url}${separator}v=${timestamp}`;
  };

  if (loading) return <Spinner text="Loading books..." />;
  // isFetching: filter/search changed — show subtle indicator, not full spinner

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Books Management</h1>
          <p>
            {totalBooks} books in catalog
            {isFetching && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Updating...</span>}
          </p>
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
      {error ? (
        <div className="empty-state">
          <div className="empty-state-icon"><AlertTriangle size={48} color="var(--color-danger)" /></div>
          <h3>Failed to load books</h3>
          <p>We couldn't reach the server. Please check your connection.</p>
          <button className="btn btn-primary" onClick={() => { setLoading(true); loadData(); }}>
            Retry Connection
          </button>
        </div>
      ) : books.length === 0 ? (
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
                    {/* FIX #4: null guard on price */}
                    {parseFloat(book.price || 0) === 0 ? (
                      <Badge type="success">FREE</Badge>
                    ) : (
                      `₹${parseFloat(book.price || 0).toFixed(2)}`
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
                    {/* FIX #4: null guard on price */}
                    {parseFloat(book.price || 0) === 0 ? (
                      <Badge type="success">FREE</Badge>
                    ) : (
                      `₹${parseFloat(book.price || 0).toFixed(2)}`
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(p - 1, 1))}
          >
            &laquo;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`page-btn ${page === p ? 'active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
          >
            &raquo;
          </button>
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
