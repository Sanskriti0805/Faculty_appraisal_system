import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const ConferenceSessions = () => {
  const [formData, setFormData] = useState({
    sessionDetails: '',
  })

  const handleInputChange = (value) => {
    setFormData({ sessionDetails: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conference Sessions Chaired</h1>
          <p className="page-subtitle">Section 15: Conference Sessions Chaired, if any</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Conference Sessions Chaired, if any:</label>
            <textarea
              rows="8"
              value={formData.sessionDetails}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of conference sessions chaired..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConferenceSessions

