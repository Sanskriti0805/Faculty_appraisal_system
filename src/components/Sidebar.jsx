import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const SECTION_GROUP_MEMBERS = {
  teaching_learning: ['courses_taught', 'new_courses', 'courseware', 'teaching_innovation'],
  research_development: ['research_publications', 'research_grants', 'patents', 'technology_transfer', 'paper_review', 'talks_and_conferences', 'awards_honours', 'consultancy', 'continuing_education'],
  other_institutional_activities: ['institutional_contributions', 'other_activities', 'research_plan', 'teaching_plan']
}

const getShortLabel = (label) => {
  const trimmed = String(label || '').trim()
  if (!trimmed) return ''

  const words = trimmed
    .replace(/&/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length >= 2) {
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase()
  }

  return trimmed.slice(0, 2).toUpperCase()
}

const NavLabel = ({ label }) => (
  <>
    <span className="nav-item-short" aria-hidden="true">{getShortLabel(label)}</span>
    <span className="nav-item-label">{label}</span>
  </>
)

const Sidebar = ({ collapsed = false, onToggleCollapse }) => {
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
        const response = await fetch(`http://${window.location.hostname}:5001/api/form-builder/schema`);
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
    const isDofa = location.pathname.startsWith('/Dofa');
    if (isDofa) return; // Dofa always sees everything

    const checkReleaseStatus = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:5001/api/sessions/active`);
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
    const isDofa = location.pathname.startsWith('/Dofa')
    if (isDofa || !token || user?.role !== 'faculty') return

    const run = async () => {
      try {
        // Step 1: find out which academic year the ACTIVE session is for
        const sessionRes = await fetch(`http://${window.location.hostname}:5001/api/sessions/active`)
        const sessionData = await sessionRes.json()
        const activeYear = sessionData?.data?.academic_year

        if (!activeYear) {
          // No active session - unlock everything (nothing to submit)
          setSubmissionStatus(null)
          setApprovedSections([])
          setHasSectionRestrictions(false)
          return
        }

        // Step 2: fetch this faculty's submission for ONLY the active session year
        const subRes = await fetch(
          `http://${window.location.hostname}:5001/api/submissions?faculty_id=${user.id}&academic_year=${encodeURIComponent(activeYear)}&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const subData = await subRes.json()

        if (!subData.success || !subData.data || subData.data.length === 0) {
          // No submission for current year yet - treat as draft (all sections open)
          setSubmissionStatus('draft')
          setApprovedSections([])
          setHasSectionRestrictions(false)
          return
        }

        const submission = subData.data[0]
        setSubmissionStatus(submission.status)

        if (submission.status !== 'sent_back') {
          setApprovedSections([])
          setHasSectionRestrictions(false)
          return
        }

        const reqRes = await fetch(`http://${window.location.hostname}:5001/api/edit-requests/my-submission/${submission.id}`, {
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
    '/talks-and-conferences': 'talks_and_conferences',
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
    const isFacultyRoute = !location.pathname.startsWith('/Dofa')
    if (!isFacultyRoute) return true

    // Faculty should always be able to open the profile data sheet in read/view mode.
    if (path === '/faculty-information') return true

    if (!submissionStatus || submissionStatus === 'draft') return true
    if (['submitted', 'under_review', 'approved'].includes(submissionStatus)) return false

    if (submissionStatus === 'sent_back') {
      if (!hasSectionRestrictions) return true

      const allowedSections = new Set()
      approvedSections.forEach((key) => {
        allowedSections.add(key)
        const members = SECTION_GROUP_MEMBERS[key]
        if (Array.isArray(members)) {
          members.forEach((memberKey) => allowedSections.add(memberKey))
        }
      })

      // Part B contains the final submit action and must remain reachable for re-submission.
      if (path === '/part-b') return true

      if (path.startsWith('/faculty/dynamic/')) {
        const idMatch = path.match(/^\/faculty\/dynamic\/(\d+)$/)
        if (!idMatch) return false
        return allowedSections.has(`dynamic_section_${idMatch[1]}`)
      }
      const sectionKey = pathToSectionKey[path]
      return !!sectionKey && allowedSections.has(sectionKey)
    }

    return true
  }

  const renderNavLink = (path, label, className = 'nav-item') => {
    const editable = path === '/' ? true : isPathEditable(path)
    const active = location.pathname === path
    if (!editable) {
      return (
        <span
          key={path}
          className={`${className} nav-item-locked ${active ? 'active' : ''}`}
          title="Locked until edit access is granted"
        >
          <NavLabel label={label} />
        </span>
      )
    }

    return (
      <Link
        key={path}
        to={path}
        className={`${className} ${active ? 'active' : ''}`}
        title={label}
      >
        <NavLabel label={label} />
      </Link>
    )
  }

  const isDofaOfficeRoute = location.pathname.startsWith('/Dofa-office')
  const isDofaRoute = location.pathname.startsWith('/Dofa') && !isDofaOfficeRoute
  const isHodRoute = location.pathname.startsWith('/hod')

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
        { name: 'Review of research papers for Tier-1/2 refereed internal research journals', path: '/paper-review' },
        { name: 'Talks and Conferences', path: '/talks-and-conferences' },
        { name: 'Other Activities', path: '/other-activities' },
        { name: 'Significant International / National Awards and Honours', path: '/awards-honours' },
        { name: 'Consultancy', path: '/consultancy' },
        { name: 'Continuing Education Activities', path: '/continuing-education' },
      ]
    },
    {
      name: 'Other Institutional Activities (Other than those covered above)',
      subItems: [
        { name: 'Other Institutional Contributions', path: '/institutional-contributions' },
        { name: 'Other Important Activity', path: '/other-important-activities' },
        { name: 'Research Plan for Next Three Years', path: '/research-plan' },
        { name: 'Teaching Plan and Preferences for Next Three Years', path: '/teaching-plan' },
      ]
    },
    ...dynamicSections
      .filter(s => s.form_type === 'A' && s.is_active)
      .map(s => ({ name: s.title, path: `/faculty/dynamic/${s.id}` }))
  ]

  // HoD-specific sidebar
  if (isHodRoute) {
    const hodNavItems = [
      { name: 'Dashboard', path: '/hod/dashboard' },
      { name: 'Help Center', path: '/hod/help' },
    ]

    return (
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-header" style={{ cursor: 'default' }}>
              <span>HoD</span>
            </div>
            <div className="nav-section-items">
              {hodNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  title={item.name}
                >
                  <NavLabel label={item.name} />
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>
    )
  }

  // Dofa-specific sidebar
  if (isDofaRoute || isDofaOfficeRoute) {
    const DofaNavItems = [
      { name: 'Dashboard', path: '/Dofa/dashboard' },
      { name: 'Form Release', path: '/Dofa/form-release' },
      { name: 'Rubrics Management', path: '/Dofa/rubrics' },
      { name: 'Sheet 1 - Evaluation', path: '/Dofa/sheet1' },
      { name: 'Sheet 2', path: '/Dofa/sheet2' },
      { name: 'Sheet 3', path: '/Dofa/sheet3' },
      { name: 'Form Builder', path: '/Dofa/form-builder' },
      { name: 'Manage Users', path: '/Dofa/manage-users' },
      { name: 'Logs', path: '/Dofa/logs' },
      { name: 'Help Center', path: '/Dofa/help' },
    ]

    const DofaOfficeNavItems = [
      { name: 'Dashboard', path: '/Dofa-office/dashboard' },
      { name: 'Form Release', path: '/Dofa-office/form-release' },
      { name: 'Rubrics Management', path: '/Dofa-office/rubrics' },
      { name: 'Sheet 1 - Evaluation', path: '/Dofa-office/sheet1' },
      { name: 'Sheet 2', path: '/Dofa-office/sheet2' },
      { name: 'Sheet 3', path: '/Dofa-office/sheet3' },
      { name: 'Form Builder', path: '/Dofa-office/form-builder' },
      { name: 'Manage Users', path: '/Dofa-office/manage-users' },
      { name: 'Logs', path: '/Dofa-office/logs' },
      { name: 'Help Center', path: '/Dofa-office/help' },
    ]

    const navItems = isDofaOfficeRoute ? DofaOfficeNavItems : DofaNavItems

    return (
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        {/* <div className="logo-container">
          <img
            src="/lnmiit-logo.svg"
            alt="LNMIIT - The LNM Institute of Information Technology"
            className="logo"
          />
        </div> */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-header" style={{ cursor: 'default' }}>
              <span>{isDofaOfficeRoute ? 'DoFA Office' : 'DoFA'}</span>
            </div>
            <div className="nav-section-items">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  title={item.name}
                >
                  <NavLabel label={item.name} />
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
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      {/* <div className="logo-container">
        <img
          src="/lnmiit-logo.svg"
          alt="LNMIIT - The LNM Institute of Information Technology"
          className="logo"
        />
      </div> */}

      <nav className="sidebar-nav">
        
        <div className="nav-section">
          <div className="nav-section-items">
            {renderNavLink('/', 'Dashboard', 'nav-item')}
          </div>
        </div>

        {formsReleased ? (
          <>
        {['submitted', 'under_review', 'approved'].includes(submissionStatus) && (
          <div className="sidebar-lock-note">
            Form is submitted. Sections are locked until DoFA sends back or approves requested edits.
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
                      title={item.name}
                    >
                      <NavLabel label={item.name} />
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
              {renderNavLink('/part-b', 'Goal Setting', 'nav-item')}
              {dynamicSections
                .filter(s => s.form_type === 'B' && s.is_active)
                .map(s => renderNavLink(`/faculty/dynamic/${s.id}`, s.title, 'nav-item'))}
            </div>
          )}
        </div>

        <div className="nav-section">
          <div className="nav-section-items">
            {renderNavLink('/help', 'Help Center', 'nav-item')}
          </div>
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

