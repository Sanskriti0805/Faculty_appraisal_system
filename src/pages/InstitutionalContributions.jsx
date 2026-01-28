import React, { useState } from 'react'
import { Save } from 'lucide-react'
import './FormPages.css'

const InstitutionalContributions = () => {
  const [formData, setFormData] = useState({
    dean: '',
    hod: '',
    warden: '',
    centreLead: '',
    committee: '',
    facultyInCharge: '',
    otherResponsibility: '',
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
          <h1 className="page-title">Institutional Contributions</h1>
          <p className="page-subtitle">Section 22: OTHER INSTITUTIONAL CONTRIBUTIONS (Other than those covered above)</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="section-header-text">OTHER INSTITUTIONAL CONTRIBUTIONS (Other than those covered above)</div>
        
        <div className="form-section">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2c3e50', marginBottom: '1rem' }}>
            Contributions towards Institutional Development or any significant Institutional Contributions not covered above:
          </h3>

          <div className="form-field-vertical">
            <label>A- As a Dean / Associate Dean / Assistant Dean:</label>
            <textarea
              rows="3"
              value={formData.dean}
              onChange={(e) => handleInputChange('dean', e.target.value)}
              placeholder="Enter details of contributions as Dean/Associate Dean/Assistant Dean..."
            />
          </div>

          <div className="form-field-vertical">
            <label>B- As an HoD / Deputy HoD:</label>
            <textarea
              rows="3"
              value={formData.hod}
              onChange={(e) => handleInputChange('hod', e.target.value)}
              placeholder="Enter details of contributions as HoD/Deputy HoD..."
            />
          </div>

          <div className="form-field-vertical">
            <label>C- As Chief Warden / Associate Chief Warden / Warden:</label>
            <textarea
              rows="3"
              value={formData.warden}
              onChange={(e) => handleInputChange('warden', e.target.value)}
              placeholder="Enter details of contributions as Warden..."
            />
          </div>

          <div className="form-field-vertical">
            <label>D- As Centre-Lead / Co-Lead / Nucleus Member:</label>
            <textarea
              rows="3"
              value={formData.centreLead}
              onChange={(e) => handleInputChange('centreLead', e.target.value)}
              placeholder="Enter details of contributions as Centre-Lead/Co-Lead/Nucleus Member..."
            />
          </div>

          <div className="form-field-vertical">
            <label>E- As Chairman / Vice Chairman / Convener / Member of one or more significant committees that involved significant efforts and time:</label>
            <textarea
              rows="3"
              value={formData.committee}
              onChange={(e) => handleInputChange('committee', e.target.value)}
              placeholder="Enter details of committee contributions..."
            />
          </div>

          <div className="form-field-vertical">
            <label>F- As Faculty-in-Charge / Member of any Cell:</label>
            <textarea
              rows="3"
              value={formData.facultyInCharge}
              onChange={(e) => handleInputChange('facultyInCharge', e.target.value)}
              placeholder="Enter details of contributions as Faculty-in-Charge/Member of any Cell..."
            />
          </div>

          <div className="form-field-vertical">
            <label>G- As leader / contributing member of any other major responsibility not covered above:</label>
            <textarea
              rows="3"
              value={formData.otherResponsibility}
              onChange={(e) => handleInputChange('otherResponsibility', e.target.value)}
              placeholder="Enter details of any other major responsibility..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstitutionalContributions

