import React, { useState, useEffect } from 'react'
import { Upload, ExternalLink } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'

const API_BASE = `http://${window.location.hostname}:5000/api`

const normalizeText = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '')

const FIELD_TYPE_ALIASES = {
  dean: [
    'Dean/Associate/Assistant Dean',
    'Dean / Associate Dean / Assistant Dean',
    'Administrative Positions: Dean',
    'Administrative Positions: Associate Dean',
    'Administrative Positions: Assistant Dean',
  ],
  hod: [
    'HoD/Deputy HoD',
    'HoD / Deputy HoD',
    'Administrative Positions: HoD',
    'Administrative Positions: Deputy HoD',
  ],
  warden: [
    'Warden/Chief Warden',
    'Chief Warden / Associate Chief Warden / Warden',
    'Administrative Positions: Chief Warden',
    'Administrative Positions: Associate Chief Warden',
    'Administrative Positions: Warden',
    'Administrative Positions: Assistant Warden',
  ],
  centreLead: [
    'Centre-Lead/Nucleus Member',
    'Centre Lead / Co-Lead / Nucleus Member',
    'Administrative Positions: Centre Lead',
    'Administrative Positions: Centre Co-Lead',
    'Administrative Positions: Nucleus Member',
  ],
  committee: [
    'Committee Member/Convener',
    'Committee Member/Convenor',
    'Chairman / Vice Chairman / Convener / Member',
    'Other Significant: Chairperson of one or more significant committees',
    'Other Significant: Convenor of one or more significant committees',
    'Other Significant: Committee Member (up to a maximum of 5 points)',
  ],
  facultyInCharge: [
    'Faculty-in-Charge/Cell Member',
    'Faculty-in-Charge / Member of any Cell',
    'Other Significant: Faculty Mentor of any Cell (Mentorship)',
  ],
  otherResponsibility: [
    'Other Major Responsibility',
    'leader / contributing member of any other major responsibility not covered above',
    'Other Significant: Member of Major responsibilities (Admissions, Accreditations, etc)',
    'Other Significant: Conduct of new certificate programmes',
    'Other Significant: Scholarly articles in reputed newspapers/magazines (max 9 points)',
  ],
}

const getValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null) return value
  }
  return null
}

const buildSectionState = (rows = []) => {
  const normalizedRows = Array.isArray(rows) ? rows : []

  const findContribution = (field) => {
    const aliasSet = new Set(FIELD_TYPE_ALIASES[field].map(normalizeText))
    return normalizedRows.find((row) => {
      const rawType = getValue(row, ['contribution_type', 'activity', 'category'])
      return aliasSet.has(normalizeText(rawType))
    })
  }

  const dean = findContribution('dean')
  const hod = findContribution('hod')
  const warden = findContribution('warden')
  const centreLead = findContribution('centreLead')
  const committee = findContribution('committee')
  const facultyInCharge = findContribution('facultyInCharge')
  const otherResponsibility = findContribution('otherResponsibility')

  return {
    formData: {
      dean: getValue(dean, ['description', 'details']) || '',
      hod: getValue(hod, ['description', 'details']) || '',
      warden: getValue(warden, ['description', 'details']) || '',
      centreLead: getValue(centreLead, ['description', 'details']) || '',
      committee: getValue(committee, ['description', 'details']) || '',
      facultyInCharge: getValue(facultyInCharge, ['description', 'details']) || '',
      otherResponsibility: getValue(otherResponsibility, ['description', 'details']) || '',
    },
    positions: {
      dean: getValue(dean, ['title', 'role']) || '',
      hod: getValue(hod, ['title', 'role']) || '',
      warden: getValue(warden, ['title', 'role']) || '',
      centreLead: getValue(centreLead, ['title', 'role']) || '',
      committee: getValue(committee, ['title', 'role']) || '',
      facultyInCharge: getValue(facultyInCharge, ['title', 'role']) || '',
      otherResponsibility: getValue(otherResponsibility, ['title', 'role']) || '',
    },
    contributionIds: {
      dean: dean?.id || null,
      hod: hod?.id || null,
      warden: warden?.id || null,
      centreLead: centreLead?.id || null,
      committee: committee?.id || null,
      facultyInCharge: facultyInCharge?.id || null,
      otherResponsibility: otherResponsibility?.id || null,
    },
    files: {
      dean: getValue(dean, ['evidence_file']) || null,
      hod: getValue(hod, ['evidence_file']) || null,
      warden: getValue(warden, ['evidence_file']) || null,
      centreLead: getValue(centreLead, ['evidence_file']) || null,
      committee: getValue(committee, ['evidence_file']) || null,
      facultyInCharge: getValue(facultyInCharge, ['evidence_file']) || null,
      otherResponsibility: getValue(otherResponsibility, ['evidence_file']) || null,
    },
  }
}

