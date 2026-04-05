import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Eye, Send, CheckCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, BookOpen, Award,
  Briefcase, Lightbulb, User, RefreshCw, XCircle
} from 'lucide-react';
import './MySubmissionView.css';
import './DOFAReview.css';
import { useAuth } from '../context/AuthContext';

// Use existing mirror-mode components (read-only)
import CoursesTaught from './CoursesTaught';
import ResearchPublications from './ResearchPublications';
import ResearchGrants from './ResearchGrants';
import Patents from './Patents';
import AwardsHonours from './AwardsHonours';
import TeachingInnovation from './TeachingInnovation';
import InstitutionalContributions from './InstitutionalContributions';
import Consultancy from './Consultancy';
import PartB from './PartB';

const API = `http://${window.location.hostname}:5000/api`;

// Sections faculty can request edits for (must match backend SECTION_LABELS keys)
const EDITABLE_SECTIONS = [
  { key: 'faculty_info',                label: 'Faculty Information' },
  { key: 'courses_taught',              label: 'Courses Taught' },
  { key: 'new_courses',                 label: 'New Courses Developed' },
  { key: 'courseware',                  label: 'Courseware' },
  { key: 'teaching_innovation',         label: 'Teaching Innovation' },
  { key: 'research_publications',       label: 'Research Publications' },
  { key: 'research_grants',             label: 'Research Grants' },
  { key: 'patents',                     label: 'Patents' },
  { key: 'technology_transfer',         label: 'Technology Transfer' },
  { key: 'paper_review',                label: 'Paper Review' },
  { key: 'conference_sessions',         label: 'Conference Sessions' },
  { key: 'keynotes_talks',              label: 'Keynotes & Invited Talks' },
  { key: 'awards_honours',              label: 'Awards & Honours' },
  { key: 'consultancy',                 label: 'Consultancy' },
  { key: 'continuing_education',        label: 'Continuing Education' },
  { key: 'institutional_contributions', label: 'Institutional Contributions' },
  { key: 'other_activities',            label: 'Other Activities' },
  { key: 'research_plan',               label: 'Research Plan' },
  { key: 'teaching_plan',               label: 'Teaching Plan' },
  { key: 'part_b',                      label: 'Part B (Goal Setting)' },
];

const STATUS_LABELS = {
  draft:        'Draft',
  submitted:    'Submitted',
  under_review: 'Under Review',
  approved:     'Approved',
  sent_back:    'Sent Back',
};

const MySubmissionView = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [submissionData, setSubmissionData] = useState(null);
  const [sessionInfo,    setSessionInfo]    = useState(null);
  const [editRequests,   setEditRequests]   = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [activeTab,       setActiveTab]      = useState('faculty');
  const [editPanelOpen,   setEditPanelOpen]  = useState(false);

  // Edit request form state
  const [selectedSections, setSelectedSections] = useState([]);
  const [requestMessage,    setRequestMessage]   = useState('');
  const [submitting,        setSubmitting]        = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1. Get my submission
      const subRes = await fetch(`${API}/submissions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subData = await subRes.json();
      if (!subData.success || !subData.data) {
        setLoading(false);
        return;
      }
      const submission = subData.data;

      // 2. Get submission details (full data)
      const detailRes = await fetch(`${API}/submissions/${submission.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detailData = await detailRes.json();
      if (detailData.success) {
        setSubmissionData(detailData.data);
      }

      // 3. Get session info (for deadline)
      const sessionRes = await fetch(`${API}/sessions/active`);
      const sessionJson = await sessionRes.json();
      if (sessionJson.success) setSessionInfo(sessionJson);

      // 4. Get edit requests for this submission
      await fetchEditRequests(submission.id);
    } catch (err) {
      console.error('Error loading submission view:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditRequests = async (submissionId) => {
    try {
      const sid = submissionId || submissionData?.submission?.id;
      if (!sid) return;
      const res = await fetch(`${API}/edit-requests/my-submission/${sid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setEditRequests(data.data);
    } catch (err) {
      console.error('Error fetching edit requests:', err);
    }
  };

  const handleSectionToggle = (key) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmitEditRequest = async () => {
    if (selectedSections.length === 0) {
      alert('Please select at least one section to request edits for.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/edit-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          submission_id: submissionData.submission.id,
          requested_sections: selectedSections,
          request_message: requestMessage.trim() || null,
        })
      });
      const data = await res.json();

      if (data.success) {
        alert('✅ Your edit request has been submitted! DOFA has been notified via email. You will receive an email once it is reviewed.');
        setSelectedSections([]);
        setRequestMessage('');
        setEditPanelOpen(false);
        await fetchEditRequests(submissionData.submission.id);
      } else {
        alert('❌ ' + (data.message || 'Failed to submit edit request.'));
      }
    } catch (err) {
      alert('Error submitting request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Compute deadline status ──────────────────────────────────────────

  const isPastDeadline = sessionInfo?.pastDeadline || false;
  const isDeadlinePending = sessionInfo?.released && !isPastDeadline;

  // ─── Pending/approved edit request lookup ─────────────────────────────

  const pendingRequest  = editRequests.find(r => r.status === 'pending');
  const approvedRequest = editRequests.find(r => r.status === 'approved');

  const canRequestEdits =
    submissionData?.submission?.status === 'submitted' &&
    !isPastDeadline &&
    !pendingRequest;

  // ─── Loading / not found ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="my-submission-view">
        <div className="msv-loading">
          <div className="msv-spinner" />
          <p>Loading your submission...</p>
        </div>
      </div>
    );
  }

  if (!submissionData) {
    return (
      <div className="my-submission-view">
        <div className="msv-empty">
          <FileText size={48} strokeWidth={1} />
          <p>No submission found for the current academic year.</p>
          <button className="msv-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const {
    submission,
    facultyInfo,
    courses, newCourses,
    publications,
    grants, proposals,
    patents,
    awards,
    paperReviews,
    techTransfer,
    conferenceSessions, keynotesTalks,
    consultancy,
    teachingInnovation,
    institutionalContributions,
    goals,
    comments,
  } = submissionData;

  const statusLabel = STATUS_LABELS[submission?.status] || submission?.status;

  const tabs = [
    { key: 'faculty',       label: 'Faculty Info',     icon: <User size={15} /> },
    { key: 'teaching',      label: 'Teaching',         icon: <BookOpen size={15} /> },
    { key: 'publications',  label: 'Publications',     icon: <FileText size={15} /> },
    { key: 'research',      label: 'Research & Grants',icon: <Briefcase size={15} /> },
    { key: 'events',        label: 'Events & Awards',  icon: <Award size={15} /> },
    { key: 'consultancy',   label: 'Consultancy',      icon: <Briefcase size={15} /> },
    { key: 'innovation',    label: 'Innovation',       icon: <Lightbulb size={15} /> },
    { key: 'partb',         label: 'Part B',           icon: <CheckCircle size={15} /> },
  ];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="my-submission-view">
      {/* ── Header ── */}
      <div className="msv-header">
        <button className="msv-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="msv-title-block">
          <h1 className="msv-title">My Submitted Form</h1>
          <p className="msv-subtitle">Academic Year: {submission.academic_year}</p>
        </div>
        <span className={`msv-status-badge badge-${submission.status}`}>
          <CheckCircle size={13} /> {statusLabel}
        </span>
      </div>

      {/* ── Status Bar ── */}
      <div className={`msv-status-bar status-${submission.status}`}>
        <div className="msv-status-icon">
          {submission.status === 'submitted' || submission.status === 'approved'
            ? <CheckCircle size={26} />
            : submission.status === 'sent_back'
              ? <RefreshCw size={26} />
              : <Clock size={26} />}
        </div>
        <div className="msv-status-info">
          <h3>
            {submission.status === 'submitted' && 'Form Successfully Submitted'}
            {submission.status === 'approved' && 'Form Approved by DOFA'}
            {submission.status === 'sent_back' && 'Edit Access Granted'}
            {submission.status === 'draft' && 'Draft — Not Yet Submitted'}
            {submission.status === 'under_review' && 'Under Review'}
          </h3>
          <p>
            Submitted on <strong>{formatDate(submission.submitted_at)}</strong>
            {isPastDeadline && ' — Submission deadline has passed. No further edits are allowed.'}
            {!isPastDeadline && sessionInfo?.data?.deadline && ` · Deadline: ${formatDate(sessionInfo.data.deadline)}`}
          </p>
        </div>
      </div>

      {/* ── Edit Request Panel (only if submitted and not past deadline) ── */}
      {(submission.status === 'submitted' || pendingRequest || approvedRequest) && (
        <div className="msv-edit-panel">
          <div
            className="msv-edit-panel-header"
            onClick={() => setEditPanelOpen(o => !o)}
          >
            <div className="msv-edit-panel-header-left">
              <div className="msv-panel-icon">
                <Send size={18} />
              </div>
              <div>
                <h3>Request Section Edits</h3>
                <p>Ask DOFA to unlock specific sections for editing</p>
              </div>
            </div>
            {editPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {editPanelOpen && (
            <div className="msv-edit-panel-body">
              {/* Deadline passed notice */}
              {isPastDeadline && (
                <div className="msv-deadline-warning">
                  <AlertTriangle size={18} />
                  <span>The submission deadline has passed on <strong>{formatDate(sessionInfo?.data?.deadline)}</strong>. You can no longer request changes.</span>
                </div>
              )}

              {/* Pending request notice */}
              {pendingRequest && (
                <div className="msv-pending-notice">
                  <Clock size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p>
                    <strong>Edit request pending review.</strong> Your request submitted on {formatDate(pendingRequest.created_at)} is awaiting DOFA approval.
                    Sections requested: <strong>{pendingRequest.requested_sections?.join(', ')}</strong>
                  </p>
                </div>
              )}

              {/* Approved request notice */}
              {approvedRequest && !pendingRequest && (
                <div className="msv-approved-notice">
                  <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 2, color: '#059669' }} />
                  <div>
                    <p><strong>Edit access has been granted for the following sections:</strong></p>
                    <ul>
                      {approvedRequest.approved_sections?.map(s => (
                        <li key={s}>{EDITABLE_SECTIONS.find(e => e.key === s)?.label || s}</li>
                      ))}
                    </ul>
                    <p style={{ marginTop: 8, fontSize: '0.82rem', color: '#047857' }}>
                      Use the sidebar to navigate to those sections and make your changes. Then re-submit from Part B.
                    </p>
                  </div>
                </div>
              )}

              {/* New request form */}
              {canRequestEdits && !isPastDeadline && (
                <>
                  <p className="msv-sections-label">Select the sections you want to edit:</p>
                  <div className="msv-sections-grid">
                    {EDITABLE_SECTIONS.map(section => (
                      <label
                        key={section.key}
                        className={`msv-section-checkbox ${selectedSections.includes(section.key) ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section.key)}
                          onChange={() => handleSectionToggle(section.key)}
                        />
                        <span>{section.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="msv-request-message">
                    <label>Why do you need to make changes? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                    <textarea
                      value={requestMessage}
                      onChange={e => setRequestMessage(e.target.value)}
                      placeholder="Briefly explain the reason for requesting changes..."
                      rows={3}
                    />
                  </div>

                  <button
                    className="msv-submit-request-btn"
                    onClick={handleSubmitEditRequest}
                    disabled={submitting || selectedSections.length === 0}
                  >
                    {submitting ? (
                      <>
                        <span style={{
                          width: 15, height: 15,
                          border: '2px solid rgba(255,255,255,0.35)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'msvSpin 0.7s linear infinite',
                          flexShrink: 0
                        }} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        {`Submit Request (${selectedSections.length} section${selectedSections.length !== 1 ? 's' : ''})`}
                      </>
                    )}
                  </button>
                  <style>{`@keyframes msvSpin { to { transform: rotate(360deg); } }`}</style>
                </>
              )}

              {/* Past Requests history */}
              {editRequests.length > 0 && (
                <div className="msv-past-requests">
                  <h4>Request History</h4>
                  {editRequests.map(req => (
                    <div key={req.id} className="msv-request-item">
                      <span
                        className={`msv-request-item-status badge-${req.status}`}
                        style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        {req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Denied'}
                      </span>
                      <div className="msv-request-item-content">
                        <p>
                          <strong>Requested:</strong> {req.requested_sections?.join(', ')}
                        </p>
                        {req.approved_sections && (
                          <p><strong>Approved:</strong> {req.approved_sections.join(', ')}</p>
                        )}
                        {req.dofa_note && (
                          <p><strong>DOFA Note:</strong> {req.dofa_note}</p>
                        )}
                        <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                          {formatDate(req.created_at)}
                          {req.reviewed_at && ` · Reviewed: ${formatDate(req.reviewed_at)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="msv-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`msv-tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="msv-content-card">
        <div className="msv-section-card">

          {activeTab === 'faculty' && (
            <>
              <h3 className="msv-section-title"><User size={18} /> Faculty Information</h3>
              {facultyInfo && Object.keys(facultyInfo).length > 0 ? (
                <div className="msv-info-grid">
                  {[
                    ['Name', facultyInfo.name],
                    ['Employee ID', facultyInfo.employee_id],
                    ['Department', facultyInfo.department],
                    ['Designation', facultyInfo.designation],
                    ['Email', facultyInfo.email],
                    ['Phone', facultyInfo.phone],
                    ['Date of Joining', facultyInfo.date_of_joining ? new Date(facultyInfo.date_of_joining).toLocaleDateString('en-IN') : null],
                  ].map(([label, val]) => (
                    <div key={label} className="msv-info-item">
                      <label>{label}</label>
                      <p>{val || '—'}</p>
                    </div>
                  ))}
                  <div className="msv-info-item msv-full-width">
                    <label>Qualifications</label>
                    <p>{facultyInfo.qualifications || '—'}</p>
                  </div>
                </div>
              ) : <p className="msv-no-data">No faculty information available.</p>}
            </>
          )}

          {activeTab === 'teaching' && (
            <>
              <h3 className="msv-section-title"><BookOpen size={18} /> Teaching & Courses</h3>
              <div className="mirror-component-wrapper">
                <CoursesTaught initialData={{ courses, newCourses }} readOnly={true} />
              </div>
            </>
          )}

          {activeTab === 'publications' && (
            <>
              <h3 className="msv-section-title"><FileText size={18} /> Research Publications</h3>
              {publications && publications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {publications.map((pub, i) => (
                    <div key={i} className="mirror-component-wrapper" style={{ border: '1px solid #eee', borderRadius: 8, padding: '1rem', background: '#fafafa' }}>
                      <ResearchPublications initialData={pub} readOnly={true} />
                    </div>
                  ))}
                </div>
              ) : <p className="msv-no-data">No publications data available.</p>}
            </>
          )}

          {activeTab === 'research' && (
            <>
              <h3 className="msv-section-title"><Briefcase size={18} /> Research Grants & Proposals</h3>
              <div className="mirror-component-wrapper">
                <ResearchGrants initialData={{ grants, proposals }} readOnly={true} />
              </div>
            </>
          )}

          {activeTab === 'events' && (
            <>
              <h3 className="msv-section-title"><Award size={18} /> Events, Patents & Awards</h3>
              <div style={{ marginBottom: '2.5rem' }}>
                <h4 style={{ color: '#1e3a5f', marginBottom: '1rem', fontSize: '1rem' }}>Patents</h4>
                <div className="mirror-component-wrapper">
                  <Patents initialData={patents || []} readOnly={true} />
                </div>
              </div>
              <div>
                <h4 style={{ color: '#1e3a5f', marginBottom: '1rem', fontSize: '1rem' }}>Awards & Honours</h4>
                <div className="mirror-component-wrapper">
                  <AwardsHonours initialData={awards || []} readOnly={true} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'consultancy' && (
            <>
              <h3 className="msv-section-title"><Briefcase size={18} /> Consultancy</h3>
              {consultancy && consultancy.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {consultancy.map((item, i) => (
                    <div key={i} className="mirror-component-wrapper" style={{ border: '1px solid #eee', borderRadius: 8, padding: '1rem', background: '#fafafa' }}>
                      <Consultancy initialData={item} readOnly={true} />
                    </div>
                  ))}
                </div>
              ) : <p className="msv-no-data">No consultancy data available.</p>}
            </>
          )}

          {activeTab === 'innovation' && (
            <>
              <h3 className="msv-section-title"><Lightbulb size={18} /> Innovation & Institutional Contributions</h3>
              <div style={{ marginBottom: '2.5rem' }}>
                <TeachingInnovation initialData={teachingInnovation} readOnly={true} />
              </div>
              <div>
                <InstitutionalContributions initialData={institutionalContributions} readOnly={true} />
              </div>
            </>
          )}

          {activeTab === 'partb' && (
            <>
              <h3 className="msv-section-title"><CheckCircle size={18} /> Part B — Goal Setting</h3>
              <div className="mirror-component-wrapper">
                <PartB initialData={goals} readOnly={true} />
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Comments from DOFA ── */}
      {comments && comments.length > 0 && (
        <div className="msv-content-card" style={{ marginTop: 20 }}>
          <div className="msv-section-card">
            <h3 className="msv-section-title">Comments from DOFA</h3>
            {comments.map((c, i) => (
              <div key={i} className="msv-request-item" style={{ marginBottom: 8 }}>
                <div className="msv-request-item-content">
                  <p><strong>{c.reviewer_name || 'DOFA Office'}</strong> — {formatDate(c.created_at)}</p>
                  <p style={{ marginTop: 4, color: '#334155' }}>{c.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySubmissionView;
