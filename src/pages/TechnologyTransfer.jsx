import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { showConfirm } from '../utils/appDialogs'
import { FILE_TYPES, getAcceptAttribute, handleValidatedFileInput } from '../utils/fileValidation'

const TECHNOLOGY_TYPES = [
  'Technology developed and transferred',
  'Software developed and deployed'
]
const ENTRY_ANIMATION = { animation: 'fadeIn 0.28s ease' }

const createLocalId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const normalizeTechnologyType = (value = '', description = '') => {
  const raw = String(value || '').trim().toLowerCase()
  const desc = String(description || '').trim().toLowerCase()

  if (raw.includes('software') || desc.includes('software')) {
    return 'Software developed and deployed'
  }

  if (raw.includes('technology') || raw.includes('transfer') || desc.includes('technology') || desc.includes('transfer')) {
    return 'Technology developed and transferred'
  }

  return 'Technology developed and transferred'
}

const getFileDisplayName = (fileValue, fallbackLabel) => {
  if (!fileValue) return fallbackLabel

  if (typeof File !== 'undefined' && fileValue instanceof File) {
    return fileValue.name
  }

  if (typeof fileValue === 'string') {
    const cleaned = fileValue.split('?')[0]
    const parts = cleaned.split('/')
    return parts[parts.length - 1] || fallbackLabel
  }

  return fallbackLabel
}

