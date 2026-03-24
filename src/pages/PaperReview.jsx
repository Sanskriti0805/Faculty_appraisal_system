import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'
import { reviewsService } from '../services/reviewsService'

const PaperReview = () => {
  const [formData, setFormData] = useState({
    tier: '',
    paperType: '',
    reviewDetails: '',
  })
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

      const reviewData = {
        faculty_id: facultyId,
        review_type: formData.paperType || 'Journal',
        journal_name: `Tier ${formData.tier} - ${formData.paperType} Review`,
        abbreviation: `Tier ${formData.tier}`,
        number_of_papers: 0,
        first_name: '',
        middle_name: '',
        last_name: '',
        month_of_review: new Date().toISOString().split('T')[0]
      }

      await reviewsService.createReview(reviewData)

      alert('Data saved successfully!')
      console.log('Saved review to database')
    } catch (error) {
      console.error('Error saving review:', error)
      alert('Error saving data: ' + (error.response?.data?.message || error.message))
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
            <textarea
              rows="10"
              value={formData.reviewDetails}
              onChange={(e) => handleInputChange('reviewDetails', e.target.value)}
              placeholder="Enter details in bullet points:&#10;• Journal name, paper title&#10;• Journal name, paper title&#10;..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaperReview

