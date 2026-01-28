import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const AwardsHonours = () => {
  const [formData, setFormData] = useState({
    internationalHonours: '',
    nationalHonours: '',
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
          <h1 className="page-title">Awards and Honours</h1>
          <p className="page-subtitle">Section 19: Significant International/National Awards and Honours</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>(i) International Honours (please do not include travel and registration grants as awards):</label>
            <textarea
              rows="6"
              value={formData.internationalHonours}
              onChange={(e) => handleInputChange('internationalHonours', e.target.value)}
              placeholder="Enter details of international honours and awards..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(ii) National Honours (please do not include travel and registration grants as awards):</label>
            <textarea
              rows="6"
              value={formData.nationalHonours}
              onChange={(e) => handleInputChange('nationalHonours', e.target.value)}
              placeholder="Enter details of national honours and awards..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AwardsHonours

