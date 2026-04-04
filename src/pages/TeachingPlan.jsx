import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'

const TeachingPlan = () => {
  const [formData, setFormData] = useState({
    coreUGCourses: '',
    ugElectives: '',
    graduateCourses: '',
    optionalQuestion: '',
  })

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    console.log('Saving data:', formData)
    alert('Data saved successfully!')
    return true
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Your teaching plan and preferences for next three years</h1>
          <p className="page-subtitle">Section 24</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>A- Core UG Courses (please provide at least five UG Core Subjects, in order of preference, as per curriculum):</label>
            <textarea
              rows="6"
              value={formData.coreUGCourses}
              onChange={(e) => handleInputChange('coreUGCourses', e.target.value)}
              placeholder="Enter at least five UG Core Subjects in order of preference..."
            />
          </div>

          <div className="form-field-vertical">
            <label>B- UG Elective Courses (existing and new):</label>
            <textarea
              rows="6"
              value={formData.ugElectives}
              onChange={(e) => handleInputChange('ugElectives', e.target.value)}
              placeholder="Enter UG Elective Courses (existing and new)..."
            />
          </div>

          <div className="form-field-vertical">
            <label>C- Graduate (Master's & Doctoral level) Courses:</label>
            <textarea
              rows="6"
              value={formData.graduateCourses}
              onChange={(e) => handleInputChange('graduateCourses', e.target.value)}
              placeholder="Enter Graduate level courses (Master's & Doctoral)..."
            />
          </div>

          <div style={{ borderTop: '2px solid #e8ecf1', paddingTop: '2rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2c3e50', marginBottom: '1rem' }}>
              OPTIONAL Question:
            </h3>
            <div className="form-field-vertical">
              <label>
                If you have any specific idea or interest for building a research or industry collaboration in case of which,
                if given an opportunity, you would be willing and able to take a lead to establish a formal collaborative
                arrangement of mutually beneficial kind, in a financially viable manner, what would that be?
              </label>
              <textarea
                rows="8"
                value={formData.optionalQuestion}
                onChange={(e) => handleInputChange('optionalQuestion', e.target.value)}
                placeholder="Enter your ideas for research or industry collaboration (optional)..."
              />
            </div>
          </div>
        </div>

        {/* Notes and Signature Section */}
        <div style={{ borderTop: '2px solid #e8ecf1', paddingTop: '2rem', marginTop: '2rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Notes:</h4>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem', fontSize: '0.95rem', color: '#4a5568' }}>
            <li style={{ marginBottom: '0.5rem' }}>Please feel free to attach any required document or annexure that you feel is either required or would add value.</li>
            <li>Please also fill Part-B "Goal Setting for the Academic Session-2023 - 2024 (word document).</li>
          </ol>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Signature</h4>
              <p style={{ fontSize: '0.9rem', color: '#4a5568' }}>(Full Name as in LNMIIT records)</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', marginBottom: '2rem' }}>
            <div className="form-field-vertical">
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'inline-block', width: '60px', fontWeight: 500 }}>Date</label>
                <input type="date" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'inline-block', width: '60px', fontWeight: 500 }}>Place:</label>
                <input type="text" placeholder="Enter Place" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
              </div>
            </div>

            <div className="form-field-vertical" style={{ gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ minWidth: '180px', fontWeight: 500 }}>Employee No.</label>
                <input type="text" style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ minWidth: '180px', fontWeight: 500 }}>LNMIIT Email:</label>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <input type="text" style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0', borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }} />
                  <span style={{ marginLeft: '5px' }}>@lnmiit.ac.in</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ minWidth: '180px', fontWeight: 500 }}>Personal Email, if any</label>
                <input type="email" style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0', borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ minWidth: '180px', fontWeight: 500 }}>Office Number (Intercom):</label>
                <input type="text" style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0', borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ minWidth: '180px', fontWeight: 500 }}>Mobile Number:</label>
                <input type="text" style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0', borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.9rem', color: '#2d3748', lineHeight: '1.6', backgroundColor: '#f7fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Last date of submission with copies of submitted documents: August 31, 2023</p>
            <p style={{ marginBottom: '1rem' }}>
              Please fill-in the Word file(both the parts) as it is and without deleting any clause from the form. If you have no data to fill, kindly fill "NIL or Not Applicable" as appropriate and send the signed copy to <a href="mailto:faculty.performance@lnmiit.ac.in" style={{ color: '#3182ce' }}>faculty.performance@lnmiit.ac.in</a> as well submit the <strong>signed hard copy to Mr. Ashish Sharma (Dean's Office) in a closed Envelope.</strong>
            </p>
            <p>The last date for submitting the filled application form is August 31, 2023.</p>
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
    </div>
  )
}

export default TeachingPlan

