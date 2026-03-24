import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()
  const [partAOpen, setPartAOpen] = useState(true)
  const [partBOpen, setPartBOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})

  const isDOFARoute = location.pathname.startsWith('/dofa') || location.pathname.startsWith('/dofa-office')

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
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
  ]

  // DOFA-specific sidebar
  if (isDOFARoute) {
    const dofaNavItems = [
      { name: 'Dashboard', path: '/dofa/dashboard' },
      { name: 'Rubrics Management', path: '/dofa/rubrics' },
      { name: 'Sheet 1 — Evaluation', path: '/dofa/sheet1' },
      { name: 'Sheet 2', path: '/dofa/sheet2' },
      { name: 'Sheet 3', path: '/dofa/sheet3' },
    ]

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
              <span>DOFA</span>
            </div>
            <div className="nav-section-items">
              {dofaNavItems.map(item => (
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
        <div className="nav-section">
          <button
            className="nav-section-header"
            onClick={() => setPartAOpen(!partAOpen)}
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
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`nav-item nav-sub-item ${location.pathname === subItem.path ? 'active' : ''}`}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </div>
          )}
        </div>

        <div className="nav-section">
          <button
            className="nav-section-header"
            onClick={() => setPartBOpen(!partBOpen)}
          >
            <span>Part B</span>
            {partBOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          {partBOpen && (
            <div className="nav-section-items">
              <Link
                to="/part-b"
                className={`nav-item ${location.pathname === '/part-b' ? 'active' : ''}`}
              >
                Part B Content
              </Link>
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