const InstitutionalContributions = ({ initialData, readOnly }) => {
  const { user, token } = useAuth()
  const [contributionIds, setContributionIds] = useState({
    dean: null,
    hod: null,
    warden: null,
    centreLead: null,
    committee: null,
    facultyInCharge: null,
    otherResponsibility: null,
  })
  const [formData, setFormData] = useState({
    dean: '',
    hod: '',
    warden: '',
    centreLead: '',
    committee: '',
    facultyInCharge: '',
    otherResponsibility: '',
  })
  const [positions, setPositions] = useState({
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

  const positionOptions = {
    dean: ['Dean', 'Associate Dean', 'Assistant Dean'],
    hod: ['HoD', 'Deputy HoD'],
    warden: ['Chief Warden', 'Associate Chief Warden', 'Warden', 'Assistant Warden'],
    centreLead: ['Centre Lead', 'Centre Co-Lead', 'Nucleus Member'],
    committee: ['Chairperson', 'Vice Chairperson', 'Convenor', 'Committee Member'],
    facultyInCharge: ['Faculty In-Charge', 'Cell Member', 'Faculty Mentor'],
    otherResponsibility: ['Major Responsibilities', 'Certificate Programme', 'Scholarly Contribution'],
  }

  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      const state = buildSectionState(initialData)
      setFormData(state.formData)
      setPositions(state.positions)
      setContributionIds(state.contributionIds)
      setFiles(state.files)
    }
  }, [initialData])

  useEffect(() => {
    if (readOnly || (initialData && Array.isArray(initialData) && initialData.length > 0) || !user?.id) return

    const fetchExisting = async () => {
      try {
        const res = await fetch(`${API_BASE}/innovation/institutional/${user.id}`)
        const data = await res.json()
        if (!data.success || !Array.isArray(data.data)) return

        const state = buildSectionState(data.data)
        setFormData(state.formData)
        setPositions(state.positions)
        setContributionIds(state.contributionIds)
        setFiles(state.files)
      } catch (error) {
        console.error('Failed to prefill institutional contributions:', error)
      }
    }

    fetchExisting()
  }, [initialData, readOnly, user])

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handlePositionChange = (field, value) => {
    setPositions({ ...positions, [field]: value })
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
      const facultyId = user?.id
      if (!facultyId || !token) {
        alert('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      const saveData = async (type, label, description, selectedPosition, file, existingId) => {
        if (existingId) {
          const deleteRes = await fetch(`${API_BASE}/innovation/institutional/${existingId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })

          if (!deleteRes.ok && deleteRes.status !== 404) {
            const errorText = await deleteRes.text()
            throw new Error(errorText || `Failed to update ${type} entry`)
          }
        }

        if (!description && !selectedPosition) return;

        const formDataObj = new FormData()
        formDataObj.append('faculty_id', facultyId)
        formDataObj.append('contribution_type', label)
        formDataObj.append('title', selectedPosition || '')
        formDataObj.append('description', description)
        formDataObj.append('year', new Date().getFullYear())
        if (file && typeof file !== 'string') {
          formDataObj.append('evidence_file', file)
        }
        if (typeof file === 'string' && file.trim()) {
          formDataObj.append('existing_evidence_file', file)
        }

        const saveRes = await fetch(`${API_BASE}/innovation/institutional`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataObj
        })

        if (!saveRes.ok) {
          const errorText = await saveRes.text()
          throw new Error(errorText || `Failed to save ${type} entry`)
        }

        return saveRes.json()
      }

      const savedRows = await Promise.all([
        saveData('dean', 'Dean/Associate/Assistant Dean', formData.dean, positions.dean, files.dean, contributionIds.dean),
        saveData('hod', 'HoD/Deputy HoD', formData.hod, positions.hod, files.hod, contributionIds.hod),
        saveData('warden', 'Warden/Chief Warden', formData.warden, positions.warden, files.warden, contributionIds.warden),
        saveData('centreLead', 'Centre-Lead/Nucleus Member', formData.centreLead, positions.centreLead, files.centreLead, contributionIds.centreLead),
        saveData('committee', 'Committee Member/Convener', formData.committee, positions.committee, files.committee, contributionIds.committee),
        saveData('facultyInCharge', 'Faculty-in-Charge/Cell Member', formData.facultyInCharge, positions.facultyInCharge, files.facultyInCharge, contributionIds.facultyInCharge),
        saveData('otherResponsibility', 'Other Major Responsibility', formData.otherResponsibility, positions.otherResponsibility, files.otherResponsibility, contributionIds.otherResponsibility)
      ])

      setContributionIds((prev) => ({
        dean: savedRows[0]?.id || prev.dean,
        hod: savedRows[1]?.id || prev.hod,
        warden: savedRows[2]?.id || prev.warden,
        centreLead: savedRows[3]?.id || prev.centreLead,
        committee: savedRows[4]?.id || prev.committee,
        facultyInCharge: savedRows[5]?.id || prev.facultyInCharge,
        otherResponsibility: savedRows[6]?.id || prev.otherResponsibility,
      }))

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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={positions.dean}
                  onChange={(e) => handlePositionChange('dean', e.target.value)}
                  disabled={readOnly}
                  style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white', padding: '0.6rem', borderRadius: '4px' }}
                >
                  <option value="">Select position</option>
                  {positionOptions.dean.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={formData.dean}
                  onChange={(e) => handleInputChange('dean', e.target.value)}
                  placeholder="Enter details of contributions as Dean/Associate Dean/Assistant Dean..."
                  style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={positions.hod}
                  onChange={(e) => handlePositionChange('hod', e.target.value)}
                  disabled={readOnly}
                  style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white', padding: '0.6rem', borderRadius: '4px' }}
                >
                  <option value="">Select position</option>
                  {positionOptions.hod.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={formData.hod}
                  onChange={(e) => handleInputChange('hod', e.target.value)}
                  placeholder="Enter details of contributions as HoD/Deputy HoD..."
                  style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={positions.warden}
                  onChange={(e) => handlePositionChange('warden', e.target.value)}
                  disabled={readOnly}
                  style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white', padding: '0.6rem', borderRadius: '4px' }}
                >
                  <option value="">Select position</option>
                  {positionOptions.warden.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={formData.warden}
                  onChange={(e) => handleInputChange('warden', e.target.value)}
                  placeholder="Enter details of contributions as Warden..."
                  style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={positions.centreLead}
                  onChange={(e) => handlePositionChange('centreLead', e.target.value)}
                  disabled={readOnly}
                  style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white', padding: '0.6rem', borderRadius: '4px' }}
                >
                  <option value="">Select position</option>
                  {positionOptions.centreLead.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={formData.centreLead}
                  onChange={(e) => handleInputChange('centreLead', e.target.value)}
                  placeholder="Enter details of contributions as Centre-Lead/Co-Lead/Nucleus Member..."
                  style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={positions.committee}
                  onChange={(e) => handlePositionChange('committee', e.target.value)}
                  disabled={readOnly}
                  style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white', padding: '0.6rem', borderRadius: '4px' }}
                >
                  <option value="">Select position</option>
                  {positionOptions.committee.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={formData.committee}
                  onChange={(e) => handleInputChange('committee', e.target.value)}
                  placeholder="Enter details of committee contributions..."
                  style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={positions.facultyInCharge}
                  onChange={(e) => handlePositionChange('facultyInCharge', e.target.value)}
                  disabled={readOnly}
                  style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white', padding: '0.6rem', borderRadius: '4px' }}
                >
                  <option value="">Select position</option>
                  {positionOptions.facultyInCharge.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={formData.facultyInCharge}
                  onChange={(e) => handleInputChange('facultyInCharge', e.target.value)}
                  placeholder="Enter details of contributions as Faculty-in-Charge/Member of any Cell..."
                  style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={positions.otherResponsibility}
                  onChange={(e) => handlePositionChange('otherResponsibility', e.target.value)}
                  disabled={readOnly}
                  style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white', padding: '0.6rem', borderRadius: '4px' }}
                >
                  <option value="">Select position</option>
                  {positionOptions.otherResponsibility.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={formData.otherResponsibility}
                  onChange={(e) => handleInputChange('otherResponsibility', e.target.value)}
                  placeholder="Enter details of any other major responsibility..."
                  style={{ flex: 1, border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
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

