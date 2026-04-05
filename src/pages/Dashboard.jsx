import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, AlertTriangle, CheckCircle, CalendarOff, Calendar, Archive } from 'lucide-react'
import './Dashboard.css'

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`

const Dashboard = () => {
  const navigate = useNavigate()
  const [sessionInfo, setSessionInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastSubmission, setLastSubmission] = useState(null)

  useEffect(() => {
    fetchSessionStatus()
    fetchLastSubmission()
  }, [])

  const fetchSessionStatus = async () => {
    try {
      const res = await fetch(`${API}/sessions/active`)
      const data = await res.json()
      if (data.success) {
        setSessionInfo(data)
      }
    } catch (error) {
      console.error('Error fetching session status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLastSubmission = async () => {
    try {
      // Try to fetch the user's latest submission
      const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
      if (!user.id) return

      const res = await fetch(`${API}/submissions?faculty_id=${user.id}&limit=1`)
      const data = await res.json()
      if (data.success && data.data && data.data.length > 0) {
        setLastSubmission(data.data[0])
      }
    } catch (err) {
      // silently fail
    }
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

    return (
      <div className="dashboard">
        <div className="dashboard-banner dashboard-banner-active">
          <div className="banner-icon-wrap banner-icon-success">
            <CheckCircle size={32} />
          </div>
          <div className="banner-content">
            <h1 className="dashboard-title">Faculty Appraisal Forms Are Open!</h1>
            <p className="dashboard-description">
              The appraisal forms for <strong>{session.academic_year}</strong> are available. Please fill out both Part A and Part B using the sidebar navigation.
            </p>
          </div>
        </div>

        <div className="dashboard-info-grid">
          <div className="info-card info-card-primary">
            <Calendar size={22} />
            <div>
              <span className="info-label">Academic Year</span>
              <span className="info-value">{session.academic_year}</span>
            </div>
          </div>

          <div className={`info-card ${daysLeft !== null && daysLeft <= 3 ? 'info-card-danger' : 'info-card-warning'}`}>
            <Clock size={22} />
            <div>
              <span className="info-label">Submission Deadline</span>
              <span className="info-value">{formatDate(session.deadline)}</span>
            </div>
          </div>

          <div className={`info-card ${daysLeft !== null && daysLeft <= 3 ? 'info-card-danger' : 'info-card-primary'}`}>
            <AlertTriangle size={22} />
            <div>
              <span className="info-label">Days Remaining</span>
              <span className="info-value">
                {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Last day!') : '—'}
              </span>
            </div>
          </div>
        </div>

        {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
          <div className="dashboard-urgent-banner">
            <AlertTriangle size={20} />
            <span>Deadline approaching! Please submit your forms within the next <strong>{daysLeft} day{daysLeft > 1 ? 's' : ''}</strong>.</span>
          </div>
        )}

        <div className="dashboard-quick-links">
          <h2>Quick Navigation</h2>
          <div className="quick-links-grid">
            <button className="quick-link-card" onClick={() => navigate('/faculty-information')}>
              <FileText size={24} />
              <span>Faculty Information</span>
            </button>
            <button className="quick-link-card" onClick={() => navigate('/courses-taught')}>
              <FileText size={24} />
              <span>Courses Taught</span>
            </button>
            <button className="quick-link-card" onClick={() => navigate('/research-publications')}>
              <FileText size={24} />
              <span>Research Publications</span>
            </button>
            <button className="quick-link-card" onClick={() => navigate('/part-b')}>
              <FileText size={24} />
              <span>Part B</span>
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
            <CalendarOff size={32} />
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
            <Archive size={20} />
            <div>
              <h3>Your Last Submission</h3>
              <p>
                Academic Year: <strong>{lastSubmission.academic_year}</strong> • 
                Status: <strong>{lastSubmission.status}</strong> • 
                Submitted: <strong>{formatDate(lastSubmission.submitted_at)}</strong>
              </p>
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
          <Clock size={32} />
        </div>
        <div className="banner-content">
          <h1 className="dashboard-title">Appraisal Forms Not Yet Available</h1>
          <p className="dashboard-description">
            {session 
              ? `The appraisal forms for ${session.academic_year} have not been released yet. You will receive an email notification once the forms are available for filling.`
              : 'There is no active appraisal session at the moment. You will be notified via email when a new session is opened and forms are released.'
            }
          </p>
        </div>
      </div>

      <div className="dashboard-waiting-illustration">
        <div className="waiting-pulse"></div>
        <p>Waiting for form release...</p>
        <span>Check your email for updates</span>
      </div>

      {lastSubmission && (
        <div className="dashboard-last-submission">
          <Archive size={20} />
          <div>
            <h3>Your Previous Submission</h3>
            <p>
              Academic Year: <strong>{lastSubmission.academic_year}</strong> • 
              Status: <strong>{lastSubmission.status}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
