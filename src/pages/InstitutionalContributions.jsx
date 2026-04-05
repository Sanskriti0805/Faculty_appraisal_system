import React, { useState, useEffect } from 'react'
import { Upload, ExternalLink } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'

const InstitutionalContributions = ({ initialData, readOnly }) => {
  const [formData, setFormData] = useState({
    dean: '',
    hod: '',
    warden: '',
    centreLead: '',
    committee: '',
    facultyInCharge: '',
    otherResponsibility: '',
  })

  const [files, setFiles] = useState({
    dean: null,
    hod: null,
    warden: null,
    centreLead: null,
    committee: null,
    facultyInCharge: null,
    otherResponsibility: null,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      const findContribution = (label) => initialData.find(c => c.contribution_type === label)

      const dean = findContribution('Dean/Associate/Assistant Dean')
      const hod = findContribution('HoD/Deputy HoD')
      const warden = findContribution('Warden/Chief Warden')
      const centreLead = findContribution('Centre-Lead/Nucleus Member')
      const committee = findContribution('Committee Member/Convener')
      const facultyInCharge = findContribution('Faculty-in-Charge/Cell Member')
      const otherResponsibility = findContribution('Other Major Responsibility')

      setFormData({
        dean: dean?.description || '',
        hod: hod?.description || '',
        warden: warden?.description || '',
        centreLead: centreLead?.description || '',
        committee: committee?.description || '',
        facultyInCharge: facultyInCharge?.description || '',
        otherResponsibility: otherResponsibility?.description || '',
      })

      setFiles({
        dean: dean?.evidence_file || null,
        hod: hod?.evidence_file || null,
        warden: warden?.evidence_file || null,
        centreLead: centreLead?.evidence_file || null,
        committee: committee?.evidence_file || null,
        facultyInCharge: facultyInCharge?.evidence_file || null,
        otherResponsibility: otherResponsibility?.evidence_file || null,
      })
    }
  }, [initialData])

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleFileChange = (field, file) => {
    setFiles({ ...files, [field]: file })
  }

  const renderUploadControl = (field) => (
    <label style={{ cursor: 'pointer', padding: '0.5rem', border: '1px dashed #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Upload size={16} color={files[field] ? '#28a745' : '#666'} />
      <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{files[field] ? 'Uploaded' : 'Evidence'}</span>
      <FilePreviewButton file={files[field]} style={{ width: '30px', height: '30px' }} />
      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileChange(field, e.target.files[0])} />
    </label>
  )

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = 1 // TODO: Actual faculty ID

      const saveData = async (type, label, description, file) => {
        if (!description) return;

        const formDataObj = new FormData()
        formDataObj.append('faculty_id', facultyId)
        formDataObj.append('contribution_type', label)
        formDataObj.append('description', description)
        formDataObj.append('year', new Date().getFullYear())
        if (file) {
          formDataObj.append('evidence_file', file)
        }

        return fetch('http://localhost:5000/api/innovation/institutional', {
          method: 'POST',
          body: formDataObj
        })
      }

      await Promise.all([
        saveData('dean', 'Dean/Associate/Assistant Dean', formData.dean, files.dean),
        saveData('hod', 'HoD/Deputy HoD', formData.hod, files.hod),
        saveData('warden', 'Warden/Chief Warden', formData.warden, files.warden),
        saveData('centreLead', 'Centre-Lead/Nucleus Member', formData.centreLead, files.centreLead),
        saveData('committee', 'Committee Member/Convener', formData.committee, files.committee),
        saveData('facultyInCharge', 'Faculty-in-Charge/Cell Member', formData.facultyInCharge, files.facultyInCharge),
        saveData('otherResponsibility', 'Other Major Responsibility', formData.otherResponsibility, files.otherResponsibility)
      ])

      alert('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving contributions:', error)
      alert('Failed to save data. Error: ' + error.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`form-page ${readOnly ? 'read-only-mode' : ''}`}>
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Contributions, towards Institutional Development or any significant Institutional Contributions not covered above</h1>
            <p className="page-subtitle">Section 21</p>
          </div>
        </div>
      )}

      <div className="form-card">
        <div className="section-header-text">OTHER INSTITUTIONAL CONTRIBUTIONS (Other than those covered above)</div>

        <div className="form-section">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2c3e50', marginBottom: '1rem' }}>
            Contributions towards Institutional Development or any significant Institutional Contributions not covered above:
          </h3>

          <div className="form-field-vertical">
            <label>A- As a Dean / Associate Dean / Assistant Dean:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="3"
                value={formData.dean}
                onChange={(e) => handleInputChange('dean', e.target.value)}
                placeholder="Enter details of contributions as Dean/Associate Dean/Assistant Dean..."
                style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              {readOnly ? (
                files.dean && (
                  <a
                    href={`http://${window.location.hostname}:5000/uploads/${files.dean}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-link"
                    style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#5b8fc7' }}
                  >
                    <ExternalLink size={16} />
                    <span style={{ fontSize: '0.8rem' }}>View</span>
                  </a>
                )
              ) : (
                renderUploadControl('dean')
              )}
            </div>
          </div>

          <div className="form-field-vertical">
            <label>B- As an HoD / Deputy HoD:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="3"
                value={formData.hod}
                onChange={(e) => handleInputChange('hod', e.target.value)}
                placeholder="Enter details of contributions as HoD/Deputy HoD..."
                style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              {readOnly ? (
                files.hod && (
                  <a
                    href={`http://${window.location.hostname}:5000/uploads/${files.hod}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-link"
                    style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#5b8fc7' }}
                  >
                    <ExternalLink size={16} />
                    <span style={{ fontSize: '0.8rem' }}>View</span>
                  </a>
                )
              ) : (
                renderUploadControl('hod')
              )}
            </div>
          </div>

          <div className="form-field-vertical">
            <label>C- As Chief Warden / Associate Chief Warden / Warden:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="3"
                value={formData.warden}
                onChange={(e) => handleInputChange('warden', e.target.value)}
                placeholder="Enter details of contributions as Warden..."
                style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              {readOnly ? (
                files.warden && (
                  <a
                    href={`http://${window.location.hostname}:5000/uploads/${files.warden}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-link"
                    style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#5b8fc7' }}
                  >
                    <ExternalLink size={16} />
                    <span style={{ fontSize: '0.8rem' }}>View</span>
                  </a>
                )
              ) : (
                renderUploadControl('warden')
              )}
            </div>
          </div>

          <div className="form-field-vertical">
            <label>D- As Centre-Lead / Co-Lead / Nucleus Member:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="3"
                value={formData.centreLead}
                onChange={(e) => handleInputChange('centreLead', e.target.value)}
                placeholder="Enter details of contributions as Centre-Lead/Co-Lead/Nucleus Member..."
                style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              {readOnly ? (
                files.centreLead && (
                  <a
                    href={`http://${window.location.hostname}:5000/uploads/${files.centreLead}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-link"
                    style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#5b8fc7' }}
                  >
                    <ExternalLink size={16} />
                    <span style={{ fontSize: '0.8rem' }}>View</span>
                  </a>
                )
              ) : (
                renderUploadControl('centreLead')
              )}
            </div>
          </div>

          <div className="form-field-vertical">
            <label>E- As Chairman / Vice Chairman / Convener / Member of one or more significant committees that involved significant efforts and time:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="3"
                value={formData.committee}
                onChange={(e) => handleInputChange('committee', e.target.value)}
                placeholder="Enter details of committee contributions..."
                style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              {readOnly ? (
                files.committee && (
                  <a
                    href={`http://${window.location.hostname}:5000/uploads/${files.committee}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-link"
                    style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#5b8fc7' }}
                  >
                    <ExternalLink size={16} />
                    <span style={{ fontSize: '0.8rem' }}>View</span>
                  </a>
                )
              ) : (
                renderUploadControl('committee')
              )}
            </div>
          </div>

          <div className="form-field-vertical">
            <label>F- As Faculty-in-Charge / Member of any Cell:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="3"
                value={formData.facultyInCharge}
                onChange={(e) => handleInputChange('facultyInCharge', e.target.value)}
                placeholder="Enter details of contributions as Faculty-in-Charge/Member of any Cell..."
                style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              {readOnly ? (
                files.facultyInCharge && (
                  <a
                    href={`http://${window.location.hostname}:5000/uploads/${files.facultyInCharge}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-link"
                    style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#5b8fc7' }}
                  >
                    <ExternalLink size={16} />
                    <span style={{ fontSize: '0.8rem' }}>View</span>
                  </a>
                )
              ) : (
                renderUploadControl('facultyInCharge')
              )}
            </div>
          </div>

          <div className="form-field-vertical">
            <label>G- As leader / contributing member of any other major responsibility not covered above:</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="3"
                value={formData.otherResponsibility}
                onChange={(e) => handleInputChange('otherResponsibility', e.target.value)}
                placeholder="Enter details of any other major responsibility..."
                style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
              {readOnly ? (
                files.otherResponsibility && (
                  <a
                    href={`http://${window.location.hostname}:5000/uploads/${files.otherResponsibility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-link"
                    style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#5b8fc7' }}
                  >
                    <ExternalLink size={16} />
                    <span style={{ fontSize: '0.8rem' }}>View</span>
                  </a>
                )
              ) : (
                renderUploadControl('otherResponsibility')
              )}
            </div>
          </div>
        </div>
        {!readOnly && (
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
      )}
    </div>
    </div>
  )
}

export default InstitutionalContributions

