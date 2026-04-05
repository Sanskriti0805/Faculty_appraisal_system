import React, { useState } from 'react'
import { useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import './ConferencesOutside.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const ConferencesOutside = () => {
  const { user } = useAuth()
  const initialState = {
    eventType: 'Conference',
    eventMode: 'Offline',
    eventTitle: '',
    eventAbbreviation: '',
    organizer: '',
    role: '',
    city: 'City',
    state: 'State',
    country: 'Country',
    fromDate: '',
    toDate: '',
    photoLink: '',
    posterFile: null
  }

  const [submittedConferences, setSubmittedConferences] = useState([])
  const [formData, setFormData] = useState(initialState)

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('conferences_outside')
        const parsed = res?.data
        if (!parsed) return
        setSubmittedConferences(Array.isArray(parsed.submittedConferences) ? parsed.submittedConferences : [])
        setFormData(parsed.formData || initialState)
      } catch (error) {
        console.error('Failed to load conferences outside data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      alert('Please add at least one conference')
      return false
    }

    if (!user?.id) {
      alert('Unable to identify logged-in faculty. Please login again.')
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
      alert('All data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save conferences outside data:', error)
      alert('Failed to save data. Please try again.')
      return false
    }
  }

  const handleAddConference = (e) => {
    e.preventDefault()
    if (!formData.eventTitle) {
      alert('Please fill in at least the Event Title.')
      return
    }

    setSubmittedConferences(prev => [...prev, formData])
    setFormData(initialState)
    alert('Conference added to list. You can now add another.')
  }

  const handleRemoveConference = (index) => {
    setSubmittedConferences(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="conferences-outside form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conferences Outside LNMIIT</h1>
          <p className="page-subtitle">Section 17: Conferences Outside LNMIIT</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSave}>
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
              <label>Link for Photos<span className="required-star">*</span></label>
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
                      <strong>{conf.eventTitle}</strong> ({conf.role}) - {conf.city}, {conf.country} ({conf.fromDate} to {conf.toDate})
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
