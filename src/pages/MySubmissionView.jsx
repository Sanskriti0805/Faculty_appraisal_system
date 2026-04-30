
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, FileText, Send, CheckCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, BookOpen, Award,
  Briefcase, Lightbulb, User, RefreshCw, ExternalLink,
  Layers, Download, Loader
} from 'lucide-react';
import './MySubmissionView.css';
import { useAuth } from '../context/AuthContext';

const API = `http://${window.location.hostname}:5001/api`;

const REQUESTABLE_SECTION_GROUPS = [
  { key: 'teaching_learning', label: 'Teaching and Learning' },
  { key: 'research_development', label: 'Research and Development' },
  { key: 'other_institutional_activities', label: 'Other Institutional Activities' },
];

const SECTION_LABELS = [
  { key: 'teaching_learning', label: 'Teaching and Learning' },
  { key: 'research_development', label: 'Research and Development' },
  { key: 'other_institutional_activities', label: 'Other Institutional Activities' },
  { key: 'faculty_info', label: 'Faculty Information' },
  { key: 'courses_taught', label: 'Courses Taught' },
  { key: 'new_courses', label: 'New Courses Developed' },
  { key: 'courseware', label: 'Courseware' },
  { key: 'teaching_innovation', label: 'Teaching Innovation' },
  { key: 'research_publications', label: 'Research Publications' },
  { key: 'research_grants', label: 'Research Grants' },
  { key: 'patents', label: 'Patents' },
  { key: 'technology_transfer', label: 'Technology Transfer' },
  { key: 'paper_review', label: 'Paper Review' },
  { key: 'conference_sessions', label: 'Conference Sessions' },
  { key: 'keynotes_talks', label: 'Keynotes & Invited Talks' },
  { key: 'awards_honours', label: 'Awards & Honours' },
  { key: 'consultancy', label: 'Consultancy' },
  { key: 'continuing_education', label: 'Continuing Education' },
  { key: 'institutional_contributions', label: 'Institutional Contributions' },
  { key: 'other_activities', label: 'Other Activities' },
  { key: 'research_plan', label: 'Research Plan' },
  { key: 'teaching_plan', label: 'Teaching Plan' },
  { key: 'part_b', label: 'Part B (Goal Setting)' },
].reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

const STATUS_LABELS = {
  draft:        'Draft',
  submitted:    'Submitted',
  submitted_hod: 'Submitted',
  under_review: 'Under Review',
  under_review_hod: 'Under Review',
  approved:     'Approved',
  hod_approved: 'Approved',
  sent_back:    'Sent Back',
};

