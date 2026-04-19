import React, { useState, useRef, useEffect } from 'react'
import { Trash2, Plus, X } from 'lucide-react'
import './ConferenceSessions.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'

const formatDateForDisplay = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

const isGenericVenueToken = (value) => {
  const token = (value || '').trim().toLowerCase()
  return token === 'city' || token === 'state' || token === 'country'
}

const formatVenue = (venue = {}) => {
  const parts = [venue.city, venue.state, venue.country]
    .map((p) => (p || '').trim())
    .filter((p) => p && !isGenericVenueToken(p))
  return parts.join(', ')
}

const formatStoredFileName = (name) => {
  if (!name) return ''
  // Stored uploads can include generated prefixes like 177542...-53136799-<original-name>
  return String(name).replace(/^\d+(?:-\d+)+-/, '')
}

const ConferenceSessions = () => {
  const { user, token } = useAuth()
  const fileInputRef = useRef(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [persistedSessionIds, setPersistedSessionIds] = useState([])
  const initialState = {
    eventType: 'Conference',
    sponsoringAgency: '',
    eventTitle: '',
    abbreviation: '',
    organizer: '',
    role: '',
    certificateFile: null,
    venue: {
      city: '',
      state: '',
      country: ''
    },
    fromDate: '',
    toDate: ''
  }

  const [submittedSessions, setSubmittedSessions] = useState([])
  const [formData, setFormData] = useState(initialState)

  const resetDraftForm = () => {
    setFormData({
      eventType: 'Conference',
      sponsoringAgency: '',
      eventTitle: '',
      abbreviation: '',
      organizer: '',
      role: '',
      certificateFile: null,
      venue: {
        city: '',
        state: '',
        country: ''
      },
      fromDate: '',
      toDate: ''
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileInputKey((prev) => prev + 1)
  }

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    window.clearTimeout(window.__conferenceSessionsToastTimer)
    window.__conferenceSessionsToastTimer = window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!user?.id) return

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const rows = Array.isArray(details?.data?.conferenceSessions) ? details.data.conferenceSessions : []
        if (rows.length === 0) return

        setPersistedSessionIds(rows.map((row) => row.id).filter(Boolean))

        const mapped = rows.map((row) => {
          const locationParts = (row.location || '').split(',').map((part) => part.trim()).filter(Boolean)
          const city = locationParts[0] || ''
          const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : ''

          return {
            id: row.id,
            eventType: 'Conference',
            sponsoringAgency: '',
            eventTitle: row.session_title || '',
            abbreviation: '',
            organizer: row.conference_name || '',
            role: row.role || '',
            certificateFile: null,
            evidence_file: row.evidence_file || null,
            venue: {
              city,
              state: '',
              country
            },
            fromDate: row.date ? String(row.date).slice(0, 10) : '',
            toDate: ''
          }
        })
        setSubmittedSessions(mapped)
      } catch (error) {
        console.error('Failed to prefill conference sessions:', error)
      }
    }

    hydrateExisting()
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleVenueChange = (e) => {
    const { name, value } = e.target
    const nextValue = isGenericVenueToken(value) ? '' : value
    setFormData(prev => ({
      ...prev,
      venue: {
        ...prev.venue,
        [name]: nextValue
      }
    }))
  }

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      certificateFile: e.target.files[0]
    }))
  }

  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId || !token) {
        showToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }
      
      await Promise.all(persistedSessionIds.map(id => fetch(`http://localhost:5001/api/activities/conference-sessions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })))
      const allSessions = [...submittedSessions]
      
      if (formData.eventTitle) {
        if (!formData.certificateFile && !formData.evidence_file) {
          showToast('Please upload an evidence file before saving this session.')
          return false
        }
        allSessions.push(formData)
      }

      if (allSessions.length === 0) {
        showToast('Please add at least one session')
        return false
      }

      const promises = allSessions.map(session => {
        const formDataObj = new FormData()
        formDataObj.append('faculty_id', facultyId)
        formDataObj.append('conference_name', session.organizer) // Using organizer as conference name for simplicity
        formDataObj.append('session_title', session.eventTitle)
        formDataObj.append('role', session.role)
        formDataObj.append('location', formatVenue(session.venue))
        formDataObj.append('date', session.fromDate || session.toDate || '')

        if (session.certificateFile) {
          formDataObj.append('evidence_file', session.certificateFile)
        } else if (session.evidence_file) {
          formDataObj.append('existing_evidence_file', session.evidence_file)
        }

        return fetch('http://localhost:5001/api/activities/conference-sessions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataObj
        })
      })

      const responses = await Promise.all(promises)
      const settled = await Promise.all(responses.map(async (response) => {
        let payload = null
        try {
          payload = await response.json()
        } catch {
          payload = null
        }

        if (!response.ok) {
          return {
            ok: false,
            message: payload?.message || `Failed to save conference session (HTTP ${response.status})`
          }
        }

        return {
          ok: true,
          id: payload?.id || payload?.data?.id || null
        }
      }))

      const failed = settled.find((item) => !item.ok)
      if (failed) {
        throw new Error(failed.message)
      }

      const createdIds = settled
        .map((item) => item.id)
        .filter((id) => Number.isFinite(Number(id)))

      if (allSessions.length > 0 && createdIds.length === 0) {
        throw new Error('Conference sessions were not saved. Please try again.')
      }

      setPersistedSessionIds(createdIds)
      showToast('Data saved successfully!', 'success')
      setSubmittedSessions([])
      resetDraftForm()
      return true
    } catch (error) {
      console.error('Error saving sessions:', error)
      showToast('Error saving data: ' + error.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleAddConference = (e) => {
    e.preventDefault()
    if (!formData.eventTitle) {
      showToast('Please fill in at least the Title.')
      return
    }

    if (!formData.certificateFile && !formData.evidence_file) {
      showToast('Please upload an evidence file before adding the session.')
      return
    }

    setSubmittedSessions(prev => [...prev, {
      ...formData,
      venue: { ...formData.venue }
    }])
    resetDraftForm()
    showToast('Session added to list. You can now add another.', 'success')
  }

  const handleRemoveSession = (index) => {
    setSubmittedSessions(prev => prev.filter((_, i) => i !== index))
  }

  const clearDraftEvidence = () => {
    setFormData(prev => ({ ...prev, certificateFile: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileInputKey((prev) => prev + 1)
  }

  const clearSessionEvidence = (index) => {
    setSubmittedSessions(prev => prev.map((session, i) => (
      i === index
        ? { ...session, certificateFile: null, evidence_file: null }
        : session
    )))
  }

  return (
    <div className="conference-sessions form-page">
      {toast && (
        <div role="alert" style={{ position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 9999, background: toast.type === 'success' ? '#276749' : '#c53030', color: '#fff', padding: '0.9rem 1rem', borderRadius: '10px', boxShadow: '0 12px 24px rgba(0,0,0,0.18)', minWidth: '280px', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>×</button>
        </div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">Conference Sessions Chaired, if any</h1>
          <p className="page-subtitle">Section 15</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSave} autoComplete="off" noValidate>
          {/* Row 1 */}
          <div className="form-row">
            <div className="form-group">
              <label>Type of Event<span className="required-star">*</span></label>
              <input
                type="text"
                name="eventType"
                value="Conference"
                readOnly
                className="readonly-input"
              />
            </div>
            <div className="form-group">
              <label>Sponsoring Agency<span className="required-star">*</span></label>
              <input
                type="text"
                name="sponsoringAgency"
                value={formData.sponsoringAgency}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="form-row">
            <div className="form-group">
              <label>Title<span className="required-star">*</span></label>
              <input
                type="text"
                name="eventTitle"
                value={formData.eventTitle}
                onChange={handleInputChange}
                  required
              />
            </div>
            <div className="form-group">
              <label>Abbreviation</label>
              <input
                type="text"
                name="abbreviation"
                value={formData.abbreviation}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="form-row">
            <div className="form-group">
              <label>Organizer<span className="required-star">*</span></label>
              <input
                type="text"
                name="organizer"
                value={formData.organizer}
                onChange={handleInputChange}
                  required
              />
            </div>
            <div className="form-group">
              <label>Role<span className="required-star">*</span></label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="e.g. Session Chair, Speaker"
                  required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Upload Evidence<span className="required-star">*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  key={fileInputKey}
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                    required
                />
                <FilePreviewButton file={formData.certificateFile} />
                {formData.certificateFile && (
                  <button
                    type="button"
                    onClick={clearDraftEvidence}
                    title="Remove uploaded document"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '1px solid #d1d8e0',
                      borderRadius: '6px',
                      background: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Venue Section */}
          <div className="section-fieldset">
            <span className="section-legend">Venue</span>
            <div className="venue-row">
              <div className="form-group">
                <label>City<span className="required-star">*</span></label>
                <input
                  type="text"
                  name="city"
                  value={formData.venue.city}
                  onChange={handleVenueChange}
                  autoComplete="off"
                    required
                />
              </div>
              <div className="form-group">
                <label>State<span className="required-star">*</span></label>
                <input
                  type="text"
                  name="state"
                  value={formData.venue.state}
                  onChange={handleVenueChange}
                  autoComplete="off"
                    required
                />
              </div>
              <div className="form-group">
                <label>Country<span className="required-star">*</span></label>
                <input
                  type="text"
                  name="country"
                  value={formData.venue.country}
                  onChange={handleVenueChange}
                  autoComplete="off"
                    required
                />
              </div>
            </div>
          </div>

          {/* Dates Row */}
          <div className="form-row">
            <div className="form-group">
              <label>From<span className="required-star">*</span></label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleInputChange}
                  required
              />
            </div>
            <div className="form-group">
              <label>To<span className="required-star">*</span></label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleInputChange}
                  required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-add-conference" onClick={handleAddConference}>
              <Plus size={18} />
              Add Conference
            </button>
          </div>

          {/* Display Added Sessions List */}
          {submittedSessions.length > 0 && (
            <div className="added-sessions-list">
              <h3>Added Sessions ({submittedSessions.length})</h3>
              <ul>
                {submittedSessions.map((session, index) => (
                  <li key={index}>
                    <div className="session-info">
                      <strong>{session.eventTitle || 'Untitled Session'}</strong>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Organizer: {session.organizer || 'N/A'} | Role: {session.role || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Venue: {formatVenue(session.venue) || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Date: {session.fromDate && session.toDate
                          ? `${formatDateForDisplay(session.fromDate)} to ${formatDateForDisplay(session.toDate)}`
                          : formatDateForDisplay(session.fromDate || session.toDate) || 'N/A'}
                      </div>
                      {(session.certificateFile || session.evidence_file) && (
                        <span style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                            File: {session.certificateFile?.name || formatStoredFileName(session.evidence_file)}
                          </span>
                          <FilePreviewButton file={session.certificateFile || session.evidence_file} style={{ width: '28px', height: '28px' }} />
                          <button
                            type="button"
                            onClick={() => clearSessionEvidence(index)}
                            title="Remove uploaded document"
                            style={{
                              width: '28px',
                              height: '28px',
                              border: '1px solid #d1d8e0',
                              borderRadius: '6px',
                              background: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="remove-session-btn"
                      onClick={() => handleRemoveSession(index)}
                      title="Remove Session"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </form>
      </div>
      <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
  )
}

export default ConferenceSessions

