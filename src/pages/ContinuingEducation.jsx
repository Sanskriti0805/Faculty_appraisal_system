import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const ContinuingEducation = () => {
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

  const handleSave = () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Continuing Education Activities</h1>
          <p className="page-subtitle">Section 21: Continuing Education Activities</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
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
      </div>
    </div>
  )
}

export default ContinuingEducation

