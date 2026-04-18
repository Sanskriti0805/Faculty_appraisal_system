import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, MessageSquare, User, BookOpen,
  FileText, Award, Briefcase, ExternalLink, Lightbulb, ChevronDown
} from 'lucide-react';
import './DofaReview.css';
import { showConfirm } from '../utils/appDialogs';

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

const decodeTokenPayload = (token) => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch (_) {
    return null;
  }
};

const COMMENT_SECTIONS = [
  { key: 'faculty_info', label: 'Faculty Information' },
  { key: 'courses_taught', label: 'Teaching & Projects' },
  { key: 'research_publications', label: 'Research Publications' },
  { key: 'research_grants', label: 'Research, Grants & Reviews' },
  { key: 'patents', label: 'Events, Patents & Awards' },
  { key: 'consultancy', label: 'Consultancy' },
  { key: 'teaching_innovation', label: 'Innovation & Contributions' },
  { key: 'continuing_education', label: 'Additional' },
  { key: 'part_b', label: 'Part B' }
];

const TAB_TO_SECTION_KEY = {
  faculty: 'faculty_info',
  teaching: 'courses_taught',
  publications: 'research_publications',
  research: 'research_grants',
  events: 'patents',
  consultancy: 'consultancy',
  innovation: 'teaching_innovation',
  additional: 'continuing_education',
  partb: 'part_b'
};

const SECTION_KEY_TO_LABEL = COMMENT_SECTIONS.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

/* -- Collapsible Section ----------------------------------- */
const CollapsibleSection = ({ title, count, children, defaultOpen = false, icon }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible-section">
      <button className="collapsible-header" onClick={() => setOpen(o => !o)}>
        <span className="collapsible-header-left">
          {icon}
          {title}
          {count !== undefined && (
            <span className="table-count-badge">{count}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`collapsible-chevron ${open ? 'open' : ''}`}
        />
      </button>
      <div className={`collapsible-body ${open ? 'open' : ''}`}>
        {children}
      </div>
    </div>
  );
};

/* -- Publication Detail Card ------------------------------- */
const PubDetailCard = ({ pub }) => {
  const field = (label, value, fullWidth = false, badge = null) => {
    const isEmpty = value === null || value === undefined || value === '';
    return (
      <div className={`pub-detail-field${fullWidth ? ' full-width' : ''}`}>
        <label>{label}</label>
        {badge ? (
          <span><span className={`pub-badge ${badge}`}>{isEmpty ? '-' : String(value)}</span></span>
        ) : (
          <span className={isEmpty ? 'empty' : ''}>{isEmpty ? '-' : String(value)}</span>
        )}
      </div>
    );
  };

  const getQuartileBadge = (q) => {
    if (!q) return null;
    const s = String(q).toLowerCase();
    if (s.includes('q1')) return 'q1';
    if (s.includes('q2')) return 'q2';
    if (s.includes('q3')) return 'q3';
    if (s.includes('q4')) return 'q4';
    return null;
  };

  // Flatten authors array to readable string
  const authorsStr = Array.isArray(pub?.authors)
    ? pub.authors.map(a => [a.first, a.middle, a.last].filter(Boolean).join(' ')).join(', ')
    : pub?.authors || null;

  return (
    <div className="pub-detail-grid">
      {field('Authors', authorsStr, true)}
      {field('Title', pub?.title, true)}
      {field('Publication Type', pub?.publication_type)}
      {field('Sub Type', pub?.sub_type)}
      {field('Year', pub?.year_of_publication)}
      {field('Journal / Conference / Book', pub?.journal_name || pub?.conference_name || pub?.book_title, true)}
      {field('Publisher / Agency', pub?.publisher || pub?.publication_agency)}
      {field('Volume', pub?.volume)}
      {field('Issue / Pages', pub?.issue ? `${pub.issue}${pub.pages ? `, pp. ${pub.pages}` : ''}` : pub?.pages)}
      {field('ISSN / ISBN', pub?.issn || pub?.isbn)}
      {field('DOI', pub?.doi)}
      {pub?.quartile && field('Quartile', pub.quartile, false, getQuartileBadge(pub.quartile))}
      {pub?.indexing && field('Indexing', pub.indexing, false, 'scopus')}
      {field('Impact Factor', pub?.impact_factor)}
      {pub?.doi_link && (
        <div className="pub-detail-field">
          <label>DOI Link</label>
          <span>
            <a href={pub.doi_link} target="_blank" rel="noopener noreferrer" className="evidence-link">
              <ExternalLink size={12} /> Open
            </a>
          </span>
        </div>
      )}
      {pub?.evidence_file && (
        <div className="pub-detail-field">
          <label>Evidence</label>
          <span>
            <a href={`${API.replace('/api', '')}/uploads/${pub.evidence_file}`} target="_blank" rel="noopener noreferrer" className="evidence-link">
              <ExternalLink size={12} /> View File
            </a>
          </span>
        </div>
      )}
    </div>
  );
};

