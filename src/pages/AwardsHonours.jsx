import React, { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Upload, FileText } from 'lucide-react'
import './FormPages.css'
import { awardsService } from '../services/awardsService'

const AwardsHonours = () => {
  const [awards, setAwards] = useState([])
  const [formData, setFormData] = useState({
    honorType: 'National',
    awardName: '',
    description: '',
    evidenceFile: null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAwards()
  }, [])

  const loadAwards = async () => {
    try {
      const facultyId = 1 // TODO: Replace with actual logged-in faculty ID
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
    setFormData({ ...formData, evidenceFile: e.target.files[0] })
  }

  const handleAddAward = async () => {
    if (!formData.awardName.trim()) {
      alert('Please enter the award name')
      return
    }

    setLoading(true)
    try {
      const facultyId = 1 // TODO: Replace with actual logged-in faculty ID
      const data = new FormData()
      data.append('faculty_id', facultyId)
      data.append('honor_type', formData.honorType)
      data.append('award_name', formData.awardName)
      data.append('description', formData.description)
      if (formData.evidenceFile) {
        data.append('evidence_file', formData.evidenceFile)
      }

      await awardsService.createAward(data)

      // Reset form
      setFormData({
        honorType: 'National',
        awardName: '',
        description: '',
        evidenceFile: null
      })

      // Reload awards
      await loadAwards()
      alert('Award added successfully!')
    } catch (error) {
      console.error('Error adding award:', error)
      alert('Error adding award: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAward = async (id) => {
    if (!confirm('Are you sure you want to delete this award?')) {
      return
    }

    try {
      await awardsService.deleteAward(id)
      await loadAwards()
      alert('Award deleted successfully!')
    } catch (error) {
      console.error('Error deleting award:', error)
      alert('Error deleting award: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleViewEvidence = (filename) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const baseUrl = apiUrl.replace('/api', '')
    window.open(`${baseUrl}/uploads/${filename}`, '_blank')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Significant International / National Awards and Honours</h1>
          <p className="page-subtitle">Section 19</p>
        </div>
      </div>

      <div className="form-card">
        {/* Add Award Form */}
        <div className="form-section" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>Add New Award</h3>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-field-vertical">
              <label>Type of Honor<span style={{ color: '#d64550' }}>*</span></label>
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
                <option value="National">National</option>
                <option value="International">International</option>
              </select>
            </div>

            <div className="form-field-vertical">
              <label>Name of Honor<span style={{ color: '#d64550' }}>*</span></label>
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
            <label>Details</label>
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
            <label>Upload Evidence</label>
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
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
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
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Name of Honor</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Details</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Evidence</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Actions</th>
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
                        {award.evidence_file ? (
                          <button
                            onClick={() => handleViewEvidence(award.evidence_file)}
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
    </div>
  )
}

export default AwardsHonours
