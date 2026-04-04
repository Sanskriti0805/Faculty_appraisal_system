import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, Plus, X, CheckCircle, AlertCircle,
  RefreshCw, Mail, Hash, Briefcase, Calendar, Send, Loader
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DOFARegistration.css';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Visiting Faculty'];
const SALUTATIONS = ['Prof', 'Dr', 'Mr', 'Ms'];
const EMPLOYMENT_TYPES = [{ value: 'fixed', label: 'Fixed' }, { value: 'contractual', label: 'Contractual' }];

const DOFARegistration = () => {
  const { user, token } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Modal state
  const [deptModal, setDeptModal] = useState(false);
  const [facultyModal, setFacultyModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);

  // Forms
  const [deptForm, setDeptForm] = useState({ name: '', code: '', hod_email: '', hod_name: '' });
  const [facultyForm, setFacultyForm] = useState({
    salutation: 'Dr', name: '', designation: '', email: '',
    employee_id: '', employment_type: 'fixed', date_of_joining: '', department_id: ''
  });

  // Bulk invite state
  const [bulkRole, setBulkRole] = useState('faculty');
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [deptError, setDeptError] = useState('');
  const [deptSuccess, setDeptSuccess] = useState('');
  const [facError, setFacError] = useState('');
  const [facSuccess, setFacSuccess] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/register/departments`, { headers }),
        fetch(`${API_BASE}/register/users`, { headers })
      ]);
      const [deptsData, usersData] = await Promise.all([deptsRes.json(), usersRes.json()]);
      if (deptsData.success) setDepartments(deptsData.data);
      if (usersData.success) setUsers(usersData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Stats
  const facultyCount = users.filter(u => u.role === 'faculty').length;
  const hodCount = users.filter(u => u.role === 'hod').length;
  const pendingOnboarding = users.filter(u => !u.onboarding_complete).length;

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code || !deptForm.hod_email) {
      setDeptError('Name, code, and HOD email are required'); return;
    }
    setSubmitting(true); setDeptError(''); setDeptSuccess('');
    try {
      const res = await fetch(`${API_BASE}/register/department`, {
        method: 'POST', headers,
        body: JSON.stringify(deptForm)
      });
      const data = await res.json();
      if (data.success) {
        setDeptModal(false);
        setDeptForm({ name: '', code: '', hod_email: '', hod_name: '' });
        showToast('Department registered! Password setup email sent to HOD. ✅');
        loadData();
      } else {
        setDeptError(data.message);
      }
    } catch { setDeptError('Server error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (!facultyForm.name || !facultyForm.email || !facultyForm.department_id) {
      setFacError('Name, email, and department are required'); return;
    }
    setSubmitting(true); setFacError(''); setFacSuccess('');
    try {
      const res = await fetch(`${API_BASE}/register/faculty`, {
        method: 'POST', headers,
        body: JSON.stringify(facultyForm)
      });
      const data = await res.json();
      if (data.success) {
        setFacultyModal(false);
        setFacultyForm({ salutation: 'Dr', name: '', designation: '', email: '', employee_id: '', employment_type: 'fixed', date_of_joining: '', department_id: '' });
        showToast('Faculty registered! Password setup email sent. ✅');
        loadData();
      } else {
        setFacError(data.message);
      }
    } catch { setFacError('Server error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const handleBulkInvite = async () => {
    const rawEmails = bulkEmails
      .split(/[,\n]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (rawEmails.length === 0) return;

    setBulkSubmitting(true);
    setBulkResults(null);
    try {
      const res = await fetch(`${API_BASE}/register/bulk-invite`, {
        method: 'POST', headers,
        body: JSON.stringify({ role: bulkRole, emails: rawEmails })
      });
      const data = await res.json();
      if (data.success) {
        setBulkResults(data);
        showToast(data.message);
        loadData();
      } else {
        showToast(data.message || 'Bulk invite failed', 'error');
      }
    } catch {
      showToast('Server error. Please try again.', 'error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const statusColor = (status) => {
    if (status === 'sent') return '#276749';
    if (status === 'sent_no_email') return '#c05621';
    if (status === 'skipped') return '#2c5282';
    return '#c53030';
  };
  const statusBg = (status) => {
    if (status === 'sent') return '#f0fff4';
    if (status === 'sent_no_email') return '#fffaf0';
    if (status === 'skipped') return '#ebf4ff';
    return '#fff5f5';
  };

  return (
    <div className="admin-page">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? '#276749' : '#c53030',
          color: '#fff', padding: '14px 22px', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '16px'
          }}>×</button>
        </div>
      )}
      <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      <main className="admin-main">
        {/* Welcome */}
        <div className="admin-welcome">
          <h1>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Manage departments, register faculty members, and oversee the appraisal system.</p>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-icon blue"><Building2 size={22} /></div>
            <div>
              <div className="admin-stat-value">{departments.length}</div>
              <div className="admin-stat-label">Departments</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon green"><Users size={22} /></div>
            <div>
              <div className="admin-stat-value">{facultyCount}</div>
              <div className="admin-stat-label">Faculty Members</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon orange"><Briefcase size={22} /></div>
            <div>
              <div className="admin-stat-value">{hodCount}</div>
              <div className="admin-stat-label">HODs Registered</div>
            </div>
          </div>
          {pendingOnboarding > 0 && (
            <div className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: '#fff5f5', color: '#c53030' }}><Mail size={22} /></div>
              <div>
                <div className="admin-stat-value">{pendingOnboarding}</div>
                <div className="admin-stat-label">Pending Onboarding</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="admin-actions">
          <div className="admin-action-card dept" onClick={() => { setDeptModal(true); setDeptError(''); setDeptSuccess(''); }}>
            <div className="admin-action-icon"><Building2 size={26} /></div>
            <h3 className="admin-action-title">Register Department</h3>
            <p className="admin-action-desc">Add a new department and assign a Head of Department. The HOD will receive an email to set up their account.</p>
            <button className="admin-action-btn"><Plus size={15} /> Add Department</button>
          </div>

          <div className="admin-action-card faculty" onClick={() => { setFacultyModal(true); setFacError(''); setFacSuccess(''); }}>
            <div className="admin-action-icon"><Users size={26} /></div>
            <h3 className="admin-action-title">Register Faculty</h3>
            <p className="admin-action-desc">Add a new faculty member to the system. They will receive a welcome email with a link to set their password.</p>
            <button className="admin-action-btn"><Plus size={15} /> Add Faculty</button>
          </div>

          <div className="admin-action-card bulk" onClick={() => { setBulkModal(true); setBulkResults(null); setBulkEmails(''); setBulkRole('faculty'); }}>
            <div className="admin-action-icon"><Send size={26} /></div>
            <h3 className="admin-action-title">Bulk Email Invite</h3>
            <p className="admin-action-desc">Send invite emails to multiple faculty or HODs at once. Paste comma-separated emails — they'll set up their own profiles.</p>
            <button className="admin-action-btn bulk-btn"><Mail size={15} /> Send Invites</button>
          </div>
        </div>

        {/* Departments Table */}
        <div>
          <h2 className="admin-section-title"><Building2 size={20} /> Registered Departments</h2>
          <div className="admin-table-card">
            {loading ? (
              <div className="admin-empty">Loading...</div>
            ) : departments.length === 0 ? (
              <div className="admin-empty">No departments registered yet. Click "Add Department" to get started.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                    <th>HOD Name</th>
                    <th>HOD Email</th>
                    <th>Faculty Count</th>
                    <th>Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: '500' }}>{d.name}</td>
                      <td><code style={{ background: '#f0f4f8', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{d.code}</code></td>
                      <td>{d.hod_name || '—'}</td>
                      <td>{d.hod_email}</td>
                      <td>{d.faculty_count || 0}</td>
                      <td>{formatDate(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Faculty Table */}
        <div>
          <h2 className="admin-section-title"><Users size={20} /> Registered Faculty</h2>
          <div className="admin-table-card">
            {loading ? (
              <div className="admin-empty">Loading...</div>
            ) : users.filter(u => u.role === 'faculty').length === 0 ? (
              <div className="admin-empty">No faculty registered yet.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Designation</th>
                    <th>Department</th>
                    <th>Employee ID</th>
                    <th>Employment</th>
                    <th>Date of Joining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'faculty').map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '500' }}>{u.salutation ? `${u.salutation}. ` : ''}{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.designation || '—'}</td>
                      <td>{u.department_name || u.department || '—'}</td>
                      <td>{u.employee_id || '—'}</td>
                      <td>
                        {u.employment_type ? (
                          <span className={`admin-badge ${u.employment_type === 'fixed' ? 'faculty' : 'hod'}`}>
                            {u.employment_type}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{formatDate(u.date_of_joining)}</td>
                      <td>
                        {u.onboarding_complete ? (
                          <span className="admin-badge faculty">Active</span>
                        ) : (
                          <span className="admin-badge" style={{ background: '#fff5f5', color: '#c53030' }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ── Department Registration Modal ── */}
      {deptModal && (
        <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeptModal(false); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Register Department</h2>
              <button className="admin-modal-close" onClick={() => setDeptModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleDeptSubmit}>
              <div className="admin-modal-body">
                {deptError && <div className="admin-form-error"><AlertCircle size={15} />{deptError}</div>}
                {deptSuccess && <div className="admin-form-success"><CheckCircle size={15} />{deptSuccess}</div>}

                <div className="admin-form-field">
                  <label className="admin-form-label">Department Name <span>*</span></label>
                  <input className="admin-form-input" placeholder="e.g. Computer Science & Engineering" value={deptForm.name}
                    onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-field">
                    <label className="admin-form-label">Department Code <span>*</span></label>
                    <input className="admin-form-input" placeholder="e.g. CSE" value={deptForm.code}
                      onChange={e => setDeptForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-form-label">HOD Name</label>
                    <input className="admin-form-input" placeholder="Full name" value={deptForm.hod_name}
                      onChange={e => setDeptForm(p => ({ ...p, hod_name: e.target.value }))} />
                  </div>
                </div>
                <div className="admin-form-field">
                  <label className="admin-form-label">HOD Email <span>*</span></label>
                  <input className="admin-form-input" type="email" placeholder="hod@lnmiit.ac.in" value={deptForm.hod_email}
                    onChange={e => setDeptForm(p => ({ ...p, hod_email: e.target.value }))} />
                  <p style={{ fontSize: '12px', color: '#718096', margin: '5px 0 0' }}>
                    HOD will receive an email with a temporary password.
                  </p>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-cancel" onClick={() => setDeptModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-submit" disabled={submitting}>
                  {submitting && <span className="btn-spinner" style={{ borderTopColor: '#fff', width: '13px', height: '13px' }} />}
                  {submitting ? 'Registering...' : 'Register Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Faculty Registration Modal ── */}
      {facultyModal && (
        <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setFacultyModal(false); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Register Faculty</h2>
              <button className="admin-modal-close" onClick={() => setFacultyModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleFacultySubmit}>
              <div className="admin-modal-body">
                {facError && <div className="admin-form-error"><AlertCircle size={15} />{facError}</div>}
                {facSuccess && <div className="admin-form-success"><CheckCircle size={15} />{facSuccess}</div>}

                <div className="admin-form-row">
                  <div className="admin-form-field">
                    <label className="admin-form-label">Salutation</label>
                    <select className="admin-form-select" value={facultyForm.salutation}
                      onChange={e => setFacultyForm(p => ({ ...p, salutation: e.target.value }))}>
                      {SALUTATIONS.map(s => <option key={s} value={s}>{s}.</option>)}
                    </select>
                  </div>
                  <div className="admin-form-field" style={{ flex: 2 }}>
                    <label className="admin-form-label">Full Name <span>*</span></label>
                    <input className="admin-form-input" placeholder="Full name" value={facultyForm.name}
                      onChange={e => setFacultyForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Email Address <span>*</span></label>
                  <input className="admin-form-input" type="email" placeholder="faculty@lnmiit.ac.in" value={facultyForm.email}
                    onChange={e => setFacultyForm(p => ({ ...p, email: e.target.value }))} />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Designation</label>
                  <select className="admin-form-select" value={facultyForm.designation}
                    onChange={e => setFacultyForm(p => ({ ...p, designation: e.target.value }))}>
                    <option value="">Select designation...</option>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-field">
                    <label className="admin-form-label">Employee ID</label>
                    <input className="admin-form-input" placeholder="e.g. FAC2024001" value={facultyForm.employee_id}
                      onChange={e => setFacultyForm(p => ({ ...p, employee_id: e.target.value }))} />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-form-label">Employment Type</label>
                    <select className="admin-form-select" value={facultyForm.employment_type}
                      onChange={e => setFacultyForm(p => ({ ...p, employment_type: e.target.value }))}>
                      {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-field">
                    <label className="admin-form-label">Date of Joining</label>
                    <input className="admin-form-input" type="date" value={facultyForm.date_of_joining}
                      onChange={e => setFacultyForm(p => ({ ...p, date_of_joining: e.target.value }))} />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-form-label">Department <span>*</span></label>
                    <select className="admin-form-select" value={facultyForm.department_id}
                      onChange={e => setFacultyForm(p => ({ ...p, department_id: e.target.value }))}>
                      <option value="">Select department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                    </select>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: '#718096', margin: '4px 0 0' }}>
                  Faculty will receive a welcome email with a temporary password.
                </p>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-cancel" onClick={() => setFacultyModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-submit" disabled={submitting}>
                  {submitting && <span className="btn-spinner" style={{ borderTopColor: '#fff', width: '13px', height: '13px' }} />}
                  {submitting ? 'Registering...' : 'Register Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Invite Modal ── */}
      {bulkModal && (
        <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setBulkModal(false); } }}>
          <div className="admin-modal" style={{ maxWidth: '560px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Bulk Email Invite</h2>
              <button className="admin-modal-close" onClick={() => setBulkModal(false)}><X size={16} /></button>
            </div>
            <div className="admin-modal-body">

              {/* Role toggle */}
              <div className="admin-form-field">
                <label className="admin-form-label">Invite as</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[{ value: 'faculty', label: '👨‍🏫 Faculty' }, { value: 'hod', label: '🏢 HOD' }].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBulkRole(opt.value)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: `2px solid ${bulkRole === opt.value ? '#2c5282' : '#e2e8f0'}`,
                        background: bulkRole === opt.value ? '#ebf4ff' : '#f8fafc',
                        color: bulkRole === opt.value ? '#2c5282' : '#4a5568',
                        fontWeight: bulkRole === opt.value ? '600' : '400',
                        fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email textarea */}
              <div className="admin-form-field">
                <label className="admin-form-label">
                  {bulkRole === 'faculty' ? 'Faculty' : 'HOD'} Emails <span>*</span>
                </label>
                <textarea
                  className="admin-form-input"
                  rows={6}
                  placeholder={`Enter emails separated by commas or new lines:\ne.g.\njohn.doe@lnmiit.ac.in\njane.smith@lnmiit.ac.in, raj.kumar@lnmiit.ac.in`}
                  value={bulkEmails}
                  onChange={e => setBulkEmails(e.target.value)}
                  style={{ resize: 'vertical', lineHeight: '1.5', fontFamily: 'monospace, sans-serif', fontSize: '13px' }}
                />
                <p style={{ fontSize: '12px', color: '#718096', margin: '6px 0 0' }}>
                  Each recipient will receive a temporary password via email. They'll complete their profile on first login.
                </p>
              </div>

              {/* Results */}
              {bulkResults && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{
                    padding: '10px 14px', background: '#f0fff4', border: '1px solid #c6f6d5',
                    borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '12px', fontWeight: '500'
                  }}>
                    ✅ {bulkResults.message}
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {bulkResults.results.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 14px', borderBottom: i < bulkResults.results.length - 1 ? '1px solid #f0f4f8' : 'none',
                        fontSize: '13px'
                      }}>
                        <span style={{ color: '#2d3748', fontFamily: 'monospace', fontSize: '12px' }}>{r.email}</span>
                        <span style={{
                          padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                          background: statusBg(r.status), color: statusColor(r.status)
                        }}>
                          {r.status === 'sent' ? '✓ Sent' :
                           r.status === 'sent_no_email' ? '⚠ Created' :
                           r.status === 'skipped' ? '↩ Exists' :
                           r.status === 'invalid' ? '✗ Invalid' : '✗ Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-cancel" onClick={() => setBulkModal(false)}>Close</button>
              {!bulkResults && (
                <button
                  type="button"
                  className="admin-btn-submit"
                  disabled={bulkSubmitting || !bulkEmails.trim()}
                  onClick={handleBulkInvite}
                  style={{ background: 'linear-gradient(135deg, #276749, #38a169)' }}
                >
                  {bulkSubmitting ? (
                    <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending...</>
                  ) : (
                    <><Send size={14} /> Send Invites</>
                  )}
                </button>
              )}
              {bulkResults && (
                <button
                  type="button"
                  className="admin-btn-submit"
                  onClick={() => { setBulkResults(null); setBulkEmails(''); }}
                  style={{ background: 'linear-gradient(135deg, #1e3a5f, #2c5282)' }}
                >
                  Send More
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .admin-action-card.bulk::before { background: linear-gradient(90deg, #276749, #38a169); }
        .admin-action-card.bulk .admin-action-icon { background: #f0fff4; color: #276749; }
        .bulk-btn { background: #276749; color: #fff; }
      `}</style>
    </div>
  );
};

export default DOFARegistration;
