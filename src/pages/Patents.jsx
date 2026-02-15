import React, { useState } from 'react'
import { Save, Upload } from 'lucide-react'
import './FormPages.css'
import { patentsService } from '../services/patentsService'

const Patents = () => {
  const [formData, setFormData] = useState({
    patentsGranted: '',
    patentsPublished: '',
    patentsApplied: '',
  })
  const [certificateFiles, setCertificateFiles] = useState({
    granted: null,
    published: null,
    applied: null
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = 1 // TODO: Replace with actual logged-in faculty ID

      // Save each patent type if it has content
      const promises = []

      if (formData.patentsGranted.trim()) {
        promises.push(patentsService.createPatent({
          faculty_id: facultyId,
          patent_type: 'Patents granted',
          title: formData.patentsGranted,
          agency: '',
          month: new Date().toISOString().split('T')[0],
          authors: []
        }))
      }

      if (formData.patentsPublished.trim()) {
        promises.push(patentsService.createPatent({
          faculty_id: facultyId,
          patent_type: 'Patents published',
          title: formData.patentsPublished,
          agency: '',
          month: new Date().toISOString().split('T')[0],
          authors: []
        }))
      }

      if (formData.patentsApplied.trim()) {
        promises.push(patentsService.createPatent({
          faculty_id: facultyId,
          patent_type: 'Patents applied for',
          title: formData.patentsApplied,
          agency: '',
          month: new Date().toISOString().split('T')[0],
          authors: []
        }))
      }

      if (promises.length === 0) {
        alert('Please fill at least one patent field')
        return
      }

      await Promise.all(promises)

      alert('Data saved successfully!')
      console.log('Saved patents to database')
    } catch (error) {
      console.error('Error saving patents:', error)
      alert('Error saving data: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patents</h1>
          <p className="page-subtitle">Section 12: Patents Information</p>
        </div>
        <button className="save-button" onClick={handleSave} disabled={loading}>
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>a) Patents granted: (Name, Patent number, granting agency)</label>
            <textarea
              rows="5"
              value={formData.patentsGranted}
              onChange={(e) => handleInputChange('patentsGranted', e.target.value)}
              placeholder="Enter details of patents granted (Name, Patent number, granting agency)..."
            />
          </div>

          {/* Certificate Upload for Patents Granted */}
          <div className="form-field-vertical">
            <label>Upload Certificate (if granted)</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <input
                type="file"
                id="certificate-granted"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setCertificateFiles({ ...certificateFiles, granted: e.target.files[0] })}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="certificate-granted"
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
                  {certificateFiles.granted ? certificateFiles.granted.name : 'Click to upload certificate'}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                </span>
              </label>
            </div>
          </div>

          <div className="form-field-vertical">
            <label>b) Patents published:</label>
            <textarea
              rows="5"
              value={formData.patentsPublished}
              onChange={(e) => handleInputChange('patentsPublished', e.target.value)}
              placeholder="Enter details of patents published..."
            />
          </div>

          {/* Certificate Upload for Patents Published */}
          <div className="form-field-vertical">
            <label>Upload Certificate (if available)</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <input
                type="file"
                id="certificate-published"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setCertificateFiles({ ...certificateFiles, published: e.target.files[0] })}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="certificate-published"
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
                  {certificateFiles.published ? certificateFiles.published.name : 'Click to upload certificate'}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                </span>
              </label>
            </div>
          </div>

          <div className="form-field-vertical">
            <label>c) Patents applied for:</label>
            <textarea
              rows="5"
              value={formData.patentsApplied}
              onChange={(e) => handleInputChange('patentsApplied', e.target.value)}
              placeholder="Enter details of patents applied for..."
            />
          </div>

          {/* Certificate Upload for Patents Applied */}
          <div className="form-field-vertical">
            <label>Upload Application Document (if available)</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <input
                type="file"
                id="certificate-applied"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setCertificateFiles({ ...certificateFiles, applied: e.target.files[0] })}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="certificate-applied"
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
                  {certificateFiles.applied ? certificateFiles.applied.name : 'Click to upload document'}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Patents