/* -- Main Component ---------------------------------------- */
const DofaReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('auth_token') || '';
  const currentUser = decodeTokenPayload(token);
  const isOfficeRoute = location.pathname.startsWith('/Dofa-office');
  const isHodRoute = location.pathname.startsWith('/hod');
  const reviewerRole = isHodRoute ? 'hod' : 'Dofa';
  const backPath = isHodRoute ? '/hod/dashboard' : (isOfficeRoute ? '/Dofa-office/dashboard' : '/Dofa/dashboard');

  const [submissionData, setSubmissionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState(isHodRoute ? 'partb' : 'faculty');
  const [expandedPubs, setExpandedPubs] = useState({});
  const [comments, setComments] = useState([]);
  const [commentView, setCommentView] = useState('pending');
  const [selectedCommentSection, setSelectedCommentSection] = useState(isHodRoute ? 'part_b' : 'faculty_info');
  const [submissionVersions, setSubmissionVersions] = useState([]);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(null);
  const [selectedVersionSnapshot, setSelectedVersionSnapshot] = useState(null);
  const [versionLoading, setVersionLoading] = useState(false);

  const toLabel = (key) =>
    String(key || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  useEffect(() => { fetchSubmissionDetails(); }, [id]);
  useEffect(() => {
    if (isHodRoute && activeTab !== 'partb' && activeTab !== 'dynamic') {
      setActiveTab('partb');
      setSelectedCommentSection('part_b');
      return;
    }

    const mapped = TAB_TO_SECTION_KEY[activeTab];
    if (mapped) {
      setSelectedCommentSection(mapped);
      return;
    }

    if (activeTab === 'dynamic') {
      const source = (selectedVersionSnapshot || submissionData)?.dynamicData || [];
      const firstSectionId = source?.[0]?.section?.id;
      if (firstSectionId) {
        setSelectedCommentSection(`dynamic_section_${firstSectionId}`);
      }
    }
  }, [activeTab, selectedVersionSnapshot, submissionData, isHodRoute]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/submissions/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setSubmissionData(data.data);
        setComments(Array.isArray(data.data?.comments) ? data.data.comments : []);
      }

      const versionsRes = await fetch(`${API}/submissions/${id}/versions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const versionsData = await versionsRes.json();
      if (versionsData.success) {
        setSubmissionVersions(Array.isArray(versionsData.data) ? versionsData.data : []);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVersion = async (versionNumber) => {
    if (versionLoading) return;
    if (selectedVersionNumber === versionNumber) {
      setSelectedVersionNumber(null);
      setSelectedVersionSnapshot(null);
      return;
    }

    try {
      setVersionLoading(true);
      const response = await fetch(`${API}/submissions/${id}/versions/${versionNumber}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await response.json();
      if (data.success && data.data?.snapshot) {
        setSelectedVersionNumber(Number(versionNumber));
        setSelectedVersionSnapshot(data.data.snapshot);
      }
    } catch (error) {
      console.error('Error loading submission version:', error);
      window.appToast('Failed to load selected version.');
    } finally {
      setVersionLoading(false);
    }
  };

  const clearVersionView = () => {
    setSelectedVersionNumber(null);
    setSelectedVersionSnapshot(null);
  };

  const handleVersionSelect = async (event) => {
    const value = String(event.target.value || '').trim();
    if (!value) {
      clearVersionView();
      return;
    }
    await handleViewVersion(Number(value));
  };

  const handleApprove = async () => {
    const nextStatus = isHodRoute ? 'hod_approved' : 'approved';
    const confirmText = isHodRoute
      ? 'Are you sure you want to approve this Form B and forward it to DoFA?'
      : 'Are you sure you want to approve this submission?';
    if (!(await showConfirm(confirmText))) return;
    try {
      const response = await fetch(`${API}/submissions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();
      if (data.success) { window.appToast(isHodRoute ? 'Submission approved and forwarded to DoFA' : 'Submission approved successfully'); navigate(backPath); }
      else window.appToast(`Error: ${data.message || 'Failed to approve submission'}`);
    } catch (error) {
      console.error('Error approving submission:', error);
      window.appToast('Error approving submission');
    }
  };

  const handleSendBack = async () => {
    const hasDraftComment = Boolean(comment.trim());
    const hasExistingPendingComment = comments.some((c) => Number(c.is_resolved) !== 1);
    if (!hasDraftComment && !hasExistingPendingComment) {
      window.appToast('Please add at least one comment before sending back');
      return;
    }
    if (!(await showConfirm('Are you sure you want to send back this submission?'))) return;
    const sectionKey = selectedCommentSection || TAB_TO_SECTION_KEY[activeTab] || 'faculty_info';
    const sourceDynamicData = (selectedVersionSnapshot || submissionData)?.dynamicData || [];
    const dynamicMatch = String(sectionKey || '').match(/^dynamic_section_(\d+)$/);
    const sectionName = dynamicMatch
      ? (sourceDynamicData.find((entry) => Number(entry?.section?.id) === Number(dynamicMatch[1]))?.section?.title || sectionKey)
      : (SECTION_KEY_TO_LABEL[sectionKey] || 'General');
    try {
      if (hasDraftComment) {
        await fetch(`${API}/review/comment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            submission_id: id,
            reviewer_id: currentUser?.id || null,
            reviewer_role: reviewerRole,
            section_name: sectionName,
            section_key: sectionKey,
            comment
          })
        });
      }
      const statusRes = await fetch(`${API}/submissions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: 'sent_back' })
      });
      const statusData = await statusRes.json();
      if (statusData.success) {
        setComment('');
        window.appToast('Submission sent back successfully');
        navigate(backPath);
      }
      else window.appToast(`Error: ${statusData.message || 'Failed to send back submission'}`);
    } catch (error) {
      console.error('Error sending back submission:', error);
      window.appToast('Error sending back submission');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) { window.appToast('Please enter a comment'); return; }
    const sectionKey = selectedCommentSection || TAB_TO_SECTION_KEY[activeTab] || 'faculty_info';
    const sourceDynamicData = (selectedVersionSnapshot || submissionData)?.dynamicData || [];
    const dynamicMatch = String(sectionKey || '').match(/^dynamic_section_(\d+)$/);
    const sectionName = dynamicMatch
      ? (sourceDynamicData.find((entry) => Number(entry?.section?.id) === Number(dynamicMatch[1]))?.section?.title || sectionKey)
      : (SECTION_KEY_TO_LABEL[sectionKey] || 'General');
    try {
      const res = await fetch(`${API}/review/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          submission_id: id,
          reviewer_id: currentUser?.id || null,
          reviewer_role: reviewerRole,
          section_name: sectionName,
          section_key: sectionKey,
          comment
        })
      });
      const data = await res.json();
      if (data.success) { setComment(''); fetchSubmissionDetails(); window.appToast('Comment added successfully'); }
      else window.appToast(`Error: ${data.message || 'Failed to add comment'}`);
    } catch (error) {
      console.error('Error adding comment:', error);
      window.appToast('Error adding comment');
    }
  };

  if (loading) return <div className="Dofa-review"><div className="loading-state">Loading submission...</div></div>;
  if (!submissionData) return <div className="Dofa-review"><div className="empty-state">Submission not found</div></div>;

  const displayData = selectedVersionSnapshot || submissionData;

  const {
    submission, facultyInfo, courses, publications, grants, patents,
    awards, newCourses, proposals, paperReviews, techTransfer,
    conferenceSessions, keynotesTalks, consultancy, teachingInnovation,
    institutionalContributions, courseware, continuingEducation,
    otherActivities, researchPlan, teachingPlan, goals,
    dynamicData
  } = displayData;

  const dynamicCommentSections = Array.isArray(dynamicData)
    ? dynamicData.map((entry) => ({
        key: `dynamic_section_${entry.section.id}`,
        label: entry.section.title || `Dynamic Section ${entry.section.id}`
      }))
    : [];

  const baseCommentSections = isHodRoute
    ? COMMENT_SECTIONS.filter((section) => section.key === 'part_b')
    : COMMENT_SECTIONS;
  const allCommentSections = [...baseCommentSections, ...dynamicCommentSections];

  const pendingComments = comments.filter((c) => Number(c.is_resolved) !== 1);
  const resolvedComments = comments.filter((c) => Number(c.is_resolved) === 1);

  /* -- Helpers -- */
  const renderFileLink = (filename) => {
    if (!filename) return null;
    const fileUrl = `${API.replace('/api', '')}/uploads/${filename}`;
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="evidence-link" title="View Supporting Document">
        <ExternalLink size={12} /><span>Evidence</span>
      </a>
    );
  };

  const isEmptyValue = (v) => v === null || v === undefined || v === '';

  const renderValue = (value, key) => {
    if (isEmptyValue(value)) return <span className="legacy-empty-inline">-</span>;
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="legacy-empty-inline">-</span>;
      return (
        <ul className="legacy-list">
          {value.map((entry, i) => (
            <li key={i}>{typeof entry === 'object' && entry !== null ? JSON.stringify(entry, null, 2) : String(entry)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') return <pre className="legacy-pre">{JSON.stringify(value, null, 2)}</pre>;
    if (typeof value === 'string' && /file|manual|attachment/i.test(key || ''))
      return renderFileLink(value) || <span className="legacy-empty-inline">-</span>;
    if (typeof value === 'string' && /^https?:\/\//i.test(value))
      return <a href={value} target="_blank" rel="noopener noreferrer" className="evidence-link"><ExternalLink size={12} /><span>Open</span></a>;
    return <p className="legacy-text">{String(value)}</p>;
  };

  const renderInfoGrid = (data, preferredKeys = [], includeOtherKeys = true) => {
    const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const preferred = preferredKeys.filter(k => Object.prototype.hasOwnProperty.call(source, k));
    const additional = includeOtherKeys
      ? Object.keys(source).filter(k => !preferredKeys.includes(k))
      : [];
    const keys = [...preferred, ...additional].filter(k => !isEmptyValue(source[k]));
    if (keys.length === 0) return <p className="no-data">No submitted information available.</p>;
    return (
      <div className="info-grid">
        {keys.map(key => (
          <div key={key} className="info-item">
            <label>{toLabel(key)}</label>
            {renderValue(source[key], key)}
          </div>
        ))}
      </div>
    );
  };

  const renderTextSection = (title, value, emptyMessage = 'No submitted information available.') => {
    if (isEmptyValue(value) || (typeof value === 'string' && !value.trim()))
      return <p className="no-data">{emptyMessage}</p>;
    return (
      <div className="legacy-text-section">
        {title && <h4 className="sub-section-title">{title}</h4>}
        <div className="legacy-text-card">{renderValue(value, title)}</div>
      </div>
    );
  };

  const publicationSummary = Array.isArray(publications)
    ? publications.reduce((acc, pub) => {
        const type = String(pub?.publication_type || 'other').toLowerCase();
        if (type.includes('journal')) acc.journals++;
        else if (type.includes('conference')) acc.conferences++;
        else if (type.includes('book') || type.includes('monograph')) acc.books++;
        else acc.other++;
        return acc;
      }, { journals: 0, conferences: 0, books: 0, other: 0 })
    : { journals: 0, conferences: 0, books: 0, other: 0 };

  const statusClass = (s) => {
    if (!s) return '';
    if (s.toLowerCase().includes('approv')) return 'approved';
    if (s.toLowerCase().includes('sent') || s.toLowerCase().includes('back')) return 'sent_back';
    return 'pending';
  };

  /* -- Tab definitions -- */
  const tabs = isHodRoute
    ? [
        { id: 'partb', label: 'Part B', icon: <CheckCircle size={14} /> },
        ...(dynamicCommentSections.length > 0
          ? [{ id: 'dynamic', label: 'Custom Sections', icon: <FileText size={14} />, count: dynamicCommentSections.length }]
          : []),
      ]
    : [
        { id: 'faculty',     label: 'Faculty',      icon: <User size={14} /> },
        { id: 'teaching',    label: 'Teaching',      icon: <BookOpen size={14} />, count: (courses?.length || 0) + (newCourses?.length || 0) },
        { id: 'publications',label: 'Publications',  icon: <FileText size={14} />, count: publications?.length },
        { id: 'research',    label: 'Research',      icon: <Briefcase size={14} /> },
        { id: 'events',      label: 'Events',        icon: <Award size={14} /> },
        { id: 'consultancy', label: 'Consultancy',   icon: <Briefcase size={14} />, count: consultancy?.length },
        { id: 'innovation',  label: 'Innovation',    icon: <Lightbulb size={14} /> },
        { id: 'additional',  label: 'Additional',    icon: <FileText size={14} /> },
        { id: 'partb',       label: 'Part B',        icon: <CheckCircle size={14} /> },
        ...(dynamicCommentSections.length > 0
          ? [{ id: 'dynamic', label: 'Custom Sections', icon: <FileText size={14} />, count: dynamicCommentSections.length }]
          : []),
      ];

  return (
    <div className="Dofa-review">
      {/* -- Header -- */}
      <div className="review-header">
        <button className="back-btn" onClick={() => navigate(backPath)}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <div className="header-info">
          <p className="review-title">Submission Review</p>
          <div className="faculty-header">
            <h2>{submission.faculty_name}</h2>
            <span className="department-badge">{submission.department || 'N/A'}</span>
            <span className={`status-chip ${statusClass(submission.status)}`}>
              {submission.status}
            </span>
          </div>
          <div className="submission-meta">
            <span className="meta-pill">Academic Year <strong>{submission.academic_year}</strong></span>
            <span className="meta-pill">Submitted <strong>{new Date(submission.submitted_at).toLocaleDateString()}</strong></span>
          </div>
        </div>
      </div>

      {/* -- Tabs -- */}
      <div className="review-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* -- Content -- */}
      <div className="review-content">
        <div className="content-main">

          {selectedVersionNumber && (
            <div className="section-card" style={{ marginBottom: '0.75rem', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div>
                  <h3 className="section-title" style={{ marginBottom: '0.25rem' }}>Viewing Snapshot v{selectedVersionNumber}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a' }}>
                    Review actions are disabled while viewing historical submission data.
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={clearVersionView}>Return to Latest</button>
              </div>
            </div>
          )}

          {/* Faculty Information */}
          {activeTab === 'faculty' && (
            <div className="section-card">
              <h3 className="section-title">Faculty Information</h3>
              {renderInfoGrid(
                facultyInfo,
                ['name', 'employee_id', 'department', 'designation', 'email', 'phone', 'qualifications'],
                false
              )}
            </div>
          )}

          {/* Teaching */}
          {activeTab === 'teaching' && (
            <div className="section-card">
              <h3 className="section-title">Teaching &amp; Projects</h3>
              <div className="mirror-component-wrapper">
                <CoursesTaught initialData={{ courses, newCourses }} readOnly={true} />
              </div>

              <CollapsibleSection title="New Courses Developed" count={newCourses?.length || 0} defaultOpen={false}>
                {(newCourses && newCourses.length > 0) ? (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Course Name</th>
                          <th>Course Code</th>
                          <th>Level Type</th>
                          <th>Program</th>
                          <th>Level</th>
                          <th>Remarks</th>
                          <th style={{ textAlign: 'center' }}>CIF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newCourses.map((course, index) => (
                          <tr key={course.id || index}>
                            <td className="cell-title">{course.course_name || '-'}</td>
                            <td>{course.course_code || '-'}</td>
                            <td>{course.level_type || '-'}</td>
                            <td>{course.program || '-'}</td>
                            <td>{course.level || '-'}</td>
                            <td>{course.remarks || '-'}</td>
                            <td className="cell-center">{renderFileLink(course.cif_file) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data" style={{ padding: '0.75rem 1rem' }}>No new courses data available.</p>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Courseware &amp; Course Material" defaultOpen={false}>
                <div style={{ padding: '0.75rem 1rem' }}>
                  {renderInfoGrid(courseware, ['type', 'courseware', 'link', 'labManualFile'])}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Teaching-learning Innovation" defaultOpen={false}>
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div className="mirror-component-wrapper">
                    <TeachingInnovation initialData={teachingInnovation} readOnly={true} />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Publications */}
          {activeTab === 'publications' && (
            <div className="section-card">
              <h3 className="section-title">Research Publications</h3>
              <div className="publication-summary-bar">
                {[
                  { label: 'Journals', count: publicationSummary.journals },
                  { label: 'Conferences', count: publicationSummary.conferences },
                  { label: 'Books', count: publicationSummary.books },
                  { label: 'Other', count: publicationSummary.other },
                ].map(item => (
                  <div key={item.label} className="publication-summary-chip">
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>

              {publications && publications.length > 0 ? (
                <div className="publication-stack">
                  {publications.map((pub, index) => {
                    const isOpen = expandedPubs[index];
                    return (
                      <div key={pub?.id || index} className="publication-card-shell">
                        <div
                          className="publication-card-header"
                          onClick={() => setExpandedPubs(prev => ({ ...prev, [index]: !prev[index] }))}
                        >
                          <div>
                            <p className="publication-card-kicker">
                              {pub?.publication_type || 'Publication'}
                              {pub?.sub_type ? `  |  ${pub.sub_type}` : ''}
                            </p>
                            <h4 className="publication-card-title">
                              {pub?.title || 'Untitled publication'}
                            </h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="publication-card-year">{pub?.year_of_publication || 'N/A'}</span>
                            <ChevronDown size={15} className={`collapsible-chevron ${isOpen ? 'open' : ''}`} style={{ color: '#94a3b8' }} />
                          </div>
                        </div>
                        {isOpen && (
                          <div className="collapsible-body open">
                            <PubDetailCard pub={pub} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-data">No publications data available</p>
              )}
            </div>
          )}

          {/* Research */}
          {activeTab === 'research' && (
            <div className="section-card">
              <h3 className="section-title">Research, Grants &amp; Reviews</h3>

              <div className="mirror-component-wrapper">
                <ResearchGrants initialData={{ grants, proposals }} readOnly={true} />
              </div>

              <CollapsibleSection
                title="Paper Reviews"
                count={paperReviews?.length || 0}
                defaultOpen={true}
              >
                {(paperReviews && paperReviews.length > 0) ? (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Journal / Conference</th>
                          <th style={{ textAlign: 'center' }}>Papers</th>
                          <th style={{ textAlign: 'center' }}>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paperReviews.map((pr, i) => (
                          <tr key={i}>
                            <td className="cell-title">{pr.journal_name}</td>
                            <td className="cell-center">{pr.count}</td>
                            <td className="cell-center">{renderFileLink(pr.evidence_file) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data" style={{ padding: '0.75rem 1rem' }}>No paper reviews data available.</p>
                )}
              </CollapsibleSection>
            </div>
          )}

          {/* Events */}
          {activeTab === 'events' && (
            <div className="section-card">
              <h3 className="section-title">Events, Patents &amp; Awards</h3>

              <CollapsibleSection title="Conference Sessions Chaired" count={conferenceSessions?.length || 0} defaultOpen>
                {(conferenceSessions && conferenceSessions.length > 0) ? (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Conference</th>
                          <th>Session Title</th>
                          <th>Role</th>
                          <th>Location</th>
                          <th style={{ textAlign: 'center' }}>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conferenceSessions.map((s, i) => (
                          <tr key={i}>
                            <td className="cell-title">{s.conference_name}</td>
                            <td className="cell-title">{s.session_title}</td>
                            <td>{s.role || '-'}</td>
                            <td>{s.location || '-'}</td>
                            <td className="cell-center">{renderFileLink(s.evidence_file) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data" style={{ padding: '0.75rem 1rem' }}>No conference sessions data available.</p>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Keynotes &amp; Invited Talks" count={keynotesTalks?.length || 0} defaultOpen>
                {(keynotesTalks && keynotesTalks.length > 0) ? (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Audience</th>
                          <th style={{ textAlign: 'center' }}>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keynotesTalks.map((k, i) => (
                          <tr key={i}>
                            <td className="cell-title">{k.event_name}</td>
                            <td className="cell-title">{k.title}</td>
                            <td>{k.event_type || '-'}</td>
                            <td>{k.audience_type || '-'}</td>
                            <td className="cell-center">{renderFileLink(k.evidence_file) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data" style={{ padding: '0.75rem 1rem' }}>No keynotes or invited talks data available.</p>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Patents" count={patents?.length || 0} defaultOpen={false}>
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div className="mirror-component-wrapper">
                    <Patents initialData={patents || []} readOnly={true} />
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Awards &amp; Honours" count={awards?.length || 0} defaultOpen={false}>
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div className="mirror-component-wrapper">
                    <AwardsHonours initialData={awards || []} readOnly={true} />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Consultancy */}
          {activeTab === 'consultancy' && (
            <div className="section-card">
              <h3 className="section-title">Consultancy Projects</h3>
              {consultancy && consultancy.length > 0 ? (
                consultancy.map((item, index) => (
                  <CollapsibleSection
                    key={index}
                    title={item.title || item.project_title || `Project ${index + 1}`}
                    defaultOpen={index === 0}
                  >
                    <div className="consultancy-item">
                      <Consultancy initialData={item} readOnly={true} />
                    </div>
                  </CollapsibleSection>
                ))
              ) : (
                <p className="no-data">No consultancy data available</p>
              )}
            </div>
          )}

          {/* Innovation */}
          {activeTab === 'innovation' && (
            <div className="section-card">
              <h3 className="section-title">Innovation &amp; Contributions</h3>

              <CollapsibleSection title="Technology Transfer" count={techTransfer?.length || 0} defaultOpen>
                {(techTransfer && techTransfer.length > 0) ? (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Agency</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'center' }}>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {techTransfer.map((tt, i) => (
                          <tr key={i}>
                            <td className="cell-title">{tt.title}</td>
                            <td>{tt.agency || '-'}</td>
                            <td>{tt.date ? new Date(tt.date).toLocaleDateString() : '-'}</td>
                            <td className="cell-center">{renderFileLink(tt.evidence_file) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data" style={{ padding: '0.75rem 1rem' }}>No technology transfer data available.</p>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Teaching Innovation" defaultOpen>
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div className="mirror-component-wrapper">
                    <TeachingInnovation initialData={teachingInnovation} readOnly={true} />
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Institutional Contributions" defaultOpen={false}>
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div className="mirror-component-wrapper">
                    <InstitutionalContributions initialData={institutionalContributions} readOnly={true} />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Additional */}
          {activeTab === 'additional' && (
            <div className="section-card">
              <h3 className="section-title">Additional Sections</h3>
              <div className="legacy-section-stack">

                <CollapsibleSection title="Courseware &amp; Course Material" defaultOpen>
                  <div style={{ padding: '0.75rem 1rem' }}>
                    {renderInfoGrid(courseware, ['type', 'courseware', 'link', 'labManualFile'])}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Continuing Education Activities" defaultOpen={false}>
                  <div style={{ padding: '0.75rem 1rem' }}>
                    {renderInfoGrid(continuingEducation, [
                      'coursesOrganized','workshopsOrganized','industryInteraction',
                      'fdpsOrganized','fdpsAttended','resourcePerson','moocCourses','others'
                    ])}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Other Activities" defaultOpen={false}>
                  <div style={{ padding: '0.75rem 1rem' }}>
                    {otherActivities && Object.keys(otherActivities).length > 0 ? (
                      <>
                        {renderTextSection('Software Developed', otherActivities.softwareDeveloped)}
                        <div style={{ marginTop: '0.75rem' }}>
                          <h4 className="sub-section-title">Visits to Other Institutions</h4>
                          {renderValue(otherActivities.institutionalVisits, 'institutionalVisits')}
                        </div>
                      </>
                    ) : (
                      <p className="no-data">No submitted information available.</p>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Research Plan" defaultOpen={false}>
                  <div style={{ padding: '0.75rem 1rem' }}>
                    {renderTextSection(null, researchPlan?.researchPlan || researchPlan)}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Teaching Plan" defaultOpen={false}>
                  <div style={{ padding: '0.75rem 1rem' }}>
                    {renderInfoGrid(teachingPlan, ['coreUGCourses','ugElectives','graduateCourses','optionalQuestion'])}
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          )}

          {/* Part B */}
          {activeTab === 'partb' && (
            <div className="section-card">
              <h3 className="section-title">Part B - Goals</h3>
              <div className="mirror-component-wrapper">
                <PartB initialData={goals} readOnly={true} />
              </div>
            </div>
          )}

          {activeTab === 'dynamic' && (
            <div className="section-card">
              <h3 className="section-title">Custom Sections</h3>
              {dynamicData && dynamicData.length > 0 ? (
                <div className="legacy-section-stack">
                  {dynamicData.map((entry, index) => (
                    <CollapsibleSection
                      key={entry?.section?.id || index}
                      title={entry?.section?.title || `Dynamic Section ${index + 1}`}
                      count={entry?.fields?.length || 0}
                      defaultOpen={index === 0}
                    >
                      <div style={{ padding: '0.75rem 1rem' }}>
                        {entry?.fields?.length > 0 ? (
                          <div className="info-grid">
                            {entry.fields.map((field) => (
                              <div key={field.id} className="info-item">
                                <label>{field.label || toLabel(field.field_type || 'field')}</label>
                                {renderValue(field.value, field.field_type || field.label || 'value')}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-data">No submitted fields in this section.</p>
                        )}
                      </div>
                    </CollapsibleSection>
                  ))}
                </div>
              ) : (
                <p className="no-data">No custom section responses available.</p>
              )}
            </div>
          )}
        </div>

        {/* -- Sidebar -- */}
        <div className="content-sidebar">
          {/* Actions */}
          <div className="actions-card">
            <h3 className="card-title">
              <MessageSquare size={16} /> Review Actions
            </h3>

            <div className="action-section">
              <label>Comment</label>
              <select
                className="comment-textarea"
                style={{ marginBottom: '0.5rem', minHeight: '2.4rem' }}
                value={selectedCommentSection}
                onChange={(e) => setSelectedCommentSection(e.target.value)}
                disabled={Boolean(selectedVersionNumber)}
              >
                {allCommentSections.map((section) => (
                  <option key={section.key} value={section.key}>{section.label}</option>
                ))}
              </select>
              <textarea
                className="comment-textarea"
                placeholder="Enter your review comments..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows="4"
                disabled={Boolean(selectedVersionNumber)}
              />
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAddComment} disabled={Boolean(selectedVersionNumber)}>
                Add Comment
              </button>
            </div>

            <div className="action-buttons-group">
              <button className="btn btn-success" onClick={handleApprove} disabled={Boolean(selectedVersionNumber)}>
                <CheckCircle size={15} /> {isHodRoute ? 'Approve & Forward' : 'Approve'}
              </button>
              <button className="btn btn-danger" onClick={handleSendBack} disabled={Boolean(selectedVersionNumber)}>
                <XCircle size={15} /> Send Back
              </button>
            </div>
          </div>

          <div className="comments-card">
            <h3 className="card-title">
              Submission Versions
              {submissionVersions.length > 0 && (
                <span className="table-count-badge" style={{ marginLeft: 'auto' }}>{submissionVersions.length}</span>
              )}
            </h3>
            {submissionVersions.length > 0 ? (
              <div>
                <select
                  className="comment-textarea"
                  style={{ minHeight: '2.4rem' }}
                  value={selectedVersionNumber ? String(selectedVersionNumber) : ''}
                  onChange={handleVersionSelect}
                  disabled={versionLoading}
                >
                  <option value="">Latest Submission (default)</option>
                  {submissionVersions.map((version) => (
                    <option key={version.id || version.version_number} value={version.version_number}>
                      v{version.version_number} - {new Date(version.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </option>
                  ))}
                </select>

                {selectedVersionNumber && (
                  <p className="comment-text" style={{ marginTop: '0.5rem' }}>
                    Viewing v{selectedVersionNumber}. Select "Latest Submission" to exit snapshot view.
                  </p>
                )}
              </div>
            ) : (
              <p className="no-comments">No submission versions yet</p>
            )}
          </div>

          {/* Comments History */}
          <div className="comments-card">
            <h3 className="card-title">
              Comments
              {comments.length > 0 && (
                <span className="table-count-badge" style={{ marginLeft: 'auto' }}>{comments.length}</span>
              )}
            </h3>
            {comments.length > 0 && (
              <div className="comment-view-tabs" role="tablist" aria-label="Comment status filters">
                <button type="button" className={`comment-view-tab ${commentView === 'pending' ? 'active' : ''}`} onClick={() => setCommentView('pending')}>
                  Pending <span>{pendingComments.length}</span>
                </button>
                <button type="button" className={`comment-view-tab ${commentView === 'resolved' ? 'active' : ''}`} onClick={() => setCommentView('resolved')}>
                  Resolved <span>{resolvedComments.length}</span>
                </button>
              </div>
            )}
            {commentView === 'pending' ? (
              pendingComments.length > 0 ? (
                <div className="comments-list">
                  {pendingComments.map((c, i) => (
                    <div key={`pending-${i}-${c.id || ''}`} className="comment-item">
                      <div className="comment-header">
                        <span className="reviewer-name">{c.reviewer_name || 'Reviewer'}</span>
                        <span className="comment-date">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="comment-section-row">
                        <span className="comment-section-badge">{c.section_name || 'General'}</span>
                      </div>
                      <p className="comment-text">{c.comment}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="no-comments">No pending comments</p>
            ) : (
              resolvedComments.length > 0 ? (
                <div className="comments-list">
                  {resolvedComments.map((c, i) => (
                    <div key={`resolved-${i}-${c.id || ''}`} className="comment-item resolved">
                      <div className="comment-header">
                        <span className="reviewer-name">{c.reviewer_name || 'Reviewer'}</span>
                        <span className="comment-date">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="comment-section-row">
                        <span className="comment-section-badge">{c.section_name || 'General'}</span>
                        <span className="comment-resolved-badge">
                          Resolved{c.resolved_in_version ? ` in v${c.resolved_in_version}` : ''}
                        </span>
                      </div>
                      <p className="comment-text">{c.comment}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="no-comments">No resolved comments</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DofaReview;
