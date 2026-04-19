import React, { useState } from 'react'
import { Calendar, Plus, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import './KeynotesTalks.css'
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

const formatVenue = (venue = {}) => {
  const parts = [venue.city, venue.state, venue.country].map((p) => (p || '').trim()).filter(Boolean)
  return parts.join(', ')
}

const formatStoredFileName = (name) => {
  if (!name) return ''
  return String(name).replace(/^\d+(?:-\d+)+-/, '')
}

const KeynotesTalks = () => {
  const { user, token } = useAuth()
  const [persistedTalkIds, setPersistedTalkIds] = useState([])
  const [toast, setToast] = useState(null)
  const initialState = {
    category: 'Keynote',
    title: '',
    typeOfEvent: '',
    organizer: '',
    date: '',
    dates: [],
    certificateFile: null,
    venue: {
      city: '',
      state: '',
      country: ''
    }
  }

  const [submittedTalks, setSubmittedTalks] = useState([])
  const [formData, setFormData] = useState(initialState)

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    window.clearTimeout(window.__keynotesTalksToastTimer)
    window.__keynotesTalksToastTimer = window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!user?.id) return

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const rows = Array.isArray(details?.data?.keynotesTalks) ? details.data.keynotesTalks : []
        if (rows.length === 0) return

        setPersistedTalkIds(rows.map((row) => row.id).filter(Boolean))

        const mapped = rows.map((row) => ({
          id: row.id,
          category: row.event_type || 'Keynote',
          title: row.title || '',
          typeOfEvent: row.audience_type || '',
          organizer: row.event_name || '',
          date: row.date ? String(row.date).slice(0, 10) : '',
          dates: row.date ? [String(row.date).slice(0, 10)] : [],
          certificateFile: null,
          evidence_file: row.evidence_file || null,
          venue: {
            city: (row.location || '').split(',')[0]?.trim() || '',
            state: '',
            country: (row.location || '').split(',').slice(1).join(',').trim() || ''
          }
        }))
        setSubmittedTalks(mapped)
      } catch (error) {
        console.error('Failed to prefill keynotes/talks:', error)
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
    setFormData(prev => ({
      ...prev,
      venue: {
        ...prev.venue,
        [name]: value
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
      
      await Promise.all(persistedTalkIds.map(id => fetch(`http://localhost:5001/api/activities/keynotes-talks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })))
      const allTalks = [...submittedTalks]
      
      if (formData.title) {
        allTalks.push(formData)
      }

      if (allTalks.length === 0) {
        showToast('Please add at least one talk')
        return false
      }

      const promises = allTalks.map(talk => {
        const formDataObj = new FormData()
        formDataObj.append('faculty_id', facultyId)
        formDataObj.append('event_name', talk.organizer)
        formDataObj.append('title', talk.title)
        formDataObj.append('event_type', talk.category)
        formDataObj.append('audience_type', talk.typeOfEvent || '')
        formDataObj.append('date', (talk.dates && talk.dates.length > 0 ? talk.dates[0] : talk.date) || '')
        formDataObj.append('location', `${talk.venue.city}, ${talk.venue.country}`)

        if (talk.certificateFile) {
          formDataObj.append('evidence_file', talk.certificateFile)
        } else if (talk.evidence_file) {
          formDataObj.append('existing_evidence_file', talk.evidence_file)
        }

        return fetch('http://localhost:5001/api/activities/keynotes-talks', {
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
            message: payload?.message || `Failed to save keynote/talk entry (HTTP ${response.status})`
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

      if (allTalks.length > 0 && createdIds.length === 0) {
        throw new Error('Keynotes/talks were not saved. Please try again.')
      }

      setPersistedTalkIds(createdIds)
      showToast('Data saved successfully!', 'success')
      setSubmittedTalks([])
      setFormData(initialState)
      return true
    } catch (error) {
      console.error('Error saving talks:', error)
      showToast('Error saving data: ' + error.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleAddDate = (e) => {
    e.preventDefault()
    if (!formData.date) {
      showToast('Please select a date first.')
      return
    }

    setFormData((prev) => {
      if (prev.dates.includes(prev.date)) {
        return prev
      }

      return {
        ...prev,
        dates: [...prev.dates, prev.date],
        date: ''
      }
    })
  }

  const handleRemoveDate = (dateToRemove) => {
    setFormData((prev) => ({
      ...prev,
      dates: prev.dates.filter((d) => d !== dateToRemove)
    }))
  }

  const handleAddTalk = (e) => {
    e.preventDefault()
    if (!formData.title) {
      showToast('Please fill in at least the Title.')
      return
    }

    const normalizedDates = [...formData.dates]
    if (formData.date && !normalizedDates.includes(formData.date)) {
      normalizedDates.push(formData.date)
    }

    if (normalizedDates.length === 0) {
      showToast('Please add at least one date.')
      return
    }

    setSubmittedTalks(prev => [...prev, { ...formData, dates: normalizedDates, date: normalizedDates[0] }])
    setFormData(initialState)
    showToast('Talk added to list. You can now add another.', 'success')
  }

  const handleRemoveTalk = (index) => {
    setSubmittedTalks(prev => prev.filter((_, i) => i !== index))
  }

  const clearDraftEvidence = () => {
    setFormData(prev => ({ ...prev, certificateFile: null }))
  }

  const clearTalkEvidence = (index) => {
    setSubmittedTalks(prev => prev.map((talk, i) => (
      i === index ? { ...talk, certificateFile: null, evidence_file: null } : talk
    )))
  }

  return (
    <div className="keynotes-talks form-page">
      {toast && (
        <div role="alert" style={{ position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 9999, background: toast.type === 'success' ? '#276749' : '#c53030', color: '#fff', padding: '0.9rem 1rem', borderRadius: '10px', boxShadow: '0 12px 24px rgba(0,0,0,0.18)', minWidth: '280px', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>×</button>
        </div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">Keynotes, Seminars and Invited Talks (outside LNMIIT)</h1>
          <p className="page-subtitle">Section 16: Keynotes, Seminars and Invited Talks (outside LNMIIT)</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSave} noValidate>

          {/* Row 1: Category & Title */}
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleInputChange}>
                <option value="Keynote">Keynote</option>
                <option value="Seminar">Seminar</option>
                <option value="Invited Talk">Invited Talk</option>
              </select>
            </div>
            <div className="form-group">
              <label>Title<span className="required-star">*</span></label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Row 2: Type of Event & Organizer */}
          <div className="form-row">
            <div className="form-group">
              <label>Type of Event<span className="required-star">*</span></label>
              <input
                type="text"
                name="typeOfEvent"
                value={formData.typeOfEvent}
                onChange={handleInputChange}
                placeholder="e.g. FDP"
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

          {/* Row 3: Date & Certificate */}
          <div className="form-row" style={{ alignItems: 'flex-start' }}>
            <div className="form-group">
              <label>Date<span className="required-star">*</span></label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                />
                <Calendar className="calendar-icon" size={18} />
              </div>
              <button type="button" className="add-date-btn" onClick={handleAddDate}>
                Add Date
              </button>
              {formData.dates.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {formData.dates.map((d) => (
                    <span key={d} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.25rem 0.6rem',
                      border: '1px solid #d1d8e0',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      color: '#1e3a5f'
                    }}>
                      {d}
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(d)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Upload Evidence<span className="required-star">*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  onChange={handleFileChange}
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

          {/* Speaker Details Section Removed */}

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
                />
              </div>
              <div className="form-group">
                <label>State<span className="required-star">*</span></label>
                <input
                  type="text"
                  name="state"
                  value={formData.venue.state}
                  onChange={handleVenueChange}
                />
              </div>
              <div className="form-group">
                <label>Country<span className="required-star">*</span></label>
                <input
                  type="text"
                  name="country"
                  value={formData.venue.country}
                  onChange={handleVenueChange}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-add-talk" onClick={handleAddTalk}>
              <Plus size={18} />
              Add Talk
            </button>
          </div>

          {/* Display Added Talks List */}
          {submittedTalks.length > 0 && (
            <div className="added-talks-list">
              <h3>Added Talks ({submittedTalks.length})</h3>
              <ul>
                {submittedTalks.map((talk, index) => (
                  <li key={index}>
                    <div className="talk-info">
                      <strong>{talk.title || 'Untitled Talk'}</strong>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Category: {talk.category || 'N/A'} | Type: {talk.typeOfEvent || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Organizer: {talk.organizer || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Venue: {formatVenue(talk.venue) || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        Date: {(talk.dates && talk.dates.length > 0)
                          ? talk.dates.map((d) => formatDateForDisplay(d)).join(', ')
                          : (formatDateForDisplay(talk.date) || 'N/A')}
                      </div>
                      {(talk.certificateFile || talk.evidence_file) && (
                        <span style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                            File: {talk.certificateFile?.name || formatStoredFileName(talk.evidence_file)}
                          </span>
                          <FilePreviewButton file={talk.certificateFile || talk.evidence_file} style={{ width: '28px', height: '28px' }} />
                          <button
                            type="button"
                            onClick={() => clearTalkEvidence(index)}
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
                      className="remove-talk-btn"
                      onClick={() => handleRemoveTalk(index)}
                      title="Remove Talk"
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

export default KeynotesTalks
