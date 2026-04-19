import React, { useState } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const ContinuingEducation = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    coursesOrganized: '',
    workshopsOrganized: '',
    industryInteraction: '',
    fdpsOrganized: '',
    fdpsAttended: '',
    resourcePerson: '',
    moocCourses: '',
    others: '',
  })

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('continuing_education')
        if (res?.data) setFormData(res.data)
      } catch (error) {
        console.error('Failed to load continuing education data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleSave = async () => {
    if (!user?.id) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    try {
      await legacySectionsService.saveSection('continuing_education', formData)
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save continuing education data:', error)
      window.appToast('Failed to save data. Please try again.')
      return false
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Continuing Education Activities</h1>
          <p className="page-subtitle">Continuing Education Activities</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>(iii) Name and type of Course(s) Organized (QIP, Self-financed, Industry):</label>
            <textarea
              rows="4"
              value={formData.coursesOrganized}
              onChange={(e) => handleInputChange('coursesOrganized', e.target.value)}
              placeholder="Enter course details with type..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(iv) Workshops/conferences organized:</label>
            <textarea
              rows="4"
              value={formData.workshopsOrganized}
              onChange={(e) => handleInputChange('workshopsOrganized', e.target.value)}
              placeholder="Enter workshops and conferences organized..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(v) Participation in High Level Industry-Academia Interaction:</label>
            <textarea
              rows="4"
              value={formData.industryInteraction}
              onChange={(e) => handleInputChange('industryInteraction', e.target.value)}
              placeholder="Enter industry-academia interaction details..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(vi) FDPs organized (details):</label>
            <textarea
              rows="4"
              value={formData.fdpsOrganized}
              onChange={(e) => handleInputChange('fdpsOrganized', e.target.value)}
              placeholder="Enter details of FDPs organized..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(vii) FDPs attended:</label>
            <textarea
              rows="4"
              value={formData.fdpsAttended}
              onChange={(e) => handleInputChange('fdpsAttended', e.target.value)}
              placeholder="Enter details of FDPs attended..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(viii) Contribution as Resource Person in FDPs/Workshops:</label>
            <textarea
              rows="4"
              value={formData.resourcePerson}
              onChange={(e) => handleInputChange('resourcePerson', e.target.value)}
              placeholder="Enter details of contributions as resource person..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(ix) MOOC Courses Completed (Certified):</label>
            <textarea
              rows="4"
              value={formData.moocCourses}
              onChange={(e) => handleInputChange('moocCourses', e.target.value)}
              placeholder="Enter MOOC courses completed with certification details..."
            />
          </div>

          <div className="form-field-vertical">
            <label>(x) Any other:</label>
            <textarea
              rows="4"
              value={formData.others}
              onChange={(e) => handleInputChange('others', e.target.value)}
              placeholder="Enter any other continuing education activities..."
            />
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
      </div>
    </div>
  )
}

export default ContinuingEducation