const TechnologyTransfer = () => {
  const { user, token } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const entryRefs = useRef({})

  const draftStorageKey = useMemo(() => (
    user?.id ? `technology_transfer_draft_${user.id}` : 'technology_transfer_draft_anonymous'
  ), [user?.id])

  const hydrateExisting = async () => {
    const mySub = await apiClient.get('/submissions/my')
    if (!mySub?.success || !mySub?.data?.id) {
      setEntries([])
      return []
    }

    const details = await apiClient.get(`/submissions/${mySub.data.id}`)
    const rows = Array.isArray(details?.data?.techTransfer) ? details.data.techTransfer : []

    const mapped = rows.map((row) => ({
      localId: createLocalId(),
      id: row.id,
      technologyType: normalizeTechnologyType(row.technology_type, row.description || row.title || ''),
      description: row.description || row.title || '',
      file: row.evidence_file || null,
      isCollapsed: false
    }))

    setEntries(mapped)
    return mapped
  }

  useEffect(() => {
    if (!user?.id || !token) return

    let mounted = true

    const bootstrap = async () => {
      try {
        const rawDraft = sessionStorage.getItem(draftStorageKey)
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft)
          if (Array.isArray(parsed?.entries) && parsed.entries.length > 0) {
            const draftEntries = parsed.entries.map((entry) => ({
              localId: entry.localId || createLocalId(),
              id: entry.id || null,
              technologyType: normalizeTechnologyType(entry.technologyType, entry.description),
              description: String(entry.description || ''),
              file: typeof entry.file === 'string' ? entry.file : null,
              isCollapsed: Boolean(entry.isCollapsed)
            }))
            if (mounted) {
              setEntries(draftEntries)
            }
            return
          }
        }
      } catch (error) {
        console.error('Failed to restore technology transfer draft:', error)
      }

      try {
        if (!mounted) return
        await hydrateExisting()
      } catch (error) {
        console.error('Failed to prefill technology transfer:', error)
      }
    }

    bootstrap()

    return () => {
      mounted = false
    }
  }, [draftStorageKey, token, user?.id])

  useEffect(() => {
    try {
      const serializableEntries = entries.map((entry) => ({
        localId: entry.localId,
        id: entry.id,
        technologyType: entry.technologyType,
        description: entry.description,
        file: typeof entry.file === 'string' ? entry.file : null,
        isCollapsed: entry.isCollapsed
      }))

      sessionStorage.setItem(draftStorageKey, JSON.stringify({ entries: serializableEntries }))
    } catch (error) {
      console.error('Failed to persist technology transfer draft:', error)
    }
  }, [draftStorageKey, entries])

  const addEntry = () => {
    const newEntry = {
      localId: createLocalId(),
      id: null,
      technologyType: '',
      description: '',
      file: null,
      isCollapsed: false
    }

    setEntries((prev) => [...prev, newEntry])
    setValidationErrors((prev) => {
      const next = { ...prev }
      delete next[newEntry.localId]
      return next
    })

    window.setTimeout(() => {
      const target = entryRefs.current[newEntry.localId]
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 120)
  }

  const removeEntry = async (localId) => {
    const confirmed = await showConfirm({
      title: 'Delete Technology Entry',
      message: 'Are you sure you want to delete this entry?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    })

    if (!confirmed) return

    setEntries((prev) => prev.filter((entry) => entry.localId !== localId))
    setValidationErrors((prev) => {
      const next = { ...prev }
      delete next[localId]
      return next
    })
  }

  const updateEntry = (localId, patch) => {
    setEntries((prev) => prev.map((entry) => (
      entry.localId === localId ? { ...entry, ...patch } : entry
    )))

    setValidationErrors((prev) => {
      if (!prev[localId]) return prev
      const next = { ...prev }
      delete next[localId]
      return next
    })
  }

  const validateEntries = () => {
    const errors = {}

    entries.forEach((entry, idx) => {
      const technologyType = String(entry.technologyType || '').trim()
      const description = String(entry.description || '').trim()
      const hasFile = Boolean(entry.file)

      if (!technologyType || !description || !hasFile) {
        errors[entry.localId] = `Entry ${idx + 1}: Evidence is required for this entry or delete the block.`
      }
    })

    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      window.appToast(Object.values(errors)[0])
      return false
    }

    return true
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId || !token) {
        window.appToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      if (!validateEntries()) {
        return false
      }

      const mySub = await apiClient.get('/submissions/my')
      if (mySub?.success && mySub?.data?.id) {
        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const existingRows = Array.isArray(details?.data?.techTransfer) ? details.data.techTransfer : []
        await Promise.all(existingRows.map((row) => fetch(`http://localhost:5001/api/activities/tech-transfer/${row.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })))
      }

      for (const entry of entries) {
        const description = String(entry.description || '').trim()
        const formDataObj = new FormData()
        formDataObj.append('faculty_id', facultyId)
        formDataObj.append('technology_type', entry.technologyType)
        formDataObj.append('title', description.substring(0, 100))
        formDataObj.append('description', description)
        formDataObj.append('agency', '')
        formDataObj.append('date', new Date().toISOString().split('T')[0])

        if (entry.file instanceof File) {
          formDataObj.append('evidence_file', entry.file)
        } else if (typeof entry.file === 'string' && entry.file) {
          formDataObj.append('existing_evidence_file', entry.file)
        }

        const response = await fetch('http://localhost:5001/api/activities/tech-transfer', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataObj
        })

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to save technology entry')
        }
      }

      await hydrateExisting()
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving tech transfer:', error)
      window.appToast('Error saving data: ' + error.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Technology Developed/Transferred</h1>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '1rem', fontWeight: '500' }}>
            Choose the type of your technology and add as per your convenience
          </p>
          <div className="form-field-vertical" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={addEntry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.72rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #3B5998',
                background: '#f3f7ff',
                color: '#1f3e73',
                cursor: 'pointer',
                fontWeight: 600,
                width: 'fit-content'
              }}
            >
              <Plus size={16} /> Add Technology
            </button>
          </div>

          {entries.map((entry, index) => {
            const description = String(entry.description || '')
            const hasDescription = description.trim().length > 0
            const fileMissing = hasDescription && !entry.file

            return (
              <div
                key={entry.localId}
                ref={(node) => {
                  if (node) entryRefs.current[entry.localId] = node
                }}
                style={{
                  border: '1px solid #dfe6ee',
                  borderRadius: '12px',
                  padding: '1rem 1rem 1.25rem 1rem',
                  background: '#fff',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
                  ...ENTRY_ANIMATION
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '1.05rem' }}>Technology Entry #{index + 1}</h3>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                      onClick={() => updateEntry(entry.localId, { isCollapsed: !entry.isCollapsed })}
                      title={entry.isCollapsed ? 'Expand entry' : 'Collapse entry'}
                    style={{
                        width: '34px',
                        height: '34px',
                      border: '1px solid #d1d8e0',
                      borderRadius: '6px',
                      background: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                      {entry.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>

                    <button
                      type="button"
                      onClick={() => removeEntry(entry.localId)}
                      title="Delete entry"
                      style={{
                        width: '34px',
                        height: '34px',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        background: '#fff5f5',
                        color: '#b91c1c',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {!entry.isCollapsed && (
                  <div className="form-section" style={{ gap: '1rem' }}>
                    <div className="form-field-vertical">
                      <label>Select Technology Type <span className="required-asterisk">*</span></label>
                      <select
                        value={entry.technologyType}
                        onChange={(e) => updateEntry(entry.localId, { technologyType: e.target.value })}
                      >
                        <option value="">Select type</option>
                        {TECHNOLOGY_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field-vertical">
                      <label>Enter details of technology developed/transferred <span className="required-asterisk">*</span></label>
                      <textarea
                        rows="6"
                        value={description}
                        onChange={(e) => updateEntry(entry.localId, { description: e.target.value })}
                        placeholder="Enter details of technology developed or transferred..."
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>Upload Evidence <span className="required-asterisk">*</span></label>
                      <div style={{
                        border: fileMissing ? '2px dashed #dc2626' : '2px dashed #ddd',
                        borderRadius: '8px',
                        padding: '1.35rem',
                        textAlign: 'center',
                        backgroundColor: '#f9f9f9'
                      }}>
                        <input
                          type="file"
                          id={`evidence-upload-tech-${entry.localId}`}
                          accept={getAcceptAttribute(FILE_TYPES.documents)}
                          onChange={(e) => handleValidatedFileInput(
                            e,
                            (file) => updateEntry(entry.localId, { file }),
                            { allowedExtensions: FILE_TYPES.documents, label: 'Technology transfer evidence' }
                          )}
                          style={{ display: 'none' }}
                        />
                        <label
                          htmlFor={`evidence-upload-tech-${entry.localId}`}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Upload size={32} color="#5b8fc7" />
                          <span style={{ color: '#5b8fc7', fontWeight: 500 }}>
                            {getFileDisplayName(entry.file, 'Click to upload or drag and drop')}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#666' }}>
                            PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                          </span>
                          <FilePreviewButton
                            file={entry.file}
                            style={{ width: '32px', height: '32px', marginTop: '0.25rem' }}
                          />
                          {entry.file && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                updateEntry(entry.localId, { file: null })
                              }}
                              title="Remove uploaded document"
                              style={{
                                width: '32px',
                                height: '32px',
                                border: '1px solid #d1d8e0',
                                borderRadius: '6px',
                                background: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </label>
                      </div>

                      {validationErrors[entry.localId] && (
                        <p style={{ margin: 0, color: '#dc2626', fontSize: '0.88rem', fontWeight: 500 }}>
                          {validationErrors[entry.localId]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
      </div>
    </div>
  )
}

export default TechnologyTransfer

