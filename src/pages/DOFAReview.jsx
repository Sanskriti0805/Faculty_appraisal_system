import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, User, BookOpen, FileText, Award, Briefcase, ExternalLink, Lightbulb } from 'lucide-react';
import './DOFAReview.css';

// Import Mirror Mode components
import ResearchPublications from './ResearchPublications';
import CoursesTaught from './CoursesTaught';
import Consultancy from './Consultancy';
import ResearchGrants from './ResearchGrants';
import Patents from './Patents';
import AwardsHonours from './AwardsHonours';
import TeachingInnovation from './TeachingInnovation';
import InstitutionalContributions from './InstitutionalContributions';
import PartB from './PartB';

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

  const {
    submission,
    facultyInfo,
    courses,
    publications,
    grants,
    patents,
    awards,
    newCourses,
    proposals,
    paperReviews,
    techTransfer,
    conferenceSessions,
    keynotesTalks,
    consultancy,
    teachingInnovation,
    institutionalContributions,
    goals,
    comments
  } = submissionData;

  const renderFileLink = (filename) => {
    if (!filename) return null;
    const baseUrl = API.replace('/api', '');
    const fileUrl = `${baseUrl}/uploads/${filename}`;
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="evidence-link"
        title="View Supporting Document"
      >
        <ExternalLink size={14} />
        <span>View Evidence</span>
      </a>
    );
  };

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
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Briefcase size={18} />
          Reviews/Proposals
        </button>
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <Award size={18} />
          Events
        </button>
        <button
          className={`tab-btn ${activeTab === 'consultancy' ? 'active' : ''}`}
          onClick={() => setActiveTab('consultancy')}
        >
          <Briefcase size={18} />
          Consultancy
        </button>
        <button
          className={`tab-btn ${activeTab === 'innovation' ? 'active' : ''}`}
          onClick={() => setActiveTab('innovation')}
        >
          <Lightbulb size={18} />
          Innovation & Contributions
        </button>
        <button
          className={`tab-btn ${activeTab === 'partb' ? 'active' : ''}`}
          onClick={() => setActiveTab('partb')}
        >
          <CheckCircle size={18} />
          Part B (Goals)
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
              <h3 className="section-title">Teaching & Projects</h3>
              <div className="mirror-component-wrapper">
                <CoursesTaught initialData={{ courses, newCourses }} readOnly={true} />
              </div>
            </div>
          )}

          {activeTab === 'publications' && (
            <div className="section-card">
              <h3 className="section-title">Research Publications</h3>
              {publications && publications.length > 0 ? (
                <div className="mirror-mode-list" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {publications.map((pub, index) => (
                    <div key={index} className="mirror-component-wrapper" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fafafa' }}>
                      <ResearchPublications initialData={pub} readOnly={true} />
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
              <div className="mirror-component-wrapper">
                <ResearchGrants initialData={{ grants, proposals }} readOnly={true} />
              </div>

              {paperReviews && paperReviews.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h4 className="sub-section-title">Paper Reviews</h4>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Journal/Conference</th>
                          <th>Number of Papers</th>
                          <th>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paperReviews.map((pr, i) => (
                          <tr key={i}>
                            <td>{pr.journal_name}</td>
                            <td>{pr.count}</td>
                            <td>{renderFileLink(pr.evidence_file)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="section-card">
              <h3 className="section-title">Reviews & Proposals</h3>

              <h4 className="sub-section-title" style={{ marginTop: '2rem' }}>Submitted Proposals</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Agency</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals?.map((p, i) => (
                      <tr key={i}>
                        <td>{p.title}</td>
                        <td>{p.funding_agency}</td>
                        <td>{p.grant_amount}</td>
                        <td>{p.status}</td>
                        <td>{renderFileLink(p.evidence_file)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="section-card">
              <h3 className="section-title">Conference Sessions & Talks</h3>

              <h4 className="sub-section-title">Conference Sessions Chaired</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Conference</th>
                      <th>Title</th>
                      <th>Role</th>
                      <th>Location</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conferenceSessions?.map((s, i) => (
                      <tr key={i}>
                        <td>{s.conference_name}</td>
                        <td>{s.session_title}</td>
                        <td>{s.role || 'N/A'}</td>
                        <td>{s.location}</td>
                        <td>{renderFileLink(s.evidence_file)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="sub-section-title" style={{ marginTop: '2rem' }}>Keynotes & Invited Talks</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Audience</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keynotesTalks?.map((k, i) => (
                      <tr key={i}>
                        <td>{k.event_name}</td>
                        <td>{k.title}</td>
                        <td>{k.event_type || 'N/A'}</td>
                        <td>{k.audience_type}</td>
                        <td>{renderFileLink(k.evidence_file)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h4 className="sub-section-title">Patents</h4>
                <div className="mirror-component-wrapper">
                  <Patents initialData={patents || []} readOnly={true} />
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h4 className="sub-section-title">Awards & Honours</h4>
                <div className="mirror-component-wrapper">
                  <AwardsHonours initialData={awards || []} readOnly={true} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'consultancy' && (
            <div className="section-card">
              <h3 className="section-title">Consultancy Projects</h3>
              <div className="mirror-component-wrapper">
                {consultancy && consultancy.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {consultancy.map((item, index) => (
                      <div key={index} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fafafa' }}>
                        <Consultancy initialData={item} readOnly={true} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No consultancy data available</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'innovation' && (
            <div className="section-card">
              <h3 className="section-title">Innovation & Extra-Curricular Contributions</h3>

              {techTransfer && techTransfer.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 className="sub-section-title">Technology Transfer</h4>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Agency</th>
                          <th>Date</th>
                          <th>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {techTransfer.map((tt, i) => (
                          <tr key={i}>
                            <td>{tt.title}</td>
                            <td>{tt.agency}</td>
                            <td>{tt.date ? new Date(tt.date).toLocaleDateString() : 'N/A'}</td>
                            <td>{renderFileLink(tt.evidence_file)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mirror-component-wrapper">
                <div style={{ marginBottom: '3rem' }}>
                  <TeachingInnovation initialData={teachingInnovation} readOnly={true} />
                </div>
                <div style={{ marginBottom: '3rem' }}>
                  <InstitutionalContributions initialData={institutionalContributions} readOnly={true} />
                </div>
              </div>

              {(!techTransfer?.length && !teachingInnovation?.length && !institutionalContributions?.length) && (
                <p className="no-data">No innovation or contribution data available</p>
              )}
            </div>
          )}

          {activeTab === 'partb' && (
            <div className="section-card">
              <div className="mirror-component-wrapper">
                <PartB initialData={goals} readOnly={true} />
              </div>
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
