import React, { useState } from 'react'
import { useEffect } from 'react'
import { Upload } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'

const PaperReview = () => {
  const { user, token } = useAuth()
  const [reviewId, setReviewId] = useState(null) // Track if editing existing review
  const [formData, setFormData] = useState({
    tier: '',
    paperType: '',
    reviewDetails: '',
  })
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const rows = Array.isArray(details?.data?.paperReviews) ? details.data.paperReviews : []
        if (rows.length === 0) return

        const first = rows[0]
        const detailsText = rows
          .map((r) => `• ${r.journal_name || 'Journal'} (${r.review_type || 'Review'})`)
          .join('\n')

        setFormData({
          tier: first.tier || '',
          paperType: first.review_type || '',
          reviewDetails: detailsText
        })
        
        // Store ID to prevent duplicate creation
        setReviewId(first.id || null)
      } catch (error) {
        console.error('Failed to prefill paper reviews:', error)
      }
    }

    hydrateExisting()
  }, [user])

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId || !token) {
        alert('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      if (reviewId) {
        await fetch(`http://localhost:5000/api/activities/paper-reviews/${reviewId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      if (!formData.reviewDetails.trim()) {
        alert('Data saved successfully!')
        return true
      }

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
        headers: { Authorization: `Bearer ${token}` },
        body: formDataObj
      })

      const data = await response.json()
      if (data.success) {
        setReviewId(data.id || null)
        alert('Data saved successfully!')
        return true
      } else {
        throw new Error(data.message || 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving review:', error)
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
          <h1 className="page-title">Review of research papers for Tier-1/2 refereed internal research journals (please provide details in bullet points)</h1>
          <p className="page-subtitle">Section 14</p>
        </div>
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
                  <FilePreviewButton
                    file={evidenceFile}
                    style={{ width: '32px', height: '32px' }}
                  />
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
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
    </div>
  )
}

export default PaperReview

