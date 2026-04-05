import React, { useState } from 'react'
import { Upload } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'

const TechnologyTransfer = () => {
  const [formData, setFormData] = useState({
    technologyInfo: '',
  })
  const [evidenceFile, setEvidenceFile] = useState(null)

  const handleInputChange = (value) => {
    setFormData({ technologyInfo: value })
  }

  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!formData.technologyInfo.trim()) {
      alert('Please enter technology details')
      return false
    }

    setLoading(true)
    try {
      const facultyId = user?.id || 1;

      const formDataObj = new FormData()
      formDataObj.append('faculty_id', facultyId)
      formDataObj.append('title', formData.technologyInfo.substring(0, 100))
      formDataObj.append('agency', 'Internal/External')
      formDataObj.append('date', new Date().toISOString().split('T')[0])

      if (evidenceFile) {
        formDataObj.append('evidence_file', evidenceFile)
      }

      const response = await fetch('http://localhost:5000/api/activities/tech-transfer', {
        method: 'POST',
        body: formDataObj
      })

      const data = await response.json()
      if (data.success) {
        alert('Data saved successfully!')
        return true
      } else {
        throw new Error(data.message || 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving tech transfer:', error)
      alert('Error saving data: ' + error.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Technology Developed/Transferred</h1>
          <p className="page-subtitle">Section 13: Technology Developed/Transferred, if any</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Technology Developed/Transferred, if any:</label>
            <textarea
              rows="8"
              value={formData.technologyInfo}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of technology developed or transferred..."
            />
          </div>

          {/* Evidence File Upload */}
          <div className="form-field-vertical">
            <label>Upload Evidence</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <input
                type="file"
                id="evidence-upload-tech"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setEvidenceFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="evidence-upload-tech"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Upload size={32} color="#5b8fc7" />
                <span style={{ color: '#5b8fc7', fontWeight: '500' }}>
                  {evidenceFile ? evidenceFile.name : 'Click to upload or drag and drop'}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                </span>
                <FilePreviewButton
                  file={evidenceFile}
                  style={{ width: '32px', height: '32px', marginTop: '0.25rem' }}
                />
              </label>
            </div>
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
    </div>
  )
}

export default TechnologyTransfer

