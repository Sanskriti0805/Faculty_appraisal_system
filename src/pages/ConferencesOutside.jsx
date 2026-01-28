import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const ConferencesOutside = () => {
  const [formData, setFormData] = useState({
    conferenceDetails: '',
  })

  const handleInputChange = (value) => {
    setFormData({ conferenceDetails: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conferences Outside LNMIIT</h1>
          <p className="page-subtitle">Section 17: Conferences Outside LNMIIT</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Conferences Outside LNMIIT:</label>
            <textarea
              rows="8"
              value={formData.conferenceDetails}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of conferences attended outside LNMIIT..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConferencesOutside

