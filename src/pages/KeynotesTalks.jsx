import React, { useState } from 'react'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import './KeynotesTalks.css'

const KeynotesTalks = () => {
  const initialState = {
    category: 'Keynote',
    title: '',
    typeOfEvent: '',
    organizer: '',
    date: '',
    certificateFile: null,
    venue: {
      city: '',
      state: '',
      country: ''
    }
  }

  const [submittedTalks, setSubmittedTalks] = useState([])
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

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)
    try {
      const facultyId = 1 // TODO: Actual faculty ID
      const allTalks = [...submittedTalks]
      if (formData.title) {
        allTalks.push(formData)
      }

      if (allTalks.length === 0) {
        alert('Please add at least one talk')
        return
      }

      const promises = allTalks.map(talk => {
        const formDataObj = new FormData()
        formDataObj.append('faculty_id', facultyId)
        formDataObj.append('event_name', talk.organizer)
        formDataObj.append('title', talk.title)
        formDataObj.append('event_type', talk.category)
        formDataObj.append('audience_type', `${talk.venue.city}, ${talk.venue.country}`)

        if (talk.certificateFile) {
          formDataObj.append('evidence_file', talk.certificateFile)
        }

        return fetch('http://localhost:5001/api/activities/keynotes-talks', {
          method: 'POST',
          body: formDataObj
        })
      })

      await Promise.all(promises)
      alert('Data saved successfully!')
      setSubmittedTalks([])
      setFormData(initialState)
    } catch (error) {
      console.error('Error saving talks:', error)
      alert('Error saving data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDate = (e) => {
    e.preventDefault()
    alert('Add Date functionality would go here (e.g., adding to a list of dates).')
  }

  const handleAddTalk = (e) => {
    e.preventDefault()
    if (!formData.title) {
      alert('Please fill in at least the Title.')
      return
    }

    setSubmittedTalks(prev => [...prev, formData])
    setFormData(initialState)
    alert('Talk added to list. You can now add another.')
  }

  const handleRemoveTalk = (index) => {
    setSubmittedTalks(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="keynotes-talks form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Keynotes, Seminars and Invited Talks (outside LNMIIT)</h1>
          <p className="page-subtitle">Section 16: Keynotes, Seminars and Invited Talks (outside LNMIIT)</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>

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
            </div>
            <div className="form-group">
              <label>Upload Evidence<span className="required-star">*</span></label>
              <input
                type="file"
                onChange={handleFileChange}
              />
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
            <button type="submit" className="btn-submit">Submit</button>
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
                      <strong>{talk.title}</strong> ({talk.typeOfEvent}) - {talk.venue.city}, {talk.venue.country} ({talk.date})
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
    </div>
  )
}

export default KeynotesTalks
