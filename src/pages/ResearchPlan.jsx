import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'

const ResearchPlan = () => {
  const [formData, setFormData] = useState({
    researchPlan: '',
  })

  const handleInputChange = (value) => {
    setFormData({ researchPlan: value })
  }

  const handleSave = async () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
    return true
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Your research plan for next three years, if available</h1>
          <p className="page-subtitle">Section 23</p>
        </div>
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
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
    </div>
  )
}

export default ResearchPlan

