import React, { useState } from 'react'
import { Save, Upload } from 'lucide-react'
import './FormPages.css'
import { reviewsService } from '../services/reviewsService'

const PaperReview = () => {
  const [formData, setFormData] = useState({
    tier: '',
    paperType: '',
    reviewDetails: '',
  })
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    if (!formData.reviewDetails.trim()) {
      alert('Please enter review details')
      return
    }

    setLoading(true)
    try {
      const facultyId = 1 // TODO: Replace with actual logged-in faculty ID

      const formDataObj = new FormData()
      formDataObj.append('faculty_id', facultyId)
      formDataObj.append('review_type', formData.paperType || 'Journal')
      formDataObj.append('journal_name', formData.reviewDetails.substring(0, 100)) // Use part of details as name if needed
      formDataObj.append('tier', formData.tier)
      formDataObj.append('number_of_papers', 1) // Default to 1 for this form
      formDataObj.append('month_of_review', new Date().toISOString().split('T')[0])

      if (evidenceFile) {
        formDataObj.append('evidence_file', evidenceFile)
      }

      const response = await fetch('http://localhost:5000/api/activities/paper-reviews', {
        method: 'POST',
        body: formDataObj
      })

      const data = await response.json()
      if (data.success) {
        alert('Data saved successfully!')
      } else {
        throw new Error(data.message || 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving review:', error)
      alert('Error saving data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Review of research papers for Tier-1/2 refereed internal research journals (please provide details in bullet points)</h1>
          <p className="page-subtitle">Section 14</p>
        </div>
        <button className="save-button" onClick={handleSave} disabled={loading}>
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Select Tier<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={formData.tier}
                onChange={(e) => handleInputChange('tier', e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              >
                <option value="">-- Select Tier --</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
              </select>
            </div>

            <div className="form-field-vertical">
              <label>Type of Paper<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={formData.paperType}
                onChange={(e) => handleInputChange('paperType', e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              >
                <option value="">-- Select Type --</option>
                <option value="Journal">Journal</option>
                <option value="Conference">Conference</option>
              </select>
            </div>
          </div>

          <div className="form-field-vertical">
            <label>Review of research papers for Tier-1/2 refereed internal research journals (please provide details in bullet points):</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="10"
                value={formData.reviewDetails}
                onChange={(e) => handleInputChange('reviewDetails', e.target.value)}
                placeholder="Enter details in bullet points:&#10;• Journal name, paper title&#10;• Journal name, paper title&#10;..."
                style={{ flex: 1 }}
              />
              <div style={{ width: '200px' }}>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  gap: '0.5rem',
                  height: '100%',
                  minHeight: '200px'
                }}>
                  <Upload size={24} color={evidenceFile ? '#28a745' : '#666'} />
                  <span style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center' }}>
                    {evidenceFile ? evidenceFile.name : 'Upload Evidence (PDF)'}
                  </span>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => setEvidenceFile(e.target.files[0])}
                    accept=".pdf"
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

export default PaperReview

