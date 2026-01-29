import React, { useState } from 'react'
import { Save, Upload } from 'lucide-react'
import './FormPages.css'

const TeachingInnovation = () => {
  const [formData, setFormData] = useState({
    onCampus: '',
    onCampusFile: null,
    online: '',
    onlineFile: null,
    evaluation: '',
    evaluationFile: null,
  })

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleFileUpload = (field, file) => {
    setFormData({ ...formData, [field]: file })
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
          {/* Section A */}
          <div className="form-field-vertical">
            <label>a) For normal on-campus classes / labs / tutorials etc.:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="5"
                value={formData.onCampus}
                onChange={(e) => handleInputChange('onCampus', e.target.value)}
                placeholder="Describe any innovations for on-campus teaching..."
                style={{ flex: 2 }}
              />
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '1rem',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  height: '100%',
                  minHeight: '130px'
                }}>
                  <Upload size={24} color="#666" />
                  <span style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center' }}>
                    {formData.onCampusFile ? formData.onCampusFile.name : 'Upload Supporting Document'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload('onCampusFile', e.target.files[0])}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section B */}
          <div className="form-field-vertical" style={{ marginTop: '2rem' }}>
            <label>b) For online (off-campus) class / labs / tutorials etc.:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="5"
                value={formData.online}
                onChange={(e) => handleInputChange('online', e.target.value)}
                placeholder="Describe any innovations for online teaching..."
                style={{ flex: 2 }}
              />
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '1rem',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  height: '100%',
                  minHeight: '130px'
                }}>
                  <Upload size={24} color="#666" />
                  <span style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center' }}>
                    {formData.onlineFile ? formData.onlineFile.name : 'Upload Supporting Document'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload('onlineFile', e.target.files[0])}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section C */}
          <div className="form-field-vertical" style={{ marginTop: '2rem' }}>
            <label>c) For evaluation / assessment etc.:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="5"
                value={formData.evaluation}
                onChange={(e) => handleInputChange('evaluation', e.target.value)}
                placeholder="Describe any innovations in evaluation or assessment..."
                style={{ flex: 2 }}
              />
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '1rem',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  height: '100%',
                  minHeight: '130px'
                }}>
                  <Upload size={24} color="#666" />
                  <span style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center' }}>
                    {formData.evaluationFile ? formData.evaluationFile.name : 'Upload Supporting Document'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload('evaluationFile', e.target.files[0])}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeachingInnovation

