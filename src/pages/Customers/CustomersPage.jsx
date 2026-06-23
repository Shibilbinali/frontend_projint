import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, Users, Upload, Download, ClipboardList, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { customersAPI, salesAPI } from '../../api';
import Modal from '../../components/UI/Modal';
import SearchInput from '../../components/UI/SearchInput';
import Spinner from '../../components/UI/Spinner';
import Badge from '../../components/UI/Badge';
import toast from 'react-hot-toast';
import ReceiptModal from '../../components/Receipt/ReceiptModal';

function CustomerFormModal({ isOpen, onClose, customer, onSaved }) {
  const [importMode, setImportMode] = useState('single'); // 'single' or 'bulk'
  const [bulkTab, setBulkTab] = useState('import'); // 'import' or 'history'

  // Single mode state
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Bulk mode state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [session, setSession] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState('skip');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [pdfOpened, setPdfOpened] = useState(false);

  const fileInputRef = useRef();
  const pollingRef = useRef();

  useEffect(() => {
    if (customer) {
      setImportMode('single');
      setForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || ''
      });
    } else {
      setImportMode('single');
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
      setFile(null);
      setPreview(null);
      setSession(null);
      setPdfOpened(false);
    }
    setFormErrors({});
  }, [customer, isOpen]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await customersAPI.getImportReports();
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
      const res = await customersAPI.downloadTemplate(format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_import_template.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template.');
    }
  };

  const handlePreview = async (selectedFile = null) => {
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) return;
    setFetching(true);
    const fd = new FormData();
    fd.append('file', fileToUpload);
    try {
      const res = await customersAPI.preview(fd);
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Preview failed.');
    } finally {
      setFetching(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await customersAPI.import(fd, duplicateMode);
      setSession({
        id: res.data.session_id,
        status: 'processing',
        success_count: 0,
        updated_count: 0,
        skipped_count: 0,
        failed_count: 0,
        total_rows: preview ? preview.total_rows : 0
      });
      startPolling(res.data.session_id);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Import failed.');
      setSaving(false);
    }
  };

  const startPolling = (sessionId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await customersAPI.getImportSessionStatus(sessionId);
        const sess = res.data;
        setSession(sess);
        if (sess.status === 'completed' || sess.status === 'failed') {
          clearInterval(pollingRef.current);
          setSaving(false);
          onSaved();
          if (sess.status === 'completed') {
            toast.success(`${sess.success_count + sess.updated_count} Customers Imported Successfully`);
            if (sess.report_id && !pdfOpened) {
              setPdfOpened(true);
              handleDownloadReport(sess.report_id, true);
            }
          }
        }
      } catch {
        // Ignored
      }
    }, 1000);
  };

  const handleDownloadErrors = (sess) => {
    const errors = sess.errors || [];
    if (!errors.length) {
      toast.error('No errors to download.');
      return;
    }
    const lines = [
      'row,name,phone,error',
      ...errors.map(e => `"${e.row}","${(e.name || '').replace(/"/g, '""')}","${(e.phone || '').replace(/"/g, '""')}","${(e.error || '').replace(/"/g, '""')}"`)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_import_errors_session_${sess.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = async (reportId, viewOnly = false) => {
    try {
      const res = await customersAPI.downloadImportReport(reportId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      if (viewOnly) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `customer_import_report_${reportId}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Failed to download report.');
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required.';
    if (!form.phone.trim()) errors.phone = 'Phone number is required.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
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

  const getFooter = () => {
    if (importMode === 'single') {
      return (
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} id="save-customer-btn">
            {saving ? 'Saving...' : 'Save Customer'}
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
            disabled={saving || preview.invalid_rows > 0}
          >
            {saving ? 'Importing...' : 'Import All Customers'}
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
          {fetching ? 'Generating Preview...' : 'Preview Data'}
        </button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      size={importMode === 'bulk' ? 'lg' : 'md'}
      footer={getFooter()}
    >
      {/* Mode Selector Toggle (only when creating a new customer) */}
      {!customer && (
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
            Single Customer
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
                  <p style={{ fontWeight: 600, marginBottom: 5 }}>Importing customers...</p>
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
                    <h3 style={{ margin: 0, fontWeight: 700 }}>{session.success_count + session.updated_count} Customers Imported Successfully</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{session.success_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Customers Imported</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{session.updated_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Customers Updated</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{session.skipped_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Duplicates Skipped</div>
                    </div>
                    <div style={{ background: 'var(--color-surface-3)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: session.failed_count > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{session.failed_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Failed Rows</div>
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

                  {session.report_id && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', padding: '15px', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Import Report PDF is ready</span>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleDownloadReport(session.report_id, true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Eye size={14} /> View PDF
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDownloadReport(session.report_id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={14} /> Download PDF
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
                        setPdfOpened(false);
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
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{preview.duplicate_phone_count}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Duplicate Phone Numbers</div>
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

                  {/* Preview Table removed to avoid displaying raw CSV content */}

                  {/* Duplicate Handling Option */}
                  {preview.duplicate_phone_count > 0 && (
                    <div style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 15 }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label" style={{ fontWeight: 700 }}>Duplicate Phone Handling Option</label>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '2px 0 8px' }}>
                          We detected {preview.duplicate_phone_count} customers in this sheet with phone numbers already existing in the system or duplicated in the sheet. Select how you want to handle them:
                        </p>
                        <select
                          className="select"
                          value={duplicateMode}
                          onChange={(e) => setDuplicateMode(e.target.value)}
                          style={{ maxWidth: 260 }}
                        >
                          <option value="skip">Skip duplicates</option>
                          <option value="update">Update existing customer details</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Upload State */
                <div>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: 15 }}>
                    Select a CSV or XLSX spreadsheet containing your customers list. Ensure all columns match the template.
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
                          handlePreview(f); // Automatically fetch preview
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
                  No bulk customer import session records found.
                </div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 350, overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>File Name</th>
                        <th>User</th>
                        <th>Records</th>
                        <th>Failed</th>
                        <th>Skipped</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((report) => (
                        <tr key={report.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(report.created_at).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td style={{ fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={report.file_name}>
                            {report.file_name}
                          </td>
                          <td>{report.imported_by_name || '—'}</td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{report.total_records}</td>
                          <td style={{ color: report.failed_records > 0 ? 'var(--color-danger)' : 'inherit', fontWeight: report.failed_records > 0 ? 600 : 500 }}>
                            {report.failed_records}
                          </td>
                          <td>{report.duplicate_records}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownloadReport(report.id, true)} title="View PDF">
                                <Eye size={16} />
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownloadReport(report.id)} title="Download PDF">
                                <Download size={16} />
                              </button>
                            </div>
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
            <div className="input-group">
              <label className="input-label">Full Name <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span></label>
              <input
                type="text"
                className={`input${formErrors.name ? ' input-error' : ''}`}
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors(prev => ({ ...prev, name: '' })); }}
                id="customer-name-input"
                placeholder="Enter full name"
              />
              {formErrors.name && <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.78rem', marginTop: 2 }}>{formErrors.name}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Phone <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span></label>
              <input
                type="tel"
                className={`input${formErrors.phone ? ' input-error' : ''}`}
                value={form.phone}
                onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFormErrors(prev => ({ ...prev, phone: '' })); }}
                id="customer-phone-input"
                placeholder="e.g. 9876543210"
              />
              {formErrors.phone && <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.78rem', marginTop: 2 }}>{formErrors.phone}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Email <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>(optional)</span></label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} id="customer-email-input" placeholder="Enter email address" />
            </div>
            <div className="input-group">
              <label className="input-label">Address <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>(optional)</span></label>
              <input type="text" className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} id="customer-address-input" placeholder="Enter address" />
            </div>
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label className="input-label">Notes <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>(optional)</span></label>
              <textarea className="input" placeholder="Internal notes or preferences..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 80 }} id="customer-notes-input" />
            </div>
          </div>
        </form>
      )}
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
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await customersAPI.getAll({ search, city, startDate, endDate });
      setCustomers(res.data.customers || []);
    } catch {
      toast.error('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, city, startDate, endDate]);

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

  const handleExport = async (format) => {
    try {
      const res = await customersAPI.export({ search, city, startDate, endDate, format });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_export_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Customers exported to ${format.toUpperCase()}!`);
    } catch (err) {
      toast.error('Failed to export customers.');
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
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-secondary" onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('xlsx')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={16} /> Export XLSX
          </button>
          <button className="btn btn-primary" onClick={() => { setEditCustomer(null); setModalOpen(true); }} id="add-customer-btn">
            <Plus size={18} /> Add Customer
          </button>
        </div>
      </div>

      <div className="filters-bar" style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onSearch={setSearch} placeholder="Search by name, phone, or email..." />
        <input
          type="text"
          className="input"
          style={{ width: 180 }}
          placeholder="Filter by City..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
          <span className="text-muted text-sm">Joined:</span>
          <input
            type="date"
            className="input"
            style={{ width: 150 }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-muted text-sm">to</span>
          <input
            type="date"
            className="input"
            style={{ width: 150 }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {(search || city || startDate || endDate) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearch('');
              setCity('');
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear Filters
          </button>
        )}
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
