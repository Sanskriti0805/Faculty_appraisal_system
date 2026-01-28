import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const ResearchPublications = () => {
  const [formData, setFormData] = useState({
    monographs: '',
    journals: '',
    conferences: '',
    otherPublications: '',
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
          <h1 className="page-title">Research Publications</h1>
          <p className="page-subtitle">Section 9: Research & Development - Research Publications</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="section-header-text">RESEARCH & DEVELOPMENT</div>
        
        <div className="form-section">
          <div className="form-field-vertical">
            <label>a) Research Monographs / Books (not textbooks) and Book Chapters Published:</label>
            <textarea
              rows="5"
              value={formData.monographs}
              onChange={(e) => handleInputChange('monographs', e.target.value)}
              placeholder="Enter details of research monographs, books, and book chapters..."
            />
          </div>

          <div className="form-field-vertical">
            <label>b) Research Papers Published in Journals:</label>
            <textarea
              rows="5"
              value={formData.journals}
              onChange={(e) => handleInputChange('journals', e.target.value)}
              placeholder="Enter details of research papers published in journals..."
            />
          </div>

          <div className="form-field-vertical">
            <label>c) Research Papers Published in Refereed Conference Proceedings:</label>
            <textarea
              rows="5"
              value={formData.conferences}
              onChange={(e) => handleInputChange('conferences', e.target.value)}
              placeholder="Enter details of conference papers..."
            />
          </div>

          <div className="form-field-vertical">
            <label>d) Any other form of scholarly publications:</label>
            <textarea
              rows="5"
              value={formData.otherPublications}
              onChange={(e) => handleInputChange('otherPublications', e.target.value)}
              placeholder="Enter details of any other scholarly publications..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResearchPublications

