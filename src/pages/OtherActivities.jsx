import React, { useState } from 'react'
import { Save, Plus, X } from 'lucide-react'
import './FormPages.css'

const OtherActivities = () => {
  const [formData, setFormData] = useState({
    softwareDeveloped: '',
    institutionalVisits: [''],
  })

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleVisitChange = (index, value) => {
    const updatedVisits = [...formData.institutionalVisits]
    updatedVisits[index] = value
    setFormData({ ...formData, institutionalVisits: updatedVisits })
  }

  const addVisit = () => {
    setFormData({ ...formData, institutionalVisits: [...formData.institutionalVisits, ''] })
  }

  const removeVisit = (index) => {
    if (formData.institutionalVisits.length > 1) {
      const updatedVisits = formData.institutionalVisits.filter((_, i) => i !== index)
      setFormData({ ...formData, institutionalVisits: updatedVisits })
    }
  }

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Other Activities</h1>
          <p className="page-subtitle">Section 18: Other Activities</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>17.1 Software Developed (if any):</label>
            <p style={{ fontSize: '0.95rem', color: '#5a6c7d', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              Name of software and its use and applications
            </p>
            <textarea
              rows="6"
              value={formData.softwareDeveloped}
              onChange={(e) => handleInputChange('softwareDeveloped', e.target.value)}
              placeholder="Enter software name, its use and applications..."
            />
          </div>

          <div className="form-field-vertical">
            <label>17.2 Visits to other Institutions for Research / Industries for Collaborative Work, if any:</label>
            {formData.institutionalVisits.map((visit, index) => (
              <div key={index} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <textarea
                    rows="4"
                    value={visit}
                    onChange={(e) => handleVisitChange(index, e.target.value)}
                    placeholder="Enter details of institutional visits and collaborative work..."
                    style={{ flex: 1 }}
                  />
                  {formData.institutionalVisits.length > 1 && (
                    <button
                      onClick={() => removeVisit(index)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        height: 'fit-content'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={addVisit}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#5cb85c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}
            >
              <Plus size={18} />
              Add Another Visit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OtherActivities

