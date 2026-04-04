import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LogOut, Mail, Hash, Briefcase, Calendar, Building2, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const HODDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState([]);
  const [deptInfo, setDeptInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    if (!user?.department_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [facRes, deptRes] = await Promise.all([
        fetch(`${API_BASE}/register/departments/${user.department_id}/faculty`, { headers }),
        fetch(`${API_BASE}/register/departments`, { headers })
      ]);
      const [facData, deptData] = await Promise.all([facRes.json(), deptRes.json()]);
      if (facData.success) setFaculty(facData.data);
      if (deptData.success) {
        const dept = deptData.data.find(d => d.id === user.department_id);
        setDeptInfo(dept);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="admin-page">
      {/* Top Nav */}
      <nav className="admin-topnav">
        <div className="admin-topnav-brand">
          <img src="/lnmiit-logo.svg" alt="LNMIIT" className="admin-topnav-logo" onError={e => e.target.style.display = 'none'} />
          <div>
            <div className="admin-topnav-title">Faculty Appraisal System</div>
            <div className="admin-topnav-subtitle">Head of Department Dashboard</div>
          </div>
        </div>
        <div className="admin-topnav-right">
          <div className="admin-topnav-user">
            <span>{user?.name}</span>
            <span className="admin-topnav-badge">HOD</span>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main className="admin-main">
        {/* Welcome + Dept Info */}
        <div className="admin-welcome">
          <h1>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
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
                </tr>
              </thead>
              <tbody>
                {faculty.map(f => (
                  <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(f)}>
                    <td style={{ fontWeight: '500' }}>
                      {f.salutation ? `${f.salutation}. ` : ''}{f.name}
                    </td>
                    <td>{f.email}</td>
                    <td>{f.designation || '—'}</td>
                    <td>{f.employee_id || '—'}</td>
                    <td>
                      {f.employment_type ? (
                        <span className={`admin-badge ${f.employment_type === 'fixed' ? 'faculty' : 'hod'}`}>
                          {f.employment_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{formatDate(f.date_of_joining)}</td>
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
              <button className="admin-modal-close" onClick={() => setSelected(null)}>✕</button>
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
                { icon: <Hash size={16} />, label: 'Employee ID', value: selected.employee_id || '—' },
                { icon: <Briefcase size={16} />, label: 'Employment Type', value: selected.employment_type ? (selected.employment_type === 'fixed' ? 'Fixed' : 'Contractual') : '—' },
                { icon: <Calendar size={16} />, label: 'Date of Joining', value: formatDate(selected.date_of_joining) },
                { icon: <Building2 size={16} />, label: 'Department', value: deptInfo?.name || '—' },
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
    </div>
  );
};

export default HODDashboard;
