import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, ExternalLink, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import './FormPages.css'
import { patentsService } from '../services/patentsService'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'
import { showConfirm } from '../utils/appDialogs'

const ENTRY_CONFIG = {
  A: {
    heading: 'Patents Granted',
    patentType: 'Patents granted',
    detailsLabel: 'Name, Patent number, granting agency',
    detailsPlaceholder: 'Enter details of patents granted (Name, Patent number, granting agency)...',
    uploadLabel: 'Upload Certificate',
    uploadPlaceholder: 'Click to upload certificate',
    readOnlyText: 'View Certificate'
  },
  B: {
    heading: 'Patents Published',
    patentType: 'Patents published',
    detailsLabel: 'Enter details of patents published',
    detailsPlaceholder: 'Enter details of patents published...',
    uploadLabel: 'Upload Certificate (if available)',
    uploadPlaceholder: 'Click to upload certificate',
    readOnlyText: 'View Certificate'
  },
  C: {
    heading: 'Patents Applied For',
    patentType: 'Patents applied for',
    detailsLabel: 'Enter details of patents applied for',
    detailsPlaceholder: 'Enter details of patents applied for...',
    uploadLabel: 'Upload Application Document (if available)',
    uploadPlaceholder: 'Click to upload document',
    readOnlyText: 'View Document'
  }
}

const createLocalId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const getTypeFromPatentType = (patentType = '') => {
  const normalized = String(patentType || '').trim().toLowerCase()
  if (normalized === 'patents granted') return 'A'
  if (normalized === 'patents published') return 'B'
  return 'C'
}

const mapPatentToEntry = (patent = {}) => ({
  localId: createLocalId(),
  id: patent.id || null,
  type: getTypeFromPatentType(patent.patent_type),
  details: patent.title || '',
  file: patent.certificate_file || null,
  isCollapsed: false
})

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

