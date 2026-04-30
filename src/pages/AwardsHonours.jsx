import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Upload, FileText, X } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { awardsService } from '../services/awardsService'
import { useAuth } from '../context/AuthContext'
import { showConfirm } from '../utils/appDialogs'
import { FILE_TYPES, getAcceptAttribute, validateUploadFile } from '../utils/fileValidation'

const AwardsHonours = ({ initialData, readOnly }) => {
  const { user } = useAuth()
  const [awards, setAwards] = useState([])
  const [toast, setToast] = useState(null)
  const [formData, setFormData] = useState({
    honorType: 'Select',
    awardName: '',
    description: '',
    evidenceFile: null
  })
  const [loading, setLoading] = useState(false)

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    window.clearTimeout(window.__awardsToastTimer)
    window.__awardsToastTimer = window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (readOnly && initialData) {
      setAwards(initialData)
    } else if (!readOnly && user?.id) {
      loadAwards()
    }
  }, [readOnly, initialData, user])

  const loadAwards = async () => {
    try {
      const facultyId = user?.id
      if (!facultyId) return
      const data = await awardsService.getAwards(facultyId)
      setAwards(data)
    } catch (error) {
      console.error('Error loading awards:', error)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null
    const result = validateUploadFile(file, { allowedExtensions: FILE_TYPES.documents, label: 'Evidence' })
    if (!result.valid) {
      showToast(result.message)
      e.target.value = ''
      return
    }
    setFormData({ ...formData, evidenceFile: file })
  }

  const persistCurrentAward = async ({ showSuccessAlert = true, requireAwardName = true } = {}) => {
    const { honorType, awardName, description, evidenceFile } = formData;
    
    const isHonourTypeSelected = honorType && honorType !== 'Select';
    const isNameFilled = awardName?.trim() !== '';
    const isDetailsFilled = description?.trim() !== '';
    const isEvidenceUploaded = !!evidenceFile;

    // Check if any field is partially filled
    const anyFieldFilled = isHonourTypeSelected || isNameFilled || isDetailsFilled;

    // Logic 1: If any detail is filled, evidence MUST be uploaded
    if (anyFieldFilled && !isEvidenceUploaded) {
      showToast('Please upload evidence for the award details provided');
      return false;
    }

    // Logic 2: If evidence is uploaded, all fields (Type, Name, Details) MUST be filled
    if (isEvidenceUploaded && (!isHonourTypeSelected || !isNameFilled || !isDetailsFilled)) {
      showToast('Please fill in Type of Honour, Name of Honour, and Details when evidence is uploaded');
      return false;
    }

    // Logic 3: If it's a mandatory add (handleAddAward), check if anything was entered at all
    if (requireAwardName && !anyFieldFilled && !isEvidenceUploaded) {
      showToast('Please enter award details');
      return false;
    }

    // Logic 4: If everything is empty (e.g. Save and Next without typing anything), just return true
    if (!anyFieldFilled && !isEvidenceUploaded) {
      return true;
    }

    const isDuplicate = awards.some(award =>
      award.award_name?.trim().toLowerCase() === awardName.toLowerCase() &&
      award.honor_type === formData.honorType
    )

    if (isDuplicate) {
      showToast('This award has already been saved. Please enter a different award or edit the existing one.')
      return false
    }

    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId) {
        showToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      const data = new FormData()
      data.append('faculty_id', facultyId)
      data.append('honor_type', formData.honorType)
      data.append('award_name', awardName)
      data.append('description', formData.description)
      if (formData.evidenceFile) {
        data.append('evidence_file', formData.evidenceFile)
      }

      await awardsService.createAward(data)

      setFormData({
        honorType: 'Select',
        awardName: '',
        description: '',
        evidenceFile: null
      })

      await loadAwards()
      if (showSuccessAlert) {
        showToast('Award added successfully!', 'success')
      }
      return true
    } catch (error) {
      console.error('Error adding award:', error)
      showToast('Error adding award: ' + (error.response?.data?.message || error.message))
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleAddAward = async () => {
    await persistCurrentAward({ showSuccessAlert: true, requireAwardName: true })
  }

  const handleDeleteAward = async (id) => {
    if (!(await showConfirm({ message: 'Are you sure you want to delete this award?', danger: true, confirmText: 'Delete' }))) {
      return
    }

    try {
      await awardsService.deleteAward(id)
      await loadAwards()
      showToast('Award deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting award:', error)
      showToast('Error deleting award: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleViewEvidence = (filename) => {
    const baseUrl = `http://${window.location.hostname}:5001`;
    window.open(`${baseUrl}/uploads/${filename}`, '_blank')
  }

  return (
    <div className={`form-page ${readOnly ? 'read-only-mode' : ''}`}>
      {toast && (
        <div role="alert" style={{ position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 9999, background: toast.type === 'success' ? '#276749' : '#c53030', color: '#fff', padding: '0.9rem 1rem', borderRadius: '10px', boxShadow: '0 12px 24px rgba(0,0,0,0.18)', minWidth: '280px', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Significant International / National Awards and Honours</h1>
          </div>
        </div>
      )}

      <div className="form-card">
        {!readOnly && (
          <div className="form-section" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>Add New Award</h3>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-field-vertical">
                <label>Type of Honour<span style={{ color: '#d64550' }}>*</span></label>
                <select
                  value={formData.honorType}
                  onChange={(e) => handleInputChange('honorType', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="Select">Select</option>
                  <option value="National">National</option>
                  <option value="International">International</option>
                </select>
              </div>

              <div className="form-field-vertical">
                <label>Name of Honour<span style={{ color: '#d64550' }}>*</span></label>
                <input
                  type="text"
                  value={formData.awardName}
                  onChange={(e) => handleInputChange('awardName', e.target.value)}
                  placeholder="Enter award name..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <div className="form-field-vertical" style={{ marginBottom: '1rem' }}>
              <label>Details<span style={{ color: '#d64550' }}>*</span></label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter award details, year, awarding agency, etc..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
              <label>Upload Evidence<span style={{ color: '#d64550' }}>*</span></label>
              <div style={{
                border: '2px dashed #ddd',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                backgroundColor: '#fff'
              }}>
                <input
                  type="file"
                  id="award-evidence"
                  accept={getAcceptAttribute(FILE_TYPES.documents)}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="award-evidence"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Upload size={28} color="#5b8fc7" />
                  <span style={{ color: '#5b8fc7', fontWeight: '500' }}>
                    {formData.evidenceFile ? formData.evidenceFile.name : 'Click to upload evidence'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                  </span>
                  <FilePreviewButton
                    file={formData.evidenceFile}
                    style={{ width: '32px', height: '32px', marginTop: '0.25rem' }}
                  />
                  {formData.evidenceFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setFormData({ ...formData, evidenceFile: null })
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

            <button
              onClick={handleAddAward}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#5b8fc7',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              <Plus size={18} />
              {loading ? 'Adding...' : 'Add Award'}
            </button>
          </div>
        )}

        {/* Awards List Table */}
        {awards.length > 0 && (
          <div className="form-section">
            <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Added Awards ({awards.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Name of Honour</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Details</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Evidence</th>
                    {!readOnly && <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {awards.map((award) => (
                    <tr key={award.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: award.honor_type === 'International' ? '#e3f2fd' : '#fff3e0',
                          color: award.honor_type === 'International' ? '#1976d2' : '#f57c00'
                        }}>
                          {award.honor_type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{award.award_name}</td>
                      <td style={{ padding: '1rem', color: '#6c757d', fontSize: '0.9rem' }}>
                        {award.description || '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {(award.evidence_file || award.certificate_file) ? (
                          <button
                            onClick={() => handleViewEvidence(award.evidence_file || award.certificate_file)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#e7f3ff',
                              color: '#0066cc',
                              border: '1px solid #b3d9ff',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={14} />
                            View
                          </button>
                        ) : (
                          <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>No file</span>
                        )}
                      </td>
                      {!readOnly && (
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteAward(award.id)}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#fff',
                              color: '#dc3545',
                              border: '1px solid #dc3545',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete Award"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {awards.length === 0 && (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6c757d',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <p>No awards added yet. Use the form above to add your first award.</p>
          </div>
        )}
      </div>
      {!readOnly && (
        <FormActions
          onSave={async () => {
            // Save and Next should also persist the currently typed award row (if any).
            return await persistCurrentAward({ showSuccessAlert: false, requireAwardName: false })
          }}
          currentPath={window.location.pathname}
        />
      )}
    </div>
  )
}

export default AwardsHonours
