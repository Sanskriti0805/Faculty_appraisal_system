import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const NewCourses = () => {
  const [formData, setFormData] = useState({
    ugLevel: '',
    mastersLevel: '',
    doctoralLevel: '',
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
          <h1 className="page-title">New Courses Developed</h1>
          <p className="page-subtitle">Section 6: New Courses Developed</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>(i) UG Level (Level 1-4):</label>
            <textarea
              rows="4"
              value={formData.ugLevel}
              onChange={(e) => handleInputChange('ugLevel', e.target.value)}
              placeholder="Enter details of UG level courses developed..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(ii) Master's Level (Level 5-6):</label>
            <textarea
              rows="4"
              value={formData.mastersLevel}
              onChange={(e) => handleInputChange('mastersLevel', e.target.value)}
              placeholder="Enter details of Master's level courses developed..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(iii) Doctoral Level (Level 7-8):</label>
            <textarea
              rows="4"
              value={formData.doctoralLevel}
              onChange={(e) => handleInputChange('doctoralLevel', e.target.value)}
              placeholder="Enter details of Doctoral level courses developed..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewCourses

