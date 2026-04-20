import React, { useState } from 'react'
import { useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const OtherActivities = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    softwareDeveloped: '',
    institutionalVisits: [''],
  })

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('other_activities')
        const parsed = res?.data
        if (!parsed) return
        setFormData({
          softwareDeveloped: parsed.softwareDeveloped || '',
          institutionalVisits: Array.isArray(parsed.institutionalVisits) && parsed.institutionalVisits.length > 0
            ? parsed.institutionalVisits
            : [''],
        })
      } catch (error) {
        console.error('Failed to load other activities data:', error)
      }
    }

    hydrate()
  }, [user])

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

  const handleSave = async () => {
    if (!user?.id) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    try {
      await legacySectionsService.saveSection('other_activities', formData)
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save other activities data:', error)
      window.appToast('Failed to save data. Please try again.')
      return false
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Other Activities</h1>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Software Developed</label>

            <textarea
              rows="6"
              value={formData.softwareDeveloped}
              onChange={(e) => handleInputChange('softwareDeveloped', e.target.value)}
              placeholder="Enter software name, its use and applications..."
            />
          </div>

          <div className="form-field-vertical">
            <label>Visits to other Institutions for Research / Industries for Collaborative Work</label>
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
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
    </div>
  )
}

export default OtherActivities

