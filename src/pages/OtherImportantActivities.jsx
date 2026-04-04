import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'

const OtherImportantActivities = () => {
  const [formData, setFormData] = useState({
    activities: '',
  })

  const handleInputChange = (value) => {
    setFormData({ activities: value })
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
          <h1 className="page-title">Any other Important Activity not covered above</h1>
          <p className="page-subtitle">Section 22</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Any other Important Activity not covered above:</label>
            <textarea
              rows="10"
              value={formData.activities}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of any other important activities not covered in previous sections..."
            />
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
    </div>
  )
}

export default OtherImportantActivities

