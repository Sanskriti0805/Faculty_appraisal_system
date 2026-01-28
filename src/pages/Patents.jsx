import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const Patents = () => {
  const [formData, setFormData] = useState({
    patentsGranted: '',
    patentsPublished: '',
    patentsApplied: '',
  })

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = () => {
    console.log('Saving patents data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patents</h1>
          <p className="page-subtitle">Section 12: Patents Information</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>a) Patents granted: (Name, Patent number, granting agency)</label>
            <textarea
              rows="5"
              value={formData.patentsGranted}
              onChange={(e) => handleInputChange('patentsGranted', e.target.value)}
              placeholder="Enter details of patents granted (Name, Patent number, granting agency)..."
            />
          </div>

          <div className="form-field-vertical">
            <label>b) Patents published:</label>
            <textarea
              rows="5"
              value={formData.patentsPublished}
              onChange={(e) => handleInputChange('patentsPublished', e.target.value)}
              placeholder="Enter details of patents published..."
            />
          </div>

          <div className="form-field-vertical">
            <label>c) Patents applied for:</label>
            <textarea
              rows="5"
              value={formData.patentsApplied}
              onChange={(e) => handleInputChange('patentsApplied', e.target.value)}
              placeholder="Enter details of patents applied for..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Patents

