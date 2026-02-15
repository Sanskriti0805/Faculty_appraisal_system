import React, { useState } from 'react'
import { Save, Upload, Plus, Trash2 } from 'lucide-react'
import './FormPages.css'

const Consultancy = () => {
  const [consultancies, setConsultancies] = useState([
    { id: 1, details: '', evidenceFile: null }
  ])

  const handleAddConsultancy = () => {
    const newId = consultancies.length > 0 ? Math.max(...consultancies.map(c => c.id)) + 1 : 1
    setConsultancies([...consultancies, { id: newId, details: '', evidenceFile: null }])
  }

  const handleRemoveConsultancy = (id) => {
    if (consultancies.length === 1) {
      alert('You must have at least one consultancy field')
      return
    }
    setConsultancies(consultancies.filter(c => c.id !== id))
  }

  const handleDetailsChange = (id, value) => {
    setConsultancies(consultancies.map(c =>
      c.id === id ? { ...c, details: value } : c
    ))
  }

  const handleFileChange = (id, file) => {
    setConsultancies(consultancies.map(c =>
      c.id === id ? { ...c, evidenceFile: file } : c
    ))
  }

  const handleSave = () => {
    console.log('Saving consultancies:', consultancies)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Consultancy</h1>
          <p className="page-subtitle">Section 20: Consultancy, if any (Please provide details.)</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        {consultancies.map((consultancy, index) => (
          <div
            key={consultancy.id}
            className="form-section"
            style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Consultancy {index + 1}</h3>
              {consultancies.length > 1 && (
                <button
                  onClick={() => handleRemoveConsultancy(consultancy.id)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#fff',
                    color: '#dc3545',
                    border: '1px solid #dc3545',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title="Remove this consultancy"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              )}
            </div>

            <div className="form-field-vertical">
              <label>Details (Organization, Project, Duration, Amount, Year):</label>
              <textarea
                rows="6"
                value={consultancy.details}
                onChange={(e) => handleDetailsChange(consultancy.id, e.target.value)}
                placeholder="Enter consultancy details: organization name, project title, duration, amount, year, etc..."
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

            {/* Evidence File Upload */}
            <div className="form-field-vertical" style={{ marginTop: '1rem' }}>
              <label>Upload Evidence</label>
              <div style={{
                border: '2px dashed #ddd',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#fff'
              }}>
                <input
                  type="file"
                  id={`consultancy-evidence-${consultancy.id}`}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(consultancy.id, e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor={`consultancy-evidence-${consultancy.id}`}
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
                    {consultancy.evidenceFile ? consultancy.evidenceFile.name : 'Click to upload or drag and drop'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                  </span>
                </label>
              </div>
            </div>
          </div>
        ))}

        {/* Add More Button */}
        <button
          onClick={handleAddConsultancy}
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
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          <Plus size={18} />
          Add Another Consultancy
        </button>
      </div>
    </div>
  )
}

export default Consultancy
