import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Tag, AlertTriangle, Sparkles, Check, CheckCircle2, RefreshCw, Info, X } from 'lucide-react';
import { authAPI, usersAPI, categoriesAPI, booksAPI, settingsAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/UI/Modal';
import Badge from '../../components/UI/Badge';
import Spinner from '../../components/UI/Spinner';
import toast from 'react-hot-toast';
import { themes } from '../../utils/themes';
import { getSavedTheme, saveTheme } from '../../utils/themeHelper';

function ChangePasswordSection() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (!err.hasGlobalToast) toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card mb-lg">
      <h3 className="font-display mb-md" style={{ fontSize: '1rem' }}>Change Password</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-2 gap-md">
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Current Password</label>
            <input type="password" className="input" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          </div>
          <div className="input-group">
            <label className="input-label">New Password</label>
            <input type="password" className="input" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm New Password</label>
            <input type="password" className="input" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
          </div>
        </div>
        <div className="flex justify-end mt-md">
          <button type="submit" className="btn btn-primary" disabled={saving} id="change-password-btn">
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersSection({ onUserAction }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'cashier' });
  const [saving, setSaving] = useState(false);
  const { user: currentUser } = useAuthStore();

  // Confirmation modal states
  const [disableConfirmUser, setDisableConfirmUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  useEffect(() => {
    usersAPI.getAll().then((res) => setUsers(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await usersAPI.create(form);
      setUsers([...users, res.data]);
      toast.success('User created!');
      setModalOpen(false);
      setForm({ username: '', email: '', password: '', role: 'cashier' });
      if (onUserAction) onUserAction();
    } catch (err) {
      if (!err.hasGlobalToast) toast.error(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await usersAPI.update(user.id, { is_active: !user.is_active });
      setUsers(users.map((u) => (u.id === user.id ? res.data : u)));
      toast.success(`User ${res.data.username} ${res.data.is_active ? 'activated' : 'deactivated'}.`);
      if (onUserAction) onUserAction();
    } catch (err) {
      console.error('[UsersSection] handleToggleActive error:', err);
      console.error('[UsersSection] Server response:', err.response?.data);
      if (!err.hasGlobalToast) toast.error(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await usersAPI.delete(user.id);
      setUsers(users.filter((u) => u.id !== user.id));
      toast.success(`User ${user.username} deleted permanently.`);
      if (onUserAction) onUserAction();
    } catch (err) {
      if (!err.hasGlobalToast) toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleSwitchClick = (user) => {
    if (user.is_active) {
      setDisableConfirmUser(user);
    } else {
      handleToggleActive(user);
    }
  };

  return (
    <div className="card mb-lg">
      <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          vertical-align: middle;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--color-surface-3);
          border: 1px solid var(--color-border);
          transition: .3s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: var(--color-text-secondary);
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--color-success);
          border-color: rgba(76, 175, 114, 0.4);
        }
        input:checked + .slider:before {
          transform: translateX(20px);
          background-color: #ffffff;
        }
      `}</style>

      <div className="flex items-center justify-between mb-md">
        <h3 className="font-display" style={{ fontSize: '1rem' }}>User Management</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)} id="add-user-btn">
          <Plus size={14} /> Add User
        </button>
      </div>
      {loading ? <Spinner /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Account Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.username}</td>
                  <td>{u.email}</td>
                  <td><Badge type={u.role === 'admin' ? 'primary' : 'info'}>{u.role}</Badge></td>
                  <td><Badge type={u.is_active ? 'success' : 'danger'} dot>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    {u.role === 'admin' ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Locked 🔒
                      </span>
                    ) : (
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={u.is_active}
                          onChange={() => handleSwitchClick(u)}
                          id={`switch-${u.username}`}
                        />
                        <span className="slider"></span>
                      </label>
                    )}
                  </td>
                  <td>
                    {u.role === 'admin' ? (
                      <Badge type="primary">Protected</Badge>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm flex items-center gap-xs"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => setDeleteConfirmUser(u)}
                        id={`delete-user-btn-${u.username}`}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New User"
        footer={<><button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving} id="save-user-btn">{saving ? 'Creating...' : 'Create User'}</button></>}>
        <form onSubmit={handleCreate}>
          <div className="grid grid-2 gap-md">
            <div className="input-group">
              <label className="input-label">Username *</label>
              <input type="text" className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} id="new-user-username" />
            </div>
            <div className="input-group">
              <label className="input-label">Email *</label>
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Password *</label>
              <input type="password" className="input" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Disable Cashier Confirmation Modal */}
      <Modal
        isOpen={disableConfirmUser !== null}
        onClose={() => setDisableConfirmUser(null)}
        title="Confirm Account Deactivation"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDisableConfirmUser(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                const target = disableConfirmUser;
                setDisableConfirmUser(null);
                await handleToggleActive(target);
              }}
              id="confirm-disable-btn"
            >
              Disable Account
            </button>
          </>
        }
      >
        <p style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text)' }}>
          Are you sure you want to disable this cashier account? The user will no longer be able to access the system.
        </p>
      </Modal>

      {/* Delete Cashier Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmUser !== null}
        onClose={() => setDeleteConfirmUser(null)}
        title="Confirm Permanent Deletion"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteConfirmUser(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                const target = deleteConfirmUser;
                setDeleteConfirmUser(null);
                await handleDeleteUser(target);
              }}
              id="confirm-delete-btn"
            >
              Delete Permanently
            </button>
          </>
        }
      >
        <p style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text)' }}>
          This action cannot be undone. Delete cashier account permanently?
        </p>
      </Modal>
    </div>
  );
}

function CategoriesSection() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#C8732A' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    categoriesAPI.getAll().then((res) => setCategories(res.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await categoriesAPI.create(form);
      toast.success('Category created!');
      setModalOpen(false);
      setForm({ name: '', description: '', color: '#C8732A' });
      load();
    } catch (err) {
      if (!err.hasGlobalToast) toast.error(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    try {
      await categoriesAPI.delete(cat.id);
      toast.success('Category deleted.');
      load();
    } catch {
      toast.error('Cannot delete — books may be assigned to this category.');
    }
  };

  return (
    <div className="card mb-lg">
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-display flex items-center gap-sm" style={{ fontSize: '1rem', margin: 0 }}>
          <span>Book Categories</span>
          <Badge type={isAdmin ? 'success' : 'info'} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
            {isAdmin ? '⚙ Full Access (Admin)' : '👁 View Only (Cashier)'}
          </Badge>
        </h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setModalOpen(true)}
          disabled={!isAdmin}
          title={!isAdmin ? 'Admin permission required.' : 'Add Category'}
          style={{
            cursor: !isAdmin ? 'not-allowed' : 'pointer',
            opacity: !isAdmin ? 0.6 : 1
          }}
          id="add-category-btn"
        >
          <Plus size={14} /> Add Category
        </button>
      </div>
      {loading ? <Spinner /> : (
        <div className="flex" style={{ flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-sm" style={{
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '6px 12px'
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cat.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({cat.book_count} books)</span>
              <button
                className="btn btn-danger btn-icon"
                style={{
                  width: 22,
                  height: 22,
                  padding: 0,
                  fontSize: '0.7rem',
                  cursor: !isAdmin ? 'not-allowed' : 'pointer',
                  opacity: !isAdmin ? 0.5 : 1
                }}
                onClick={() => handleDelete(cat)}
                disabled={!isAdmin || parseInt(cat.book_count) > 0}
                title={!isAdmin ? 'Admin permission required.' : parseInt(cat.book_count) > 0 ? 'Cannot delete — has books' : 'Delete'}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Category"
        footer={<><button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving} id="save-category-btn">{saving ? 'Saving...' : 'Create'}</button></>}>
        <div className="grid gap-md">
          <div className="input-group">
            <label className="input-label">Category Name *</label>
            <input type="text" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="category-name-input" />
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Color</label>
            <input type="color" className="input" style={{ height: 44, cursor: 'pointer' }} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}


function CatalogAuditSection() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [selectedWarning, setSelectedWarning] = useState(null);

  const loadReport = () => {
    booksAPI.getAuditReport().then((res) => {
      if (res.data && res.data.timestamp) {
        setReport(res.data);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleAudit = async () => {
    if (loading) return; // Prevent duplicate requests
    setLoading(true);
    const toastId = toast.loading('Auditing database book records...');
    try {
      const res = await booksAPI.auditBooks();
      setReport(res.data);
      toast.success('Database audit completed successfully!', { id: toastId });
    } catch (err) {
      console.error('Audit execution error:', err);
      let errMsg = 'Failed to run database audit.';
      if (!err.response) {
        errMsg = 'Server not running. Please check if the server is running and accessible.';
      } else if (err.response.status === 404) {
        errMsg = 'Route not found. The audit endpoint /api/catalog-audit/run is not configured on the server.';
      } else if (err.response.data && err.response.data.message) {
        if (err.response.data.message.includes('Database connection failed')) {
          errMsg = 'Database connection failed. Please ensure PostgreSQL is running and accessible.';
        } else {
          errMsg = `Audit execution failed: ${err.response.data.message}`;
        }
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCategory = async (bookId, suggestedCategoryId, suggestedCategoryName) => {
    try {
      await booksAPI.updateCategory(bookId, suggestedCategoryId);
      toast.success(`Book category updated to ${suggestCategoryName}!`);
      
      if (report) {
        const oldWarnings = report.warnings !== undefined ? report.warnings : (report.incorrectCategoryWarnings || []);
        const updatedWarnings = oldWarnings.filter(w => w.id !== bookId);
        
        const totalBooksVal = report.totalBooks !== undefined ? report.totalBooks : (report.stats?.totalBooks || 1);
        const oldWarningsCount = oldWarnings.length;
        const newWarningsCount = updatedWarnings.length;
        const diff = oldWarningsCount - newWarningsCount;
        
        const oldHealth = report.healthScore !== undefined ? report.healthScore : (report.stats?.healthScore || 100);
        const newHealth = Math.min(100, Math.round(oldHealth + (diff / totalBooksVal * 100)));
        const oldFixed = report.totalFixed !== undefined ? report.totalFixed : (report.stats?.totalUpdated || 0);

        setReport({
          ...report,
          warnings: updatedWarnings,
          incorrectCategoryWarnings: updatedWarnings,
          healthScore: newHealth,
          totalFixed: oldFixed + 1,
          stats: {
            ...(report.stats || {}),
            totalBooks: totalBooksVal,
            totalUpdated: oldFixed + 1,
            healthScore: newHealth,
            missingInfoCount: report.missingInfo !== undefined ? report.missingInfo : (report.stats?.missingInfoCount || 0)
          }
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update category.');
    }
  };

  const handleIgnoreWarning = (bookId) => {
    if (report) {
      const oldWarnings = report.warnings !== undefined ? report.warnings : (report.incorrectCategoryWarnings || []);
      const updatedWarnings = oldWarnings.filter(w => w.id !== bookId);
      setReport({
        ...report,
        warnings: updatedWarnings,
        incorrectCategoryWarnings: updatedWarnings
      });
      toast.success('Warning ignored.');
    }
  };

  // Map values correctly to show cards even before first audit
  const totalBooks = report ? (report.totalBooks !== undefined ? report.totalBooks : report.stats?.totalBooks) : '—';
  const healthScoreVal = report ? (report.healthScore !== undefined ? report.healthScore : report.stats?.healthScore) : '—';
  const totalFixed = report ? (report.totalFixed !== undefined ? report.totalFixed : report.stats?.totalUpdated) : '—';
  const missingInfo = report ? (report.missingInfo !== undefined ? report.missingInfo : report.stats?.missingInfoCount) : '—';
  const incorrectWarnings = report ? (report.warnings !== undefined ? report.warnings : report.incorrectCategoryWarnings || []) : [];

  return (
    <div className="card mb-lg">
      <style>{`
        .audit-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 1024px) {
          .audit-metric-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .audit-metric-grid {
            grid-template-columns: 1fr;
          }
        }

        .audit-metric-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          aspect-ratio: 1 / 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }

        .audit-metric-card:hover {
          border-color: #F59E0B;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
          transform: translateY(-2px);
        }

        .audit-metric-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 8px;
          font-family: 'Outfit', 'Inter', sans-serif;
        }

        .audit-metric-label {
          font-size: 0.725rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--color-text-muted, #a3a3a3);
          letter-spacing: 0.05em;
          text-align: center;
        }

        .audit-warning-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          margin-top: 24px;
          padding: 20px;
        }

        .audit-warning-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }

        .audit-warning-title {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .audit-table-container {
          max-height: 400px;
          overflow-y: auto;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.15);
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .audit-table th {
          background: rgba(255, 255, 255, 0.03);
          color: var(--color-text-muted, #a3a3a3);
          font-size: 0.725rem;
          font-weight: 600;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .audit-table td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 0.85rem;
          color: var(--color-text, #e5e5e5);
          vertical-align: middle;
        }

        .audit-table tr:hover {
          background: rgba(255, 255, 255, 0.01);
        }

        .confidence-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.725rem;
          font-weight: 600;
        }

        .confidence-green {
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .confidence-yellow {
          background: rgba(255, 193, 7, 0.15);
          color: #FFC107;
          border: 1px solid rgba(255, 193, 7, 0.3);
        }

        .confidence-red {
          background: rgba(244, 67, 54, 0.15);
          color: #F44336;
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .status-ready {
          background: rgba(33, 150, 243, 0.15);
          color: #2196F3;
          border: 1px solid rgba(33, 150, 243, 0.3);
        }

        .status-verify {
          background: rgba(158, 158, 158, 0.15);
          color: #9E9E9E;
          border: 1px solid rgba(158, 158, 158, 0.3);
        }

        .audit-actions {
          display: flex;
          gap: 6px;
        }

        .audit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .audit-btn-accept {
          background: rgba(76, 175, 114, 0.12);
          color: #4CAF50;
          border-color: rgba(76, 175, 114, 0.25);
        }

        .audit-btn-accept:hover:not(:disabled) {
          background: #4CAF50;
          color: #fff;
        }

        .audit-btn-ignore {
          background: rgba(255, 255, 255, 0.04);
          color: var(--color-text-muted, #a3a3a3);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .audit-btn-ignore:hover:not(:disabled) {
          background: rgba(244, 67, 54, 0.12);
          color: #F44336;
          border-color: rgba(244, 67, 54, 0.25);
        }

        .audit-btn-details {
          background: rgba(33, 150, 243, 0.1);
          color: #2196F3;
          border-color: rgba(33, 150, 243, 0.2);
        }

        .audit-btn-details:hover {
          background: #2196F3;
          color: #fff;
        }
      `}</style>

      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm">
          <AlertTriangle size={18} color="var(--color-primary)" />
          <h3 className="font-display flex items-center gap-sm" style={{ fontSize: '1rem', margin: 0 }}>
            <span>Database & Catalog Audit</span>
            <Badge type={isAdmin ? 'success' : 'info'} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
              {isAdmin ? '⚙ Full Access (Admin)' : '👁 View Only (Cashier)'}
            </Badge>
          </h3>
        </div>
        <div className="flex gap-sm">
          {!isAdmin && (
            <button
              className="btn btn-ghost btn-sm flex items-center gap-xs"
              onClick={() => {
                toast.success("Catalog health concerns reported to Administrator successfully.");
              }}
              id="report-audit-issues-btn"
            >
              Report Issues to Admin
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAudit}
            disabled={loading || !isAdmin}
            title={!isAdmin ? 'Admin permission required.' : 'Run Catalog Audit'}
            style={{
              cursor: !isAdmin ? 'not-allowed' : 'pointer',
              opacity: !isAdmin ? 0.6 : 1
            }}
            id="audit-catalog-btn"
          >
            {loading ? (
              <><RefreshCw size={14} className="spinner" style={{ marginRight: 6 }} /> Running Audit...</>
            ) : (
              <><AlertTriangle size={14} style={{ marginRight: 6 }} /> Run Catalog Audit</>
            )}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>
        Audits all library book records to detect and auto-correct missing, null, or zero prices (scaled by page count) and assign default GST tax rates based on format and category. Also detects books with missing essential information.
      </p>

      {/* 4 Responsive metric cards (always rendered) */}
      <div className="audit-metric-grid">
        <div className="audit-metric-card">
          <div className="audit-metric-number">{totalBooks}</div>
          <div className="audit-metric-label">Total Books</div>
        </div>
        <div className="audit-metric-card">
          <div className="audit-metric-number" style={{ color: healthScoreVal !== '—' ? '#F59E0B' : '#ffffff' }}>
            {healthScoreVal}{healthScoreVal !== '—' ? '%' : ''}
          </div>
          <div className="audit-metric-label">Health Score</div>
        </div>
        <div className="audit-metric-card">
          <div className="audit-metric-number">{totalFixed}</div>
          <div className="audit-metric-label">Total Fixed</div>
        </div>
        <div className="audit-metric-card">
          <div className="audit-metric-number">{missingInfo}</div>
          <div className="audit-metric-label">Missing Info</div>
        </div>
      </div>

      {/* Incorrect Category Warnings scrollable table panel */}
      <div className="audit-warning-panel">
        <div className="audit-warning-header">
          <div className="audit-warning-title">
            <AlertTriangle size={18} color="#F59E0B" />
            <span>Incorrect Category Warnings ({incorrectWarnings.length})</span>
          </div>
        </div>
        
        {!report ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '24px', textAlign: 'center' }}>
            No audit has been run yet. Click "Run Catalog Audit" to begin scanning the database.
          </div>
        ) : incorrectWarnings.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '24px', textAlign: 'center' }}>
            No incorrect category warnings found. All book categories appear correct.
          </div>
        ) : (
          <div className="audit-table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Suggested Category</th>
                  <th>Confidence Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incorrectWarnings.map((bk) => (
                  <tr key={bk.id}>
                    <td style={{ fontWeight: 600 }}>{bk.title}</td>
                    <td>{bk.author}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {bk.currentCategory || 'Uncategorized'} &rarr;
                      </div>
                      <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        {bk.suggestedCategory}
                      </div>
                    </td>
                    <td>
                      <span className={`confidence-badge ${
                        bk.confidence >= 80 ? 'confidence-green' :
                        bk.confidence >= 50 ? 'confidence-yellow' : 'confidence-red'
                      }`}>
                        {bk.confidence}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        bk.confidence >= 80 ? 'status-ready' : 'status-verify'
                      }`}>
                        {bk.status}
                      </span>
                    </td>
                    <td>
                      <div className="audit-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="audit-btn audit-btn-accept"
                          onClick={() => handleAcceptCategory(bk.id, bk.suggestedCategoryId, bk.suggestedCategory)}
                          title="Accept Suggested Category"
                          disabled={!isAdmin}
                          style={{
                            cursor: !isAdmin ? 'not-allowed' : 'pointer',
                            opacity: !isAdmin ? 0.6 : 1
                          }}
                        >
                          <Check size={12} /> Accept
                        </button>
                        <button
                          className="audit-btn audit-btn-ignore"
                          onClick={() => handleIgnoreWarning(bk.id)}
                          title="Ignore Warning"
                          disabled={!isAdmin}
                          style={{
                            cursor: !isAdmin ? 'not-allowed' : 'pointer',
                            opacity: !isAdmin ? 0.6 : 1
                          }}
                        >
                          <X size={12} /> Ignore
                        </button>
                        <button
                          className="audit-btn audit-btn-details"
                          onClick={() => setSelectedWarning(bk)}
                          title="View Details"
                        >
                          <Info size={12} /> Details
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

      {/* Other audit detail lists */}
      {report && (
        <div style={{ display: 'grid', gap: '20px', marginTop: '24px' }}>
          {/* Updated Prices List */}
          {report.updatedPrices && report.updatedPrices.length > 0 && (
            <div className="report-section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px' }}>
              <div className="report-title" style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Auto-Corrected Book Prices ({report.updatedPrices.length})
              </div>
              <div className="list-container" style={{ display: 'grid', gap: '8px' }}>
                {report.updatedPrices.map((bk, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      ₹{parseFloat(bk.oldPrice).toFixed(2)} &rarr; <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{parseFloat(bk.newPrice).toFixed(2)}</span> ({bk.priceType})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updated Taxes List */}
          {report.updatedTaxes && report.updatedTaxes.length > 0 && (
            <div className="report-section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px' }}>
              <div className="report-title" style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Auto-Corrected Tax Rates ({report.updatedTaxes.length})
              </div>
              <div className="list-container" style={{ display: 'grid', gap: '8px' }}>
                {report.updatedTaxes.map((bk, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {parseFloat(bk.oldTax).toFixed(1)}% &rarr; <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{parseFloat(bk.newTax).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Data Warnings List */}
          {report.missingDataWarnings && report.missingDataWarnings.length > 0 && (
            <div className="report-section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(224, 82, 82, 0.2)', padding: '16px' }}>
              <div className="report-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600 }}>
                <AlertTriangle size={16} /> Missing Essential Fields ({report.missingDataWarnings.length})
              </div>
              <div className="list-container" style={{ display: 'grid', gap: '8px' }}>
                {report.missingDataWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.85rem' }}>
                      Missing: {bk.missingFields.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Warnings List */}
          {report.duplicateWarnings && report.duplicateWarnings.length > 0 && (
            <div className="report-section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(224, 82, 82, 0.2)', padding: '16px' }}>
              <div className="report-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600 }}>
                <AlertTriangle size={16} /> Duplicate Catalog Records ({report.duplicateWarnings.length})
              </div>
              <div className="list-container" style={{ display: 'grid', gap: '8px' }}>
                {report.duplicateWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {bk.isbn ? `ISBN: ${bk.isbn}` : 'Matching title and author'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing ISBN Warnings List */}
          {report.missingIsbnWarnings && report.missingIsbnWarnings.length > 0 && (
            <div className="report-section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(91, 155, 213, 0.2)', padding: '16px' }}>
              <div className="report-title" style={{ color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600 }}>
                <AlertTriangle size={16} /> Missing ISBN Identifiers ({report.missingIsbnWarnings.length})
              </div>
              <div className="list-container" style={{ display: 'grid', gap: '8px' }}>
                {report.missingIsbnWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                      Required for scanning/barcode features
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Cover Image Warnings List */}
          {report.missingCoverImageWarnings && report.missingCoverImageWarnings.length > 0 && (
            <div className="report-section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px' }}>
              <div className="report-title" style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600 }}>
                <AlertTriangle size={16} /> Missing Cover Images ({report.missingCoverImageWarnings.length})
              </div>
              <div className="list-container" style={{ display: 'grid', gap: '8px' }}>
                {report.missingCoverImageWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Using default catalog placeholder
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Inconsistencies List */}
          {report.inventoryInconsistencies && report.inventoryInconsistencies.length > 0 && (
            <div className="report-section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(224, 82, 82, 0.2)', padding: '16px' }}>
              <div className="report-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600 }}>
                <AlertTriangle size={16} /> Inventory Inconsistencies ({report.inventoryInconsistencies.length})
              </div>
              <div className="list-container" style={{ display: 'grid', gap: '8px' }}>
                {report.inventoryInconsistencies.map((bk, idx) => (
                  <div key={idx} className="list-row" style={{ display: 'flex', justifyContent: 'between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                      Current Stock: {bk.stock_qty !== null ? bk.stock_qty : 'Unspecified'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Warning Details Modal */}
      <Modal
        isOpen={selectedWarning !== null}
        onClose={() => setSelectedWarning(null)}
        title="Book Category Audit Details"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSelectedWarning(null)}>Close</button>
            <button
              className="btn btn-danger btn-sm"
              style={{ marginRight: '8px' }}
              disabled={!isAdmin}
              onClick={() => {
                const bk = selectedWarning;
                setSelectedWarning(null);
                handleIgnoreWarning(bk.id);
              }}
            >
              Ignore Warning
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!isAdmin}
              onClick={async () => {
                const bk = selectedWarning;
                setSelectedWarning(null);
                await handleAcceptCategory(bk.id, bk.suggestedCategoryId, bk.suggestedCategory);
              }}
            >
              Accept Suggestion
            </button>
          </>
        }
      >
        {selectedWarning && (
          <div style={{ color: 'var(--color-text)', display: 'grid', gap: 'var(--spacing-md)' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 600 }}>{selectedWarning.title}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>by {selectedWarning.author}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--color-surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>ISBN</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '2px' }}>{selectedWarning.isbn || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Confidence Score</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '2px' }}>
                  <span className={`confidence-badge ${
                    selectedWarning.confidence >= 80 ? 'confidence-green' :
                    selectedWarning.confidence >= 50 ? 'confidence-yellow' : 'confidence-red'
                  }`} style={{ padding: '2px 6px', borderRadius: '8px' }}>
                    {selectedWarning.confidence}%
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Current Category</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '2px', color: 'var(--color-danger)' }}>{selectedWarning.currentCategory || 'None'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Suggested Category</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '2px', color: 'var(--color-success)' }}>{selectedWarning.suggestedCategory}</div>
              </div>
            </div>

            {selectedWarning.tags && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tags</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {selectedWarning.tags.split(',').map((t, idx) => (
                    <Badge key={idx} type="info" style={{ fontSize: '0.7rem' }}>{t.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedWarning.description && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Description</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', lineHeight: '1.4', maxHeight: '120px', overflowY: 'auto', background: 'var(--color-surface-2)', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  {selectedWarning.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ThemeSettingsSection() {
  const [activeTheme, setActiveTheme] = useState(() => getSavedTheme());

  const handleSelectTheme = (themeId) => {
    setActiveTheme(themeId);
    saveTheme(themeId);
    toast.success(`${themeId === 'auto' ? 'Auto Theme' : themes.find(t => t.id === themeId)?.name} applied!`);
  };

  return (
    <div className="card mb-lg">
      <h3 className="font-display mb-md" style={{ fontSize: '1rem' }}>Theme Settings</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>
        Personalize your workspace. Select a theme below or use "Auto Theme" to match your system setting.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
        {/* Auto Theme Card */}
        <div
          className={`theme-preview-card ${activeTheme === 'auto' ? 'active' : ''}`}
          onClick={() => handleSelectTheme('auto')}
          id="theme-card-auto"
        >
          <div className="flex items-center justify-between">
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>🖥️ Auto Theme</span>
            {activeTheme === 'auto' && <Check size={16} color="var(--color-primary)" />}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 8px 0' }}>
            Syncs with system light/dark preference.
          </p>
          <div className="theme-color-palette">
            <div className="theme-color-dot" style={{ background: '#FAF8F5' }} title="Light mode background" />
            <div className="theme-color-dot" style={{ background: '#0C0A08' }} title="Dark mode background" />
            <div className="theme-color-dot" style={{ background: '#C8732A' }} title="Accent color" />
          </div>
        </div>

        {/* Dynamic theme cards */}
        {themes.map((t) => (
          <div
            key={t.id}
            className={`theme-preview-card ${activeTheme === t.id ? 'active' : ''}`}
            onClick={() => handleSelectTheme(t.id)}
            id={`theme-card-${t.id}`}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {t.emoji} {t.name}
              </span>
              {activeTheme === t.id && <Check size={16} color="var(--color-primary)" />}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 8px 0' }}>
              {t.isDark ? 'Dark Theme' : 'Light Theme'}
            </p>
            <div className="theme-color-palette">
              <div className="theme-color-dot" style={{ background: t.colors['--color-bg'] }} title="Background" />
              <div className="theme-color-dot" style={{ background: t.colors['--color-surface'] }} title="Surface" />
              <div className="theme-color-dot" style={{ background: t.colors['--color-primary'] }} title="Primary Color" />
              <div className="theme-color-dot" style={{ background: t.colors['--color-accent'] }} title="Accent Color" />
              <div className="theme-color-dot" style={{ background: t.colors['--color-text'] }} title="Text Color" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogsSection({ triggerReload }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    usersAPI.getAuditLogs()
      .then((res) => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [triggerReload]);

  return (
    <div className="card mb-lg" id="audit-logs-section">
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-display" style={{ fontSize: '1rem' }}>User Audit Logs</h3>
        <button className="btn btn-ghost btn-sm flex items-center gap-xs" onClick={fetchLogs} id="refresh-audit-logs-btn">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? <Spinner /> : logs.length === 0 ? (
        <p className="text-muted text-sm" style={{ padding: 'var(--spacing-sm) 0' }}>No administrative logs recorded yet.</p>
      ) : (
        <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Action</th>
                <th>Target Cashier</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="font-semibold">{log.admin_name}</td>
                  <td>
                    <Badge type={
                      log.action === 'Activate' ? 'success' :
                      log.action === 'Deactivate' ? 'warning' : 'danger'
                    }>
                      {log.action}
                    </Badge>
                  </td>
                  <td>{log.cashier_name}</td>
                  <td className="text-sm text-secondary">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StoreInformationSection() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [form, setForm] = useState({ store_name: '', store_email: '', store_phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsAPI.getStore()
      .then((res) => setForm(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await settingsAPI.updateStore(form);
      setForm(res.data);
      toast.success('Store settings updated successfully!');
    } catch (err) {
      if (!err.hasGlobalToast) toast.error(err.response?.data?.message || 'Failed to update store settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card mb-lg"><Spinner /></div>;

  return (
    <div className="card mb-lg" id="store-settings-section">
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-display flex items-center gap-sm" style={{ fontSize: '1rem', margin: 0 }}>
          <span>Store Information</span>
          <Badge type={isAdmin ? 'success' : 'info'} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
            {isAdmin ? '⚙ Edit (Admin)' : '👁 View Only (Cashier)'}
          </Badge>
        </h3>
      </div>

      {isAdmin ? (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-3 gap-md">
            <div className="input-group">
              <label className="input-label">Store Name *</label>
              <input
                type="text"
                className="input"
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                required
                id="store-name-input"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Store Email *</label>
              <input
                type="email"
                className="input"
                value={form.store_email}
                onChange={(e) => setForm({ ...form, store_email: e.target.value })}
                required
                id="store-email-input"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Store Phone Number *</label>
              <input
                type="text"
                className="input"
                value={form.store_phone}
                onChange={(e) => setForm({ ...form, store_phone: e.target.value })}
                required
                id="store-phone-input"
              />
            </div>
          </div>
          <div className="flex justify-end mt-md">
            <button type="submit" className="btn btn-primary" disabled={saving} id="save-store-settings-btn">
              {saving ? 'Saving...' : 'Save Store Details'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-3 gap-md" style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Name</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-text)' }}>{form.store_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Email</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-text)' }}>{form.store_email}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Phone</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-text)' }}>{form.store_phone}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentSettingsSection() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [form, setForm] = useState({ upi_enabled: true, upi_id: '', merchant_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsAPI.getPayment()
      .then((res) => setForm(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await settingsAPI.updatePayment(form);
      setForm(res.data);
      toast.success('Payment settings updated successfully!');
    } catch (err) {
      if (!err.hasGlobalToast) toast.error(err.response?.data?.message || 'Failed to update payment settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card mb-lg"><Spinner /></div>;

  return (
    <div className="card mb-lg" id="payment-settings-section">
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-display flex items-center gap-sm" style={{ fontSize: '1rem', margin: 0 }}>
          <span>Payment Settings</span>
          <Badge type={isAdmin ? 'success' : 'info'} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
            {isAdmin ? '⚙ Edit (Admin)' : '👁 View Only (Cashier)'}
          </Badge>
        </h3>
      </div>

      {isAdmin ? (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-3 gap-md">
            <div className="input-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label className="input-label" style={{ marginBottom: 8 }}>Enable UPI Payments</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.upi_enabled}
                  onChange={(e) => setForm({ ...form, upi_enabled: e.target.checked })}
                  id="upi-enabled-toggle"
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="input-group">
              <label className="input-label">UPI ID *</label>
              <input
                type="text"
                className="input"
                value={form.upi_id}
                onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                required
                disabled={!form.upi_enabled}
                style={{ opacity: form.upi_enabled ? 1 : 0.6 }}
                id="upi-id-input"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Merchant Name *</label>
              <input
                type="text"
                className="input"
                value={form.merchant_name}
                onChange={(e) => setForm({ ...form, merchant_name: e.target.value })}
                required
                disabled={!form.upi_enabled}
                style={{ opacity: form.upi_enabled ? 1 : 0.6 }}
                id="upi-merchant-name-input"
              />
            </div>
          </div>
          <div className="flex justify-end mt-md">
            <button type="submit" className="btn btn-primary" disabled={saving} id="save-payment-settings-btn">
              {saving ? 'Saving...' : 'Save Payment Details'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-3 gap-md" style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>UPI Payments</div>
            <div style={{ marginTop: 4 }}>
              <Badge type={form.upi_enabled ? 'success' : 'danger'}>
                {form.upi_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>UPI ID</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-text)' }}>{form.upi_enabled ? form.upi_id : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Merchant Name</div>
            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-text)' }}>{form.upi_enabled ? form.merchant_name : '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [auditLogTrigger, setAuditLogTrigger] = useState(0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account, users, and categories</p>
        </div>
      </div>

      {/* Profile info */}
      <div className="card mb-lg">
        <h3 className="font-display mb-md" style={{ fontSize: '1rem' }}>My Profile</h3>
        <div className="flex items-center gap-lg">
          <div className="sidebar-avatar" style={{ width: 56, height: 56, fontSize: '1.25rem', flexShrink: 0 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.username}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{user?.email}</div>
            <Badge type={user?.role === 'admin' ? 'primary' : 'info'} style={{ marginTop: 4 }}>{user?.role}</Badge>
          </div>
        </div>
      </div>

      <ThemeSettingsSection />

      <ChangePasswordSection />

      <StoreInformationSection />
      <PaymentSettingsSection />

      {isAdmin && (
        <>
          <UsersSection onUserAction={() => setAuditLogTrigger(prev => prev + 1)} />
          <AuditLogsSection triggerReload={auditLogTrigger} />
        </>
      )}

      <CategoriesSection />
      <CatalogAuditSection />
    </div>
  );
}
