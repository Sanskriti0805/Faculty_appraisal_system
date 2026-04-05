import React, { useState, useEffect } from 'react'
import { Upload, ExternalLink } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'

const TeachingInnovation = ({ initialData, readOnly }) => {
  const { user, token } = useAuth()
  const [innovationIds, setInnovationIds] = useState({
    onCampus: null,
    online: null,
    evaluation: null
  })
  const [formData, setFormData] = useState({
    onCampus: '',
    onCampusFile: null,
    online: '',
    onlineFile: null,
    evaluation: '',
    evaluationFile: null,
  })

  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      const onCampus = initialData.find(i => i.impact === 'onCampus')
      const online = initialData.find(i => i.impact === 'online')
      const evaluation = initialData.find(i => i.impact === 'evaluation')

      setFormData({
        onCampus: onCampus?.description || '',
        onCampusFile: onCampus?.evidence_file || null,
        online: online?.description || '',
        onlineFile: online?.evidence_file || null,
        evaluation: evaluation?.description || '',
        evaluationFile: evaluation?.evidence_file || null,
      })
      
      // Store IDs to prevent duplicate creation
      setInnovationIds({
        onCampus: onCampus?.id || null,
        online: online?.id || null,
        evaluation: evaluation?.id || null
      })
    }
  }, [initialData])

  useEffect(() => {
    if (readOnly || (initialData && Array.isArray(initialData) && initialData.length > 0) || !user?.id) return

    const fetchExisting = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:5000/api/innovation/teaching/${user.id}`)
        const data = await res.json()
        if (!data.success || !Array.isArray(data.data)) return

        const onCampus = data.data.find(i => i.impact === 'onCampus')
        const online = data.data.find(i => i.impact === 'online')
        const evaluation = data.data.find(i => i.impact === 'evaluation')

        setFormData({
          onCampus: onCampus?.description || '',
          onCampusFile: onCampus?.evidence_file || null,
          online: online?.description || '',
          onlineFile: online?.evidence_file || null,
          evaluation: evaluation?.description || '',
          evaluationFile: evaluation?.evidence_file || null,
        })
        
        // Store IDs to prevent duplicate creation
        setInnovationIds({
          onCampus: onCampus?.id || null,
          online: online?.id || null,
          evaluation: evaluation?.id || null
        })
      } catch (error) {
        console.error('Failed to prefill teaching innovation:', error)
      }
    }

    fetchExisting()
  }, [initialData, readOnly, user])

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleFileUpload = (field, file) => {
    setFormData({ ...formData, [field]: file })
  }

  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId || !token) {
        alert('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      const saveData = async (type, description, file, existingId) => {
        if (existingId) {
          await fetch(`http://${window.location.hostname}:5000/api/innovation/teaching/${existingId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
        }

        if (!description) return;

        const formData = new FormData()
        formData.append('faculty_id', facultyId)
        formData.append('description', description)
        formData.append('impact', type) // Using impact field to store type info
        if (file) {
          formData.append('evidence_file', file)
        }

        return fetch('http://localhost:5000/api/innovation/teaching', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
      }

      await Promise.all([
        saveData('onCampus', formData.onCampus, formData.onCampusFile, innovationIds.onCampus),
        saveData('online', formData.online, formData.onlineFile, innovationIds.online),
        saveData('evaluation', formData.evaluation, formData.evaluationFile, innovationIds.evaluation)
      ])

      alert('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving innovation:', error)
      alert('Failed to save data. Error: ' + error.message)
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
            <h1 className="page-title">Any effective or successful innovation in terms of teaching-learning</h1>
            <p className="page-subtitle">Section 8</p>
          </div>
        </div>
      )}

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
                style={{ flex: 2, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              <div style={{ flex: 1 }}>
                {readOnly ? (
                  formData.onCampusFile && (
                    <a
                      href={`http://${window.location.hostname}:5000/uploads/${formData.onCampusFile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-link"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none', padding: '1rem', border: '1px solid #d1d8e0', borderRadius: '8px', backgroundColor: '#f9f9f9', justifyContent: 'center' }}
                    >
                      <ExternalLink size={18} /> View Document
                    </a>
                  )
                ) : (
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
                      {formData.onCampusFile && formData.onCampusFile.name ? formData.onCampusFile.name : formData.onCampusFile || 'Upload Supporting Document'}
                    </span>
                    <FilePreviewButton file={formData.onCampusFile} style={{ width: '32px', height: '32px' }} />
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload('onCampusFile', e.target.files[0])}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                )}
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
                style={{ flex: 2, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              <div style={{ flex: 1 }}>
                {readOnly ? (
                  formData.onlineFile && (
                    <a
                      href={`http://${window.location.hostname}:5000/uploads/${formData.onlineFile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-link"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none', padding: '1rem', border: '1px solid #d1d8e0', borderRadius: '8px', backgroundColor: '#f9f9f9', justifyContent: 'center' }}
                    >
                      <ExternalLink size={18} /> View Document
                    </a>
                  )
                ) : (
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
                      {formData.onlineFile && formData.onlineFile.name ? formData.onlineFile.name : formData.onlineFile || 'Upload Supporting Document'}
                    </span>
                    <FilePreviewButton file={formData.onlineFile} style={{ width: '32px', height: '32px' }} />
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload('onlineFile', e.target.files[0])}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                )}
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
                style={{ flex: 2, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              <div style={{ flex: 1 }}>
                {readOnly ? (
                  formData.evaluationFile && (
                    <a
                      href={`http://${window.location.hostname}:5000/uploads/${formData.evaluationFile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-link"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none', padding: '1rem', border: '1px solid #d1d8e0', borderRadius: '8px', backgroundColor: '#f9f9f9', justifyContent: 'center' }}
                    >
                      <ExternalLink size={18} /> View Document
                    </a>
                  )
                ) : (
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
                      {formData.evaluationFile && formData.evaluationFile.name ? formData.evaluationFile.name : formData.evaluationFile || 'Upload Supporting Document'}
                    </span>
                    <FilePreviewButton file={formData.evaluationFile} style={{ width: '32px', height: '32px' }} />
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload('evaluationFile', e.target.files[0])}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {!readOnly && (
        <FormActions 
          onSave={handleSave} 
          currentPath={window.location.pathname} 
          loading={loading}
        />
      )}
    </div>
  )
}

export default TeachingInnovation

