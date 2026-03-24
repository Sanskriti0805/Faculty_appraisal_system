import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, User, BookOpen, FileText, Award, Briefcase } from 'lucide-react';
import './DOFAReview.css';

const API = `http://${window.location.hostname}:5000/api`;

const DOFAReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submissionData, setSubmissionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('faculty');

  useEffect(() => {
    fetchSubmissionDetails();
  }, [id]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/submissions/${id}`);
      const data = await response.json();
      if (data.success) {
        setSubmissionData(data.data);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this submission?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/submissions/${id}/status`, {
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
        navigate('/dofa/dashboard');
      }
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleSendBack = async () => {
    if (!comment.trim()) {
      alert('Please provide a comment before sending back');
      return;
    }

    if (!window.confirm('Are you sure you want to send back this submission?')) {
      return;
    }

    try {
      // Add comment
      await fetch(`${API}/review/comment`, {
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
      await fetch(`${API}/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent_back' })
      });

      alert('Submission sent back successfully');
      navigate('/dofa/dashboard');
    } catch (error) {
      console.error('Error sending back submission:', error);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    try {
      await fetch(`${API}/review/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: id,
          reviewer_id: 1, // Mock DOFA user ID
          reviewer_role: 'dofa',
          comment: comment
        })
      });

      setComment('');
      fetchSubmissionDetails();
      alert('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="dofa-review">
        <div className="loading-state">Loading submission details...</div>
      </div>
    );
  }

  if (!submissionData) {
    return (
      <div className="dofa-review">
        <div className="empty-state">Submission not found</div>
      </div>
    );
  }

  const { submission, facultyInfo, courses, publications, grants, patents, awards, comments } = submissionData;

  return (
    <div className="dofa-review">
      {/* Header */}
      <div className="review-header">
        <button className="back-btn" onClick={() => navigate('/dofa/dashboard')}>
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        
        <div className="header-info">
          <h1 className="review-title">Review Submission</h1>
          <div className="faculty-header">
            <h2>{submission.faculty_name}</h2>
            <span className="department-badge">{submission.department || 'N/A'}</span>
          </div>
          <p className="submission-meta">
            Academic Year: <strong>{submission.academic_year}</strong> | 
            Status: <strong>{submission.status}</strong> | 
            Submitted: <strong>{new Date(submission.submitted_at).toLocaleDateString()}</strong>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="review-tabs">
        <button
          className={`tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
          onClick={() => setActiveTab('faculty')}
        >
          <User size={18} />
          Faculty Information
        </button>
        <button
          className={`tab-btn ${activeTab === 'teaching' ? 'active' : ''}`}
          onClick={() => setActiveTab('teaching')}
        >
          <BookOpen size={18} />
          Teaching ({courses?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'publications' ? 'active' : ''}`}
          onClick={() => setActiveTab('publications')}
        >
          <FileText size={18} />
          Publications ({publications?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'grants' ? 'active' : ''}`}
          onClick={() => setActiveTab('grants')}
        >
          <Briefcase size={18} />
          Grants ({grants?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'awards' ? 'active' : ''}`}
          onClick={() => setActiveTab('awards')}
        >
          <Award size={18} />
          Awards ({awards?.length || 0})
        </button>
      </div>

      {/* Content Sections */}
      <div className="review-content">
        <div className="content-main">
          {activeTab === 'faculty' && (
            <div className="section-card">
              <h3 className="section-title">Faculty Information</h3>
              {facultyInfo && Object.keys(facultyInfo).length > 0 ? (
                <div className="info-grid">
                  <div className="info-item">
                    <label>Name</label>
                    <p>{facultyInfo.name}</p>
                  </div>
                  <div className="info-item">
                    <label>Employee ID</label>
                    <p>{facultyInfo.employee_id || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>Department</label>
                    <p>{facultyInfo.department || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>Designation</label>
                    <p>{facultyInfo.designation || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <p>{facultyInfo.email || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <p>{facultyInfo.phone || 'N/A'}</p>
                  </div>
                  <div className="info-item full-width">
                    <label>Qualifications</label>
                    <p>{facultyInfo.qualifications || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p className="no-data">No faculty information available</p>
              )}
            </div>
          )}

          {activeTab === 'teaching' && (
            <div className="section-card">
              <h3 className="section-title">Courses Taught</h3>
              {courses && courses.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Course Code</th>
                        <th>Course Name</th>
                        <th>Program</th>
                        <th>Semester</th>
                        <th>Credits</th>
                        <th>Enrollment</th>
                        <th>Feedback Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course, index) => (
                        <tr key={index}>
                          <td>{course.course_code}</td>
                          <td>{course.course_name}</td>
                          <td>{course.program}</td>
                          <td>{course.semester}</td>
                          <td>{course.credits}</td>
                          <td>{course.enrollment}</td>
                          <td>{course.feedback_score || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No courses data available</p>
              )}
            </div>
          )}

          {activeTab === 'publications' && (
            <div className="section-card">
              <h3 className="section-title">Research Publications</h3>
              {publications && publications.length > 0 ? (
                <div className="publications-list">
                  {publications.map((pub, index) => (
                    <div key={index} className="publication-item">
                      <h4>{pub.title}</h4>
                      <div className="pub-details">
                        <span className="pub-type">{pub.publication_type}</span>
                        {pub.journal_name && <span>Journal: {pub.journal_name}</span>}
                        {pub.conference_name && <span>Conference: {pub.conference_name}</span>}
                        <span>Year: {pub.year_of_publication}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No publications data available</p>
              )}
            </div>
          )}

          {activeTab === 'grants' && (
            <div className="section-card">
              <h3 className="section-title">Research Grants</h3>
              {grants && grants.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Funding Agency</th>
                        <th>Grant Amount</th>
                        <th>Duration</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grants.map((grant, index) => (
                        <tr key={index}>
                          <td>{grant.project_name}</td>
                          <td>{grant.funding_agency}</td>
                          <td>{grant.currency} {grant.grant_amount}</td>
                          <td>{grant.duration}</td>
                          <td>{grant.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No grants data available</p>
              )}
            </div>
          )}

          {activeTab === 'awards' && (
            <div className="section-card">
              <h3 className="section-title">Awards & Honours</h3>
              {awards && awards.length > 0 ? (
                <div className="awards-list">
                  {awards.map((award, index) => (
                    <div key={index} className="award-item">
                      <h4>{award.award_name}</h4>
                      <p className="award-type">{award.honor_type}</p>
                      {award.description && <p>{award.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No awards data available</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Comments & Actions */}
        <div className="content-sidebar">
          {/* Actions Card */}
          <div className="actions-card">
            <h3 className="card-title">
              <MessageSquare size={20} />
              Review Actions
            </h3>
            
            <div className="action-section">
              <label>Add Comment</label>
              <textarea
                className="comment-textarea"
                placeholder="Enter your review comments..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="4"
              />
              <button className="btn btn-secondary" onClick={handleAddComment}>
                Add Comment
              </button>
            </div>

            <div className="action-buttons-group">
              <button className="btn btn-success" onClick={handleApprove}>
                <CheckCircle size={18} />
                Approve Submission
              </button>
              <button className="btn btn-danger" onClick={handleSendBack}>
                <XCircle size={18} />
                Send Back for Changes
              </button>
            </div>
          </div>

          {/* Comments History */}
          <div className="comments-card">
            <h3 className="card-title">Comments History</h3>
            {comments && comments.length > 0 ? (
              <div className="comments-list">
                {comments.map((c, index) => (
                  <div key={index} className="comment-item">
                    <div className="comment-header">
                      <span className="reviewer-name">{c.reviewer_name || 'Reviewer'}</span>
                      <span className="comment-date">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="comment-text">{c.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-comments">No comments yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DOFAReview;
