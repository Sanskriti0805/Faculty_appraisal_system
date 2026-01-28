import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const PaperReview = () => {
  const [formData, setFormData] = useState({
    reviewDetails: '',
  })

  const handleInputChange = (value) => {
    setFormData({ reviewDetails: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Review of Research Papers</h1>
          <p className="page-subtitle">Section 14: Review of research papers for Tier-1/2 refereed internal research journals (please provide details in bullet points)</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Review of research papers for Tier-1/2 refereed internal research journals (please provide details in bullet points):</label>
            <textarea
              rows="10"
              value={formData.reviewDetails}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details in bullet points:&#10;• Journal name, paper title&#10;• Journal name, paper title&#10;..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaperReview

