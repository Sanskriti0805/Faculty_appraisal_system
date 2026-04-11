import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, AlertTriangle, CheckCircle, CalendarOff, Calendar, Archive, Send } from 'lucide-react'
import './Dashboard.css'

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`

const Dashboard = () => {
  const navigate = useNavigate()
  const [sessionInfo, setSessionInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastSubmission, setLastSubmission] = useState(null)
  const [activeSessionYear, setActiveSessionYear] = useState(null)

  useEffect(() => {
    fetchSessionStatus()

    // Auto-poll every 30 s so the page updates when DOFA releases forms
    // without requiring a manual refresh
    const pollInterval = setInterval(() => {
      fetchSessionStatus()
    }, 30000)
    return () => clearInterval(pollInterval)
  }, [])

  // Once we know the active session year, fetch the submission for THAT year only
  useEffect(() => {
    if (activeSessionYear) fetchLastSubmission(activeSessionYear)
  }, [activeSessionYear])

  const fetchSessionStatus = async () => {
    try {
      const res = await fetch(`${API}/sessions/active`)
      const data = await res.json()
      if (data.success) {
        setSessionInfo(data)
        if (data.data?.academic_year) {
          setActiveSessionYear(data.data.academic_year)
        }
      }
    } catch (error) {
      console.error('Error fetching session status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLastSubmission = async (academicYear) => {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
      if (!user.id) return
      // Filter by the CURRENT session's academic year so a previous year's
      // submission doesn't appear as "submitted" for the new session
      const yearParam = academicYear ? `&academic_year=${encodeURIComponent(academicYear)}` : ''
      const res = await fetch(`${API}/submissions?faculty_id=${user.id}&limit=1${yearParam}`)
      const data = await res.json()
      if (data.success && data.data && data.data.length > 0) {
        setLastSubmission(data.data[0])
      } else {
        setLastSubmission(null)   // no submission for this year yet
      }
    } catch (err) { /* silently fail */ }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="dashboard-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const session = sessionInfo?.data
  const isReleased = sessionInfo?.released
  const isPastDeadline = sessionInfo?.pastDeadline

  // ─── Case 1: Forms are released ─────────────────────────────
  if (isReleased && session) {
    const deadline = session.deadline ? new Date(session.deadline) : null
    const now = new Date()
    const daysLeft = deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : null
    const isSubmitted = lastSubmission && ['submitted', 'under_review', 'sent_back'].includes(lastSubmission.status)
    const isEditGranted = lastSubmission?.status === 'sent_back'

    // ── Sub-case A: Already submitted ────────────────────────
    if (isSubmitted) {
      return (
        <div className="dashboard">
          {isEditGranted ? (
            <div className="dashboard-banner" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', marginBottom: 24 }}>
              <div className="banner-icon-wrap" style={{ color: '#d97706' }}>
                <CheckCircle size={20} />
              </div>
              <div className="banner-content">
                <h1 className="dashboard-title">Edit Access Granted</h1>
                <p className="dashboard-description">
                  The DOFA office has approved your edit request for <strong>{session.academic_year}</strong>.
                  Navigate to the approved sections from the sidebar, make your changes, then re-submit from <strong>Part B</strong>.
                  &nbsp;Deadline: <strong>{formatDate(session.deadline)}</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="dashboard-banner dashboard-banner-active">
              <div className="banner-icon-wrap banner-icon-success">
                <CheckCircle size={20} />
              </div>
              <div className="banner-content">
                <h1 className="dashboard-title">Appraisal Form Submitted</h1>
                <p className="dashboard-description">
                  Your appraisal form for <strong>{session.academic_year}</strong> has been submitted successfully.
                  You may view the submitted form or request section edits from the DOFA office before the deadline.
                </p>
              </div>
            </div>
          )}

          <div className="dashboard-info-grid">
            <div className="info-card info-card-primary">
              <Calendar size={18} />
              <div>
                <span className="info-label">Academic Year</span>
                <span className="info-value">{session.academic_year}</span>
              </div>
            </div>
            <div className={`info-card ${daysLeft !== null && daysLeft <= 3 ? 'info-card-danger' : 'info-card-warning'}`}>
              <Clock size={18} />
              <div>
                <span className="info-label">Submission Deadline</span>
                <span className="info-value">{formatDate(session.deadline)}</span>
              </div>
            </div>
            <div className="info-card info-card-primary">
              <CheckCircle size={18} />
              <div>
                <span className="info-label">Your Status</span>
                <span className="info-value">
                  {isEditGranted ? 'Edit Access Granted'
                    : lastSubmission.status === 'submitted' ? 'Submitted'
                      : lastSubmission.status}
                </span>
              </div>
            </div>
          </div>

          {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
            <div className="dashboard-urgent-banner">
              <AlertTriangle size={16} />
              <span>Deadline approaching — <strong>{daysLeft} day{daysLeft > 1 ? 's' : ''}</strong> remaining.</span>
            </div>
          )}

          <div className="dashboard-quick-links">
            <h2>Your Submission</h2>
            <div className="quick-links-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              <button
                className="quick-link-card"
                onClick={() => navigate('/my-submission')}
                style={{ borderColor: '#1d4ed8', background: '#eff6ff', color: '#1d4ed8' }}
              >
                <FileText size={20} />
                <span style={{ fontWeight: 600 }}>View Submitted Form</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>Review what you submitted</span>
              </button>

              {!isEditGranted && daysLeft > 0 && (
                <button
                  className="quick-link-card"
                  onClick={() => navigate('/my-submission')}
                >
                  <Send size={20} />
                  <span>Request Section Edits</span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>Ask DOFA to unlock sections</span>
                </button>
              )}
            </div>
          </div>

          {isEditGranted && (
            <div className="dashboard-quick-links" style={{ marginTop: 0 }}>
              <h2>Navigate to Edit</h2>
              <div className="quick-links-grid">
                <button className="quick-link-card" onClick={() => navigate('/faculty-information')}>
                  <FileText size={18} /><span>Faculty Information</span>
                </button>
                <button className="quick-link-card" onClick={() => navigate('/courses-taught')}>
                  <FileText size={18} /><span>Courses Taught</span>
                </button>
                <button className="quick-link-card" onClick={() => navigate('/research-publications')}>
                  <FileText size={18} /><span>Research Publications</span>
                </button>
                <button className="quick-link-card" onClick={() => navigate('/part-b')}>
                  <FileText size={18} /><span>Part B — Re-submit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

    // ── Sub-case B: Not yet submitted ────────────────────────
    return (
      <div className="dashboard">
        <div className="dashboard-banner dashboard-banner-active">
          <div className="banner-icon-wrap banner-icon-success">
            <CheckCircle size={20} />
          </div>
          <div className="banner-content">
            <h1 className="dashboard-title">Appraisal Forms Are Open</h1>
            <p className="dashboard-description">
              The appraisal forms for <strong>{session.academic_year}</strong> are now available. Please complete Part A and Part B using the sidebar navigation and submit before the deadline.
            </p>
          </div>
        </div>

        <div className="dashboard-info-grid">
          <div className="info-card info-card-primary">
            <Calendar size={18} />
            <div>
              <span className="info-label">Academic Year</span>
              <span className="info-value">{session.academic_year}</span>
            </div>
          </div>
          <div className={`info-card ${daysLeft !== null && daysLeft <= 3 ? 'info-card-danger' : 'info-card-warning'}`}>
            <Clock size={18} />
            <div>
              <span className="info-label">Submission Deadline</span>
              <span className="info-value">{formatDate(session.deadline)}</span>
            </div>
          </div>
          <div className={`info-card ${daysLeft !== null && daysLeft <= 3 ? 'info-card-danger' : 'info-card-primary'}`}>
            <AlertTriangle size={18} />
            <div>
              <span className="info-label">Days Remaining</span>
              <span className="info-value">
                {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Last day') : '—'}
              </span>
            </div>
          </div>
        </div>

        {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
          <div className="dashboard-urgent-banner">
            <AlertTriangle size={16} />
            <span>Deadline approaching — please submit within <strong>{daysLeft} day{daysLeft > 1 ? 's' : ''}</strong>.</span>
          </div>
        )}

        <div className="dashboard-quick-links">
          <h2>Quick Navigation</h2>
          <div className="quick-links-grid">
            <button className="quick-link-card" onClick={() => navigate('/faculty-information')}>
              <FileText size={18} /><span>Faculty Information</span>
            </button>
            <button className="quick-link-card" onClick={() => navigate('/courses-taught')}>
              <FileText size={18} /><span>Courses Taught</span>
            </button>
            <button className="quick-link-card" onClick={() => navigate('/research-publications')}>
              <FileText size={18} /><span>Research Publications</span>
            </button>
            <button className="quick-link-card" onClick={() => navigate('/part-b')}>
              <FileText size={18} /><span>Part B</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Case 2: Deadline has passed ─────────────────────────────
  if (isPastDeadline && session) {
    return (
      <div className="dashboard">
        <div className="dashboard-banner dashboard-banner-expired">
          <div className="banner-icon-wrap banner-icon-danger">
            <CalendarOff size={20} />
          </div>
          <div className="banner-content">
            <h1 className="dashboard-title">Submission Deadline Has Passed</h1>
            <p className="dashboard-description">
              The submission deadline for <strong>{session.academic_year}</strong> was <strong>{formatDate(session.deadline)}</strong>.
              Form submissions are no longer accepted. Please contact the DOFA office if you have any concerns.
            </p>
          </div>
        </div>

        {lastSubmission && (
          <div className="dashboard-last-submission">
            <Archive size={18} />
            <div>
              <h3>Your Last Submission</h3>
              <p>
                Academic Year: <strong>{lastSubmission.academic_year}</strong> &middot;
                Status: <strong>{lastSubmission.status}</strong> &middot;
                Submitted: <strong>{formatDate(lastSubmission.submitted_at)}</strong>
              </p>
              <button
                onClick={() => navigate('/my-submission')}
                style={{ marginTop: 10, padding: '7px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}
              >
                View Submitted Form
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Case 3: No active session / Forms not released ──────────
  return (
    <div className="dashboard">
      <div className="dashboard-banner dashboard-banner-waiting">
        <div className="banner-icon-wrap banner-icon-neutral">
          <Clock size={20} />
        </div>
        <div className="banner-content">
          <h1 className="dashboard-title">Appraisal Forms Not Yet Available</h1>
          <p className="dashboard-description">
            {session
              ? `The appraisal forms for ${session.academic_year} have not been released yet. You will receive an email notification once forms are available.`
              : 'There is no active appraisal session at the moment. You will be notified via email when a new session is opened and forms are released.'}
          </p>
        </div>
      </div>

      <div className="dashboard-waiting-illustration">
        <div className="waiting-pulse"></div>
        <p>Awaiting form release</p>
        <span>Check your email for updates from the DOFA office</span>
      </div>

      {lastSubmission && (
        <div className="dashboard-last-submission">
          <Archive size={18} />
          <div>
            <h3>Previous Submission</h3>
            <p>
              Academic Year: <strong>{lastSubmission.academic_year}</strong> &middot;
              Status: <strong>{lastSubmission.status}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard