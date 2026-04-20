import React, { useState, useEffect } from 'react'
import { Upload, ExternalLink, X, Plus, Trash2 } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'

const API_BASE = `http://${window.location.hostname}:5001/api`

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
    'Chief Warden / Associate Chief Warden / Assistant Warden / Warden',
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
    'Chairperson / Vice Chairperson / Convener / Commitee Member',
    'Other Significant: Chairperson of one or more significant committees',
    'Other Significant: Convenor of one or more significant committees',
    'Other Significant: Committee Member (up to a maximum of 5 points)',
  ],
  facultyInCharge: [
    'Faculty-in-Charge/Cell Member',
    'Faculty-in-Charge / Member of any Cell',
    'Faculty In-Charge / Faculty Mentor / Cell Member',
    'Other Significant: Faculty Mentor of any Cell (Mentorship)',
  ],
  otherResponsibility: [
    'Other Major Responsibility',
    'leader / contributing member of any other major responsibility not covered above',
    'Member of Major Responsibilities / Conduct of New Certificate / Scholarly Articles in Reputed Newspapers / Magazines',
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
  const newState = {
    dean: [],
    hod: [],
    warden: [],
    centreLead: [],
    committee: [],
    facultyInCharge: [],
    otherResponsibility: []
  }

  normalizedRows.forEach(row => {
    const rawType = getValue(row, ['contribution_type', 'activity', 'category'])
    const normalized = normalizeText(rawType)

    for (const [field, aliases] of Object.entries(FIELD_TYPE_ALIASES)) {
      if (aliases.map(normalizeText).includes(normalized)) {
        newState[field].push({
          localId: row.id,
          dbId: row.id,
          details: getValue(row, ['description', 'details']) || '',
          position: getValue(row, ['title', 'role']) || '',
          file: getValue(row, ['evidence_file']) || null
        })
        break
      }
    }
  })

  // Ensure every section has at least one entry
  Object.keys(newState).forEach(key => {
    if (newState[key].length === 0) {
      newState[key].push({ localId: Date.now() + Math.random(), dbId: null, details: '', position: '', file: null })
    }
  })

  return newState
}

const getFriendlySaveErrorMessage = (sectionLabel, entryIndex, backendMessage = '') => {
  const lower = String(backendMessage || '').toLowerCase()
  const entryText = `entry #${entryIndex + 1} in ${sectionLabel}`

  if (lower.includes('data truncated')) {
    return `Could not save ${entryText}. One of the selected values is not accepted by the server. Please reselect the position and try again.`
  }

  if (lower.includes('max_allowed_packet') || lower.includes('too large')) {
    return `Could not save ${entryText}. The evidence file is too large. Please upload a smaller file and try again.`
  }

  if (lower.includes('faculty profile not found')) {
    return 'Your profile is incomplete. Please complete onboarding first, then try again.'
  }

  return `Could not save ${entryText}. Please check Position, Details, and Evidence, then try again.`
}

