import React, { useState } from 'react'
import { Save, Plus, Trash2 } from 'lucide-react'
import './FormPages.css'

const PaperReview = () => {
  const [reviews, setReviews] = useState([
    {
      id: 1,
      type: 'Journal',
      journalName: '',
      abbreviation: '',
      numberOfPapers: '',
      firstName: '',
      middleName: '',
      lastName: '',
      monthOfReview: ''
    }
  ])

  const handleInputChange = (index, field, value) => {
    const updated = [...reviews]
    updated[index][field] = value
    setReviews(updated)
  }

  const addReview = () => {
    setReviews([...reviews, {
      id: Date.now(),
      type: 'Journal',
      journalName: '',
      abbreviation: '',
      numberOfPapers: '',
      firstName: '',
      middleName: '',
      lastName: '',
      monthOfReview: ''
    }])
  }

  const removeReview = (index) => {
    if (reviews.length > 1) {
      setReviews(reviews.filter((_, i) => i !== index))
    }
  }

  const handleSave = () => {
    console.log('Saving data:', reviews)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Review of Research Papers</h1>
          <p className="page-subtitle">Section 14: Review of research papers for Tier-1/2 refereed international research journals</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', paddingRight: '1rem' }}>
        <button
          onClick={addReview}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#5b6e9f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Plus size={16} />
          Add Review
        </button>
      </div>

      {reviews.map((review, index) => (
        <div key={review.id} className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Review {index + 1}</h3>
              <button
                onClick={() => removeReview(index)}
                disabled={reviews.length === 1}
                style={{
                  padding: '0.5rem',
                  backgroundColor: reviews.length === 1 ? '#e0e0e0' : '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: reviews.length === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-field-vertical">
                <label style={{ fontWeight: '500', color: '#2c3e50' }}>Type:</label>
                <select
                  value={review.type}
                  onChange={(e) => handleInputChange(index, 'type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Journal">Journal</option>
                  <option value="Conference">Conference</option>
                </select>
              </div>

              <div className="form-field-vertical">
                <label style={{ fontWeight: '500', color: '#2c3e50' }}>Name of Journal/Conference:</label>
                <input
                  type="text"
                  value={review.journalName}
                  onChange={(e) => handleInputChange(index, 'journalName', e.target.value)}
                  placeholder="Enter journal or conference name"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-field-vertical">
                <label style={{ fontWeight: '500', color: '#2c3e50' }}>Abbreviation:</label>
                <input
                  type="text"
                  value={review.abbreviation}
                  onChange={(e) => handleInputChange(index, 'abbreviation', e.target.value)}
                  placeholder="Enter abbreviation"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div className="form-field-vertical">
                <label style={{ fontWeight: '500', color: '#2c3e50' }}>Number of Papers:</label>
                <input
                  type="number"
                  value={review.numberOfPapers}
                  onChange={(e) => handleInputChange(index, 'numberOfPapers', e.target.value)}
                  placeholder="Enter number"
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

            <div style={{ border: '1px solid #ddd', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: '#fafafa' }}>
              <label style={{ display: 'block', fontWeight: '500', color: '#2c3e50', marginBottom: '1rem' }}>
                Name of Faculty
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-field-vertical">
                  <label style={{ fontSize: '0.9rem', color: '#555' }}>First Name:</label>
                  <input
                    type="text"
                    value={review.firstName}
                    onChange={(e) => handleInputChange(index, 'firstName', e.target.value)}
                    placeholder="First name"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      backgroundColor: '#fff'
                    }}
                  />
                </div>

                <div className="form-field-vertical">
                  <label style={{ fontSize: '0.9rem', color: '#555' }}>Middle Name:</label>
                  <input
                    type="text"
                    value={review.middleName}
                    onChange={(e) => handleInputChange(index, 'middleName', e.target.value)}
                    placeholder="Middle name"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      backgroundColor: '#fff'
                    }}
                  />
                </div>

                <div className="form-field-vertical">
                  <label style={{ fontSize: '0.9rem', color: '#555' }}>Last Name:</label>
                  <input
                    type="text"
                    value={review.lastName}
                    onChange={(e) => handleInputChange(index, 'lastName', e.target.value)}
                    placeholder="Last name"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      backgroundColor: '#fff'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-field-vertical">
              <label style={{ fontWeight: '500', color: '#2c3e50' }}>Month of Review:</label>
              <input
                type="month"
                value={review.monthOfReview}
                onChange={(e) => handleInputChange(index, 'monthOfReview', e.target.value)}
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
        </div>
      ))}
    </div>
  )
}

export default PaperReview

