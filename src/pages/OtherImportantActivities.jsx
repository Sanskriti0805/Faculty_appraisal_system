import React, { useState } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const OtherImportantActivities = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    activities: '',
  })

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('other_important_activities')
        const parsed = res?.data
        if (!parsed) return
        setFormData({ activities: parsed.activities || '' })
      } catch (error) {
        console.error('Failed to load other important activities data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleInputChange = (value) => {
    setFormData({ activities: value })
  }

  const handleSave = async () => {
    if (!user?.id) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    try {
      await legacySectionsService.saveSection('other_important_activities', formData)
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save other important activities data:', error)
      window.appToast('Failed to save data. Please try again.')
      return false
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Any other Important Activity not covered above</h1>
          <p className="page-subtitle">Other Important Activities</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Any other Important Activity not covered above:</label>
            <textarea
              rows="10"
              value={formData.activities}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter details of any other important activities not covered in previous sections..."
            />
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
    </div>
  )
}

export default OtherImportantActivities

