import React, { useState } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const ResearchPlan = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    researchPlan: '',
  })

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('research_plan')
        const parsed = res?.data
        if (!parsed) return
        setFormData({ researchPlan: parsed.researchPlan || '' })
      } catch (error) {
        console.error('Failed to load research plan data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleInputChange = (value) => {
    setFormData({ researchPlan: value })
  }

  const handleSave = async () => {
    if (!user?.id) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    try {
      await legacySectionsService.saveSection('research_plan', formData)
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save research plan data:', error)
      window.appToast('Failed to save data. Please try again.')
      return false
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Your research plan for next three years, if available</h1>
          <p className="page-subtitle">Research Plan for Next Three Years</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Your research plan for next three years, if available:</label>
            <textarea
              rows="12"
              value={formData.researchPlan}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter your research plan for the next three years including objectives, methodology, expected outcomes, etc..."
            />
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
    </div>
  )
}

export default ResearchPlan

