import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()
  const { user, token } = useAuth()
  const [partAOpen, setPartAOpen] = useState(true)
  const [partBOpen, setPartBOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})
  const [dynamicSections, setDynamicSections] = useState([])
  const [formsReleased, setFormsReleased] = useState(true) // default true for non-faculty
  const [submissionStatus, setSubmissionStatus] = useState(null)
  const [approvedSections, setApprovedSections] = useState([])
  const [hasSectionRestrictions, setHasSectionRestrictions] = useState(false)

  React.useEffect(() => {
    const fetchDynamicSections = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:5000/api/form-builder/schema`);
        const data = await response.json();
        if (data.success) {
          setDynamicSections(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching dynamic sections:', error);
      }
    };
    fetchDynamicSections();
  }, []);

  // Check if forms are released (for faculty sidebar)
  React.useEffect(() => {
    const isDOFA = location.pathname.startsWith('/dofa');
    if (isDOFA) return; // DOFA always sees everything

    const checkReleaseStatus = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:5000/api/sessions/active`);
        const data = await res.json();
        if (data.success) {
          setFormsReleased(data.released === true);
        }
      } catch (err) {
        console.error('Error checking release status:', err);
      }
    };
    checkReleaseStatus();
  }, [location.pathname]);

  // Fetch submission/edit access status for faculty to disable locked sections in UI.
  React.useEffect(() => {
    const isDOFA = location.pathname.startsWith('/dofa')
    if (isDOFA || !token || user?.role !== 'faculty') return

    const run = async () => {
      try {
        const subRes = await fetch(`http://${window.location.hostname}:5000/api/submissions/my`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const subData = await subRes.json()
        if (!subData.success || !subData.data) {
          setSubmissionStatus(null)
          setApprovedSections([])
          setHasSectionRestrictions(false)
          return
        }

        const submission = subData.data
        setSubmissionStatus(submission.status)

        if (submission.status !== 'sent_back') {
          setApprovedSections([])
          setHasSectionRestrictions(false)
          return
        }

        const reqRes = await fetch(`http://${window.location.hostname}:5000/api/edit-requests/my-submission/${submission.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const reqData = await reqRes.json()

        if (!reqData.success) {
          setApprovedSections([])
          setHasSectionRestrictions(false)
          return
        }

        const unlockedSections = Array.isArray(reqData.unlockedSections) ? reqData.unlockedSections : []
        setApprovedSections(unlockedSections)
        setHasSectionRestrictions(unlockedSections.length > 0)
      } catch (error) {
        console.error('Error fetching sidebar edit access:', error)
      }
    }

    run()
  }, [location.pathname, token, user])

  const pathToSectionKey = {
    '/faculty-information': 'faculty_info',
    '/courses-taught': 'courses_taught',
    '/new-courses': 'new_courses',
    '/courseware': 'courseware',
    '/teaching-innovation': 'teaching_innovation',
    '/research-publications': 'research_publications',
    '/research-grants': 'research_grants',
    '/patents': 'patents',
    '/technology-transfer': 'technology_transfer',
    '/paper-review': 'paper_review',
    '/conference-sessions': 'conference_sessions',
    '/keynotes-talks': 'keynotes_talks',
    '/conferences-outside': 'conference_sessions',
    '/other-activities': 'other_activities',
    '/awards-honours': 'awards_honours',
    '/consultancy': 'consultancy',
    '/continuing-education': 'continuing_education',
    '/institutional-contributions': 'institutional_contributions',
    '/other-important-activities': 'other_activities',
    '/research-plan': 'research_plan',
    '/teaching-plan': 'teaching_plan',
    '/part-b': 'part_b',
  }

  const isPathEditable = (path) => {
    const isFacultyRoute = !location.pathname.startsWith('/dofa')
    if (!isFacultyRoute) return true

    if (!submissionStatus || submissionStatus === 'draft') return true
    if (['submitted', 'under_review', 'approved'].includes(submissionStatus)) return false

    if (submissionStatus === 'sent_back') {
      if (!hasSectionRestrictions) return true

      // Part B contains the final submit action and must remain reachable for re-submission.
      if (path === '/part-b') return true

      if (path.startsWith('/faculty/dynamic/')) return false
      const sectionKey = pathToSectionKey[path]
      return !!sectionKey && approvedSections.includes(sectionKey)
    }

    return true
  }

  const renderNavLink = (path, label, className = 'nav-item') => {
    const editable = isPathEditable(path)
    const active = location.pathname === path
    if (!editable) {
      return (
        <span
          key={path}
          className={`${className} nav-item-locked ${active ? 'active' : ''}`}
          title="Locked until edit access is granted"
        >
          {label}
        </span>
      )
    }

    return (
      <Link
        key={path}
        to={path}
        className={`${className} ${active ? 'active' : ''}`}
      >
        {label}
      </Link>
    )
  }

  const isDOFAOfficeRoute = location.pathname.startsWith('/dofa-office')
  const isDOFARoute = location.pathname.startsWith('/dofa') && !isDOFAOfficeRoute

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => {
      if (prev[sectionName]) {
        return { [sectionName]: false }
      }
      return { [sectionName]: true }
    })
  }

  const partAItems = [
    { name: 'Faculty Information', path: '/faculty-information' },
    {
      name: 'Teaching-Learning',
      subItems: [
        { name: 'Courses Taught and Projects Guided', path: '/courses-taught' },
        { name: 'New Courses Developed', path: '/new-courses' },
        { name: 'Courseware / Course Material / Laboratory Manual Developed / Text-Books / Course Notes Published', path: '/courseware' },
        { name: 'Any effective or successful innovation in terms of teaching-learning', path: '/teaching-innovation' }
      ]
    },
    {
      name: 'Research & Development',
      subItems: [
        { name: 'Research Publications', path: '/research-publications' },
        { name: 'External Sponsored Research & Development Grants received/submitted during this Academic Session', path: '/research-grants' },
        { name: 'Patents', path: '/patents' },
        { name: 'Technology Developed/Transferred', path: '/technology-transfer' },
        { name: 'Review of research papers for Tier-1/2 refereed internal research journals (please provide details in bullet points)', path: '/paper-review' },
        { name: 'Conference Sessions Chaired, if any', path: '/conference-sessions' },
        { name: 'Keynotes, Seminars and Invited Talks (outside LNMIIT)', path: '/keynotes-talks' },
        { name: 'Conferences Outside LNMIIT', path: '/conferences-outside' },
        { name: 'Other Activities', path: '/other-activities' },
        { name: 'Significant International / National Awards and Honours', path: '/awards-honours' },
        { name: 'Consultancy, if any (Please provide details.)', path: '/consultancy' },
        { name: 'Continuing Education Activities', path: '/continuing-education' },
      ]
    },
    {
      name: 'Other Institutional Activities (Other than those covered above)',
      subItems: [
        { name: 'Contributions, towards Institutional Development or any significant Institutional Contributions not covered above', path: '/institutional-contributions' },
        { name: 'Any other Important Activity not covered above', path: '/other-important-activities' },
        { name: 'Your research plan for next three years, if available', path: '/research-plan' },
        { name: 'Your teaching plan and preferences for next three years', path: '/teaching-plan' },
      ]
    },
    ...dynamicSections
      .filter(s => s.form_type === 'A' && s.is_active)
      .map(s => ({ name: s.title, path: `/faculty/dynamic/${s.id}` }))
  ]

  // DOFA-specific sidebar
  if (isDOFARoute || isDOFAOfficeRoute) {
    const dofaNavItems = [
      { name: 'Dashboard', path: '/dofa/dashboard' },
      { name: 'Form Release', path: '/dofa/form-release' },
      { name: 'Rubrics Management', path: '/dofa/rubrics' },
      { name: 'Sheet 1 — Evaluation', path: '/dofa/sheet1' },
      { name: 'Sheet 2', path: '/dofa/sheet2' },
      { name: 'Sheet 3', path: '/dofa/sheet3' },
      { name: 'Form Builder', path: '/dofa-office/form-builder' },
      { name: 'Manage Users', path: '/dofa/manage-users' },
    ]

    const dofaOfficeNavItems = [
      { name: 'Dashboard', path: '/dofa-office/dashboard' },
      { name: 'Form Release', path: '/dofa-office/form-release' },
      { name: 'Rubrics Management', path: '/dofa-office/rubrics' },
      { name: 'Sheet 1 — Evaluation', path: '/dofa-office/sheet1' },
      { name: 'Sheet 2', path: '/dofa-office/sheet2' },
      { name: 'Sheet 3', path: '/dofa-office/sheet3' },
      { name: 'Form Builder', path: '/dofa-office/form-builder' },
      { name: 'Manage Users', path: '/dofa-office/manage-users' },
    ]

    const navItems = isDOFAOfficeRoute ? dofaOfficeNavItems : dofaNavItems

    return (
      <aside className="sidebar">
        <div className="logo-container">
          <img
            src="/lnmiit-logo.svg"
            alt="LNMIIT - The LNM Institute of Information Technology"
            className="logo"
          />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-header" style={{ cursor: 'default' }}>
              <span>{isDOFAOfficeRoute ? 'DOFA OFFICE' : 'DOFA'}</span>
            </div>
            <div className="nav-section-items">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>
    )
  }

  // Faculty sidebar (default)
  return (
    <aside className="sidebar">
      <div className="logo-container">
        <img
          src="/lnmiit-logo.svg"
          alt="LNMIIT - The LNM Institute of Information Technology"
          className="logo"
        />
      </div>

      <nav className="sidebar-nav">
        {formsReleased ? (
          <>
        {['submitted', 'under_review', 'approved'].includes(submissionStatus) && (
          <div className="sidebar-lock-note">
            Form is submitted. Sections are locked until DOFA sends back or approves requested edits.
          </div>
        )}
        {submissionStatus === 'sent_back' && hasSectionRestrictions && (
          <div className="sidebar-lock-note sidebar-lock-note-warning">
            Only approved sections are editable right now.
          </div>
        )}
        <div className="nav-section">
          <button
            className="nav-section-header"
            onClick={() => {
              setPartAOpen(!partAOpen)
              if (!partAOpen) setPartBOpen(false)
            }}
          >
            <span>Part A</span>
            {partAOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {partAOpen && (
            <div className="nav-section-items">
              {partAItems.map((item) => (
                item.subItems ? (
                  <div key={item.name}>
                    <button
                      className="nav-item nav-parent-item"
                      onClick={() => toggleSection(item.name)}
                    >
                      <span>{item.name}</span>
                      {expandedSections[item.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {expandedSections[item.name] && (
                      <div className="nav-sub-items">
                        {item.subItems.map((subItem) => (
                          renderNavLink(subItem.path, subItem.name, 'nav-item nav-sub-item')
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  renderNavLink(item.path, item.name, 'nav-item')
                )
              ))}
            </div>
          )}
        </div>

        <div className="nav-section">
          <button
            className="nav-section-header"
            onClick={() => {
              setPartBOpen(!partBOpen)
              if (!partBOpen) setPartAOpen(false)
            }}
          >
            <span>Part B</span>
            {partBOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {partBOpen && (
            <div className="nav-section-items">
              {renderNavLink('/part-b', 'Part B Content', 'nav-item')}
              {dynamicSections
                .filter(s => s.form_type === 'B' && s.is_active)
                .map(s => renderNavLink(`/faculty/dynamic/${s.id}`, s.title, 'nav-item'))}
            </div>
          )}
        </div>
          </>
        ) : (
          <div className="nav-section">
            <div className="nav-section-header" style={{ cursor: 'default' }}>
              <span>Appraisal Forms</span>
            </div>
            <div className="nav-section-items">
              <div className="nav-item" style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.5', padding: '12px 16px' }}>
                Forms are not available yet. You will be notified by email when they are released.
              </div>
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar
