import React, { useState, useEffect } from 'react'
import { Upload, ExternalLink } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import { patentsService } from '../services/patentsService'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'

const Patents = ({ initialData, readOnly }) => {
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

  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      const granted = initialData.find(p => p.patent_type === 'Patents granted')
      const published = initialData.find(p => p.patent_type === 'Patents published')
      const applied = initialData.find(p => p.patent_type === 'Patents applied for')

      setFormData({
        patentsGranted: granted?.title || '',
        patentsPublished: published?.title || '',
        patentsApplied: applied?.title || ''
      })

      // Store evidence filenames for read-only view
      setCertificateFiles({
        granted: granted?.certificate_file || null,
        published: published?.certificate_file || null,
        applied: applied?.certificate_file || null
      })
    }
  }, [initialData])

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
          authors: [],
          certificate_file: certificateFiles.granted
        }))
      }

      if (formData.patentsPublished.trim()) {
        promises.push(patentsService.createPatent({
          faculty_id: facultyId,
          patent_type: 'Patents published',
          title: formData.patentsPublished,
          agency: '',
          month: new Date().toISOString().split('T')[0],
          authors: [],
          certificate_file: certificateFiles.published
        }))
      }

      if (formData.patentsApplied.trim()) {
        promises.push(patentsService.createPatent({
          faculty_id: facultyId,
          patent_type: 'Patents applied for',
          title: formData.patentsApplied,
          agency: '',
          month: new Date().toISOString().split('T')[0],
          authors: [],
          certificate_file: certificateFiles.applied
        }))
      }

      if (promises.length === 0) {
        alert('Please fill at least one patent field')
        return false
      }

      await Promise.all(promises)

      alert('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving patents:', error)
      alert('Error saving data: ' + (error.response?.data?.message || error.message))
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`form-page ${readOnly ? 'read-only-mode' : ''}`}>
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Patents</h1>
            <p className="page-subtitle">Section 12: Patents Information</p>
          </div>
        </div>
      )}

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>a) Patents granted: (Name, Patent number, granting agency)</label>
            <textarea
              rows="5"
              value={formData.patentsGranted}
              onChange={(e) => handleInputChange('patentsGranted', e.target.value)}
              placeholder="Enter details of patents granted (Name, Patent number, granting agency)..."
              disabled={readOnly}
              style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
            />
          </div>

          {/* Certificate Upload for Patents Granted */}
          <div className="form-field-vertical">
            <label>{readOnly ? 'Evidence (if granted)' : 'Upload Certificate (if granted)'}</label>
            {readOnly ? (
              certificateFiles.granted && (
                <a
                  href={`http://${window.location.hostname}:5000/uploads/${certificateFiles.granted}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
                >
                  <ExternalLink size={18} /> View Certificate
                </a>
              )
            ) : (
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
                  <FilePreviewButton file={certificateFiles.granted} style={{ width: '32px', height: '32px' }} />
                </label>
              </div>
            )}
          </div>

          <div className="form-field-vertical">
            <label>b) Patents published:</label>
            <textarea
              rows="5"
              value={formData.patentsPublished}
              onChange={(e) => handleInputChange('patentsPublished', e.target.value)}
              placeholder="Enter details of patents published..."
              disabled={readOnly}
              style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
            />
          </div>

          {/* Certificate Upload for Patents Published */}
          <div className="form-field-vertical">
            <label>{readOnly ? 'Evidence (if available)' : 'Upload Certificate (if available)'}</label>
            {readOnly ? (
              certificateFiles.published && (
                <a
                  href={`http://${window.location.hostname}:5000/uploads/${certificateFiles.published}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
                >
                  <ExternalLink size={18} /> View Certificate
                </a>
              )
            ) : (
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
                  <FilePreviewButton file={certificateFiles.published} style={{ width: '32px', height: '32px' }} />
                </label>
              </div>
            )}
          </div>

          <div className="form-field-vertical">
            <label>c) Patents applied for:</label>
            <textarea
              rows="5"
              value={formData.patentsApplied}
              onChange={(e) => handleInputChange('patentsApplied', e.target.value)}
              placeholder="Enter details of patents applied for..."
              disabled={readOnly}
              style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
            />
          </div>

          {/* Certificate Upload for Patents Applied */}
          <div className="form-field-vertical">
            <label>{readOnly ? 'Evidence (if available)' : 'Upload Application Document (if available)'}</label>
            {readOnly ? (
              certificateFiles.applied && (
                <a
                  href={`http://${window.location.hostname}:5000/uploads/${certificateFiles.applied}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
                >
                  <ExternalLink size={18} /> View Document
                </a>
              )
            ) : (
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
                  <FilePreviewButton file={certificateFiles.applied} style={{ width: '32px', height: '32px' }} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
      {!readOnly && (
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
      )}
    </div>
  )
}

export default Patents
