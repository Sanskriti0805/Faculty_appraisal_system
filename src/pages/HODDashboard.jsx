import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LogOut, Mail, Hash, Briefcase, Calendar, Building2, Archive, RotateCcw, Eye, Download, X, Settings, Lock, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmLogout, showConfirm } from '../utils/appDialogs';
import './HODDashboard.css';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const HODDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState([]);
  const [deptInfo, setDeptInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [archiveFaculty, setArchiveFaculty] = useState([]);

  const [showSettings, setShowSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, archiveRes] = await Promise.all([
        fetch(`${API_BASE}/register/departments`, { headers }),
        fetch(`${API_BASE}/register/archive`, { headers })
      ]);

      const deptData = await deptRes.json();
      const archiveData = await archiveRes.json();

      let effectiveDeptId = Number(user?.department_id || 0);
      let effectiveDeptInfo = null;

      if (deptData.success) {
        if (effectiveDeptId > 0) {
          effectiveDeptInfo = deptData.data.find((d) => Number(d.id) === effectiveDeptId) || null;
        }

        if (!effectiveDeptInfo && user?.department) {
          const targetDeptName = String(user.department).trim().toLowerCase();
          effectiveDeptInfo = deptData.data.find(
            (d) => String(d.name || '').trim().toLowerCase() === targetDeptName
          ) || null;
          if (effectiveDeptInfo) {
            effectiveDeptId = Number(effectiveDeptInfo.id);
          }
        }
      }

      setDeptInfo(effectiveDeptInfo);

      if (effectiveDeptId > 0) {
        const facRes = await fetch(`${API_BASE}/register/departments/${effectiveDeptId}/faculty`, { headers });
        const facData = await facRes.json();
        if (facData.success) {
          setFaculty(facData.data);
        } else {
          setFaculty([]);
        }
      } else {
        setFaculty([]);
      }

      if (archiveData.success) setArchiveFaculty(archiveData.data.faculty || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    const shouldLogout = await confirmLogout();
    if (!shouldLogout) return;

    logout();
    navigate('/login');
  };
  const formatDate = (d) => {
    if (!d) return '-';

    // Avoid timezone offset for DATE values returned as YYYY-MM-DD.
    const value = String(d);
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dt = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);

    return Number.isNaN(dt.getTime())
      ? '-'
      : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleArchiveFaculty = async (f) => {
    if (!(await showConfirm('Are you sure you want to delete this faculty?'))) return;
    try {
      const res = await fetch(`${API_BASE}/register/faculty/${f.id}/archive`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Archived by HOD' })
      });
      const data = await res.json();
      if (!data.success) window.appToast(data.message || 'Failed to archive faculty');
      loadData();
    } catch {
      window.appToast('Failed to archive faculty');
    }
  };

  const handleRestoreFaculty = async (f) => {
    if (!(await showConfirm('Are you sure you want to add this faculty back into the appraisal system?'))) return;
    try {
      const res = await fetch(`${API_BASE}/register/faculty/${f.id}/restore`, { method: 'PUT', headers });
      const data = await res.json();
      if (!data.success) window.appToast(data.message || 'Failed to restore faculty');
      loadData();
    } catch {
      window.appToast('Failed to restore faculty');
    }
  };

  const handleArchiveExport = async (format) => {
    try {
      const res = await fetch(`${API_BASE}/register/archive/export?type=faculty&format=${format}`, { headers });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faculty_archive_hod.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.appToast('Failed to export archive data');
    }
  };

  const closeSettingsModal = () => {
    setShowSettings(false);
    setSettingsMessage('');
    setSettingsError(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPassword({ current: false, new: false, confirm: false });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSettingsError(true);
      setSettingsMessage('New passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setSettingsError(true);
      setSettingsMessage('New password must be at least 6 characters.');
      return;
    }

    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (data.success) {
        setSettingsError(false);
        setSettingsMessage('Password updated successfully.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          closeSettingsModal();
        }, 1200);
      } else {
        setSettingsError(true);
        setSettingsMessage(data.message || 'Failed to update password.');
      }
    } catch {
      setSettingsError(true);
      setSettingsMessage('Server error. Please try again later.');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="admin-page">
      {/* Top Nav */}
      <nav className="admin-topnav">
        <div className="admin-topnav-brand">
          <img src="/lnmiit-logo.png" alt="LNMIIT" className="admin-topnav-logo" onError={e => e.target.style.display = 'none'} />
        </div>
        <div className="admin-topnav-center">
          <div className="admin-topnav-title">Faculty Appraisal System</div>
          <div className="admin-topnav-subtitle">Head of Department Dashboard</div>
        </div>
        <div className="admin-topnav-right">
          <div className="admin-topnav-user">
            <span>{user?.name}</span>
            <span className="admin-topnav-badge">HOD</span>
          </div>
          <button className="admin-settings-btn" onClick={() => setShowSettings(true)}>
            <Settings size={14} /> Account Settings
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main className="admin-main">
        {/* Welcome + Dept Info */}
        <div className="admin-welcome">
          <h1>Welcome, {user?.name || 'HOD'} ðŸ‘‹</h1>
          <p>View and manage faculty members registered in your department.</p>
        </div>

        {/* Dept info card */}
        {deptInfo && (
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
            borderRadius: '12px', padding: '24px 28px', marginBottom: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px' }}>
                <Building2 size={28} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{deptInfo.name}</div>
                <div style={{ fontSize: '13px', opacity: 0.75, marginTop: '4px' }}>
                  Code: <strong>{deptInfo.code}</strong>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '36px', fontWeight: '700' }}>{faculty.length}</div>
              <div style={{ fontSize: '13px', opacity: 0.75 }}>Faculty Members</div>
            </div>
          </div>
        )}
        {!deptInfo && !loading && (
          <div className="admin-empty" style={{ marginBottom: '28px' }}>
            Your account does not have a department assigned. Contact the admin or Dofa office to correct the HOD mapping.
          </div>
        )}

        {/* Faculty List */}
        <h2 className="admin-section-title"><Users size={20} /> Faculty Members</h2>
        <div className="admin-table-card">
          {loading ? (
            <div className="admin-empty">Loading faculty...</div>
          ) : faculty.length === 0 ? (
            <div className="admin-empty">
              No faculty registered in your department yet.<br />
              <span style={{ fontSize: '12px', color: '#b0bec5', marginTop: '8px', display: 'block' }}>
                Contact the admin to register faculty members.
              </span>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Employee ID</th>
                  <th>Employment Type</th>
                  <th>Date of Joining</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map(f => (
                  <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(f)}>
                    <td style={{ fontWeight: '500' }}>
                      {f.salutation ? `${f.salutation}. ` : ''}{f.name}
                    </td>
                    <td>{f.email}</td>
                    <td>{f.designation || '-'}</td>
                    <td>{f.employee_id || '-'}</td>
                    <td>
                      {f.employment_type ? (
                        <span className={`admin-badge ${f.employment_type === 'fixed' ? 'faculty' : 'hod'}`}>
                          {f.employment_type}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{formatDate(f.date_of_joining)}</td>
                    <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <button className="admin-btn-cancel" onClick={() => setSelected(f)} style={{ padding: '6px 10px', fontSize: '12px', marginRight: '6px' }}>
                        <Eye size={12} /> Details
                      </button>
                      <button className="admin-btn-cancel" onClick={() => handleArchiveFaculty(f)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                        <Archive size={12} /> Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="admin-section-title admin-archive-title"><Archive size={20} /> Archived Faculty</h2>
        <div className="admin-table-card">
          <div className="admin-archive-actions">
            <button className="admin-btn-submit" onClick={() => handleArchiveExport('csv')} style={{ padding: '8px 12px', fontSize: '12px' }}>
              <Download size={14} /> Export CSV
            </button>
            <button className="admin-btn-submit" onClick={() => handleArchiveExport('xlsx')} style={{ padding: '8px 12px', fontSize: '12px' }}>
              <Download size={14} /> Export Excel
            </button>
          </div>
          {archiveFaculty.length === 0 ? (
            <div className="admin-empty">No archived faculty in your department.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Archived At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {archiveFaculty.map(f => (
                  <tr key={`arch-${f.id}`}>
                    <td>{f.name}</td>
                    <td>{f.email}</td>
                    <td>{formatDate(f.archived_at)}</td>
                    <td>
                      <button className="admin-btn-submit" onClick={() => handleRestoreFaculty(f)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                        <RotateCcw size={12} /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Faculty Detail Modal */}
      {selected && (
        <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Faculty Details</h2>
              <button className="admin-modal-close" onClick={() => setSelected(null)}>x</button>
            </div>
            <div className="admin-modal-body">
              {/* Avatar */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e3a5f, #2c5282)',
                  color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', fontWeight: '700', marginBottom: '12px'
                }}>
                  {selected.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c' }}>
                  {selected.salutation ? `${selected.salutation}. ` : ''}{selected.name}
                </div>
                <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>{selected.designation || 'Faculty'}</div>
              </div>

              {/* Details Grid */}
              {[
                { icon: <Mail size={16} />, label: 'Email', value: selected.email },
                { icon: <Hash size={16} />, label: 'Employee ID', value: selected.employee_id || '-' },
                { icon: <Briefcase size={16} />, label: 'Employment Type', value: selected.employment_type ? (selected.employment_type === 'fixed' ? 'Fixed' : 'Contractual') : '-' },
                { icon: <Calendar size={16} />, label: 'Date of Joining', value: formatDate(selected.date_of_joining) },
                { icon: <Building2 size={16} />, label: 'Department', value: deptInfo?.name || '-' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', background: '#f8fafc', borderRadius: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{ color: '#4a5568', flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                    <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500', marginTop: '2px' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-cancel" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeSettingsModal(); }}>
          <div className="admin-modal" style={{ maxWidth: '420px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Account Settings</h2>
              <button className="admin-modal-close" onClick={closeSettingsModal}><X size={16} /></button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="admin-modal-body">
                <h3 style={{ fontSize: '15px', color: '#2d3748', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Change Password</h3>

                {settingsMessage && (
                  <div className={settingsError ? 'admin-form-error' : 'admin-form-success'} style={{ margin: '0 0 16px 0' }}>
                    {settingsError ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                    {settingsMessage}
                  </div>
                )}

                <div className="admin-form-field">
                  <label className="admin-form-label"><Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      className="admin-form-input"
                      required
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                      onClick={() => setShowPassword(p => ({ ...p, current: !p.current }))}
                    >
                      {showPassword.current ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label"><Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      className="admin-form-input"
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                      onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                    >
                      {showPassword.new ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label"><Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      className="admin-form-input"
                      required
                      minLength={6}
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                      onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                    >
                      {showPassword.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-cancel" onClick={closeSettingsModal}>Cancel</button>
                <button type="submit" className="admin-btn-submit" disabled={settingsLoading}>
                  {settingsLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboard;

