import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const TeachingPlan = () => {
  const [formData, setFormData] = useState({
    coreUGCourses: '',
    ugElectives: '',
    graduateCourses: '',
    optionalQuestion: '',
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
          <h1 className="page-title">Teaching Plan & Preferences</h1>
          <p className="page-subtitle">Section 25: Your teaching plan and preferences for next three years</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>A- Core UG Courses (please provide at least five UG Core Subjects, in order of preference, as per curriculum):</label>
            <textarea
              rows="6"
              value={formData.coreUGCourses}
              onChange={(e) => handleInputChange('coreUGCourses', e.target.value)}
              placeholder="Enter at least five UG Core Subjects in order of preference..."
            />
          </div>

          <div className="form-field-vertical">
            <label>B- UG Elective Courses (existing and new):</label>
            <textarea
              rows="6"
              value={formData.ugElectives}
              onChange={(e) => handleInputChange('ugElectives', e.target.value)}
              placeholder="Enter UG Elective Courses (existing and new)..."
            />
          </div>

          <div className="form-field-vertical">
            <label>C- Graduate (Master's & Doctoral level) Courses:</label>
            <textarea
              rows="6"
              value={formData.graduateCourses}
              onChange={(e) => handleInputChange('graduateCourses', e.target.value)}
              placeholder="Enter Graduate level courses (Master's & Doctoral)..."
            />
          </div>

          <div style={{ borderTop: '2px solid #e8ecf1', paddingTop: '2rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2c3e50', marginBottom: '1rem' }}>
              OPTIONAL Question:
            </h3>
            <div className="form-field-vertical">
              <label>
                If you have any specific idea or interest for building a research or industry collaboration in case of which, 
                if given an opportunity, you would be willing and able to take a lead to establish a formal collaborative 
                arrangement of mutually beneficial kind, in a financially viable manner, what would that be?
              </label>
              <textarea
                rows="8"
                value={formData.optionalQuestion}
                onChange={(e) => handleInputChange('optionalQuestion', e.target.value)}
                placeholder="Enter your ideas for research or industry collaboration (optional)..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeachingPlan

