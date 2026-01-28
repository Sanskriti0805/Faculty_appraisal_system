import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const ResearchPlan = () => {
  const [formData, setFormData] = useState({
    researchPlan: '',
  })

  const handleInputChange = (value) => {
    setFormData({ researchPlan: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Plan</h1>
          <p className="page-subtitle">Section 24: Your research plan for next three years, if available</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Your research plan for next three years, if available:</label>
            <textarea
              rows="12"
              value={formData.researchPlan}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter your research plan for the next three years including objectives, methodology, expected outcomes, etc..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResearchPlan

