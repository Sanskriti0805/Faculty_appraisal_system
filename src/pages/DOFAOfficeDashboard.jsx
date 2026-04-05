import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Mail, Download, Users, FileText, Clock, CheckSquare, Eye, CheckCircle, XCircle, Calendar, FileCode, Table, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import './DOFAOfficeDashboard.css';

const API = `http://${window.location.hostname}:5000/api`;

const DOFAOfficeDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalSubmissions: 0,
    submitted: 0,
    underReview: 0,
    approved: 0
  });
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);
  const [downloadModal, setDownloadModal] = useState({ open: false, submission: null });
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchSubmissions();
  }, [filter, yearFilter]);

  const fetchStats = async () => {
    try {
      const params = yearFilter !== 'all' ? `?academic_year=${yearFilter}` : '';
      const response = await fetch(`${API}/submissions/stats${params}`);
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
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (yearFilter !== 'all') params.set('academic_year', yearFilter);

      const url = `${API}/submissions${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data);
        const years = [...new Set(data.data.map(s => s.academic_year).filter(Boolean))].sort().reverse();
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (id, currentlyLocked) => {
    const action = currentlyLocked ? 'unlock' : 'lock';
    if (!window.confirm(`Are you sure you want to ${action} this submission?`)) return;

    try {
      await fetch(`${API}/submissions/${id}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: !currentlyLocked, locked_by: 1 })
      });
      alert(`Submission ${action}ed successfully`);
      fetchSubmissions();
    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
    }
  };

  const handleSendReminder = async (submissionId, email, name) => {
    if (!window.confirm(`Send deadline reminder to ${name} (${email})?`)) return;
    try {
      const res = await fetch(`${API}/submissions/${submissionId}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Reminder sent to ${email}`);
      } else {
        alert(`⚠️ ${data.message || 'Failed to send reminder'}`);
      }
    } catch (e) {
      console.error('Reminder error:', e);
      alert('Error sending reminder. Check if email is configured in .env');
    }
  };

  const handleUpdateStatus = async (submissionId, status, facultyName) => {
    const labels = { approved: 'Approve', sent_back: 'Send Back', under_review: 'Mark Under Review' };
    if (!window.confirm(`${labels[status] || status} submission for ${facultyName}?`)) return;
    try {
      const res = await fetch(`${API}/submissions/${submissionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Status updated to "${status}"`);
        fetchSubmissions();
        fetchStats();
      } else {
        alert(`⚠️ ${data.message}`);
      }
    } catch (e) {
      alert('Error updating status');
    }
  };

  // ── Download Helpers ─────────────────────────────────────────────────────

  const fetchSubmissionData = async (id) => {
    const res = await fetch(`${API}/submissions/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    });
    const data = await res.json();
    return data.success ? data.data : null;
  };

  const handleDownloadJSON = async (submission) => {
    setDownloadingFormat('json');
    try {
      const data = await fetchSubmissionData(submission.id);
      if (!data) return alert('Could not fetch submission data');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${submission.faculty_name}_${submission.academic_year}_appraisal.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadModal({ open: false, submission: null });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadCSV = async (submission) => {
    setDownloadingFormat('csv');
    try {
      const headers = ['Faculty Name', 'Department', 'Email', 'Designation', 'Academic Year', 'Form Type', 'Status', 'Submitted Date'];
      const row = [
        submission.faculty_name,
        submission.department || '',
        submission.email || '',
        submission.designation || '',
        submission.academic_year,
        submission.form_type || 'A',
        submission.status,
        submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : ''
      ];
      const csvContent = [headers.join(','), row.map(c => `"${c}"`).join(',')].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${submission.faculty_name}_${submission.academic_year}_appraisal.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadModal({ open: false, submission: null });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadPDF = async (submission) => {
    setDownloadingFormat('pdf');
    try {
      const data = await fetchSubmissionData(submission.id);
      if (!data) return alert('Could not fetch submission data');

      const { submission: sub, facultyInfo, publications, courses, grants, patents, awards, proposals, newCourses } = data;

      const html = `<!DOCTYPE html><html><head><title>${sub.faculty_name} - Appraisal ${sub.academic_year}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:30px;color:#222}
        h1{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px}
        h2{color:#2d4373;margin-top:24px;font-size:1.1rem;border-bottom:1px solid #ddd;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
        th{background:#f5f7fa;padding:8px;text-align:left;border:1px solid #ddd}
        td{padding:8px;border:1px solid #ddd}
        .meta{display:flex;gap:2rem;background:#f9fafb;padding:12px;border-radius:6px;margin-bottom:12px}
        .meta-item label{font-size:11px;color:#777;display:block}
        .meta-item span{font-weight:600}
      </style></head><body>
      <h1>Annual Performance Appraisal — Form ${sub.form_type || 'A'}</h1>
      <div class="meta">
        <div class="meta-item"><label>Name</label><span>${sub.faculty_name}</span></div>
        <div class="meta-item"><label>Department</label><span>${sub.department || 'N/A'}</span></div>
        <div class="meta-item"><label>Academic Year</label><span>${sub.academic_year}</span></div>
        <div class="meta-item"><label>Status</label><span>${sub.status}</span></div>
        <div class="meta-item"><label>Designation</label><span>${facultyInfo?.designation || 'N/A'}</span></div>
      </div>

      <h2>Part A — Courses Taught (${courses?.length || 0})</h2>
      <table><tr><th>Course Name</th><th>Code</th><th>Semester</th><th>Program</th><th>Enrollment</th></tr>
      ${(courses || []).map(c => `<tr><td>${c.course_name||''}</td><td>${c.course_code||''}</td><td>${c.semester||''}</td><td>${c.program||''}</td><td>${c.enrollment||''}</td></tr>`).join('')}
      </table>

      <h2>Research Publications (${publications?.length || 0})</h2>
      <table><tr><th>Type</th><th>Sub Type</th><th>Title</th><th>Year</th><th>Journal/Conference</th></tr>
      ${(publications || []).map(p => `<tr><td>${p.publication_type||''}</td><td>${p.sub_type||''}</td><td>${p.title||''}</td><td>${p.year_of_publication||''}</td><td>${p.journal_name||p.conference_name||''}</td></tr>`).join('')}
      </table>

      <h2>Research Grants (${grants?.length || 0})</h2>
      <table><tr><th>Project Name</th><th>Agency</th><th>Amount (Lakhs)</th><th>Role</th></tr>
      ${(grants || []).map(g => `<tr><td>${g.project_name||''}</td><td>${g.funding_agency||''}</td><td>${g.amount_in_lakhs||0}</td><td>${g.role||''}</td></tr>`).join('')}
      </table>

      <h2>Patents (${patents?.length || 0})</h2>
      <table><tr><th>Type</th><th>Title</th><th>Agency</th></tr>
      ${(patents || []).map(p => `<tr><td>${p.patent_type||''}</td><td>${p.title||''}</td><td>${p.agency||''}</td></tr>`).join('')}
      </table>

      <h2>Awards & Honours (${awards?.length || 0})</h2>
      <table><tr><th>Award</th><th>Agency</th><th>Year</th></tr>
      ${(awards || []).map(a => `<tr><td>${a.award_name||''}</td><td>${a.awarding_agency||''}</td><td>${a.year||''}</td></tr>`).join('')}
      </table>

      <h2>New Courses Developed (${newCourses?.length || 0})</h2>
      <table><tr><th>Course Name</th><th>Code</th><th>Level</th><th>Program</th></tr>
      ${(newCourses || []).map(c => `<tr><td>${c.course_name||''}</td><td>${c.course_code||''}</td><td>${c.level||''}</td><td>${c.program||''}</td></tr>`).join('')}
      </table>

      <h2>Submitted Proposals (${proposals?.length || 0})</h2>
      <table><tr><th>Title</th><th>Agency</th><th>Amount</th><th>Status</th></tr>
      ${(proposals || []).map(p => `<tr><td>${p.title||''}</td><td>${p.funding_agency||''}</td><td>${p.grant_amount||0}</td><td>${p.status||''}</td></tr>`).join('')}
      </table>

      <p style="margin-top:40px;font-size:11px;color:#888">Generated on ${new Date().toLocaleString()}</p>
      </body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.print();
      setDownloadModal({ open: false, submission: null });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Faculty Name', 'Department', 'Academic Year', 'Status', 'Submitted Date'];
    const rows = submissions.map(s => [
      s.faculty_name, s.department || '', s.academic_year, s.status,
      s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const cls = { draft: 'status-draft', submitted: 'status-submitted', under_review: 'status-review', approved: 'status-approved', sent_back: 'status-sent-back' };
    const text = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', sent_back: 'Sent Back' };
    return <span className={`status-badge ${cls[status] || ''}`}>{text[status] || status}</span>;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const grouped = submissions.reduce((acc, s) => {
    const yr = s.academic_year || 'Unknown';
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(s);
    return acc;
  }, {});

  const yearsToShow = yearFilter === 'all' ? Object.keys(grouped).sort().reverse() : [yearFilter];

  return (
    <div className="dofa-office-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">DOFA Office Dashboard</h1>
          <p className="dashboard-subtitle">Academic year-wise faculty appraisal management</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="year-filter-select"
          >
            <option value="all">All Academic Years</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
          <button className="export-btn" onClick={handleExportCSV}>
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Faculty</p>
            <h3 className="stat-value">{stats.totalFaculty}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-info">
          <div className="stat-icon"><FileText size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Submitted</p>
            <h3 className="stat-value">{stats.submitted}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Under Review</p>
            <h3 className="stat-value">{stats.underReview}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon"><CheckSquare size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Approved</p>
            <h3 className="stat-value">{stats.approved}</h3>
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="filters-section">
        <div className="filter-buttons">
          {['all', 'submitted', 'under_review', 'approved', 'sent_back', 'draft'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'under_review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table */}
      {loading ? (
        <div className="loading-state">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="empty-state"><p>No submissions found</p></div>
      ) : (
        yearsToShow.map(yr => (
          grouped[yr] ? (
            <div key={yr} className="submissions-card" style={{ marginBottom: '1.5rem' }}>
              <h2 className="card-title"><Calendar size={25} /> Academic Year: {yr} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#5a6c7d' }}>({grouped[yr].length} submission{grouped[yr].length !== 1 ? 's' : ''})</span></h2>
              <div className="table-container">
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th>Faculty Name</th>
                      <th>Department</th>
                      <th>Form</th>
                      <th>Status</th>
                      <th>Submitted On</th>
                      <th>Locked</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[yr].map(submission => (
                      <tr key={submission.id}>
                        <td>
                          <div className="faculty-info">
                            <span className="faculty-name">{submission.faculty_name}</span>
                            <span className="faculty-email">{submission.email}</span>
                          </div>
                        </td>
                        <td>{submission.department || '-'}</td>
                        <td>
                          <span className="form-type-badge">Form {submission.form_type || 'A'}</span>
                        </td>
                        <td>{getStatusBadge(submission.status)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(submission.submitted_at)}</td>
                        <td>
                          <span className={`lock-status ${submission.locked ? 'locked' : 'unlocked'}`}>
                            {submission.locked ? <><Lock size={14} /> Locked</> : <><Unlock size={14} /> Unlocked</>}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: 'center' }}>
                            <button
                              className="action-btn btn-view"
                              onClick={() => navigate(`/dofa-office/review/${submission.id}`)}
                              title="View Full Form"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="action-btn btn-download"
                              onClick={() => setDownloadModal({ open: true, submission })}
                              title="Download Form"
                            >
                              <Download size={16} />
                            </button>

                            {submission.status !== 'approved' && (
                              <button
                                className="action-btn btn-approve"
                                onClick={() => handleUpdateStatus(submission.id, 'approved', submission.faculty_name)}
                                title="Approve Submission"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}

                            {submission.status !== 'sent_back' && submission.status !== 'draft' && (
                              <button
                                className="action-btn btn-send-back"
                                onClick={() => handleUpdateStatus(submission.id, 'sent_back', submission.faculty_name)}
                                title="Send Back for Changes"
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                            <button
                              className={`action-btn ${submission.locked ? 'btn-unlock' : 'btn-lock'}`}
                              onClick={() => handleToggleLock(submission.id, submission.locked)}
                              title={submission.locked ? 'Unlock' : 'Lock'}
                            >
                              {submission.locked ? <Unlock size={16} /> : <Lock size={16} />}
                            </button>

                            <button
                              className="action-btn btn-reminder"
                              onClick={() => handleSendReminder(submission.id, submission.email, submission.faculty_name)}
                              title="Send Reminder Email"
                            >
                              <Mail size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        ))
      )}

      {/* Download Modal */}
      {downloadModal.open && downloadModal.submission && (
        <div className="download-modal-overlay" onClick={() => setDownloadModal({ open: false, submission: null })}>
          <div className="download-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Export Appraisal Form</h2>
                <p className="modal-subtitle">{downloadModal.submission.faculty_name} — {downloadModal.submission.academic_year}</p>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setDownloadModal({ open: false, submission: null })}
                aria-label="Close dialog"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-content">
              <p className="modal-description">Choose a format to download the appraisal form:</p>

              <div className="export-options">
                {/* PDF Option */}
                <button
                  className={`export-option ${downloadingFormat === 'pdf' ? 'loading' : ''}`}
                  onClick={() => handleDownloadPDF(downloadModal.submission)}
                  disabled={downloadingFormat !== null}
                >
                  <div className="option-icon pdf-icon">
                    <FileText size={28} />
                  </div>
                  <div className="option-content">
                    <h3>PDF Document</h3>
                    <p>Formatted report with all data tables and sections</p>
                  </div>
                  {downloadingFormat === 'pdf' && <div className="spinner"></div>}
                </button>

                {/* JSON Option */}
                <button
                  className={`export-option ${downloadingFormat === 'json' ? 'loading' : ''}`}
                  onClick={() => handleDownloadJSON(downloadModal.submission)}
                  disabled={downloadingFormat !== null}
                >
                  <div className="option-icon json-icon">
                    <FileCode size={28} />
                  </div>
                  <div className="option-content">
                    <h3>JSON Data</h3>
                    <p>Structured data format for integration with other tools</p>
                  </div>
                  {downloadingFormat === 'json' && <div className="spinner"></div>}
                </button>

                {/* CSV Option */}
                <button
                  className={`export-option ${downloadingFormat === 'csv' ? 'loading' : ''}`}
                  onClick={() => handleDownloadCSV(downloadModal.submission)}
                  disabled={downloadingFormat !== null}
                >
                  <div className="option-icon csv-icon">
                    <Table size={28} />
                  </div>
                  <div className="option-content">
                    <h3>CSV Spreadsheet</h3>
                    <p>Import into Excel or other spreadsheet applications</p>
                  </div>
                  {downloadingFormat === 'csv' && <div className="spinner"></div>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DOFAOfficeDashboard;