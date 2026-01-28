import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const TechnologyTransfer = () => {
  const [formData, setFormData] = useState({
    technologyInfo: '',
  })

  const handleInputChange = (value) => {
    setFormData({ technologyInfo: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Technology Developed/Transferred</h1>
          <p className="page-subtitle">Section 13: Technology Developed/Transferred, if any</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Technology Developed/Transferred, if any:</label>
            <textarea
              rows="8"
              value={formData.technologyInfo}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of technology developed or transferred..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TechnologyTransfer

