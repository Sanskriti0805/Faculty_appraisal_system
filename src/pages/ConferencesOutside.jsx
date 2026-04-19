import React, { useState } from 'react'
import { useEffect } from 'react'
import { Trash2, Plus, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import './ConferencesOutside.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const normalizeVenueField = (value) => {
  const text = (value || '').trim()
  const token = text.toLowerCase()
  if (token === 'city' || token === 'state' || token === 'country') {
    return ''
  }
  return value || ''
}

const sanitizeConferenceFormData = (data, fallback) => ({
  ...fallback,
  ...data,
  city: normalizeVenueField(data?.city),
  state: normalizeVenueField(data?.state),
  country: normalizeVenueField(data?.country)
})

const formatDateForDisplay = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

const formatStoredFileName = (name) => {
  if (!name) return ''
  return String(name).replace(/^\d+(?:-\d+)+-/, '')
}

const formatVenue = (conf) => {
  const parts = [conf?.city, conf?.state, conf?.country]
    .map((p) => (p || '').trim())
    .filter(Boolean)
  return parts.join(', ')
}

const ConferencesOutside = () => {
  const { user } = useAuth()
  const [toast, setToast] = useState(null)
  const initialState = {
    eventType: 'Conference',
    eventMode: 'Offline',
    eventTitle: '',
    eventAbbreviation: '',
    organizer: '',
    role: '',
    city: '',
    state: '',
    country: '',
    fromDate: '',
    toDate: '',
    photoLink: '',
    posterFile: null
  }

  const [submittedConferences, setSubmittedConferences] = useState([])
  const [formData, setFormData] = useState(initialState)

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    window.clearTimeout(window.__conferencesOutsideToastTimer)
    window.__conferencesOutsideToastTimer = window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('conferences_outside')
        const parsed = res?.data
        if (!parsed) return
        setSubmittedConferences(Array.isArray(parsed.submittedConferences) ? parsed.submittedConferences : [])
        setFormData(sanitizeConferenceFormData(parsed.formData || initialState, initialState))
      } catch (error) {
        console.error('Failed to load conferences outside data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const nextValue = (name === 'city' || name === 'state' || name === 'country')
      ? normalizeVenueField(value)
      : value
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }))
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: files[0]
    }))
  }

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    // Only save NEW conference data if form has content
    // Don't re-save submittedConferences as they're already in database
    if (!formData.eventTitle && submittedConferences.length === 0) {
      showToast('Please add at least one conference')
      return false
    }

    if (!user?.id) {
      showToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    try {
      // Only include new conference if it has data, keep submitted ones as-is
      const dataToSave = {
        submittedConferences: submittedConferences, // Keep existing ones unchanged
        formData: formData.eventTitle ? initialState : formData // Reset form after adding new
      }
      
      // If form has new conference data, add it to the list
      if (formData.eventTitle) {
        dataToSave.submittedConferences = [...submittedConferences, formData]
        dataToSave.formData = initialState // Reset form
      }
      
      await legacySectionsService.saveSection('conferences_outside', dataToSave)
      showToast('All data saved successfully!', 'success')
      return true
    } catch (error) {
      console.error('Failed to save conferences outside data:', error)
      showToast('Failed to save data. Please try again.')
      return false
    }
  }

  const handleAddConference = (e) => {
    e.preventDefault()
    if (!formData.eventTitle) {
      showToast('Please fill in at least the Event Title.')
      return
    }

    setSubmittedConferences(prev => [...prev, formData])
    setFormData(initialState)
    showToast('Conference added to list. You can now add another.', 'success')
  }

  const handleRemoveConference = (index) => {
    setSubmittedConferences(prev => prev.filter((_, i) => i !== index))
  }

  const clearDraftEvidence = () => {
    setFormData(prev => ({ ...prev, posterFile: null }))
  }

  const clearConferenceEvidence = (index) => {
    setSubmittedConferences(prev => prev.map((conf, i) => (
      i === index ? { ...conf, posterFile: null } : conf
    )))
  }

  return (
    <div className="conferences-outside form-page">
      {toast && (
        <div role="alert" style={{ position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 9999, background: toast.type === 'success' ? '#276749' : '#c53030', color: '#fff', padding: '0.9rem 1rem', borderRadius: '10px', boxShadow: '0 12px 24px rgba(0,0,0,0.18)', minWidth: '280px', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>×</button>
        </div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">Conferences Outside LNMIIT</h1>
          <p className="page-subtitle">Conferences Outside LNMIIT</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSave} noValidate>
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
              <label>Mode of Event<span className="required-star">*</span></label>
              <select name="eventMode" value={formData.eventMode} onChange={handleInputChange}>
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="form-row">
            <div className="form-group">
              <label>Title of Event<span className="required-star">*</span></label>
              <input
                type="text"
                name="eventTitle"
                value={formData.eventTitle}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="form-row">
            <div className="form-group">
              <label>Abbreviation of Event</label>
              <input
                type="text"
                name="eventAbbreviation"
                value={formData.eventAbbreviation}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Organizer<span className="required-star">*</span></label>
              <input
                type="text"
                name="organizer"
                value={formData.organizer}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Role<span className="required-star">*</span></label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="e.g. Session Chair, Speaker, Organizer"
              />
            </div>
          </div>

          {/* Venue Section */}
          <div className="section-label">Venue</div>
          <div className="form-row">
            <div className="form-group">
              <label>City<span className="required-star">*</span></label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>State<span className="required-star">*</span></label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Country<span className="required-star">*</span></label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>From<span className="required-star">*</span></label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>To<span className="required-star">*</span></label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Link for Photos</label>
              <input
                type="text"
                name="photoLink"
                value={formData.photoLink}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Upload Evidence</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  name="posterFile"
                  onChange={handleFileChange}
                />
                <FilePreviewButton file={formData.posterFile} />
                {formData.posterFile && (
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

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleAddConference}>
              <Plus size={18} />
              Add Conference
            </button>
          </div>

          {/* Display Added Conferences List */}
          {submittedConferences.length > 0 && (
            <div className="added-conferences-list">
              <h3>Added Conferences ({submittedConferences.length})</h3>
              <ul>
                {submittedConferences.map((conf, index) => (
                  <li key={index}>
                    <div className="conference-info">
                      <strong>{conf.eventTitle || 'Untitled Conference'}</strong>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Organizer: {conf.organizer || 'N/A'} | Role: {conf.role || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Mode: {conf.eventMode || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Venue: {formatVenue(conf) || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Date: {conf.fromDate && conf.toDate
                          ? `${formatDateForDisplay(conf.fromDate)} to ${formatDateForDisplay(conf.toDate)}`
                          : (formatDateForDisplay(conf.fromDate || conf.toDate) || 'N/A')}
                      </div>
                      {conf.photoLink && (
                        <div style={{ fontSize: '0.9rem', color: '#4b5563', wordBreak: 'break-all' }}>
                          Photos: {conf.photoLink}
                        </div>
                      )}
                      {conf.posterFile && (
                        <span style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                            File: {typeof conf.posterFile === 'string' ? formatStoredFileName(conf.posterFile) : conf.posterFile?.name}
                          </span>
                          <FilePreviewButton file={conf.posterFile} style={{ width: '28px', height: '28px' }} />
                          <button
                            type="button"
                            onClick={() => clearConferenceEvidence(index)}
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
                      className="remove-conference-btn"
                      onClick={() => handleRemoveConference(index)}
                      title="Remove Conference"
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
      <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
  )
}

export default ConferencesOutside
