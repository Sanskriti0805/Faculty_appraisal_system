import React, { useState, useEffect } from 'react'
import { Upload, ExternalLink, X } from 'lucide-react'
import './FormPages.css'
import { patentsService } from '../services/patentsService'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'

const Patents = ({ initialData, readOnly }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    patentsGranted: '',
    patentsPublished: '',
    patentsApplied: '',
  })
  const [patentIds, setPatentIds] = useState({
    granted: null,
    published: null,
    applied: null
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

      // Store IDs and evidence filenames to prevent duplicates
      setPatentIds({
        granted: granted?.id || null,
        published: published?.id || null,
        applied: applied?.id || null
      })

      setCertificateFiles({
        granted: granted?.certificate_file || null,
        published: published?.certificate_file || null,
        applied: applied?.certificate_file || null
      })
    }
  }, [initialData])

  useEffect(() => {
    if (readOnly || (initialData && Array.isArray(initialData) && initialData.length > 0) || !user?.id) return

    const loadExisting = async () => {
      try {
        const res = await patentsService.getPatentsByFaculty(user.id)
        const data = Array.isArray(res?.data) ? res.data : []
        if (data.length === 0) return

        const granted = data.find(p => p.patent_type === 'Patents granted')
        const published = data.find(p => p.patent_type === 'Patents published')
        const applied = data.find(p => p.patent_type === 'Patents applied for')

        setFormData({
          patentsGranted: granted?.title || '',
          patentsPublished: published?.title || '',
          patentsApplied: applied?.title || ''
        })

        setPatentIds({
          granted: granted?.id || null,
          published: published?.id || null,
          applied: applied?.id || null
        })

        setCertificateFiles({
          granted: granted?.certificate_file || null,
          published: published?.certificate_file || null,
          applied: applied?.certificate_file || null
        })
      } catch (error) {
        console.error('Failed to prefill patents:', error)
      }
    }

    loadExisting()
  }, [initialData, readOnly, user])

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId) {
        window.appToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      // Save each patent type if it has content AND doesn't already exist in database
      const promises = []

      if (patentIds.granted) {
        promises.push(patentsService.deletePatent(patentIds.granted))
      }
      if (patentIds.published) {
        promises.push(patentsService.deletePatent(patentIds.published))
      }
      if (patentIds.applied) {
        promises.push(patentsService.deletePatent(patentIds.applied))
      }

      await Promise.all(promises)

      const createPromises = []

      if (formData.patentsGranted.trim()) {
        createPromises.push(patentsService.createPatent({
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
        createPromises.push(patentsService.createPatent({
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
        createPromises.push(patentsService.createPatent({
          faculty_id: facultyId,
          patent_type: 'Patents applied for',
          title: formData.patentsApplied,
          agency: '',
          month: new Date().toISOString().split('T')[0],
          authors: [],
          certificate_file: certificateFiles.applied
        }))
      }

      if (createPromises.length === 0) {
        window.appToast('Data saved successfully!')
        return true
      }

      await Promise.all(createPromises)

      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving patents:', error)
      window.appToast('Error saving data: ' + (error.response?.data?.message || error.message))
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
            <p className="page-subtitle">Patents Information</p>
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
                  href={`http://${window.location.hostname}:5001/uploads/${certificateFiles.granted}`}
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
                  {certificateFiles.granted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCertificateFiles({ ...certificateFiles, granted: null })
                      }}
                      title="Remove uploaded document"
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #d1d8e0',
                        borderRadius: '6px',
                        background: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
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
                  href={`http://${window.location.hostname}:5001/uploads/${certificateFiles.published}`}
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
                  {certificateFiles.published && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCertificateFiles({ ...certificateFiles, published: null })
                      }}
                      title="Remove uploaded document"
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #d1d8e0',
                        borderRadius: '6px',
                        background: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
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
                  href={`http://${window.location.hostname}:5001/uploads/${certificateFiles.applied}`}
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
                  {certificateFiles.applied && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCertificateFiles({ ...certificateFiles, applied: null })
                      }}
                      title="Remove uploaded document"
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #d1d8e0',
                        borderRadius: '6px',
                        background: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
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
