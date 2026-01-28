import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const TeachingInnovation = () => {
  const [formData, setFormData] = useState({
    onCampus: '',
    online: '',
    evaluation: '',
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
          <h1 className="page-title">Teaching-Learning Innovation</h1>
          <p className="page-subtitle">Section 8: Any effective or successful innovation in terms of teaching-learning</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>a) For normal on-campus classes / labs / tutorials etc.:</label>
            <textarea
              rows="5"
              value={formData.onCampus}
              onChange={(e) => handleInputChange('onCampus', e.target.value)}
              placeholder="Describe any innovations for on-campus teaching..."
            />
          </div>

          <div className="form-field-vertical">
            <label>b) For online (off-campus) class / labs / tutorials etc.:</label>
            <textarea
              rows="5"
              value={formData.online}
              onChange={(e) => handleInputChange('online', e.target.value)}
              placeholder="Describe any innovations for online teaching..."
            />
          </div>

          <div className="form-field-vertical">
            <label>c) For evaluation / assessment etc.:</label>
            <textarea
              rows="5"
              value={formData.evaluation}
              onChange={(e) => handleInputChange('evaluation', e.target.value)}
              placeholder="Describe any innovations in evaluation or assessment..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeachingInnovation

