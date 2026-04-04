import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import './LoginPage.css';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo-section">
          <div className="login-logo-fallback">
            <div className="login-logo-text">LNMIIT<span>■■</span></div>
            <div className="login-logo-subtitle">The LNM Institute of Information Technology</div>
          </div>
          <h1 className="login-title">Reset Your Password</h1>
          <p className="login-subtitle">Enter your email to receive a reset link</p>
        </div>

        <div className="login-card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={48} color="#38a169" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px' }}>
                Check your inbox!
              </h3>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '24px' }}>
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: '#2c5282', fontSize: '14px', fontWeight: '500', textDecoration: 'none'
              }}>
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-field-label">
                  <Mail size={15} />
                  Email Address
                </label>
                <input
                  type="email"
                  className="login-input"
                  placeholder="your.email@lnmiit.ac.in"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>

              {error && (
                <div className="login-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading && <span className="btn-spinner" />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="login-forgot" style={{ marginTop: '16px' }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#4a5568', textDecoration: 'none' }}>
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
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

export default ForgotPassword;
