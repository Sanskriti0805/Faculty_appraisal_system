import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, XCircle, MessageSquare, FileText, Users, Clock, CheckSquare } from 'lucide-react';
import './DOFADashboard.css';

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
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchSubmissions();
  }, [filter]);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/submissions/stats');
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
        ? 'http://localhost:5001/api/submissions'
        : `http://localhost:5001/api/submissions?status=${filter}`;

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

  const handleViewSubmission = (id) => {
    navigate(`/dofa/review/${id}`);
  };

  const handleQuickApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this submission?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          approved_by: 1 // Mock DOFA user ID
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Submission approved successfully');
        fetchStats();
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleSendBack = async (id) => {
    const comment = window.prompt('Please provide a reason for sending back:');
    if (!comment) return;

    try {
      // Add comment
      await fetch('http://localhost:5001/api/review/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: id,
          reviewer_id: 1, // Mock DOFA user ID
          reviewer_role: 'dofa',
          comment: comment
        })
      });

      // Update status
      await fetch(`http://localhost:5001/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent_back' })
      });

      alert('Submission sent back successfully');
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
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
            <p className="stat-label">Total Submissions</p>
            <h3 className="stat-value">{stats.totalSubmissions}</h3>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Review</p>
            <h3 className="stat-value">{stats.pending}</h3>
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
          <button
            className={`filter-btn ${filter === 'sent_back' ? 'active' : ''}`}
            onClick={() => setFilter('sent_back')}
          >
            Sent Back
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="submissions-card">
        <h2 className="card-title">Faculty Submissions</h2>

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
                    <td>{submission.department || '-'}</td>
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
                          <Eye size={16} />
                        </button>
                        {submission.status === 'submitted' || submission.status === 'under_review' ? (
                          <>
                            <button
                              className="action-btn btn-approve"
                              onClick={() => handleQuickApprove(submission.id)}
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              className="action-btn btn-reject"
                              onClick={() => handleSendBack(submission.id)}
                              title="Send Back"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        ) : null}
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
