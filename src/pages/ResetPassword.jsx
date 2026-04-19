import React, { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import './LoginPage.css';

const API_BASE = `http://${window.location.hostname}:5001/api`;

const ResetPassword = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || '';
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match'); return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: form.password })
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || 'Reset failed. The link may have expired.');
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrength = (pwd) => {
    if (!pwd) return { label: '', color: '#e2e8f0', width: '0%' };
    if (pwd.length < 6) return { label: 'Too short', color: '#fc8181', width: '25%' };
    if (pwd.length < 8) return { label: 'Weak', color: '#f6ad55', width: '50%' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'Strong', color: '#68d391', width: '100%' };
    return { label: 'Good', color: '#63b3ed', width: '75%' };
  };

  const strength = getStrength(form.password);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo-section">
          <div className="login-logo-fallback">
            <div className="login-logo-text">LNMIIT<span>■■</span></div>
            <div className="login-logo-subtitle">The LNM Institute of Information Technology</div>
          </div>
          <h1 className="login-title">Set New Password</h1>
          <p className="login-subtitle">
            Create a strong password for your account
            {role && <> (<strong>{role.toUpperCase()}</strong>)</>}
          </p>
        </div>

        <div className="login-card">
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={48} color="#38a169" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px' }}>
                Password Set Successfully!
              </h3>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                Redirecting to login page...
              </p>
              {role && (
                <p style={{ fontSize: '13px', color: '#4a5568', marginBottom: '12px' }}>
                  Remember to select <strong>{role.toUpperCase()}</strong> as your role when logging in.
                </p>
              )}
              <Link to="/login" style={{ fontSize: '14px', color: '#2c5282', fontWeight: '500' }}>
                Go to Login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-field-label">
                  <Lock size={15} />
                  New Password
                </label>
                <div className="login-password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError(''); }}
                    autoFocus
                  />
                  <button type="button" className="login-password-toggle" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {form.password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ height: '4px', borderRadius: '2px', background: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: strength.color, fontWeight: '500' }}>{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="login-field">
                <label className="login-field-label">
                  <Lock size={15} />
                  Confirm Password
                </label>
                <div className="login-password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); setError(''); }}
                  />
                </div>
              </div>

              {error && (
                <div className="login-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading && <span className="btn-spinner" />}
                {loading ? 'Setting Password...' : 'Set Password'}
              </button>
            </form>
          )}
        </div>

        <div className="login-footer">
          <p>© {new Date().getFullYear()} The LNM Institute of Information Technology</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
