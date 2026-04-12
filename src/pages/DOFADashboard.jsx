import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, XCircle, MessageSquare, FileText, Users, Clock, CheckSquare, Bell, ChevronDown, ChevronUp, Send } from 'lucide-react';
import './DOFADashboard.css';
import { showConfirm, showPrompt } from '../utils/appDialogs';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const DOFADashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalSubmissions: 0,
    submitted: 0,
    approved: 0,
    pending: 0,
    underReview: 0,
    sentBack: 0
  });
  const [submissions, setSubmissions] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [editRequestsOpen, setEditRequestsOpen] = useState(true);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [approvedSections, setApprovedSections] = useState([]);
  const [dofaNote, setDofaNote] = useState('');
  const [reviewLoading, setReviewLoading] = useState(null);
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchSubmissions();
    fetchEditRequests();
  }, [filter, yearFilter]);

  const fetchStats = async () => {
    try {
      const url = new URL(`${API}/submissions/stats`);
      if (yearFilter !== 'all') url.searchParams.append('academic_year', yearFilter);
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API}/submissions`);
      if (filter !== 'all') url.searchParams.append('status', filter);
      if (yearFilter !== 'all') url.searchParams.append('academic_year', yearFilter);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        setSubmissions(data.data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditRequests = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/edit-requests?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setEditRequests(data.data);
    } catch (err) {
      console.error('Error fetching edit requests:', err);
    }
  };

  const handleViewSubmission = (id) => {
    navigate(`/dofa/review/${id}`);
  };

  const handleQuickApprove = async (id) => {
    if (!(await showConfirm('Are you sure you want to approve this submission?'))) {
      return;
    }

    try {
      const response = await fetch(`${API}/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          approved_by: 1
        })
      });

      const data = await response.json();
      if (data.success) {
        window.appToast('Submission approved successfully');
        fetchStats();
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleSendBack = async (id) => {
    const comment = await showPrompt({
      title: 'Send Back Submission',
      message: 'Please provide a reason for sending back:',
      placeholder: 'Enter reason',
      confirmText: 'Send Back'
    });
    if (!comment) return;

    try {
      await fetch(`${API}/review/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: id,
          reviewer_id: 1,
          reviewer_role: 'dofa',
          section_name: 'General',
          section_key: 'general',
          comment: comment
        })
      });

      await fetch(`${API}/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent_back' })
      });

      window.appToast('Submission sent back successfully');
      fetchStats();
      fetchSubmissions();
    } catch (error) {
      console.error('Error sending back submission:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-badge status-draft',
      submitted: 'status-badge status-submitted',
      under_review: 'status-badge status-review',
      approved: 'status-badge status-approved',
      sent_back: 'status-badge status-sent-back'
    };

    const statusText = {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      sent_back: 'Sent Back'
    };

    return (
      <span className={statusClasses[status]}>
        {statusText[status]}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const startReview = (req) => {
    setReviewingRequest(req);
    setApprovedSections(req.requested_sections || []);
    setDofaNote('');
  };

  const toggleSection = (key) => {
    setApprovedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleReviewSubmit = async (status) => {
    if (status === 'approved' && approvedSections.length === 0) {
      window.appToast('Please select at least one section to approve.');
      return;
    }
    setReviewLoading(status);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/edit-requests/${reviewingRequest.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status,
          approved_sections: status === 'approved' ? approvedSections : [],
          dofa_note: dofaNote || null
        })
      });
      const data = await res.json();
      if (data.success) {
        window.appToast(data.message);
        setReviewingRequest(null);
        setApprovedSections([]);
        setDofaNote('');
        fetchEditRequests();
        fetchSubmissions();
      } else {
        window.appToast('Error: ' + data.message);
      }
    } catch (err) {
      window.appToast('Request failed: ' + err.message);
    } finally {
      setReviewLoading(null);
    }
  };

  return (
    <div className="dofa-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">DOFA Dashboard</h1>
          <p className="dashboard-subtitle">Review and manage faculty appraisal submissions</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon"><Users size={18} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Faculty</p>
            <h3 className="stat-value">{stats.totalFaculty}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-info">
          <div className="stat-icon"><FileText size={18} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Submissions</p>
            <h3 className="stat-value">{stats.totalSubmissions}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon"><Clock size={18} /></div>
          <div className="stat-content">
            <p className="stat-label">Pending Review</p>
            <h3 className="stat-value">{stats.pending}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon"><CheckSquare size={18} /></div>
          <div className="stat-content">
            <p className="stat-label">Approved</p>
            <h3 className="stat-value">{stats.approved}</h3>
          </div>
        </div>
        {editRequests.length > 0 && (
          <div className="stat-card" style={{ borderColor: '#fcd34d' }}>
            <div className="stat-icon" style={{ background: '#fef9c3', color: '#92400e' }}>
              <Bell size={18} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Edit Requests</p>
              <h3 className="stat-value" style={{ color: '#92400e' }}>{editRequests.length}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Edit Requests Panel */}
      {editRequests.length > 0 && (
        <div className="submissions-card" style={{ marginBottom: 20, borderColor: '#fcd34d' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: editRequestsOpen ? 16 : 0 }}
            onClick={() => setEditRequestsOpen(o => !o)}
          >
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', marginBottom: 0 }}>
              <Bell size={15} />
              Edit Requests
              <span style={{
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
                borderRadius: 4,
                padding: '1px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.3px'
              }}>
                {editRequests.length} PENDING
              </span>
            </h2>
            {editRequestsOpen ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
          </div>

          {editRequestsOpen && (
            <div className="table-container">
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Faculty</th>
                    <th>Academic Year</th>
                    <th>Sections Requested</th>
                    <th>Message</th>
                    <th>Requested On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editRequests.map(req => (
                    <tr key={req.id}>
                      <td>
                        <div className="faculty-info">
                          <span className="faculty-name">{req.faculty_name}</span>
                          <span className="faculty-email">{req.faculty_email}</span>
                        </div>
                      </td>
                      <td>{req.academic_year}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {req.requested_sections?.map(s => (
                            <span key={s} style={{
                              background: '#eff6ff',
                              color: '#1e40af',
                              border: '1px solid #bfdbfe',
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              letterSpacing: '0.2px'
                            }}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ maxWidth: 200, fontSize: '0.8125rem', color: '#64748b' }}>{req.request_message || '—'}</td>
                      <td>{formatDate(req.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn btn-approve"
                            title="Review & Approve/Deny"
                            onClick={() => startReview(req)}
                            style={{ gap: 5, paddingLeft: 10, paddingRight: 10 }}
                          >
                            <Eye size={13} /> Review
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
      )}

      {/* Review Modal */}
      {reviewingRequest && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: '28px 32px',
            maxWidth: 560,
            width: '100%',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            animation: 'rqModalIn 0.2s ease-out'
          }}>
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                Review Edit Request
              </h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.8125rem' }}>
                <strong style={{ color: '#334155' }}>{reviewingRequest.faculty_name}</strong>
                <span style={{ margin: '0 6px', color: '#cbd5e1' }}>·</span>
                {reviewingRequest.academic_year}
              </p>
            </div>

            <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Select sections to approve
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 6, marginBottom: 18 }}>
              {reviewingRequest.requested_sections?.map(s => (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  border: `1px solid ${approvedSections.includes(s) ? '#93c5fd' : '#e2e8f0'}`,
                  borderRadius: 6, cursor: 'pointer',
                  background: approvedSections.includes(s) ? '#eff6ff' : '#fafafa',
                  transition: 'all 0.12s'
                }}>
                  <input
                    type="checkbox"
                    checked={approvedSections.includes(s)}
                    onChange={() => toggleSection(s)}
                    style={{ accentColor: '#1d4ed8' }}
                  />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>{s}</span>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Note to Faculty <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={dofaNote}
                onChange={e => setDofaNote(e.target.value)}
                placeholder="e.g. Please only update the course names, not the marks or credit hours."
                rows={3}
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid #e2e8f0', borderRadius: 6,
                  fontSize: '0.8125rem', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                  color: '#334155', outline: 'none',
                  background: '#fafafa'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => setReviewingRequest(null)}
                disabled={!!reviewLoading}
                style={{
                  padding: '8px 18px', borderRadius: 6,
                  border: '1px solid #e2e8f0', background: '#fff',
                  cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem', fontWeight: 600,
                  color: '#475569', opacity: reviewLoading ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewSubmit('denied')}
                disabled={!!reviewLoading}
                style={{
                  padding: '8px 18px', borderRadius: 6,
                  border: '1px solid #fecaca', background: '#fff5f5',
                  color: '#b91c1c', cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem', fontWeight: 600,
                  opacity: reviewLoading && reviewLoading !== 'denied' ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                {reviewLoading === 'denied' ? (
                  <><span style={{ width: 12, height: 12, border: '2px solid #b91c1c', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'rqSpin 0.7s linear infinite' }} />Denying...</>
                ) : (
                  <><XCircle size={13} />Deny</>
                )}
              </button>
              <button
                onClick={() => handleReviewSubmit('approved')}
                disabled={!!reviewLoading}
                style={{
                  padding: '8px 20px', borderRadius: 6,
                  border: 'none', background: '#0f172a',
                  color: '#fff', cursor: reviewLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem', fontWeight: 600,
                  opacity: reviewLoading && reviewLoading !== 'approved' ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                {reviewLoading === 'approved' ? (
                  <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'rqSpin 0.7s linear infinite' }} />Approving...</>
                ) : (
                  <><CheckCircle size={13} />Approve Selected</>
                )}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes rqModalIn { from{opacity:0;transform:scale(0.97) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
            @keyframes rqSpin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="filter-buttons">
          {['all', 'submitted', 'under_review', 'approved', 'sent_back'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'under_review' ? 'Under Review' : f === 'sent_back' ? 'Sent Back' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              fontSize: '0.8125rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: 160,
              color: '#334155',
              fontFamily: 'inherit'
            }}
          >
            <option value="all">All Academic Years</option>
            <option value="2022-23">2022–23</option>
            <option value="2023-24">2023–24</option>
            <option value="2024-25">2024–25</option>
            <option value="2025-26">2025–26</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="submissions-card">
        <h2 className="card-title">Faculty Submissions</h2>

        {loading ? (
          <div className="loading-state">Loading submissions…</div>
        ) : submissions.length === 0 ? (
          <div className="empty-state">No submissions found.</div>
        ) : (
          <div className="table-container">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Academic Year</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <div className="faculty-info">
                        <span className="faculty-name">{submission.faculty_name}</span>
                        <span className="faculty-email">{submission.email}</span>
                      </div>
                    </td>
                    <td>{submission.department || '—'}</td>
                    <td>{submission.academic_year}</td>
                    <td>{getStatusBadge(submission.status)}</td>
                    <td>{formatDate(submission.submitted_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn btn-view"
                          onClick={() => handleViewSubmission(submission.id)}
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {(submission.status === 'submitted' || submission.status === 'under_review') && (
                          <>
                            <button
                              className="action-btn btn-approve"
                              onClick={() => handleQuickApprove(submission.id)}
                              title="Approve"
                            >
                              <CheckCircle size={13} />
                            </button>
                            <button
                              className="action-btn btn-reject"
                              onClick={() => handleSendBack(submission.id)}
                              title="Send Back"
                            >
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DOFADashboard;