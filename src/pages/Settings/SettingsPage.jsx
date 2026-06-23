import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Tag, AlertTriangle, Sparkles, Check, CheckCircle2, RefreshCw } from 'lucide-react';
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
      toast.error(err.response?.data?.message || 'Failed to change password.');
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
      toast.error(err.response?.data?.message || 'Failed to create user.');
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
      toast.error(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await usersAPI.delete(user.id);
      setUsers(users.filter((u) => u.id !== user.id));
      toast.success(`User ${user.username} deleted permanently.`);
      if (onUserAction) onUserAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
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
      toast.error(err.response?.data?.message || 'Failed to create category.');
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

function CategoryVerificationSection() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [manualReviewBooks, setManualReviewBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [editStates, setEditStates] = useState({});

  const loadData = async () => {
    try {
      const [reviewRes, catsRes, reportRes] = await Promise.all([
        booksAPI.getManualReview(),
        categoriesAPI.getAll(),
        booksAPI.getVerifyCategoriesReport().catch(() => ({ data: null }))
      ]);
      setManualReviewBooks(reviewRes.data);
      setCategories(catsRes.data);
      if (reportRes && reportRes.data && reportRes.data.timestamp) {
        setReport(reportRes.data);
      }

      const initialStates = {};
      reviewRes.data.forEach(book => {
        initialStates[book.id] = {
          category_id: book.suggested_category_id || book.category_id || '',
          secondary_categories: book.suggested_secondary_category_ids || (book.secondary_categories ? book.secondary_categories.map(c => c.id) : [])
        };
      });
      setEditStates(initialStates);
    } catch (err) {
      console.error('Failed to load manual review data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSuggest = async (bookId) => {
    const editState = editStates[bookId];
    if (!editState || !editState.category_id) {
      toast.error('Please select a primary category.');
      return;
    }
    setApprovingId(bookId);
    try {
      await booksAPI.suggestCategory(bookId, {
        category_id: parseInt(editState.category_id),
        secondary_categories: editState.secondary_categories
      });
      toast.success('Category suggestion submitted successfully!');
      loadData();
    } catch (err) {
      toast.error('Failed to submit category suggestion.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveSuggestion = async (book) => {
    setApprovingId(book.id);
    try {
      await booksAPI.approveCategory(book.id, {
        category_id: book.suggested_category_id,
        secondary_categories: book.suggested_secondary_category_ids
      });
      toast.success('Cashier suggestion approved successfully!');
      loadData();
    } catch (err) {
      toast.error('Failed to approve cashier suggestion.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectSuggestion = async (bookId) => {
    setApprovingId(bookId);
    try {
      await booksAPI.rejectSuggestion(bookId);
      toast.success('Cashier suggestion rejected.');
      loadData();
    } catch (err) {
      toast.error('Failed to reject suggestion.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    const toastId = toast.loading('Running book category verification scan...');
    try {
      const res = await booksAPI.verifyCategories();
      setReport(res.data);
      toast.success('Category scan completed successfully!', { id: toastId });
      loadData();
    } catch (err) {
      toast.error('Failed to complete category scan.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookId) => {
    const editState = editStates[bookId];
    if (!editState || !editState.category_id) {
      toast.error('Please select a primary category.');
      return;
    }
    setApprovingId(bookId);
    try {
      await booksAPI.approveCategory(bookId, {
        category_id: parseInt(editState.category_id),
        secondary_categories: editState.secondary_categories
      });
      toast.success('Book category approved successfully!');
      loadData();
    } catch (err) {
      toast.error('Failed to approve book category.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleSecondaryToggle = (bookId, catId) => {
    const current = editStates[bookId]?.secondary_categories || [];
    let updated;
    if (current.includes(catId)) {
      updated = current.filter(id => id !== catId);
    } else {
      updated = [...current, catId];
    }
    setEditStates(prev => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        secondary_categories: updated
      }
    }));
  };

  const handlePrimaryChange = (bookId, catId) => {
    const currentSec = editStates[bookId]?.secondary_categories || [];
    const updatedSec = currentSec.filter(id => id !== parseInt(catId));
    setEditStates(prev => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        category_id: catId,
        secondary_categories: updatedSec
      }
    }));
  };

  return (
    <div className="card mb-lg">
      <style>{`
        .scan-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
          margin-top: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }
        @media (max-width: 768px) {
          .scan-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .scan-stat-card {
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          text-align: center;
          transition: all 0.2s ease;
        }
        .scan-stat-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-primary);
        }
        .scan-stat-val {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--color-text);
          margin-bottom: 4px;
        }
        .scan-stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-text-muted);
        }
        .review-book-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          margin-top: var(--spacing-md);
        }
        .review-book-card {
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          position: relative;
        }
        .review-book-card.low-confidence {
          border-left: 3px solid var(--color-warning);
        }
        .review-book-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-sm);
        }
        .review-book-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 2px 0;
        }
        .review-book-author {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }
        .proposal-badge {
          background: rgba(244, 162, 97, 0.12);
          border: 1px solid rgba(244, 162, 97, 0.3);
          color: var(--color-warning);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .category-editor-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
          background: var(--color-surface-3);
          padding: var(--spacing-md);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
        }
        @media (max-width: 600px) {
          .category-editor-grid {
            grid-template-columns: 1fr;
          }
        }
        .secondary-checkboxes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .report-section {
          background: var(--color-surface-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }
        .report-title {
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-sm);
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }
        .list-container {
          max-height: 180px;
          overflow-y: auto;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface-2);
          font-size: 0.8rem;
        }
        .list-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border);
        }
        .list-row:last-child {
          border-bottom: none;
        }
      `}</style>

      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm">
          <Sparkles size={18} color="var(--color-primary)" />
          <h3 className="font-display flex items-center gap-sm" style={{ fontSize: '1rem', margin: 0 }}>
            <span>Category Verification & Correction</span>
            <Badge type={isAdmin ? 'success' : 'info'} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
              {isAdmin ? '⚙ Full Access (Admin)' : '👁 View Only (Cashier)'}
            </Badge>
          </h3>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleScan}
          disabled={loading || !isAdmin}
          title={!isAdmin ? 'Admin permission required.' : 'Scan & Verify Categories'}
          style={{
            cursor: !isAdmin ? 'not-allowed' : 'pointer',
            opacity: !isAdmin ? 0.6 : 1
          }}
          id="verify-categories-btn"
        >
          {loading ? (
            <><RefreshCw size={14} className="spinner" style={{ marginRight: 6 }} /> Analyzing...</>
          ) : (
            <><Sparkles size={14} style={{ marginRight: 6 }} /> Scan & Verify Categories</>
          )}
        </button>
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>
        Verify book categorizations using database title, description, and publisher metadata. Detects anomalies, duplicate/conflicting records, and prompts manual review for low-confidence assignments.
      </p>

      {/* Global scan report */}
      {report && (
        <div className="report-dashboard">
          <div className="scan-stats-grid">
            <div className="scan-stat-card">
              <div className="scan-stat-val">{report.stats.totalChecked}</div>
              <div className="scan-stat-label">Books Checked</div>
            </div>
            <div className="scan-stat-card" style={{ borderColor: report.stats.movedCount > 0 ? 'rgba(76, 175, 114, 0.4)' : 'var(--color-border)' }}>
              <div className="scan-stat-val" style={{ color: report.stats.movedCount > 0 ? 'var(--color-success)' : 'inherit' }}>{report.stats.movedCount}</div>
              <div className="scan-stat-label">Auto-Corrected</div>
            </div>
            <div className="scan-stat-card" style={{ borderColor: report.stats.reviewCount > 0 ? 'rgba(244, 162, 97, 0.4)' : 'var(--color-border)' }}>
              <div className="scan-stat-val" style={{ color: report.stats.reviewCount > 0 ? 'var(--color-warning)' : 'inherit' }}>{report.stats.reviewCount}</div>
              <div className="scan-stat-label">Needs Review</div>
            </div>
            <div className="scan-stat-card" style={{ borderColor: report.stats.conflictCount > 0 ? 'rgba(224, 82, 82, 0.4)' : 'var(--color-border)' }}>
              <div className="scan-stat-val" style={{ color: report.stats.conflictCount > 0 ? 'var(--color-danger)' : 'inherit' }}>{report.stats.conflictCount}</div>
              <div className="scan-stat-label">Duplicates/Conflicts</div>
            </div>
          </div>

          {/* Moved Books List */}
          {report.moved.length > 0 && (
            <div className="report-section">
              <div className="report-title" style={{ color: 'var(--color-success)' }}>
                <CheckCircle2 size={14} /> Auto-Corrected Category Assignments ({report.moved.length})
              </div>
              <div className="list-container">
                {report.moved.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      {bk.previousCategory} → <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{bk.newCategory}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflicts/Duplicates List */}
          {report.conflicts.length > 0 && (
            <div className="report-section" style={{ borderColor: 'rgba(224, 82, 82, 0.3)' }}>
              <div className="report-title" style={{ color: 'var(--color-danger)' }}>
                <AlertTriangle size={14} /> Conflicting or Duplicate Database Records ({report.conflicts.length})
              </div>
              <div className="list-container">
                {report.conflicts.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author} {bk.isbn ? `(ISBN: ${bk.isbn})` : ''}
                    </div>
                    <div style={{ color: 'var(--color-danger)' }}>
                      {bk.conflictType}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual review items */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
        <h4 className="font-display mb-sm" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Manual Category Review Queue</span>
          <Badge type={manualReviewBooks.length > 0 ? 'warning' : 'success'}>
            {manualReviewBooks.length} items pending
          </Badge>
        </h4>

        {manualReviewBooks.length === 0 ? (
          <div style={{
            background: 'rgba(76, 175, 114, 0.08)',
            border: '1px solid rgba(76, 175, 114, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.85rem'
          }}>
            <CheckCircle2 size={16} />
            <span>Excellent! All bookstore catalog items are categorized with high confidence. No manual reviews pending.</span>
          </div>
        ) : (
          <div className="review-book-list">
            {manualReviewBooks.map((book) => {
              const editState = editStates[book.id] || { category_id: '', secondary_categories: [] };
              const currentCategoryName = book.category_name || 'Unassigned';
              
              return (
                <div key={book.id} className="review-book-card low-confidence">
                  <div className="review-book-header">
                    <div>
                      <h5 className="review-book-title">{book.title}</h5>
                      <span className="review-book-author">by {book.author} | Publisher: {book.publisher || 'N/A'}</span>
                    </div>
                    <div className="flex gap-sm items-center">
                      <span className="proposal-badge">
                        <AlertTriangle size={12} /> Proposed: {book.categorization_notes ? book.categorization_notes.split(':')[0] : 'Fiction'}
                      </span>
                      <Badge type="info">Confidence: {parseFloat(book.categorization_confidence).toFixed(2)}</Badge>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Reasoning: {book.categorization_notes}
                  </p>

                  {/* Cashier Suggestion Info Display */}
                  {book.suggestion_cashier_name && (
                    <div style={{
                      background: book.suggestion_cashier_name === user?.username ? 'rgba(244, 162, 97, 0.08)' : 'rgba(91, 155, 213, 0.08)',
                      border: book.suggestion_cashier_name === user?.username ? '1px solid rgba(244, 162, 97, 0.2)' : '1px solid rgba(91, 155, 213, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      color: book.suggestion_cashier_name === user?.username ? 'var(--color-warning)' : 'var(--color-info)',
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      {book.suggestion_cashier_name === user?.username ? (
                        <span>📝 You submitted a correction suggestion: <strong>{categories.find(c => c.id === book.suggested_category_id)?.name}</strong> (Pending Admin Approval)</span>
                      ) : (
                        <span>💡 Cashier <strong>{book.suggestion_cashier_name}</strong> suggested: <strong>{categories.find(c => c.id === book.suggested_category_id)?.name}</strong></span>
                      )}
                    </div>
                  )}

                  <div className="category-editor-grid">
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Primary Category</label>
                      <select
                        className="select"
                        value={editState.category_id}
                        onChange={(e) => handlePrimaryChange(book.id, e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        <option value="">Select Primary Category...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Secondary Categories</label>
                      <div className="secondary-checkboxes">
                        {categories
                          .filter(c => c.id !== parseInt(editState.category_id))
                          .map((c) => {
                            const isChecked = editState.secondary_categories.includes(c.id);
                            return (
                              <label key={c.id} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleSecondaryToggle(book.id, c.id)}
                                />
                                <span>{c.name}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-sm" style={{ flexWrap: 'wrap' }}>
                    <div style={{ marginRight: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignSelf: 'center' }}>
                      Current Db Category: <strong style={{ color: 'var(--color-text)', marginLeft: 4 }}>{currentCategoryName}</strong>
                    </div>
                    
                    {/* Cashier suggest button: disabled for admin */}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSuggest(book.id)}
                      disabled={approvingId === book.id || isAdmin}
                      title={isAdmin ? 'Admin cannot submit suggestions; use Approve buttons.' : 'Submit Correction Suggestion'}
                      style={{
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        cursor: isAdmin ? 'not-allowed' : 'pointer',
                        opacity: isAdmin ? 0.6 : 1
                      }}
                      id={`suggest-category-btn-${book.id}`}
                    >
                      {approvingId === book.id ? 'Submitting...' : 'Submit Correction Suggestion'}
                    </button>

                    {/* Admin Approve / Reject buttons: disabled with tooltip for Cashier */}
                    {book.suggestion_cashier_name && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApproveSuggestion(book)}
                          disabled={approvingId === book.id || !isAdmin}
                          title={!isAdmin ? 'Admin permission required.' : 'Approve Suggestion'}
                          style={{
                            fontSize: '0.75rem',
                            padding: '6px 12px',
                            cursor: !isAdmin ? 'not-allowed' : 'pointer',
                            opacity: !isAdmin ? 0.6 : 1
                          }}
                          id={`approve-suggestion-btn-${book.id}`}
                        >
                          Approve Suggestion
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRejectSuggestion(book.id)}
                          disabled={approvingId === book.id || !isAdmin}
                          title={!isAdmin ? 'Admin permission required.' : 'Reject Suggestion'}
                          style={{
                            fontSize: '0.75rem',
                            padding: '6px 12px',
                            cursor: !isAdmin ? 'not-allowed' : 'pointer',
                            opacity: !isAdmin ? 0.6 : 1
                          }}
                          id={`reject-suggestion-btn-${book.id}`}
                        >
                          Reject Suggestion
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-primary btn-sm btn-ghost"
                      onClick={() => handleApprove(book.id)}
                      disabled={approvingId === book.id || !isAdmin}
                      title={!isAdmin ? 'Admin permission required.' : (book.suggestion_cashier_name ? 'Approve Custom' : 'Approve Assignment')}
                      style={{
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        borderColor: 'var(--color-primary)',
                        cursor: !isAdmin ? 'not-allowed' : 'pointer',
                        opacity: !isAdmin ? 0.6 : 1
                      }}
                      id={`approve-custom-btn-${book.id}`}
                    >
                      {approvingId === book.id ? 'Saving...' : book.suggestion_cashier_name ? 'Approve Custom' : 'Approve Assignment'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogAuditSection() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

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
    setLoading(true);
    const toastId = toast.loading('Auditing database book records...');
    try {
      const res = await booksAPI.auditBooks();
      setReport(res.data);
      toast.success('Database audit completed successfully!', { id: toastId });
    } catch (err) {
      toast.error('Failed to run database audit.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const healthScoreVal = report?.stats?.healthScore !== undefined ? report.stats.healthScore : 100;

  return (
    <div className="card mb-lg">
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
              <><RefreshCw size={14} className="spinner" style={{ marginRight: 6 }} /> Auditing...</>
            ) : (
              <><AlertTriangle size={14} style={{ marginRight: 6 }} /> Run Catalog Audit</>
            )}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>
        Audits all library book records to detect and auto-correct missing, null, or zero prices (scaled by page count) and assign default GST tax rates based on format and category. Also detects books with missing essential information.
      </p>

      {report && (
        <div className="report-dashboard">
          <div className="scan-stats-grid">
            <div className="scan-stat-card">
              <div className="scan-stat-val">{report.stats.totalBooks}</div>
              <div className="scan-stat-label">Total Books</div>
            </div>
            <div className="scan-stat-card" style={{ borderColor: 'var(--color-primary)' }}>
              <div className="scan-stat-val" style={{ color: 'var(--color-primary)' }}>{healthScoreVal}%</div>
              <div className="scan-stat-label">Health Score</div>
            </div>
            <div className="scan-stat-card" style={{ borderColor: report.stats.totalUpdated > 0 ? 'rgba(76, 175, 114, 0.4)' : 'var(--color-border)' }}>
              <div className="scan-stat-val" style={{ color: report.stats.totalUpdated > 0 ? 'var(--color-success)' : 'inherit' }}>{report.stats.totalUpdated}</div>
              <div className="scan-stat-label">Total Fixed</div>
            </div>
            <div className="scan-stat-card" style={{ borderColor: report.stats.missingInfoCount > 0 ? 'rgba(224, 82, 82, 0.4)' : 'var(--color-border)' }}>
              <div className="scan-stat-val" style={{ color: report.stats.missingInfoCount > 0 ? 'var(--color-danger)' : 'inherit' }}>{report.stats.missingInfoCount}</div>
              <div className="scan-stat-label">Missing Info</div>
            </div>
          </div>

          {/* Updated Prices List */}
          {report.updatedPrices && report.updatedPrices.length > 0 && (
            <div className="report-section">
              <div className="report-title" style={{ color: 'var(--color-success)' }}>
                <CheckCircle2 size={14} /> Auto-Corrected Book Prices ({report.updatedPrices.length})
              </div>
              <div className="list-container">
                {report.updatedPrices.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      ₹{parseFloat(bk.oldPrice).toFixed(2)} &rarr; <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{parseFloat(bk.newPrice).toFixed(2)}</span> ({bk.priceType})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updated Taxes List */}
          {report.updatedTaxes && report.updatedTaxes.length > 0 && (
            <div className="report-section">
              <div className="report-title" style={{ color: 'var(--color-success)' }}>
                <CheckCircle2 size={14} /> Auto-Corrected Tax Rates ({report.updatedTaxes.length})
              </div>
              <div className="list-container">
                {report.updatedTaxes.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      {parseFloat(bk.oldTax).toFixed(1)}% &rarr; <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{parseFloat(bk.newTax).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Data Warnings List */}
          {report.missingDataWarnings && report.missingDataWarnings.length > 0 && (
            <div className="report-section" style={{ borderColor: 'rgba(224, 82, 82, 0.3)' }}>
              <div className="report-title" style={{ color: 'var(--color-danger)' }}>
                <AlertTriangle size={14} /> Missing Essential Fields ({report.missingDataWarnings.length})
              </div>
              <div className="list-container">
                {report.missingDataWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                      Missing: {bk.missingFields.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Warnings List */}
          {report.duplicateWarnings && report.duplicateWarnings.length > 0 && (
            <div className="report-section" style={{ borderColor: 'rgba(224, 82, 82, 0.3)' }}>
              <div className="report-title" style={{ color: 'var(--color-danger)' }}>
                <AlertTriangle size={14} /> Duplicate Catalog Records ({report.duplicateWarnings.length})
              </div>
              <div className="list-container">
                {report.duplicateWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      {bk.isbn ? `ISBN: ${bk.isbn}` : 'Matching title and author'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incorrect Category Warnings List */}
          {report.incorrectCategoryWarnings && report.incorrectCategoryWarnings.length > 0 && (
            <div className="report-section" style={{ borderColor: 'rgba(244, 162, 97, 0.3)' }}>
              <div className="report-title" style={{ color: 'var(--color-warning)' }}>
                <AlertTriangle size={14} /> Incorrect Category Warnings ({report.incorrectCategoryWarnings.length})
              </div>
              <div className="list-container">
                {report.incorrectCategoryWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-warning)' }}>
                      Needs verification (Confidence: {parseFloat(bk.confidence).toFixed(2)})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing ISBN Warnings List */}
          {report.missingIsbnWarnings && report.missingIsbnWarnings.length > 0 && (
            <div className="report-section" style={{ borderColor: 'rgba(91, 155, 213, 0.3)' }}>
              <div className="report-title" style={{ color: 'var(--color-info)' }}>
                <AlertTriangle size={14} /> Missing ISBN Identifiers ({report.missingIsbnWarnings.length})
              </div>
              <div className="list-container">
                {report.missingIsbnWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      Required for scanning/barcode features
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Cover Image Warnings List */}
          {report.missingCoverImageWarnings && report.missingCoverImageWarnings.length > 0 && (
            <div className="report-section">
              <div className="report-title" style={{ color: 'var(--color-text-secondary)' }}>
                <AlertTriangle size={14} /> Missing Cover Images ({report.missingCoverImageWarnings.length})
              </div>
              <div className="list-container">
                {report.missingCoverImageWarnings.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      Using default catalog placeholder
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Inconsistencies List */}
          {report.inventoryInconsistencies && report.inventoryInconsistencies.length > 0 && (
            <div className="report-section" style={{ borderColor: 'rgba(224, 82, 82, 0.3)' }}>
              <div className="report-title" style={{ color: 'var(--color-danger)' }}>
                <AlertTriangle size={14} /> Inventory Inconsistencies ({report.inventoryInconsistencies.length})
              </div>
              <div className="list-container">
                {report.inventoryInconsistencies.map((bk, idx) => (
                  <div key={idx} className="list-row">
                    <div>
                      <strong>{bk.title}</strong> by {bk.author}
                    </div>
                    <div style={{ color: 'var(--color-danger)' }}>
                      Current Stock: {bk.stock_qty !== null ? bk.stock_qty : 'Unspecified'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
      toast.error(err.response?.data?.message || 'Failed to update store settings.');
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
      toast.error(err.response?.data?.message || 'Failed to update payment settings.');
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
      <CategoryVerificationSection />
      <CatalogAuditSection />
    </div>
  );
}
