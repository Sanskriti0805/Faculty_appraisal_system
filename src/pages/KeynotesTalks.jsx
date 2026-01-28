import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const KeynotesTalks = () => {
  const [formData, setFormData] = useState({
    talksDetails: '',
  })

  const handleInputChange = (value) => {
    setFormData({ talksDetails: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Keynotes, Seminars and Invited Talks</h1>
          <p className="page-subtitle">Section 16: Keynotes, Seminars and Invited Talks (outside LNMIIT)</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Keynotes, Seminars and Invited Talks (outside LNMIIT):</label>
            <textarea
              rows="8"
              value={formData.talksDetails}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of keynotes, seminars and invited talks..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeynotesTalks

