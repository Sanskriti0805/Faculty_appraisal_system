import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, PlayCircle, StopCircle, Timer, AlertTriangle, CheckCircle2, XCircle, Loader2, CalendarClock, Rocket, Ban } from 'lucide-react';
import './FormRelease.css';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const FormRelease = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Create session form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSession, setNewSession] = useState({
    academic_year: '',
    start_date: '',
    end_date: '',
    deadline: ''
  });

  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, activeRes] = await Promise.all([
        fetch(`${API}/sessions`),
        fetch(`${API}/sessions/active`)
      ]);
      
      const sessionsData = await sessionsRes.json();
      const activeData = await activeRes.json();
      
      if (sessionsData.success) setSessions(sessionsData.data);
      if (activeData.success) setActiveSession(activeData.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showToast('Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSession, status: 'open' })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Appraisal session created successfully!');
        setShowCreateForm(false);
        setNewSession({ academic_year: '', start_date: '', end_date: '', deadline: '' });
        fetchData();
      } else {
        showToast(data.message || 'Failed to create session', 'error');
      }
    } catch (error) {
      showToast('Failed to create session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseNow = async () => {
    if (!activeSession) return;
    if (!window.confirm('Are you sure you want to release the appraisal forms now? This will send notification emails to ALL faculty members.')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id })
      });
      const data = await response.json();
      if (data.success) {
        showToast(data.message);
        fetchData();
      } else {
        showToast(data.message || 'Failed to release forms', 'error');
      }
    } catch (error) {
      showToast('Failed to release forms', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleRelease = async (e) => {
    e.preventDefault();
    if (!activeSession) return;
    
    const scheduled_date = `${scheduledDate}T${scheduledTime}:00`;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id, scheduled_date })
      });
      const data = await response.json();
      if (data.success) {
        showToast(data.message);
        setShowScheduleForm(false);
        setScheduledDate('');
        setScheduledTime('10:00');
        fetchData();
      } else {
        showToast(data.message || 'Failed to schedule release', 'error');
      }
    } catch (error) {
      showToast('Failed to schedule release', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!activeSession) return;
    if (!window.confirm('Cancel the scheduled form release?')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/cancel-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Scheduled release cancelled.');
        fetchData();
      }
    } catch (error) {
      showToast('Failed to cancel schedule', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnrelease = async () => {
    if (!activeSession) return;
    if (!window.confirm('Close form access? Faculty will no longer be able to fill forms.')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/unrelease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Form access closed.');
        fetchData();
      }
    } catch (error) {
      showToast('Failed to close forms', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSession = async (id) => {
    if (!window.confirm('Are you sure you want to close this session?')) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Session closed successfully.');
        fetchData();
      }
    } catch (error) {
      showToast('Failed to close session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getStatusInfo = () => {
    if (!activeSession) return { label: 'No Active Session', color: 'neutral', icon: XCircle };
    if (activeSession.is_released) return { label: 'Forms Released', color: 'success', icon: CheckCircle2 };
    if (activeSession.scheduled_release) return { label: 'Scheduled', color: 'warning', icon: CalendarClock };
    return { label: 'Not Released', color: 'neutral', icon: Clock };
  };

  const getDaysRemaining = () => {
    if (!activeSession?.deadline) return null;
    const now = new Date();
    const deadline = new Date(activeSession.deadline);
    const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const statusInfo = getStatusInfo();
  const daysLeft = getDaysRemaining();

  if (loading) {
    return (
      <div className="form-release-page">
        <div className="fr-loading">
          <Loader2 className="spin" size={32} />
          <p>Loading session data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-release-page">
      {/* Toast notification */}
      {toast && (
        <div className={`fr-toast fr-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="fr-header">
        <div>
          <h1 className="fr-title">Form Release Management</h1>
          <p className="fr-subtitle">Control when faculty appraisal forms become available</p>
        </div>
        {!activeSession && (
          <button className="fr-btn fr-btn-primary" onClick={() => setShowCreateForm(true)}>
            <Calendar size={18} />
            Create New Session
          </button>
        )}
      </div>

      {/* Status Overview Cards */}
      <div className="fr-status-grid">
        <div className={`fr-status-card fr-status-${statusInfo.color}`}>
          <div className="fr-status-icon-wrapper">
            <statusInfo.icon size={28} />
          </div>
          <div className="fr-status-content">
            <span className="fr-status-label">Current Status</span>
            <span className="fr-status-value">{statusInfo.label}</span>
          </div>
        </div>

        <div className="fr-status-card fr-status-info">
          <div className="fr-status-icon-wrapper">
            <Calendar size={28} />
          </div>
          <div className="fr-status-content">
            <span className="fr-status-label">Academic Year</span>
            <span className="fr-status-value">{activeSession?.academic_year || '—'}</span>
          </div>
        </div>

        <div className="fr-status-card fr-status-info">
          <div className="fr-status-icon-wrapper">
            <Timer size={28} />
          </div>
          <div className="fr-status-content">
            <span className="fr-status-label">Submission Deadline</span>
            <span className="fr-status-value">{formatDate(activeSession?.deadline)}</span>
          </div>
        </div>

        <div className={`fr-status-card ${daysLeft !== null && daysLeft <= 3 ? 'fr-status-danger' : 'fr-status-info'}`}>
          <div className="fr-status-icon-wrapper">
            <AlertTriangle size={28} />
          </div>
          <div className="fr-status-content">
            <span className="fr-status-label">Days Remaining</span>
            <span className="fr-status-value">
              {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Expired') : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Session Controls */}
      {activeSession && (
        <div className="fr-control-panel">
          <h2 className="fr-panel-title">Release Controls</h2>
          <p className="fr-panel-subtitle">
            Session: <strong>{activeSession.academic_year}</strong> • 
            {activeSession.release_date && ` Released on: ${formatDateTime(activeSession.release_date)} • `}
            Deadline: <strong>{formatDate(activeSession.deadline)}</strong>
          </p>

          {/* If not released and no schedule */}
          {!activeSession.is_released && !activeSession.scheduled_release && (
            <div className="fr-actions-section">
              <div className="fr-action-card fr-action-release">
                <div className="fr-action-icon">
                  <Rocket size={36} />
                </div>
                <div className="fr-action-content">
                  <h3>Release Now</h3>
                  <p>Immediately release forms for all faculty. Notification emails will be sent.</p>
                  <button 
                    className="fr-btn fr-btn-release" 
                    onClick={handleReleaseNow}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="spin" size={18} /> : <PlayCircle size={18} />}
                    Release Forms Now
                  </button>
                </div>
              </div>

              <div className="fr-action-card fr-action-schedule">
                <div className="fr-action-icon">
                  <CalendarClock size={36} />
                </div>
                <div className="fr-action-content">
                  <h3>Schedule Release</h3>
                  <p>Set a future date and time for automatic form release.</p>
                  <button 
                    className="fr-btn fr-btn-schedule"
                    onClick={() => setShowScheduleForm(!showScheduleForm)}
                  >
                    <Calendar size={18} />
                    Schedule for Later
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule form */}
          {showScheduleForm && !activeSession.is_released && (
            <div className="fr-schedule-form-wrapper">
              <form className="fr-schedule-form" onSubmit={handleScheduleRelease}>
                <h3><CalendarClock size={20} /> Schedule Form Release</h3>
                <div className="fr-form-row">
                  <div className="fr-form-group">
                    <label>Release Date</label>
                    <input 
                      type="date" 
                      value={scheduledDate} 
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required 
                    />
                  </div>
                  <div className="fr-form-group">
                    <label>Release Time</label>
                    <input 
                      type="time" 
                      value={scheduledTime} 
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <div className="fr-form-actions">
                  <button type="submit" className="fr-btn fr-btn-primary" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                    Confirm Schedule
                  </button>
                  <button type="button" className="fr-btn fr-btn-ghost" onClick={() => setShowScheduleForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* If scheduled */}
          {!activeSession.is_released && activeSession.scheduled_release && (
            <div className="fr-scheduled-banner">
              <div className="fr-scheduled-info">
                <CalendarClock size={24} />
                <div>
                  <h3>Release Scheduled</h3>
                  <p>Forms will be automatically released on <strong>{formatDateTime(activeSession.scheduled_release)}</strong></p>
                  <p className="fr-scheduled-note">Notification emails will be sent to all faculty at that time.</p>
                </div>
              </div>
              <button 
                className="fr-btn fr-btn-danger-outline" 
                onClick={handleCancelSchedule}
                disabled={actionLoading}
              >
                <Ban size={18} />
                Cancel Schedule
              </button>
            </div>
          )}

          {/* If released */}
          {activeSession.is_released === 1 && (
            <div className="fr-released-banner">
              <div className="fr-released-info">
                <CheckCircle2 size={24} />
                <div>
                  <h3>Forms are Live!</h3>
                  <p>Faculty can currently fill out their appraisal forms.</p>
                  <p className="fr-released-meta">
                    Released: {formatDateTime(activeSession.release_date)} • 
                    Deadline: {formatDate(activeSession.deadline)}
                    {daysLeft !== null && ` • ${daysLeft} days remaining`}
                  </p>
                </div>
              </div>
              <button 
                className="fr-btn fr-btn-danger" 
                onClick={handleUnrelease}
                disabled={actionLoading}
              >
                <StopCircle size={18} />
                Close Form Access
              </button>
            </div>
          )}

          {/* Close session button */}
          <div className="fr-session-actions">
            <button 
              className="fr-btn fr-btn-danger-outline" 
              onClick={() => handleCloseSession(activeSession.id)}
              disabled={actionLoading}
            >
              <XCircle size={18} />
              Close Session Entirely
            </button>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateForm && (
        <div className="fr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div className="fr-modal">
            <h2><Calendar size={22} /> Create Appraisal Session</h2>
            <form onSubmit={handleCreateSession}>
              <div className="fr-form-group">
                <label>Academic Year</label>
                <input 
                  type="text" 
                  placeholder="e.g., 2025-26"
                  value={newSession.academic_year}
                  onChange={(e) => setNewSession({...newSession, academic_year: e.target.value})}
                  required
                />
              </div>
              <div className="fr-form-row">
                <div className="fr-form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    value={newSession.start_date}
                    onChange={(e) => setNewSession({...newSession, start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="fr-form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    value={newSession.end_date}
                    onChange={(e) => setNewSession({...newSession, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="fr-form-group">
                <label>Submission Deadline</label>
                <input 
                  type="date" 
                  value={newSession.deadline}
                  onChange={(e) => setNewSession({...newSession, deadline: e.target.value})}
                  required
                />
                <span className="fr-form-hint">Faculty must submit their forms before this date</span>
              </div>
              <div className="fr-form-actions">
                <button type="submit" className="fr-btn fr-btn-primary" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                  Create Session
                </button>
                <button type="button" className="fr-btn fr-btn-ghost" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Past Sessions */}
      {sessions.filter(s => s.status === 'closed').length > 0 && (
        <div className="fr-past-sessions">
          <h2 className="fr-panel-title">Past Sessions</h2>
          <div className="fr-sessions-table-wrapper">
            <table className="fr-sessions-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Deadline</th>
                  <th>Released On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.filter(s => s.status === 'closed').map(session => (
                  <tr key={session.id}>
                    <td><strong>{session.academic_year}</strong></td>
                    <td>{formatDate(session.start_date)}</td>
                    <td>{formatDate(session.end_date)}</td>
                    <td>{formatDate(session.deadline)}</td>
                    <td>{formatDateTime(session.release_date)}</td>
                    <td><span className="fr-badge fr-badge-closed">Closed</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormRelease;
