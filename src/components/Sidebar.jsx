import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()
  const [partAOpen, setPartAOpen] = useState(true)
  const [partBOpen, setPartBOpen] = useState(false)

  const partAItems = [
    { name: 'Faculty Information', path: '/faculty-information' },
    { name: 'Courses Taught & Projects Guided', path: '/courses-taught' },
    { name: 'New Courses Developed', path: '/new-courses' },
    { name: 'Courseware / Course Material', path: '/courseware' },
    { name: 'Teaching-Learning Innovation', path: '/teaching-innovation' },
    { name: 'Research Publications', path: '/research-publications' },
    { name: 'Research & Development', path: '/research-grants' },
    { name: 'Patents', path: '/patents' },
    { name: 'Technology Developed/Transferred', path: '/technology-transfer' },
    { name: 'Review of Research Papers', path: '/paper-review' },
    { name: 'Conference Sessions Chaired', path: '/conference-sessions' },
    { name: 'Keynotes & Invited Talks', path: '/keynotes-talks' },
    { name: 'Conferences Outside LNMIIT', path: '/conferences-outside' },
    { name: 'Other Activities', path: '/other-activities' },
    { name: 'Awards and Honours', path: '/awards-honours' },
    { name: 'Consultancy', path: '/consultancy' },
    { name: 'Continuing Education Activities', path: '/continuing-education' },
    { name: 'Institutional Contributions', path: '/institutional-contributions' },
    { name: 'Other Important Activities', path: '/other-important-activities' },
    { name: 'Research Plan', path: '/research-plan' },
    { name: 'Teaching Plan & Preferences', path: '/teaching-plan' },
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
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
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

