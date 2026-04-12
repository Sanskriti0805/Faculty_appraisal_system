import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, PlayCircle, StopCircle, Timer, CheckCircle2, XCircle, Loader2, CalendarClock, Rocket, Ban } from 'lucide-react';
import { showConfirm } from '../utils/appDialogs';
import './FormRelease.css';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const FormRelease = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSession, setNewSession] = useState({
    academic_year: '',
    start_date: '',
    end_date: '',
    deadline: '',
    reminder_days: 2,
    reminder_time: '08:00'
  });

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editReminderDays, setEditReminderDays] = useState(2);
  const [editReminderTime, setEditReminderTime] = useState('08:00');

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
      if (activeData.success) {
        setActiveSession(activeData.data);
        if (activeData.data) {
          setEditReminderDays(activeData.data.reminder_days !== null ? activeData.data.reminder_days : 2);
          setEditReminderTime((activeData.data.reminder_time || '08:00:00').substring(0, 5));
        }
      }
    } catch (error) {
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
        showToast('Appraisal session created successfully.');
        setShowCreateForm(false);
        setNewSession({ academic_year: '', start_date: '', end_date: '', deadline: '', reminder_days: 2, reminder_time: '08:00' });
        fetchData();
      } else {
        showToast(data.message || 'Failed to create session', 'error');
      }
    } catch {
      showToast('Failed to create session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseNow = async () => {
    if (!activeSession) return;
    if (!(await showConfirm('Are you sure you want to release the appraisal forms now? Notification emails will be sent to all faculty members.'))) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id })
      });
      const data = await response.json();
      if (data.success) { showToast(data.message); fetchData(); }
      else showToast(data.message || 'Failed to release forms', 'error');
    } catch { showToast('Failed to release forms', 'error'); }
    finally { setActionLoading(false); }
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
        setScheduledDate(''); setScheduledTime('10:00');
        fetchData();
      } else showToast(data.message || 'Failed to schedule release', 'error');
    } catch { showToast('Failed to schedule release', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleCancelSchedule = async () => {
    if (!activeSession) return;
    if (!(await showConfirm('Cancel the scheduled form release?'))) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/cancel-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id })
      });
      const data = await response.json();
      if (data.success) { showToast('Scheduled release cancelled.'); fetchData(); }
    } catch { showToast('Failed to cancel schedule', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleUpdateReminder = async (e) => {
    e.preventDefault();
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeSession, reminder_days: editReminderDays, reminder_time: editReminderTime })
      });
      const data = await response.json();
      if (data.success) { showToast('Reminder settings updated.'); setShowReminderForm(false); fetchData(); }
      else showToast(data.message || 'Failed to update reminder settings', 'error');
    } catch { showToast('Failed to update reminder settings', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleUnrelease = async () => {
    if (!activeSession) return;
    if (!(await showConfirm('Close form access? Faculty will no longer be able to fill forms.'))) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/unrelease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id })
      });
      const data = await response.json();
      if (data.success) { showToast('Form access closed.'); fetchData(); }
    } catch { showToast('Failed to close forms', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleCloseSession = async (id) => {
    if (!(await showConfirm('Are you sure you want to close this session?'))) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API}/sessions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' })
      });
      const data = await response.json();
      if (data.success) { showToast('Session closed.'); fetchData(); }
    } catch { showToast('Failed to close session', 'error'); }
    finally { setActionLoading(false); }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
    const diff = Math.ceil((new Date(activeSession.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const statusInfo = getStatusInfo();
  const daysLeft = getDaysRemaining();

  if (loading) {
    return (
      <div className="form-release-page">
        <div className="fr-loading">
          <Loader2 className="spin" size={24} />
          <p>Loading session data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-release-page">
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#fff', padding: '14px 22px', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideIn 0.3s ease'
        }}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '16px', lineHeight: 1
          }}>×</button>
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
            <Calendar size={15} />
            New Session
          </button>
        )}
      </div>

      {/* Status Overview */}
      <div className="fr-status-grid">
        <div className={`fr-status-card fr-status-${statusInfo.color}`}>
          <div className="fr-status-icon-wrapper">
            <statusInfo.icon size={20} />
          </div>
          <div className="fr-status-content">
            <span className="fr-status-label">Current Status</span>
            <span className="fr-status-value">{statusInfo.label}</span>
          </div>
        </div>

        <div className="fr-status-card fr-status-info">
          <div className="fr-status-icon-wrapper">
            <Calendar size={20} />
          </div>
          <div className="fr-status-content">
            <span className="fr-status-label">Academic Year</span>
            <span className="fr-status-value">{activeSession?.academic_year || '—'}</span>
          </div>
        </div>

        <div className="fr-status-card fr-status-info">
          <div className="fr-status-icon-wrapper">
            <Timer size={20} />
          </div>
          <div className="fr-status-content">
            <span className="fr-status-label">Submission Deadline</span>
            <span className="fr-status-value">{formatDate(activeSession?.deadline)}</span>
          </div>
        </div>

        <div className={`fr-status-card ${daysLeft !== null && daysLeft <= 3 ? 'fr-status-danger' : 'fr-status-neutral'}`}>
          <div className="fr-status-icon-wrapper">
            <Clock size={20} />
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
            Session: <strong>{activeSession.academic_year}</strong>
            {activeSession.release_date && <> &middot; Released: {formatDateTime(activeSession.release_date)}</>}
            {' '}&middot; Deadline: <strong>{formatDate(activeSession.deadline)}</strong>
            {' '}&middot; Reminder: <strong>{activeSession.reminder_days !== null ? activeSession.reminder_days : 2}d before at {(activeSession.reminder_time || '08:00:00').substring(0, 5)}</strong>
            <button
              className="fr-btn fr-btn-ghost"
              style={{ marginLeft: '10px', padding: '3px 10px', fontSize: '0.78rem' }}
              onClick={() => setShowReminderForm(!showReminderForm)}
            >
              Edit
            </button>
          </p>

          {showReminderForm && (
            <div className="fr-schedule-form-wrapper" style={{ borderLeft: '3px solid #1d4ed8' }}>
              <form className="fr-schedule-form" onSubmit={handleUpdateReminder}>
                <h3><Clock size={15} /> Reminder Settings</h3>
                <div className="fr-form-row">
                  <div className="fr-form-group">
                    <label>Days before deadline</label>
                    <input type="number" min="1" max="90" value={editReminderDays}
                      onChange={e => setEditReminderDays(e.target.value)} required />
                  </div>
                  <div className="fr-form-group">
                    <label>Time to send</label>
                    <input type="time" value={editReminderTime}
                      onChange={e => setEditReminderTime(e.target.value)} required />
                  </div>
                </div>
                <div className="fr-form-actions">
                  <button type="submit" className="fr-btn fr-btn-primary" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />}
                    Save
                  </button>
                  <button type="button" className="fr-btn fr-btn-ghost" onClick={() => setShowReminderForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Not released, no schedule */}
          {!activeSession.is_released && !activeSession.scheduled_release && (
            <div className="fr-actions-section">
              <div className="fr-action-card fr-action-release">
                <div className="fr-action-icon">
                  <Rocket size={24} />
                </div>
                <div className="fr-action-content">
                  <h3>Release Now</h3>
                  <p>Immediately make forms available to all faculty. Notification emails will be dispatched.</p>
                  <button className="fr-btn fr-btn-release" onClick={handleReleaseNow} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="spin" size={15} /> : <PlayCircle size={15} />}
                    Release Forms
                  </button>
                </div>
              </div>

              <div className="fr-action-card fr-action-schedule">
                <div className="fr-action-icon">
                  <CalendarClock size={24} />
                </div>
                <div className="fr-action-content">
                  <h3>Schedule Release</h3>
                  <p>Set a future date and time for automatic form release with email notification.</p>
                  <button className="fr-btn fr-btn-schedule" onClick={() => setShowScheduleForm(!showScheduleForm)}>
                    <Calendar size={15} />
                    Schedule for Later
                  </button>
                </div>
              </div>
            </div>
          )}

          {showScheduleForm && !activeSession.is_released && (
            <div className="fr-schedule-form-wrapper">
              <form className="fr-schedule-form" onSubmit={handleScheduleRelease}>
                <h3><CalendarClock size={15} /> Schedule Form Release</h3>
                <div className="fr-form-row">
                  <div className="fr-form-group">
                    <label>Release Date</label>
                    <input type="date" value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div className="fr-form-group">
                    <label>Release Time</label>
                    <input type="time" value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)} required />
                  </div>
                </div>
                <div className="fr-form-actions">
                  <button type="submit" className="fr-btn fr-btn-primary" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />}
                    Confirm Schedule
                  </button>
                  <button type="button" className="fr-btn fr-btn-ghost" onClick={() => setShowScheduleForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Scheduled banner */}
          {!activeSession.is_released && activeSession.scheduled_release && (
            <div className="fr-scheduled-banner">
              <div className="fr-scheduled-info">
                <CalendarClock size={18} />
                <div>
                  <h3>Release Scheduled</h3>
                  <p>Forms will be released on <strong>{formatDateTime(activeSession.scheduled_release)}</strong></p>
                  <p className="fr-scheduled-note">Email notifications will be sent to all faculty at that time.</p>
                </div>
              </div>
              <button className="fr-btn fr-btn-danger-outline" onClick={handleCancelSchedule} disabled={actionLoading}>
                <Ban size={14} />
                Cancel Schedule
              </button>
            </div>
          )}

          {/* Released banner */}
          {activeSession.is_released === 1 && (
            <div className="fr-released-banner">
              <div className="fr-released-info">
                <CheckCircle2 size={18} />
                <div>
                  <h3>Forms are Live</h3>
                  <p>Faculty can currently access and fill their appraisal forms.</p>
                  <p className="fr-released-meta">
                    Released {formatDateTime(activeSession.release_date)} &middot; Deadline {formatDate(activeSession.deadline)}
                    {daysLeft !== null && ` · ${daysLeft > 0 ? `${daysLeft} days remaining` : 'Deadline passed'}`}
                  </p>
                </div>
              </div>
              <button className="fr-btn fr-btn-danger" onClick={handleUnrelease} disabled={actionLoading}>
                <StopCircle size={14} />
                Close Access
              </button>
            </div>
          )}

          <div className="fr-session-actions">
            <button className="fr-btn fr-btn-danger-outline" onClick={() => handleCloseSession(activeSession.id)} disabled={actionLoading}>
              <XCircle size={14} />
              Close Session
            </button>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateForm && (
        <div className="fr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div className="fr-modal">
            <h2><Calendar size={18} /> Create Appraisal Session</h2>
            <form onSubmit={handleCreateSession}>
              <div className="fr-form-group">
                <label>Academic Year</label>
                <input type="text" placeholder="e.g., 2025–26"
                  value={newSession.academic_year}
                  onChange={(e) => setNewSession({...newSession, academic_year: e.target.value})}
                  required />
              </div>
              <div className="fr-form-row">
                <div className="fr-form-group">
                  <label>Start Date</label>
                  <input type="date" value={newSession.start_date}
                    onChange={(e) => setNewSession({...newSession, start_date: e.target.value})} required />
                </div>
                <div className="fr-form-group">
                  <label>End Date</label>
                  <input type="date" value={newSession.end_date}
                    onChange={(e) => setNewSession({...newSession, end_date: e.target.value})} required />
                </div>
              </div>
              <div className="fr-form-group">
                <label>Submission Deadline</label>
                <input type="date" value={newSession.deadline}
                  onChange={(e) => setNewSession({...newSession, deadline: e.target.value})} required />
                <span className="fr-form-hint">Faculty must submit forms before this date</span>
              </div>
              <div className="fr-form-row">
                <div className="fr-form-group">
                  <label>Reminder Days</label>
                  <input type="number" min="1" max="90" value={newSession.reminder_days}
                    onChange={(e) => setNewSession({...newSession, reminder_days: e.target.value})} required />
                  <span className="fr-form-hint">Days before deadline to send reminder</span>
                </div>
                <div className="fr-form-group">
                  <label>Reminder Time</label>
                  <input type="time" value={newSession.reminder_time}
                    onChange={(e) => setNewSession({...newSession, reminder_time: e.target.value})} required />
                </div>
              </div>
              <div className="fr-form-actions">
                <button type="submit" className="fr-btn fr-btn-primary" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />}
                  Create Session
                </button>
                <button type="button" className="fr-btn fr-btn-ghost" onClick={() => setShowCreateForm(false)}>Cancel</button>
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

      <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};

export default FormRelease;