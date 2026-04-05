import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Building2, Briefcase, Calendar, Hash,
  CheckCircle, ChevronRight, AlertCircle, LogOut, X, Key
} from 'lucide-react';
import './Onboarding.css';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Visiting Faculty'];
const SALUTATIONS = ['Prof', 'Dr', 'Mr', 'Ms'];
const EMPLOYMENT_TYPES = [{ value: 'fixed', label: 'Fixed' }, { value: 'contractual', label: 'Contractual' }];

const Onboarding = () => {
  const { user, token, needsOnboarding, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordPopup, setShowPasswordPopup] = useState(true);

  // Faculty form state
  const [facultyForm, setFacultyForm] = useState({
    salutation: 'Dr',
    name: '',
    designation: '',
    employee_id: '',
    employment_type: 'fixed',
    date_of_joining: '',
    department_id: ''
  });

  // HOD form state
  const [hodForm, setHodForm] = useState({
    salutation: 'Dr',
    name: '',
    dept_name: '',
    dept_code: ''
  });

  // If user already completed onboarding, send them to dashboard
  useEffect(() => {
    if (!needsOnboarding && user) {
      redirectToDashboard();
    }
  }, [needsOnboarding, user]);

  useEffect(() => {
    // Load departments for faculty selection
    fetch(`${API_BASE}/register/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setDepartments(d.data); })
      .catch(() => {});
  }, [token]);

  const redirectToDashboard = () => {
    const map = {
      faculty: '/',
      hod: '/hod/dashboard',
      dofa: '/dofa/dashboard',
      dofa_office: '/dofa-office/dashboard'
    };
    navigate(map[user?.role] || '/', { replace: true });
  };

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (!facultyForm.name.trim()) { setError('Full name is required'); return; }
    if (!facultyForm.department_id) { setError('Please select your department'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/register/onboarding`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyForm)
      });
      const data = await res.json();
      if (data.success) {
        await refreshUser();
        redirectToDashboard();
      } else {
        setError(data.message || 'Failed to save profile');
      }
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHodSubmit = async (e) => {
    e.preventDefault();
    if (!hodForm.name.trim()) { setError('Your name is required'); return; }
    if (!hodForm.dept_name.trim()) { setError('Department name is required'); return; }
    if (!hodForm.dept_code.trim()) { setError('Department code is required'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/register/onboarding`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(hodForm)
      });
      const data = await res.json();
      if (data.success) {
        await refreshUser();
        redirectToDashboard();
      } else {
        setError(data.message || 'Failed to save profile');
      }
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFaculty = user?.role === 'faculty';
  const isHod = user?.role === 'hod';

  return (
    <div className="onboarding-root">
      {/* Background decoration */}
      <div className="onboarding-bg" />

      {/* First-time Password Reminder Popup */}
      {showPasswordPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: 20, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px',
            maxWidth: 500, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <button 
              onClick={() => setShowPasswordPopup(false)}
              style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={24} />
            </button>
            
            <div style={{
              width: 80, height: 80, background: '#eff6ff', color: '#1e40af',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Key size={40} />
            </div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              Account Security Notice
            </h2>
            
            <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 32 }}>
              Okay now change your password first by going into account settings and then proceed for your security.
            </p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/settings')}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #1e40af, #2563eb)',
                  color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                Go to Settings
              </button>
              <button
                onClick={() => setShowPasswordPopup(false)}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: '1px solid #e2e8f0',
                  background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '1rem'
                }}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="onboarding-card">
        {/* Header */}
        <div className="onboarding-header">
          <img
            src="https://lnmiit.ac.in/wp-content/uploads/2023/07/cropped-LNMIIT-Logo-Transperant-Background-e1699342125845.png"
            alt="LNMIIT"
            className="onboarding-logo"
          />
          <div className="onboarding-welcome-badge">
            <CheckCircle size={14} />
            <span>Account Activated</span>
          </div>
          <h1 className="onboarding-title">Complete Your Profile</h1>
          <p className="onboarding-subtitle">
            Welcome to the LNMIIT Faculty Appraisal System!<br />
            Please fill in your details to get started.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="onboarding-steps">
          <div className="onboarding-step done"><span>1</span> Login</div>
          <div className="onboarding-step-line done" />
          <div className="onboarding-step active"><span>2</span> Profile</div>
          <div className="onboarding-step-line" />
          <div className="onboarding-step"><span>3</span> Dashboard</div>
        </div>

        {/* Error */}
        {error && (
          <div className="onboarding-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* ── Faculty Form ── */}
        {isFaculty && (
          <form className="onboarding-form" onSubmit={handleFacultySubmit}>
            {/* Salutation + Name */}
            <div className="ob-field-group">
              <div className="ob-field ob-field--narrow">
                <label className="ob-label">Salutation</label>
                <select className="ob-select" value={facultyForm.salutation}
                  onChange={e => setFacultyForm(p => ({ ...p, salutation: e.target.value }))}>
                  {SALUTATIONS.map(s => <option key={s} value={s}>{s}.</option>)}
                </select>
              </div>
              <div className="ob-field ob-field--wide">
                <label className="ob-label">Full Name <span>*</span></label>
                <div className="ob-input-wrap">
                  <User size={15} className="ob-icon" />
                  <input className="ob-input ob-input--icon" placeholder="Your full name"
                    value={facultyForm.name}
                    onChange={e => setFacultyForm(p => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="ob-field">
              <label className="ob-label">Email Address</label>
              <div className="ob-input-wrap">
                <input className="ob-input ob-readonly" value={user?.email || ''} readOnly />
              </div>
            </div>

            {/* Designation */}
            <div className="ob-field">
              <label className="ob-label">Designation</label>
              <select className="ob-select ob-select--full" value={facultyForm.designation}
                onChange={e => setFacultyForm(p => ({ ...p, designation: e.target.value }))}>
                <option value="">Select designation...</option>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Employee ID + Employment Type */}
            <div className="ob-field-group">
              <div className="ob-field">
                <label className="ob-label">Employee ID</label>
                <div className="ob-input-wrap">
                  <Hash size={15} className="ob-icon" />
                  <input className="ob-input ob-input--icon" placeholder="e.g. FAC2024001"
                    value={facultyForm.employee_id}
                    onChange={e => setFacultyForm(p => ({ ...p, employee_id: e.target.value }))} />
                </div>
              </div>
              <div className="ob-field">
                <label className="ob-label">Employment Type</label>
                <select className="ob-select ob-select--full" value={facultyForm.employment_type}
                  onChange={e => setFacultyForm(p => ({ ...p, employment_type: e.target.value }))}>
                  {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Date of Joining + Department */}
            <div className="ob-field-group">
              <div className="ob-field">
                <label className="ob-label">Date of Joining</label>
                <div className="ob-input-wrap">
                  <Calendar size={15} className="ob-icon" />
                  <input className="ob-input ob-input--icon" type="date"
                    value={facultyForm.date_of_joining}
                    onChange={e => setFacultyForm(p => ({ ...p, date_of_joining: e.target.value }))} />
                </div>
              </div>
              <div className="ob-field">
                <label className="ob-label">Department <span>*</span></label>
                <select className="ob-select ob-select--full" value={facultyForm.department_id}
                  onChange={e => setFacultyForm(p => ({ ...p, department_id: e.target.value }))}>
                  <option value="">Select department...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="ob-submit" disabled={submitting}>
              {submitting ? (
                <><span className="ob-spinner" />Saving Profile...</>
              ) : (
                <>Complete Setup <ChevronRight size={16} /></>
              )}
            </button>
          </form>
        )}

        {/* ── HOD Form ── */}
        {isHod && (
          <form className="onboarding-form" onSubmit={handleHodSubmit}>
            {/* Salutation + Name */}
            <div className="ob-field-group">
              <div className="ob-field ob-field--narrow">
                <label className="ob-label">Salutation</label>
                <select className="ob-select" value={hodForm.salutation}
                  onChange={e => setHodForm(p => ({ ...p, salutation: e.target.value }))}>
                  {SALUTATIONS.map(s => <option key={s} value={s}>{s}.</option>)}
                </select>
              </div>
              <div className="ob-field ob-field--wide">
                <label className="ob-label">HOD Full Name <span>*</span></label>
                <div className="ob-input-wrap">
                  <User size={15} className="ob-icon" />
                  <input className="ob-input ob-input--icon" placeholder="Your full name"
                    value={hodForm.name}
                    onChange={e => setHodForm(p => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="ob-field">
              <label className="ob-label">HOD Email</label>
              <input className="ob-input ob-readonly" value={user?.email || ''} readOnly />
            </div>

            {/* Dept Name + Dept Code */}
            <div className="ob-field">
              <label className="ob-label">Department Name <span>*</span></label>
              <div className="ob-input-wrap">
                <Building2 size={15} className="ob-icon" />
                <input className="ob-input ob-input--icon"
                  placeholder="e.g. Computer Science & Engineering"
                  value={hodForm.dept_name}
                  onChange={e => setHodForm(p => ({ ...p, dept_name: e.target.value }))} />
              </div>
            </div>

            <div className="ob-field">
              <label className="ob-label">Department Code <span>*</span></label>
              <div className="ob-input-wrap">
                <Hash size={15} className="ob-icon" />
                <input className="ob-input ob-input--icon" placeholder="e.g. CSE"
                  value={hodForm.dept_code}
                  onChange={e => setHodForm(p => ({ ...p, dept_code: e.target.value.toUpperCase() }))} />
              </div>
              <p className="ob-hint">This code uniquely identifies your department in the system.</p>
            </div>

            <button type="submit" className="ob-submit" disabled={submitting}>
              {submitting ? (
                <><span className="ob-spinner" />Saving Profile...</>
              ) : (
                <>Complete Setup <ChevronRight size={16} /></>
              )}
            </button>
          </form>
        )}

        {/* Logout link */}
        <div className="onboarding-footer">
          <button className="ob-logout" onClick={logout}>
            <LogOut size={13} /> Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