const Patents = ({ initialData, readOnly }) => {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [selectedEntryType, setSelectedEntryType] = useState('A')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const entryRefs = useRef({})

  const draftStorageKey = useMemo(() => (
    user?.id ? `patents_dynamic_draft_${user.id}` : 'patents_dynamic_draft_anonymous'
  ), [user?.id])

  useEffect(() => {
    if (!readOnly) return
    if (initialData && Array.isArray(initialData)) {
      setEntries(initialData.map(mapPatentToEntry))
    }
  }, [initialData, readOnly])

  useEffect(() => {
    if (readOnly || !user?.id) return

    let mounted = true

    const loadData = async () => {
      const hasInitial = initialData && Array.isArray(initialData) && initialData.length > 0
      if (hasInitial) {
        if (mounted) setEntries(initialData.map(mapPatentToEntry))
        return
      }

      try {
        const rawDraft = sessionStorage.getItem(draftStorageKey)
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft)
          if (Array.isArray(parsed?.entries) && parsed.entries.length > 0) {
            const draftEntries = parsed.entries.map((entry) => ({
              localId: entry.localId || createLocalId(),
              id: entry.id || null,
              type: ['A', 'B', 'C'].includes(entry.type) ? entry.type : 'A',
              details: String(entry.details || ''),
              file: typeof entry.file === 'string' ? entry.file : null,
              isCollapsed: Boolean(entry.isCollapsed)
            }))

            if (mounted) {
              setEntries(draftEntries)
              setSelectedEntryType(['A', 'B', 'C'].includes(parsed?.selectedEntryType) ? parsed.selectedEntryType : 'A')
            }
            return
          }
        }
      } catch (error) {
        console.error('Failed to restore patents draft:', error)
      }

      try {
        const res = await patentsService.getPatentsByFaculty(user.id)
        const data = Array.isArray(res?.data) ? res.data : []
        if (!mounted) return
        setEntries(data.map(mapPatentToEntry))
      } catch (error) {
        console.error('Failed to prefill patents:', error)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [draftStorageKey, initialData, readOnly, user])

  useEffect(() => {
    if (readOnly) return

    try {
      const serializableEntries = entries.map((entry) => ({
        localId: entry.localId,
        id: entry.id,
        type: entry.type,
        details: entry.details,
        file: typeof entry.file === 'string' ? entry.file : null,
        isCollapsed: entry.isCollapsed
      }))

      sessionStorage.setItem(draftStorageKey, JSON.stringify({
        selectedEntryType,
        entries: serializableEntries
      }))
    } catch (error) {
      console.error('Failed to persist patents draft:', error)
    }
  }, [draftStorageKey, entries, readOnly, selectedEntryType])

  const addEntry = () => {
    if (readOnly) return

    const newEntry = {
      localId: createLocalId(),
      id: null,
      type: selectedEntryType,
      details: '',
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
    if (readOnly) return

    const confirmed = await showConfirm({
      title: 'Remove Patent Entry',
      message: 'Are you sure you want to remove this entry?',
      confirmText: 'Remove',
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
      const details = String(entry.details || '').trim()
      const hasFile = Boolean(entry.file)

      if (!details || !hasFile) {
        errors[entry.localId] = `Entry ${idx + 1}: Please upload supporting document or delete this entry.`
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
      if (!facultyId) {
        window.appToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      if (entries.length > 0 && !validateEntries()) {
        return false
      }

      const existingRes = await patentsService.getPatentsByFaculty(facultyId)
      const existingRows = Array.isArray(existingRes?.data) ? existingRes.data : []
      await Promise.all(existingRows.map((row) => patentsService.deletePatent(row.id)))

      if (entries.length > 0) {
        const createPayloads = entries.map((entry) => {
          const cfg = ENTRY_CONFIG[entry.type] || ENTRY_CONFIG.A
          return {
            faculty_id: facultyId,
            patent_type: cfg.patentType,
            title: String(entry.details || '').trim(),
            agency: '',
            month: new Date().toISOString().split('T')[0],
            authors: [],
            certificate_file: entry.file
          }
        })

        await Promise.all(createPayloads.map((payload) => patentsService.createPatent(payload)))
      }

      const refreshed = await patentsService.getPatentsByFaculty(facultyId)
      const refreshedRows = Array.isArray(refreshed?.data) ? refreshed.data : []
      setEntries(refreshedRows.map(mapPatentToEntry))

      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving patents:', error)
      window.appToast('Error saving data: ' + (error.response?.data?.message || error.message))
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
            <h1 className="page-title">Patents</h1>
            <p className="page-subtitle">Patents Information</p>
          </div>
        </div>
      )}

      <div className="form-card">
        <div className="form-section">
          {!readOnly && (
            <div className="form-field-vertical" style={{ marginBottom: '0.25rem' }}>
              <label>Add Patent Entry</label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedEntryType}
                  onChange={(e) => setSelectedEntryType(String(e.target.value || 'A'))}
                  style={{ minWidth: 260 }}
                >
                  <option value="A">A - Patents Granted</option>
                  <option value="B">B - Patents Published</option>
                  <option value="C">C - Patents Applied For</option>
                </select>

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
                    fontWeight: 600
                  }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          )}

          {readOnly && entries.length === 0 && (
            <p style={{ color: '#64748b', margin: 0 }}>No patent entries added.</p>
          )}

          {entries.map((entry, index) => {
            const cfg = ENTRY_CONFIG[entry.type] || ENTRY_CONFIG.A
            const detailsValue = String(entry.details || '')
            const hasDetails = detailsValue.trim().length > 0
            const fileMissingForFilledDetails = hasDetails && !entry.file

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
                  animation: 'fadeIn 0.28s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.2rem' }}>Entry {index + 1}</div>
                    <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '1.05rem' }}>{cfg.heading}</h3>
                  </div>

                  {!readOnly && (
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
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {entry.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeEntry(entry.localId)}
                        title="Remove entry"
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
                  )}
                </div>

                {!entry.isCollapsed && (
                  <div className="form-section" style={{ gap: '1rem' }}>
                    <div className="form-field-vertical">
                      <label>{cfg.detailsLabel}</label>
                      <textarea
                        rows="5"
                        value={detailsValue}
                        onChange={(e) => updateEntry(entry.localId, { details: e.target.value })}
                        placeholder={cfg.detailsPlaceholder}
                        disabled={readOnly}
                        style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>
                        {readOnly ? 'Evidence' : cfg.uploadLabel}
                        {!readOnly && hasDetails && <span className="required-asterisk"> *</span>}
                      </label>

                      {readOnly ? (
                        entry.file ? (
                          <a
                            href={`http://${window.location.hostname}:5001/uploads/${entry.file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="evidence-link"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: 500, textDecoration: 'none' }}
                          >
                            <ExternalLink size={18} /> {cfg.readOnlyText}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No document uploaded.</span>
                        )
                      ) : (
                        <div
                          style={{
                            border: fileMissingForFilledDetails ? '2px dashed #dc2626' : '2px dashed #ddd',
                            borderRadius: '8px',
                            padding: '1.35rem',
                            textAlign: 'center',
                            backgroundColor: '#f9f9f9'
                          }}
                        >
                          <input
                            type="file"
                            id={`certificate-${entry.localId}`}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => updateEntry(entry.localId, { file: e.target.files[0] || null })}
                            style={{ display: 'none' }}
                          />
                          <label
                            htmlFor={`certificate-${entry.localId}`}
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
                              {getFileDisplayName(entry.file, cfg.uploadPlaceholder)}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                              PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                            </span>
                            <FilePreviewButton file={entry.file} style={{ width: '32px', height: '32px' }} />
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
                      )}

                      {!readOnly && validationErrors[entry.localId] && (
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
      </div>

      {!readOnly && (
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
      )}
    </div>
  )
}

export default Patents
