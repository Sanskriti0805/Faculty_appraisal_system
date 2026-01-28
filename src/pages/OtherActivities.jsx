import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const OtherActivities = () => {
  const [formData, setFormData] = useState({
    softwareDeveloped: '',
    institutionalVisits: '',
  })

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Other Activities</h1>
          <p className="page-subtitle">Section 18: Other Activities</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>17.1 Software Developed (if any):</label>
            <p style={{ fontSize: '0.95rem', color: '#5a6c7d', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              Name of software and its use and applications
            </p>
            <textarea
              rows="6"
              value={formData.softwareDeveloped}
              onChange={(e) => handleInputChange('softwareDeveloped', e.target.value)}
              placeholder="Enter software name, its use and applications..."
            />
          </div>

          <div className="form-field-vertical">
            <label>17.2 Visits to other Institutions for Research / Industries for Collaborative Work, if any:</label>
            <textarea
              rows="6"
              value={formData.institutionalVisits}
              onChange={(e) => handleInputChange('institutionalVisits', e.target.value)}
              placeholder="Enter details of institutional visits and collaborative work..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default OtherActivities

