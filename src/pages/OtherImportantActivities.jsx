import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const OtherImportantActivities = () => {
  const [formData, setFormData] = useState({
    activities: '',
  })

  const handleInputChange = (value) => {
    setFormData({ activities: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Other Important Activities</h1>
          <p className="page-subtitle">Section 23: Any other Important Activity not covered above</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
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
      </div>
    </div>
  )
}

export default OtherImportantActivities