const InstitutionalContributions = ({ initialData, readOnly }) => {
  const { user, token } = useAuth()
  const [sections, setSections] = useState({
    dean: [{ localId: Date.now() + 1, dbId: null, details: '', position: '', file: null }],
    hod: [{ localId: Date.now() + 2, dbId: null, details: '', position: '', file: null }],
    warden: [{ localId: Date.now() + 3, dbId: null, details: '', position: '', file: null }],
    centreLead: [{ localId: Date.now() + 4, dbId: null, details: '', position: '', file: null }],
    committee: [{ localId: Date.now() + 5, dbId: null, details: '', position: '', file: null }],
    facultyInCharge: [{ localId: Date.now() + 6, dbId: null, details: '', position: '', file: null }],
    otherResponsibility: [{ localId: Date.now() + 7, dbId: null, details: '', position: '', file: null }],
  })
  const [loading, setLoading] = useState(false)
  const [removedIds, setRemovedIds] = useState([])

  const positionOptions = {
    dean: ['Dean', 'Associate Dean', 'Assistant Dean'],
    hod: ['HoD', 'Deputy HoD'],
    warden: ['Chief Warden', 'Associate Chief Warden', 'Warden', 'Assistant Warden'],
    centreLead: ['Centre Lead', 'Center Co-Lead', 'Nucleus Member'],
    committee: ['Chairperson', 'Vice Chairperson', 'Convenor', 'Committee Member'],
    facultyInCharge: ['Faculty In-Charge / Faculty Mentor', 'Cell Member'],
    otherResponsibility: ['Major Responsibilities (Admissions, Accreditations, etc.)', 'Conduct of New Certificate Programmes', 'Scholarly Articles in Reputed Newspapers / Magazines (upto a maximum of 9 pages)', 'Others'],
  }

  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      const state = buildSectionState(initialData)
      setSections(state)
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
        setSections(state)
      } catch (error) {
        console.error('Failed to prefill institutional contributions:', error)
      }
    }

    fetchExisting()
  }, [initialData, readOnly, user])

  const handleInputChange = (field, id, value) => {
    setSections(prev => ({
      ...prev,
      [field]: prev[field].map(item => item.localId === id ? { ...item, details: value } : item)
    }))
  }

  const handlePositionChange = (field, id, value) => {
    setSections(prev => ({
      ...prev,
      [field]: prev[field].map(item => item.localId === id ? { ...item, position: value } : item)
    }))
  }

  const handleFileChange = (field, id, file) => {
    setSections(prev => ({
      ...prev,
      [field]: prev[field].map(item => item.localId === id ? { ...item, file: file } : item)
    }))
  }

  const handleAddEntry = (field) => {
    setSections(prev => ({
      ...prev,
      [field]: [...prev[field], { localId: Date.now(), dbId: null, details: '', position: '', file: null }]
    }))
  }

  const handleRemoveEntry = (field, localId, dbId) => {
    if (dbId) {
      setRemovedIds(prev => [...prev, dbId])
    }
    setSections(prev => {
      const updated = prev[field].filter(item => item.localId !== localId)
      return {
        ...prev,
        [field]: updated.length > 0 ? updated : [{ localId: Date.now(), dbId: null, details: '', position: '', file: null }]
      }
    })
  }

  const renderUploadControl = (field, item) => (
    <label style={{ cursor: 'pointer', padding: '0.5rem', border: '1px dashed #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
      <Upload size={16} color={item.file ? '#28a745' : '#666'} />
      <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{item.file ? 'Uploaded' : 'Evidence'} <span style={{ color: '#d64550' }}>*</span></span>
      <FilePreviewButton file={item.file} style={{ width: '30px', height: '30px' }} />
      {item.file && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFileChange(field, item.localId, null)
          }}
          title="Remove uploaded document"
          style={{
            width: '30px',
            height: '30px',
            border: '1px solid #d1d8e0',
            borderRadius: '6px',
            background: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={13} />
        </button>
      )}
      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileChange(field, item.localId, e.target.files[0])} />
    </label>
  )

  const handleSave = async () => {
    // Validation
    const categories = [
      { key: 'dean', label: 'Dean/Associate/Assistant Dean', shortLabel: 'Dean Role' },
      { key: 'hod', label: 'HoD/Deputy HoD', shortLabel: 'HoD Role' },
      { key: 'warden', label: 'Chief Warden / Associate Chief Warden / Assistant Warden / Warden', shortLabel: 'Warden Role' },
      { key: 'centreLead', label: 'Centre-Lead/Nucleus Member', shortLabel: 'Centre Lead Role' },
      { key: 'committee', label: 'Chairperson / Vice Chairperson / Convener / Commitee Member', shortLabel: 'Committee Role' },
      { key: 'facultyInCharge', label: 'Faculty In-Charge / Faculty Mentor / Cell Member', shortLabel: 'Faculty In-Charge' },
      { key: 'otherResponsibility', label: 'Member of Major Responsibilities / Conduct of New Certificate / Scholarly Articles in Reputed Newspapers / Magazines', shortLabel: 'Other Responsibilities' }
    ]

    for (const cat of categories) {
      const items = sections[cat.key] || []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const details = item.details?.trim()
        const position = item.position
        const file = item.file

        const hasContent = details || position
        const hasFile = !!file

        if (hasContent && !hasFile) {
          window.appToast(`Entry #${i + 1} (${cat.shortLabel}): upload evidence before saving.`)
          return false
        }
        if (hasFile && (!details || !position)) {
          window.appToast(`Entry #${i + 1} (${cat.shortLabel}): select position and add details.`)
          return false
        }
      }
    }

    setLoading(true)
    try {
      if (!user?.id || !token) {
        window.appToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      // 1. Handle Deletions
      for (const id of removedIds) {
        await fetch(`${API_BASE}/innovation/institutional/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      // 2. Handle Saves (Upserts via DELETE+POST pattern used in this app)
      const savePromises = []
      categories.forEach(cat => {
        sections[cat.key].forEach((item, index) => {
          if (!item.details && !item.position && !item.file) return // Skip completely empty items

          const formDataObj = new FormData()
          formDataObj.append('faculty_id', user.id)
          formDataObj.append('contribution_type', cat.label)
          formDataObj.append('title', item.position || '')
          formDataObj.append('description', item.details || '')
          formDataObj.append('year', new Date().getFullYear())

          if (item.file && typeof item.file !== 'string') {
            formDataObj.append('evidence_file', item.file)
          } else if (typeof item.file === 'string' && item.file.trim()) {
            formDataObj.append('existing_evidence_file', item.file)
          }

          const saveAction = async () => {
            if (item.dbId) {
              await fetch(`${API_BASE}/innovation/institutional/${item.dbId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              })
            }
            const res = await fetch(`${API_BASE}/innovation/institutional`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formDataObj
            })
            if (!res.ok) {
              let backendMessage = ''
              try {
                const body = await res.json()
                backendMessage = body?.message || ''
              } catch (_) {
                backendMessage = ''
              }

              const err = new Error(backendMessage || `Failed to save ${cat.key} entry`)
              err.userMessage = getFriendlySaveErrorMessage(cat.shortLabel, index, backendMessage)
              throw err
            }
            return res.json()
          }
          savePromises.push(saveAction())
        })
      })

      await Promise.all(savePromises)

      setRemovedIds([])
      window.appToast('Data saved successfully!')

      // Refresh state from server to get new dbIds
      const res = await fetch(`${API_BASE}/innovation/institutional/${user.id}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setSections(buildSectionState(data.data))
      }

      return true
    } catch (error) {
      console.error('Error saving contributions:', error)
      window.appToast(error?.userMessage || 'Could not save your data right now. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const renderSectionGroup = (category, label, placeholder) => {
    const items = sections[category] || []

    return (
      <div className="section-group" style={{ marginBottom: '2.5rem', borderBottom: '1px solid #edf2f7', paddingBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '1rem', fontWeight: '600', color: '#2d3748', margin: 0 }}>
            {label} <span style={{ color: '#d64550' }}>*</span>
          </label>
          {!readOnly && (
            <button
              onClick={() => handleAddEntry(category)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                backgroundColor: '#f0fff4',
                color: '#2f855a',
                border: '1px solid #c6f6d5',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={14} /> Add Another
            </button>
          )}
        </div>

        {items.map((item, index) => (
          <div key={item.localId} style={{
            position: 'relative',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.2rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            {!readOnly && items.length > 1 && (
              <button
                onClick={() => handleRemoveEntry(category, item.localId, item.dbId)}
                style={{
                  position: 'absolute',
                  top: '0.6rem',
                  right: '0.6rem',
                  background: '#fff5f5',
                  border: '1px solid #fed7d7',
                  color: '#e53e3e',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1
                }}
                title="Remove entry"
              >
                <Trash2 size={14} />
              </button>
            )}

            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <select
                  value={item.position}
                  onChange={(e) => handlePositionChange(category, item.localId, e.target.value)}
                  disabled={readOnly}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: readOnly ? 'none' : '1px solid #cbd5e0',
                    background: readOnly ? 'transparent' : '#fff',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="">Select position</option>
                  {positionOptions[category].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <textarea
                  rows="3"
                  value={item.details}
                  onChange={(e) => handleInputChange(category, item.localId, e.target.value)}
                  placeholder={placeholder}
                  disabled={readOnly}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    borderRadius: '6px',
                    border: readOnly ? 'none' : '1px solid #cbd5e0',
                    background: readOnly ? 'transparent' : '#fff',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                />
              </div>
              <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
                {readOnly ? (
                  item.file && (
                    <a
                      href={`http://${window.location.hostname}:5001/uploads/${item.file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-link"
                      style={{
                        padding: '0.6rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: '#edf2f7',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        textDecoration: 'none',
                        color: '#3182ce',
                        fontWeight: '500',
                        fontSize: '0.9rem'
                      }}
                    >
                      <ExternalLink size={16} />
                      <span>View Evidence</span>
                    </a>
                  )
                ) : (
                  renderUploadControl(category, item)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`form-page ${readOnly ? 'read-only-mode' : ''}`}>
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Other Institutional Contributions</h1>
          </div>
        </div>
      )}

      <div className="form-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1a202c', marginBottom: '2rem', borderBottom: '2px solid #3182ce', paddingBottom: '0.5rem', display: 'inline-block' }}>
          Contributions towards Institutional Development
        </h3>

        {renderSectionGroup('dean', 'As a Dean / Associate Dean / Assistant Dean', 'Enter details of contributions as Dean/Associate Dean/Assistant Dean...')}
        {renderSectionGroup('hod', 'As an HoD / Deputy HoD', 'Enter details of contributions as HoD/Deputy HoD...')}
        {renderSectionGroup('warden', 'As Chief Warden / Associate Chief Warden / Assistant Warden / Warden', 'Enter details of contributions as Warden...')}
        {renderSectionGroup('centreLead', 'As Centre-Lead / Center Co-Lead / Nucleus Member', 'Enter details of contributions as Centre-Lead/Center Co-Lead/Nucleus Member...')}
        {renderSectionGroup('committee', 'As Chairperson / Vice Chairperson / Convener / Commitee Member of one or more significant committees that involved significant efforts and time', 'Enter details of committee contributions...')}
        {renderSectionGroup('facultyInCharge', 'As Faculty In-Charge / Faculty Mentor / Cell Member of any Cell', 'Enter details of contributions as Faculty-in-Charge/Member of any Cell...')}
        {renderSectionGroup('otherResponsibility', 'Member of Major Responsibilities / Conduct of New Certificate / Scholarly Articles in Reputed Newspapers / Magazines not covered above', 'Enter details of any other major responsibility...')}

        {!readOnly && (
          <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
        )}
      </div>
    </div>
  )
}

export default InstitutionalContributions

