import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BookOpen } from 'lucide-react';
import { authAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Debug logging
    console.log('[Login] Role:', selectedRole);
    console.log('[Login] Email:', form.email);
    console.log('[Login] Password:', form.password);

    try {
      const res = await authAPI.login(form);
      const { user, token } = res.data;

      console.log('[Login] Success — server role:', user.role);

      // Warn if selected role doesn't match server role
      if (user.role !== selectedRole) {
        setError(`These credentials belong to a ${user.role}, not a ${selectedRole}. Redirecting…`);
      }

      login(user, token);
      toast.success(`Welcome back, ${user.username}!`);

      // Navigate based on actual role from the server
      const destination = user.role === 'cashier' ? '/cashier-dashboard' : '/admin-dashboard';
      console.log('[Login] Navigating to:', destination);
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('[Login] Error:', err.response?.data);
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setForm({ email: '', password: '' });
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* Floating book decorations */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        fontSize: '4rem', opacity: 0.05, transform: 'rotate(-15deg)',
        animation: 'float 6s ease-in-out infinite',
        userSelect: 'none'
      }}>📖</div>
      <div style={{
        position: 'absolute', bottom: '15%', right: '8%',
        fontSize: '5rem', opacity: 0.05, transform: 'rotate(10deg)',
        animation: 'float 8s ease-in-out infinite 2s',
        userSelect: 'none'
      }}>📚</div>
      <div style={{
        position: 'absolute', top: '40%', right: '3%',
        fontSize: '3rem', opacity: 0.04, transform: 'rotate(-5deg)',
        animation: 'float 7s ease-in-out infinite 1s',
        userSelect: 'none'
      }}>📕</div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-15deg); }
          50% { transform: translateY(-20px) rotate(-15deg); }
        }
        .role-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }
        .role-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: 0.01em;
          position: relative;
          overflow: hidden;
        }
        .role-btn.active {
          background: linear-gradient(135deg, #e67e22, #d35400);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 18px rgba(230, 126, 34, 0.45);
          transform: translateY(-1px);
        }
        .role-btn.inactive {
          background: var(--color-surface-2);
          border-color: var(--color-border);
          color: var(--color-text-muted);
        }
        .role-btn.inactive:hover {
          border-color: #e67e22;
          color: #e67e22;
          background: var(--color-surface-3);
        }
        .role-btn .role-icon {
          font-size: 1.1rem;
          transition: transform 0.25s ease;
        }
        .role-btn.active .role-icon {
          transform: scale(1.15);
        }
        .role-selector-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          margin-bottom: 10px;
        }
      `}</style>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <BookOpen size={32} color="white" />
          </div>
          <h1 className="login-title">BookStore POS</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {/* Role Selector */}
        <div style={{ marginBottom: 4 }}>
          <div className="role-selector-label">Select Role</div>
          <div className="role-selector">
            <button
              type="button"
              id="role-admin-btn"
              className={`role-btn ${selectedRole === 'admin' ? 'active' : 'inactive'}`}
              onClick={() => handleRoleSelect('admin')}
            >
              <span className="role-icon">👑</span>
              Admin
            </button>
            <button
              type="button"
              id="role-cashier-btn"
              className={`role-btn ${selectedRole === 'cashier' ? 'active' : 'inactive'}`}
              onClick={() => handleRoleSelect('cashier')}
            >
              <span className="role-icon">💼</span>
              Cashier
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder={selectedRole === 'admin' ? 'admin@bookstore.com' : 'cashier1@bookstore.com'}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ paddingRight: 40 }}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12,
                  background: 'none', border: 'none',
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Signing in...
              </>
            ) : (
              `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Cashier'}`
            )}
          </button>
        </form>

        <div className="login-hint">
          <p><strong>Demo Credentials:</strong></p>
          <code>Admin: admin@bookstore.com / password123</code>
          <code>Cashier: cashier1@bookstore.com / password123</code>
        </div>
      </div>
    </div>
  );
}
