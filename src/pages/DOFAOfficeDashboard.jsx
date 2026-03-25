import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Mail, Download, Users, FileText, Clock, CheckSquare } from 'lucide-react';
import './DOFAOfficeDashboard.css';

const API = `http://${window.location.hostname}:5001/api`;

const DOFAOfficeDashboard = () => {
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalSubmissions: 0,
    submitted: 0,
    underReview: 0,
    approved: 0
  });
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchSubmissions();
  }, [filter]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API}/submissions/stats`);
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
      const url = filter === 'all'
        ? `${API}/submissions`
        : `${API}/submissions?status=${filter}`;

      const response = await fetch(url);
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

  const handleToggleLock = async (id, currentlyLocked) => {
    const action = currentlyLocked ? 'unlock' : 'lock';
    if (!window.confirm(`Are you sure you want to ${action} this submission?`)) {
      return;
    }

    try {
      await fetch(`${API}/submissions/${id}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locked: !currentlyLocked,
          locked_by: 1 // Mock DOFA Office user ID
        })
      });

      alert(`Submission ${action}ed successfully`);
      fetchSubmissions();
    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
    }
  };

  const handleSendReminder = async (facultyId, email) => {
    if (!window.confirm(`Send reminder to ${email}?`)) {
      return;
    }

    // Mock reminder functionality
    alert(`Reminder sent to ${email}`);
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Faculty Name', 'Department', 'Academic Year', 'Status', 'Submitted Date'];
    const rows = submissions.map(s => [
      s.faculty_name,
      s.department || '',
      s.academic_year,
      s.status,
      s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="dofa-office-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">DOFA Office Dashboard</h1>
          <p className="dashboard-subtitle">Administrative management and support</p>
        </div>
        <button className="export-btn" onClick={handleExportCSV}>
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Faculty</p>
            <h3 className="stat-value">{stats.totalFaculty}</h3>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Submitted</p>
            <h3 className="stat-value">{stats.submitted}</h3>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Under Review</p>
            <h3 className="stat-value">{stats.underReview}</h3>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">
            <CheckSquare size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Approved</p>
            <h3 className="stat-value">{stats.approved}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'submitted' ? 'active' : ''}`}
            onClick={() => setFilter('submitted')}
          >
            Submitted
          </button>
          <button
            className={`filter-btn ${filter === 'under_review' ? 'active' : ''}`}
            onClick={() => setFilter('under_review')}
          >
            Under Review
          </button>
          <button
            className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="submissions-card">
        <h2 className="card-title">Submission Management</h2>

        {loading ? (
          <div className="loading-state">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="empty-state">
            <p>No submissions found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Assigned Reviewer</th>
                  <th>Locked</th>
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
                    <td>{submission.department || '-'}</td>
                    <td>{getStatusBadge(submission.status)}</td>
                    <td>
                      {submission.approved_by_name || (
                        <span className="unassigned">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`lock-status ${submission.locked ? 'locked' : 'unlocked'}`}>
                        {submission.locked ? (
                          <>
                            <Lock size={14} />
                            Locked
                          </>
                        ) : (
                          <>
                            <Unlock size={14} />
                            Unlocked
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`action-btn ${submission.locked ? 'btn-unlock' : 'btn-lock'}`}
                          onClick={() => handleToggleLock(submission.id, submission.locked)}
                          title={submission.locked ? 'Unlock' : 'Lock'}
                        >
                          {submission.locked ? <Unlock size={16} /> : <Lock size={16} />}
                        </button>
                        <button
                          className="action-btn btn-reminder"
                          onClick={() => handleSendReminder(submission.faculty_id, submission.email)}
                          title="Send Reminder"
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
        )}
      </div>
    </div>
  );
};

export default DOFAOfficeDashboard;
