import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const ROLES = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'hod', label: 'Head of Department (HOD)' },
  { value: 'dofa', label: 'DOFA' },
  { value: 'dofa_office', label: 'DOFA Office' },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', role: 'faculty' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.role) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await login(form.email, form.password, form.role);
      if (result.success) {
        const redirectMap = {
          hod: '/hod/dashboard',
          faculty: '/',
          dofa: '/dofa/dashboard',
          dofa_office: '/dofa-office/dashboard',
        };
        navigate(redirectMap[result.user.role] || '/');
      } else {
        setError(result.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo */}
        <div className="login-logo-section">
          <img
            src="/lnmiit-logo.png"
            alt="LNMIIT"
            className="login-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {/* <div className="login-logo-fallback">
            <div className="login-logo-text">LNMIIT<span>■■</span></div>
            <div className="login-logo-subtitle">The LNM Institute of Information Technology</div>
          </div> */}
          <h1 className="login-title">Faculty Appraisal System</h1>
          <p className="login-subtitle">Sign in to access your dashboard</p>
        </div>

        {/* Card */}
        <div className="login-card">
          <form onSubmit={handleSubmit} noValidate>

            {/* Role */}
            <div className="login-field">
              <label className="login-field-label">
                <User size={15} />
                Select Your Role
              </label>
              <select
                name="role"
                className="login-select"
                value={form.role}
                onChange={handleChange}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="login-field">
              <label className="login-field-label">
                <Mail size={15} />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                className="login-input"
                placeholder={`${form.role}@lnmiit.ac.in`}
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-field-label">
                <Lock size={15} />
                Password
              </label>
              <div className="login-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading && <span className="btn-spinner" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Forgot password */}
          <div className="login-forgot">
            <Link to="/forgot-password">Forgot your password?</Link>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© {new Date().getFullYear()} The LNM Institute of Information Technology</p>
          <p>Faculty Appraisal System v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
