import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const Courseware = () => {
  const [formData, setFormData] = useState({
    courseware: '',
  })

  const handleInputChange = (value) => {
    setFormData({ courseware: value })
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Courseware / Course Material</h1>
          <p className="page-subtitle">Section 7: Courseware / Course Material / Laboratory Manual Developed / Text-Books / Course Notes Published</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Courseware / Course Material / Laboratory Manual Developed / Text-Books / Course Notes Published:</label>
            <textarea
              rows="8"
              value={formData.courseware}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of courseware, course material, laboratory manuals, text-books, or course notes published..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Courseware