const MySubmissionView = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [submissionData, setSubmissionData] = useState(null);
  const [sessionInfo,    setSessionInfo]    = useState(null);
  const [editRequests,   setEditRequests]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('faculty');
  const [editPanelOpen,  setEditPanelOpen]  = useState(false);
  const [commentView,    setCommentView]    = useState('pending');
  // Dynamic sections filled by this faculty
  const [dynamicData, setDynamicData] = useState([]); // [{section, fields, responses}]
  const [dynamicSectionOptions, setDynamicSectionOptions] = useState([]);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const [selectedSections, setSelectedSections] = useState([]);
  const [requestMessage,   setRequestMessage]   = useState('');
  const [submitting,       setSubmitting]        = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const subRes = await fetch(`${API}/submissions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subData = await subRes.json();
      if (!subData.success || !subData.data) { setLoading(false); return; }
      const submission = subData.data;

      const detailRes = await fetch(`${API}/submissions/${submission.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detailData = await detailRes.json();
      if (detailData.success) {
        setSubmissionData(detailData.data);
        setDynamicData(Array.isArray(detailData.data?.dynamicData) ? detailData.data.dynamicData : []);
      }

      const sessionRes = await fetch(`${API}/sessions/active`);
      const sessionJson = await sessionRes.json();
      if (sessionJson.success) setSessionInfo(sessionJson);

      await fetchEditRequests(submission.id);

      // -- Fetch dynamic sections list for edit-request options -----------------
      try {
        const schemaRes = await fetch(`${API}/form-builder/schema/flat`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const schemaJson = await schemaRes.json();

        if (schemaJson.success) {
          const currentFormType = submission.form_type || null;
          const normalized = (schemaJson.data || [])
            .filter((s) => !s.parent_id)
            .filter((s) => {
              if (!currentFormType) return true;
              const ft = String(s.form_type || '').trim().toLowerCase();
              if (!ft || ft === 'all') return true;
              return ft === String(currentFormType).trim().toLowerCase();
            })
            .map((s) => ({
              key: `dynamic_section_${s.id}`,
              label: s.title || `Dynamic Section ${s.id}`
            }));
          setDynamicSectionOptions(normalized);
        }
      } catch (dynErr) {
        console.warn('Could not load dynamic section options:', dynErr);
      }

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

  const handleSectionToggle = (key) =>
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );

  const handleSubmitEditRequest = async () => {
    if (selectedSections.length === 0) {
      window.appToast('Please select at least one section to request edits for.');
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
        window.appToast('Your edit request has been submitted. DoFA has been notified.');
        setSelectedSections([]);
        setRequestMessage('');
        setEditPanelOpen(false);
        await fetchEditRequests(submissionData.submission.id);
      } else {
        window.appToast('Error: ' + (data.message || 'Failed to submit edit request.'));
      }
    } catch (err) {
      window.appToast('Error submitting request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isPastDeadline   = sessionInfo?.pastDeadline || false;
  const pendingRequest   = editRequests.find(r => r.status === 'pending');
  const approvedRequest  = editRequests.find(r => r.status === 'approved');
  const submittedStatuses = new Set(['submitted', 'submitted_hod', 'under_review', 'under_review_hod']);
  const isSubmittedLikeStatus = submittedStatuses.has(submissionData?.submission?.status);
  const canRequestEdits  =
    isSubmittedLikeStatus &&
    !isPastDeadline && !pendingRequest;

  useEffect(() => {
    if (!submissionData) return;
    const params = new URLSearchParams(location.search);
    if (params.get('openEditRequest') !== '1') return;

    const canShowPanel = isSubmittedLikeStatus || !!pendingRequest || !!approvedRequest;
    if (!canShowPanel) return;

    setEditPanelOpen(true);
    window.requestAnimationFrame(() => {
      const panel = document.querySelector('.msv-edit-panel');
      if (panel && typeof panel.scrollIntoView === 'function') {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [location.search, submissionData, pendingRequest, approvedRequest, isSubmittedLikeStatus]);

  /* -- PDF download -- */
  const handleDownloadPdf = async () => {
    const subId = submissionData?.submission?.id;
    if (!subId) return;
    setPdfDownloading(true);
    try {
      const res = await fetch(`${API}/submissions/${subId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Appraisal_${submissionData?.submission?.academic_year || 'report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.appToast('Could not generate PDF: ' + err.message);
    } finally {
      setPdfDownloading(false);
    }
  };

  /* Helpers */
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

  const uploadBase = `http://${window.location.hostname}:5000/uploads/`;

  const toLabel = (key) =>
    String(key || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const resolveSectionLabel = (sectionKey) => {
    if (SECTION_LABELS[sectionKey]) return SECTION_LABELS[sectionKey];
    const knownDynamic = dynamicSectionOptions.find((s) => s.key === sectionKey);
    if (knownDynamic) return knownDynamic.label;
    const dynamicMatch = String(sectionKey || '').match(/^dynamic_section_(\d+)$/);
    if (!dynamicMatch) return sectionKey;
    const sectionId = Number(dynamicMatch[1]);
    const dynamic = dynamicData.find((entry) => Number(entry?.section?.id) === sectionId);
    return dynamic?.section?.title || sectionKey;
  };

  const formatCellValue = (value, key) => {
    if (value === null || value === undefined || value === '')
      return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>-</span>;

    if (key && key.includes('evidence_file') && typeof value === 'string') {
      return (
        <a href={`${uploadBase}${value}`} target="_blank" rel="noopener noreferrer" className="msv-link-cell">
          <ExternalLink size={11} /> View File
        </a>
      );
    }

    if ((key === 'authors' || key === 'editors') && Array.isArray(value)) {
      if (value.length === 0) return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>-</span>;
      return value
        .map((person) => {
          if (!person || typeof person !== 'object') return String(person || '');
          return [
            person.first || person.first_name,
            person.middle || person.middle_name,
            person.last || person.last_name
          ].filter(Boolean).join(' ');
        })
        .filter(Boolean)
        .join(', ');
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-IN');
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>-</span>;
      return value.map(e => typeof e === 'object' ? JSON.stringify(e) : String(e)).join(', ');
    }

    if (typeof value === 'object') return JSON.stringify(value);

    return String(value);
  };

  const renderDataTable = (title, rows, preferredColumns = []) => {
    const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (safeRows.length === 0) {
      return (
        <div className="msv-data-section" key={title}>
          <h4 className="msv-subsection-title">{title}</h4>
          <p className="msv-no-data-inline">No submitted entries.</p>
        </div>
      );
    }

    const hidden = new Set(['id', 'faculty_id']);
    const rawCols = Object.keys(safeRows[0]).filter(k => !hidden.has(k));
    const preferred = preferredColumns.filter(k => rawCols.includes(k));
    const rest = rawCols.filter(k => !preferred.includes(k));
    const columns = [...preferred, ...rest];
    const columnLabels = title === 'Consultancy Projects'
      ? { amount: 'Amount (INR lacs)' }
      : {};

    return (
      <div className="msv-data-section" key={title}>
        <h4 className="msv-subsection-title">{title}
          <span style={{
            marginLeft: '0.5rem', padding: '0.1rem 0.45rem',
            background: '#e0e7ff', color: '#3730a3',
            borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700
          }}>{safeRows.length}</span>
        </h4>
        <div className="msv-table-wrap">
          <table className="msv-table">
            <thead>
              <tr>
                {columns.map(col => <th key={col}>{columnLabels[col] || toLabel(col)}</th>)}
              </tr>
            </thead>
            <tbody>
              {safeRows.map((row, idx) => (
                <tr key={`${title}-${idx}`}>
                  {columns.map(col => (
                    <td key={`${title}-${idx}-${col}`}>{formatCellValue(row[col], col)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFieldGrid = (title, data) => {
    const entries = Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (entries.length === 0) {
      return (
        <div className="msv-data-section" key={title}>
          <h4 className="msv-subsection-title">{title}</h4>
          <p className="msv-no-data-inline">No submitted entries.</p>
        </div>
      );
    }
    return (
      <div className="msv-data-section" key={title}>
        <h4 className="msv-subsection-title">{title}</h4>
        <div className="msv-info-grid">
          {entries.map(([key, value]) => (
            <div key={key} className="msv-info-item">
              <label>{toLabel(key)}</label>
              <p>{formatCellValue(value, key)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const parseStoredContent = (value) => {
    if (!value) return null;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch (_) {
      return { details: value };
    }
  };

  const renderGoalsBySemester = () => {
    const safeGoals = Array.isArray(goals) ? goals : [];
    if (safeGoals.length === 0) return <p className="msv-no-data">No goals data available.</p>;
    const semesters = [...new Set(safeGoals.map(g => g.semester || 'Unspecified'))];
    return semesters.map(sem => renderDataTable(
      `Semester: ${sem}`,
      safeGoals.filter(g => (g.semester || 'Unspecified') === sem),
      ['teaching', 'research', 'contribution', 'outreach', 'description', 'evidence_file']
    ));
  };

  /* States */
  if (loading) return (
    <div className="my-submission-view">
      <div className="msv-loading">
        <div className="msv-spinner" />
        <p>Loading your submission...</p>
      </div>
    </div>
  );

  if (!submissionData) return (
    <div className="my-submission-view">
      <div className="msv-empty">
        <FileText size={44} strokeWidth={1.25} />
        <p>No submission found for the current academic year.</p>
        <button className="msv-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    </div>
  );

  const {
    submission, facultyInfo, courses, newCourses, publications,
    grants, proposals, patents, awards, paperReviews, techTransfer,
    conferenceSessions, keynotesTalks, consultancy, teachingInnovation,
    institutionalContributions, goals, comments, courseware, continuingEducation,
    otherActivities, researchPlan, teachingPlan,
  } = submissionData;

  const allTeachingRows = Array.isArray(courses) ? courses : [];
  const taughtCourses = allTeachingRows.filter((row) => {
    const section = String(row?.section || '').trim().toLowerCase();
    return section !== 'projects' && section !== 'project';
  });
  const guidedProjects = allTeachingRows.filter((row) => {
    const section = String(row?.section || '').trim().toLowerCase();
    return section === 'projects' || section === 'project';
  });

  const dynamicEditableSections = dynamicSectionOptions;

  const editableSections = REQUESTABLE_SECTION_GROUPS;

  const statusLabel = STATUS_LABELS[submission?.status] || submission?.status;

  const tabs = [
    { key: 'faculty',      label: 'Faculty Info',      icon: <User size={14} /> },
    { key: 'teaching',     label: 'Teaching',           icon: <BookOpen size={14} /> },
    { key: 'publications', label: 'Publications',       icon: <FileText size={14} />, count: publications?.length },
    { key: 'research',     label: 'Research & Grants',  icon: <Briefcase size={14} /> },
    { key: 'events',       label: 'Events & Awards',    icon: <Award size={14} /> },
    { key: 'consultancy',  label: 'Consultancy',        icon: <Briefcase size={14} />, count: consultancy?.length },
    { key: 'innovation',   label: 'Innovation',         icon: <Lightbulb size={14} /> },
    { key: 'additional',   label: 'Additional',         icon: <FileText size={14} /> },
    { key: 'partb',        label: 'Part B',             icon: <CheckCircle size={14} /> },
    // Show custom tab when dynamic sections exist for this form type
    ...(dynamicEditableSections.length > 0 ? [{
      key: 'dynamic',
      label: 'Custom Sections',
      icon: <Layers size={14} />,
      count: dynamicEditableSections.length
    }] : []),
  ];

  return (
    <div className="my-submission-view">

      {/* Header */}
      <div className="msv-header">
        <button className="msv-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="msv-title-block">
          <h1 className="msv-title">My Submitted Form</h1>
          <p className="msv-subtitle">Academic Year: {submission.academic_year}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className={`msv-status-badge badge-${submission.status}`}>
            <CheckCircle size={12} /> {statusLabel}
          </span>
          <button
            className="msv-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={pdfDownloading}
            title="Download full appraisal as PDF"
          >
            {pdfDownloading
              ? <><Loader size={14} className="msv-pdf-spin" /> Generating PDF...</>
              : <><Download size={14} /> Download PDF</>}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`msv-status-bar status-${submission.status}`}>
        <div className="msv-status-icon">
          {submission.status === 'submitted' || submission.status === 'approved'
            ? <CheckCircle size={22} />
            : submission.status === 'sent_back'
              ? <RefreshCw size={22} />
              : <Clock size={22} />}
        </div>
        <div className="msv-status-info">
          <h3>
            {submission.status === 'submitted'    && 'Form Successfully Submitted'}
            {submission.status === 'approved'     && 'Form Approved by Dofa'}
            {submission.status === 'sent_back'    && 'Edit Access Granted'}
            {submission.status === 'draft'        && 'Draft - Not Yet Submitted'}
            {submission.status === 'under_review' && 'Under Review'}
          </h3>
          <p>
            Submitted on <strong>{formatDate(submission.submitted_at)}</strong>
            {isPastDeadline && ' | Submission deadline has passed. No further edits allowed.'}
            {!isPastDeadline && sessionInfo?.data?.deadline &&
              ` | Deadline: ${formatDate(sessionInfo.data.deadline)}`}
          </p>
        </div>
      </div>

      {/* Edit Request Panel */}
      {(isSubmittedLikeStatus || pendingRequest || approvedRequest) && (
        <div className="msv-edit-panel">
          <div className="msv-edit-panel-header" onClick={() => setEditPanelOpen(o => !o)}>
            <div className="msv-edit-panel-header-left">
              <div className="msv-panel-icon"><Send size={16} /></div>
              <div>
                <h3>Request Section Edits</h3>
                <p>Ask Dofa to unlock specific sections for editing</p>
              </div>
            </div>
            {editPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {editPanelOpen && (
            <div className="msv-edit-panel-body">
              {isPastDeadline && (
                <div className="msv-deadline-warning">
                  <AlertTriangle size={16} />
                  <span>The submission deadline has passed on <strong>{formatDate(sessionInfo?.data?.deadline)}</strong>. You can no longer request changes.</span>
                </div>
              )}

              {pendingRequest && (
                <div className="msv-pending-notice">
                  <Clock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p>
                    <strong>Edit request pending review.</strong> Submitted on {formatDate(pendingRequest.created_at)}.{' '}
                    Sections: <strong>{(pendingRequest.requested_sections || []).map(resolveSectionLabel).join(', ')}</strong>
                  </p>
                </div>
              )}

              {approvedRequest && !pendingRequest && (
                <div className="msv-approved-notice">
                  <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#059669' }} />
                  <div>
                    <p><strong>Edit access granted for:</strong></p>
                    <ul>
                      {approvedRequest.approved_sections?.map(s => (
                        <li key={s}>{resolveSectionLabel(s)}</li>
                      ))}
                    </ul>
                    <p style={{ marginTop: 6, fontSize: '0.78rem', color: '#047857' }}>
                      Navigate to those sections in the sidebar and make your changes, then re-submit from Part B.
                    </p>
                  </div>
                </div>
              )}

              {canRequestEdits && !isPastDeadline && (
                <>
                  <p className="msv-sections-label">Select sections you want to edit:</p>
                  <div className="msv-sections-grid">
                    {editableSections.map(section => (
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
                    <label>Reason for changes <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea
                      value={requestMessage}
                      onChange={e => setRequestMessage(e.target.value)}
                      placeholder="Briefly explain why you need to make changes..."
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
                          width: 14, height: 14,
                          border: '2px solid rgba(255,255,255,0.3)',
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
                        <Send size={14} />
                        Submit Request{selectedSections.length > 0 ? ` (${selectedSections.length})` : ''}
                      </>
                    )}
                  </button>
                  <style>{`@keyframes msvSpin { to { transform: rotate(360deg); } }`}</style>
                </>
              )}

              {editRequests.length > 0 && (
                <div className="msv-past-requests">
                  <h4>Request History</h4>
                  {editRequests.map(req => (
                    <div key={req.id} className="msv-request-item">
                      <span className={`msv-request-item-status badge-${req.status}`}>
                        {req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Denied'}
                      </span>
                      <div className="msv-request-item-content">
                        <p><strong>Requested:</strong> {(req.requested_sections || []).map(resolveSectionLabel).join(', ')}</p>
                        {req.approved_sections && <p><strong>Approved:</strong> {req.approved_sections.map(resolveSectionLabel).join(', ')}</p>}
                        {req.Dofa_note && <p><strong>Note:</strong> {req.Dofa_note}</p>}
                        <p style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          {formatDate(req.created_at)}
                          {req.reviewed_at && ` | Reviewed: ${formatDate(req.reviewed_at)}`}
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

      {/* Tabs */}
      <div className="msv-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`msv-tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 17, height: 17, padding: '0 3px',
                background: activeTab === t.key ? 'rgba(255,255,255,0.25)' : '#e0e7ff',
                color: activeTab === t.key ? '#fff' : '#3730a3',
                borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="msv-content-card">
        <div className="msv-section-card">

          {activeTab === 'faculty' && (
            <>
              <h3 className="msv-section-title"><User size={17} /> Faculty Information</h3>
              {renderFieldGrid('Submitted Faculty Profile', facultyInfo)}
            </>
          )}

          {activeTab === 'teaching' && (
            <>
              <h3 className="msv-section-title"><BookOpen size={17} /> Teaching & Courses</h3>
              {renderDataTable('Courses Taught', taughtCourses, ['course_code', 'course_name', 'course_title', 'semester', 'session_id', 'program', 'enrollment', 'students', 'percentage', 'feedback_score', 'remarks', 'evidence_file'])}
              {renderDataTable('Projects Guided', guidedProjects, ['semester', 'session_id', 'project_title', 'project_type', 'project_role', 'student_name', 'project_duration', 'project_outcome', 'remarks', 'evidence_file'])}
              {renderDataTable('New Courses Developed', newCourses, ['title', 'course_name', 'semester', 'year', 'role', 'evidence_file'])}
            </>
          )}

          {activeTab === 'publications' && (
            <>
              <h3 className="msv-section-title"><FileText size={17} /> Research Publications</h3>
              {renderDataTable('Research Publications', publications, ['publication_type', 'sub_type', 'title', 'details', 'authors', 'editors', 'year_of_publication', 'journal_name', 'conference_name', 'type_of_conference', 'date_from', 'date_to', 'publication_agency', 'title_of_book', 'evidence_file'])}
            </>
          )}

          {activeTab === 'research' && (
            <>
              <h3 className="msv-section-title"><Briefcase size={17} /> Research Grants & Proposals</h3>
              {renderDataTable('Research Grants', grants, ['grant_type', 'project_name', 'funding_agency', 'currency', 'grant_amount', 'amount_in_lakhs', 'duration', 'researchers', 'role', 'evidence_file'])}
              {renderDataTable('Submitted Proposals', proposals, ['title', 'funding_agency', 'currency', 'grant_amount', 'amount_in_lakhs', 'duration', 'submission_date', 'status', 'role', 'evidence_file'])}
              {renderDataTable('Technology Transfer', techTransfer, ['title', 'details', 'year', 'organization', 'role', 'evidence_file'])}
            </>
          )}

          {activeTab === 'events' && (
            <>
              <h3 className="msv-section-title"><Award size={17} /> Events, Patents & Awards</h3>
              {renderDataTable('Patents', patents, ['title', 'patent_number', 'status', 'year', 'country', 'evidence_file'])}
              {renderDataTable('Awards & Honours', awards, ['title', 'awarding_body', 'year', 'level', 'evidence_file'])}
              {renderDataTable('Paper Reviews', paperReviews, ['journal_name', 'review_count', 'year', 'details', 'evidence_file'])}
              {renderDataTable('Conference Sessions', conferenceSessions, ['conference_name', 'role', 'date', 'location', 'evidence_file'])}
              {renderDataTable('Keynotes & Talks', keynotesTalks, ['title', 'event_name', 'date', 'location', 'evidence_file'])}
            </>
          )}

          {activeTab === 'consultancy' && (
            <>
              <h3 className="msv-section-title"><Briefcase size={17} /> Consultancy</h3>
              {renderDataTable('Consultancy Projects', consultancy, ['organization', 'project_title', 'role', 'duration', 'amount', 'year', 'evidence_file'])}
            </>
          )}

          {activeTab === 'innovation' && (
            <>
              <h3 className="msv-section-title"><Lightbulb size={17} /> Innovation & Institutional Contributions</h3>
              {renderDataTable('Teaching Innovation', teachingInnovation, ['title', 'description', 'impact', 'year', 'evidence_file'])}
              {renderDataTable('Institutional Contributions', institutionalContributions, ['category', 'activity', 'role', 'year', 'details', 'evidence_file'])}
            </>
          )}

          {activeTab === 'partb' && (
            <>
              <h3 className="msv-section-title"><CheckCircle size={17} /> Part B - Goal Setting</h3>
              {renderGoalsBySemester()}
            </>
          )}

          {activeTab === 'additional' && (
            <>
              <h3 className="msv-section-title"><FileText size={17} /> Additional Sections</h3>
              {renderFieldGrid('Courseware & Course Material', parseStoredContent(courseware))}
              {renderFieldGrid('Continuing Education', parseStoredContent(continuingEducation))}
              {renderFieldGrid('Other Activities', parseStoredContent(otherActivities))}
              {renderFieldGrid('Research Plan', parseStoredContent(researchPlan))}
              {renderFieldGrid('Teaching Plan', parseStoredContent(teachingPlan))}
            </>
          )}

          {/* Dynamic / Custom Sections */}
          {activeTab === 'dynamic' && (
            <>
              <h3 className="msv-section-title"><Layers size={17} /> Custom Sections</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                These sections were added by the Dofa office specifically for your college's appraisal form.
              </p>
              {dynamicData.map(({ section, fields = [], respMap = {} }) => (
                <div key={section.id} className="msv-data-section" style={{ marginBottom: '2rem' }}>
                  <h4 className="msv-subsection-title">
                    {section.title}
                    <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.45rem', background: '#e0e7ff', color: '#3730a3', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700 }}>
                      Form {section.form_type}
                    </span>
                  </h4>
                  {fields.map(field => {
                    const value = Object.prototype.hasOwnProperty.call(respMap, field.id)
                      ? respMap[field.id]
                      : field.value;

                    // Table field: render as a proper table
                    if (field.field_type === 'table' && Array.isArray(value) && value.length > 0) {
                      const cols = field.config?.columns || [];
                      return (
                        <div key={field.id} style={{ marginBottom: '1rem' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155', marginBottom: '0.5rem' }}>{field.label}</p>
                          <div className="msv-table-wrap">
                            <table className="msv-table">
                              <thead>
                                <tr>{cols.map(c => <th key={c.key}>{c.header}</th>)}</tr>
                              </thead>
                              <tbody>
                                {value.map((row, ri) => (
                                  <tr key={ri}>
                                    {cols.map(c => <td key={c.key}>{row[c.key] ?? '-'}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }

                    // Text / textarea / comment field
                    return (
                      <div key={field.id} className="msv-info-item" style={{ marginBottom: '0.75rem' }}>
                        <label>{field.label}</label>
                        <p style={{ whiteSpace: 'pre-wrap' }}>
                          {Array.isArray(value) ? value.join(', ') : String(value ?? '-')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}

        </div>
      </div>

      {/* Dofa Comments */}
      {comments && comments.length > 0 && (
        <div className="msv-content-card" style={{ marginTop: '1.25rem' }}>
          <div className="msv-section-card">
            <h3 className="msv-section-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Comments from Dofa
            </h3>
            {comments.length > 0 && (
              <div className="msv-comment-view-tabs" role="tablist" aria-label="Comment status filters">
                <button type="button" className={`msv-comment-view-tab ${commentView === 'pending' ? 'active' : ''}`} onClick={() => setCommentView('pending')}>
                  Pending <span>{comments.filter((c) => Number(c.is_resolved) !== 1).length}</span>
                </button>
                <button type="button" className={`msv-comment-view-tab ${commentView === 'resolved' ? 'active' : ''}`} onClick={() => setCommentView('resolved')}>
                  Resolved <span>{comments.filter((c) => Number(c.is_resolved) === 1).length}</span>
                </button>
              </div>
            )}

            {commentView === 'pending' ? (
              comments.filter((c) => Number(c.is_resolved) !== 1).length > 0 ? comments
                .filter((c) => Number(c.is_resolved) !== 1)
                .map((c, i) => (
                  <div key={`pending-${i}-${c.id || ''}`} className="msv-request-item" style={{ marginBottom: '0.5rem' }}>
                    <div className="msv-request-item-content">
                      <p><strong>{c.reviewer_name || 'Dofa Office'}</strong> | {formatDate(c.created_at)}</p>
                      <div className="msv-comment-section-row">
                        <span className="msv-comment-section-badge">{c.section_name || 'General'}</span>
                      </div>
                      <p style={{ marginTop: '0.25rem', color: '#334155' }}>{c.comment}</p>
                    </div>
                  </div>
                )) : <p className="no-comments" style={{ textAlign: 'left' }}>No pending comments</p>
            ) : (
              comments.filter((c) => Number(c.is_resolved) === 1).length > 0 ? comments
                .filter((c) => Number(c.is_resolved) === 1)
                .map((c, i) => (
                  <div key={`resolved-${i}-${c.id || ''}`} className="msv-request-item" style={{ marginBottom: '0.5rem' }}>
                    <div className="msv-request-item-content">
                      <p><strong>{c.reviewer_name || 'Dofa Office'}</strong> | {formatDate(c.created_at)}</p>
                      <div className="msv-comment-section-row">
                        <span className="msv-comment-section-badge">{c.section_name || 'General'}</span>
                        <span className="msv-comment-resolved-badge">
                          Resolved{c.resolved_in_version ? ` in v${c.resolved_in_version}` : ''}
                        </span>
                      </div>
                      <p style={{ marginTop: '0.25rem', color: '#334155' }}>{c.comment}</p>
                    </div>
                  </div>
                )) : <p className="no-comments" style={{ textAlign: 'left' }}>No resolved comments</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default MySubmissionView;
