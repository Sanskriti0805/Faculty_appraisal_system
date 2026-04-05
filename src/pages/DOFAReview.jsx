import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, MessageSquare, User, BookOpen,
  FileText, Award, Briefcase, ExternalLink, Lightbulb, ChevronDown
} from 'lucide-react';
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

/* ── Collapsible Section ─────────────────────────────────── */
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

/* ── Publication Detail Card ─────────────────────────────── */
const PubDetailCard = ({ pub }) => {
  const field = (label, value, fullWidth = false, badge = null) => {
    const isEmpty = value === null || value === undefined || value === '';
    return (
      <div className={`pub-detail-field${fullWidth ? ' full-width' : ''}`}>
        <label>{label}</label>
        {badge ? (
          <span><span className={`pub-badge ${badge}`}>{isEmpty ? '—' : String(value)}</span></span>
        ) : (
          <span className={isEmpty ? 'empty' : ''}>{isEmpty ? '—' : String(value)}</span>
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

/* ── Main Component ──────────────────────────────────────── */
const DOFAReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isOfficeRoute = location.pathname.startsWith('/dofa-office');
  const backPath = isOfficeRoute ? '/dofa-office/dashboard' : '/dofa/dashboard';

  const [submissionData, setSubmissionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('faculty');
  const [expandedPubs, setExpandedPubs] = useState({});

  const toLabel = (key) =>
    String(key || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  useEffect(() => { fetchSubmissionDetails(); }, [id]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/submissions/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await response.json();
      if (data.success) setSubmissionData(data.data);
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this submission?')) return;
    try {
      const response = await fetch(`${API}/submissions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: 'approved', approved_by: 1 })
      });
      const data = await response.json();
      if (data.success) { alert('Submission approved successfully'); navigate(backPath); }
      else alert(`Error: ${data.message || 'Failed to approve submission'}`);
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Error approving submission');
    }
  };

  const handleSendBack = async () => {
    if (!comment.trim()) { alert('Please provide a comment before sending back'); return; }
    if (!window.confirm('Are you sure you want to send back this submission?')) return;
    try {
      await fetch(`${API}/review/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ submission_id: id, reviewer_id: 1, reviewer_role: 'dofa', comment })
      });
      const statusRes = await fetch(`${API}/submissions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: 'sent_back' })
      });
      const statusData = await statusRes.json();
      if (statusData.success) { alert('Submission sent back successfully'); navigate(backPath); }
      else alert(`Error: ${statusData.message || 'Failed to send back submission'}`);
    } catch (error) {
      console.error('Error sending back submission:', error);
      alert('Error sending back submission');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) { alert('Please enter a comment'); return; }
    try {
      const res = await fetch(`${API}/review/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ submission_id: id, reviewer_id: 1, reviewer_role: 'dofa', comment })
      });
      const data = await res.json();
      if (data.success) { setComment(''); fetchSubmissionDetails(); alert('Comment added successfully'); }
      else alert(`Error: ${data.message || 'Failed to add comment'}`);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment');
    }
  };

  if (loading) return <div className="dofa-review"><div className="loading-state">Loading submission…</div></div>;
  if (!submissionData) return <div className="dofa-review"><div className="empty-state">Submission not found</div></div>;

  const {
    submission, facultyInfo, courses, publications, grants, patents,
    awards, newCourses, proposals, paperReviews, techTransfer,
    conferenceSessions, keynotesTalks, consultancy, teachingInnovation,
    institutionalContributions, courseware, continuingEducation,
    otherActivities, researchPlan, teachingPlan, goals, comments
  } = submissionData;

  /* ── Helpers ── */
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
    if (isEmptyValue(value)) return <span className="legacy-empty-inline">—</span>;
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="legacy-empty-inline">—</span>;
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
      return renderFileLink(value) || <span className="legacy-empty-inline">—</span>;
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

  /* ── Tab definitions ── */
  const tabs = [
    { id: 'faculty',     label: 'Faculty',      icon: <User size={14} /> },
    { id: 'teaching',    label: 'Teaching',      icon: <BookOpen size={14} />, count: courses?.length },
    { id: 'publications',label: 'Publications',  icon: <FileText size={14} />, count: publications?.length },
    { id: 'research',    label: 'Research',      icon: <Briefcase size={14} /> },
    { id: 'events',      label: 'Events',        icon: <Award size={14} /> },
    { id: 'consultancy', label: 'Consultancy',   icon: <Briefcase size={14} />, count: consultancy?.length },
    { id: 'innovation',  label: 'Innovation',    icon: <Lightbulb size={14} /> },
    { id: 'additional',  label: 'Additional',    icon: <FileText size={14} /> },
    { id: 'partb',       label: 'Part B',        icon: <CheckCircle size={14} /> },
  ];

  return (
    <div className="dofa-review">
      {/* ── Header ── */}
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

      {/* ── Tabs ── */}
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

      {/* ── Content ── */}
      <div className="review-content">
        <div className="content-main">

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
                              {pub?.sub_type ? ` · ${pub.sub_type}` : ''}
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

              {paperReviews && paperReviews.length > 0 && (
                <CollapsibleSection
                  title="Paper Reviews"
                  count={paperReviews.length}
                  defaultOpen={true}
                >
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
                            <td className="cell-center">{renderFileLink(pr.evidence_file) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {/* Events */}
          {activeTab === 'events' && (
            <div className="section-card">
              <h3 className="section-title">Events, Patents &amp; Awards</h3>

              {conferenceSessions && conferenceSessions.length > 0 && (
                <CollapsibleSection title="Conference Sessions Chaired" count={conferenceSessions.length} defaultOpen>
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
                            <td>{s.role || '—'}</td>
                            <td>{s.location}</td>
                            <td className="cell-center">{renderFileLink(s.evidence_file) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

              {keynotesTalks && keynotesTalks.length > 0 && (
                <CollapsibleSection title="Keynotes &amp; Invited Talks" count={keynotesTalks.length} defaultOpen>
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
                            <td>{k.event_type || '—'}</td>
                            <td>{k.audience_type}</td>
                            <td className="cell-center">{renderFileLink(k.evidence_file) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

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

              {techTransfer && techTransfer.length > 0 && (
                <CollapsibleSection title="Technology Transfer" count={techTransfer.length} defaultOpen>
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
                            <td>{tt.agency}</td>
                            <td>{tt.date ? new Date(tt.date).toLocaleDateString() : '—'}</td>
                            <td className="cell-center">{renderFileLink(tt.evidence_file) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

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
              <h3 className="section-title">Part B — Goals</h3>
              <div className="mirror-component-wrapper">
                <PartB initialData={goals} readOnly={true} />
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="content-sidebar">
          {/* Actions */}
          <div className="actions-card">
            <h3 className="card-title">
              <MessageSquare size={16} /> Review Actions
            </h3>

            <div className="action-section">
              <label>Comment</label>
              <textarea
                className="comment-textarea"
                placeholder="Enter your review comments…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows="4"
              />
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAddComment}>
                Add Comment
              </button>
            </div>

            <div className="action-buttons-group">
              <button className="btn btn-success" onClick={handleApprove}>
                <CheckCircle size={15} /> Approve
              </button>
              <button className="btn btn-danger" onClick={handleSendBack}>
                <XCircle size={15} /> Send Back
              </button>
            </div>
          </div>

          {/* Comments History */}
          <div className="comments-card">
            <h3 className="card-title">
              Comments
              {comments?.length > 0 && (
                <span className="table-count-badge" style={{ marginLeft: 'auto' }}>{comments.length}</span>
              )}
            </h3>
            {comments && comments.length > 0 ? (
              <div className="comments-list">
                {comments.map((c, i) => (
                  <div key={i} className="comment-item">
                    <div className="comment-header">
                      <span className="reviewer-name">{c.reviewer_name || 'Reviewer'}</span>
                      <span className="comment-date">{new Date(c.created_at).toLocaleDateString()}</span>
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