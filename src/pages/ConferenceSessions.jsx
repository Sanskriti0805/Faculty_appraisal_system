import React, { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import './ConferenceSessions.css'

const ConferenceSessions = () => {
  const initialState = {
    eventType: 'Conference',
    sponsoringAgency: '',
    eventTitle: '',
    abbreviation: '',
    organizer: '',
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

  const handleSubmit = (e) => {
    e.preventDefault()
    // Submit both list and current form data (if filled)
    const allSessions = [...submittedSessions]
    if (formData.eventTitle) {
      allSessions.push(formData)
    }
    console.log('Form Data:', allSessions)
    alert('Data saved successfully!')
  }

  const handleAddConference = (e) => {
    e.preventDefault()
    if (!formData.eventTitle) {
      alert('Please fill in at least the Title.')
      return
    }

    setSubmittedSessions(prev => [...prev, formData])
    setFormData(initialState)
    alert('Session added to list. You can now add another.')
  }

  const handleRemoveSession = (index) => {
    setSubmittedSessions(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="conference-sessions form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conference Sessions Chaired, if any</h1>
          <p className="page-subtitle">Section 15</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
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
              />
            </div>
            <div className="form-group">
              <label>Upload Evidence<span className="required-star">*</span></label>
              <input
                type="file"
                onChange={handleFileChange}
              />
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

          {/* Dates Row */}
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

          <div className="form-actions">
            <button type="submit" className="btn-submit">Submit</button>
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
                      <strong>{session.eventTitle}</strong> - {session.venue.city}, {session.venue.country}
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
    </div>
  )
}

export default ConferenceSessions

