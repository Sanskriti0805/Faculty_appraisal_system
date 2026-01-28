import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const Consultancy = () => {
  const [formData, setFormData] = useState({
    consultancyDetails: '',
  })

  const handleInputChange = (value) => {
    setFormData({ consultancyDetails: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Consultancy</h1>
          <p className="page-subtitle">Section 20: Consultancy, if any (Please provide details.)</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Consultancy, if any (Please provide details.):</label>
            <textarea
              rows="8"
              value={formData.consultancyDetails}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of consultancy work including organization name, project details, duration, etc..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Consultancy

