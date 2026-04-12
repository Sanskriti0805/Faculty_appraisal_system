import React, { useState } from 'react'
import { useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'

const TechnologyTransfer = () => {
  const { user, token } = useAuth()
  const [technologyTransferId, setTechnologyTransferId] = useState(null)
  const [formData, setFormData] = useState({
    technologyInfo: '',
  })
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [persistedEvidenceFile, setPersistedEvidenceFile] = useState('')

  useEffect(() => {
    if (!user?.id) return

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const rows = Array.isArray(details?.data?.techTransfer) ? details.data.techTransfer : []
        if (rows.length === 0) {
          setPersistedEvidenceFile('')
          return
        }

        const latest = [...rows].sort((a, b) => {
          const bTs = b?.created_at ? new Date(b.created_at).getTime() : Number(b?.id || 0)
          const aTs = a?.created_at ? new Date(a.created_at).getTime() : Number(a?.id || 0)
          return bTs - aTs
        })[0]
        setTechnologyTransferId(latest.id || null)
        setPersistedEvidenceFile(latest.evidence_file || '')

        // Show exactly what the user entered as the technology text.
        const summary = [...rows]
          .sort((a, b) => {
            const aTs = a?.created_at ? new Date(a.created_at).getTime() : Number(a?.id || 0)
            const bTs = b?.created_at ? new Date(b.created_at).getTime() : Number(b?.id || 0)
            return aTs - bTs
          })
          .map((r) => (r.title || '').trim())
          .filter(Boolean)
          .join('\n')
        setFormData({ technologyInfo: summary })
      } catch (error) {
        console.error('Failed to prefill technology transfer:', error)
      }
    }

    hydrateExisting()
  }, [user])

  const handleInputChange = (value) => {
    setFormData({ technologyInfo: value })
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

      if (technologyTransferId) {
        await fetch(`http://localhost:5000/api/activities/tech-transfer/${technologyTransferId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      if (!formData.technologyInfo.trim()) {
        alert('Data saved successfully!')
        return true
      }

      const formDataObj = new FormData()
      formDataObj.append('faculty_id', facultyId)
      formDataObj.append('title', formData.technologyInfo.substring(0, 100))
      formDataObj.append('agency', '')
      formDataObj.append('date', new Date().toISOString().split('T')[0])

      if (evidenceFile) {
        formDataObj.append('evidence_file', evidenceFile)
      } else if (persistedEvidenceFile) {
        formDataObj.append('existing_evidence_file', persistedEvidenceFile)
      }

      const response = await fetch('http://localhost:5000/api/activities/tech-transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataObj
      })

      const data = await response.json()
      if (data.success) {
        setTechnologyTransferId(data.id || data?.data?.id || technologyTransferId)
        if (evidenceFile) {
          setPersistedEvidenceFile(evidenceFile.name)
        }
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
                  {evidenceFile ? evidenceFile.name : (persistedEvidenceFile || 'Click to upload or drag and drop')}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                </span>
                <FilePreviewButton
                  file={evidenceFile || persistedEvidenceFile}
                  style={{ width: '32px', height: '32px', marginTop: '0.25rem' }}
                />
                {(evidenceFile || persistedEvidenceFile) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEvidenceFile(null)
                      setPersistedEvidenceFile('')
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
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
    </div>
  )
}

export default TechnologyTransfer

