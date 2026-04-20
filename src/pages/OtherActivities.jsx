import React, { useState } from 'react'
import { useEffect } from 'react'
import { Plus, Upload, X } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const getEmptyVisitEntry = () => ({
  details: '',
  evidenceFile: null,
  evidence_file: ''
})

const normalizeVisitEntry = (entry) => {
  if (typeof entry === 'string') {
    return {
      details: String(entry || '').trim(),
      evidenceFile: null,
      evidence_file: ''
    }
  }

  return {
    details: String(entry?.details || entry?.visit || entry?.text || '').trim(),
    evidenceFile: entry?.evidenceFile || null,
    evidence_file: String(entry?.evidence_file || '').trim()
  }
}

const hasVisitContent = (entry) => Boolean(
  String(entry?.details || '').trim() || entry?.evidenceFile || String(entry?.evidence_file || '').trim()
)

const hasVisitEvidence = (entry) => Boolean(entry?.evidenceFile || String(entry?.evidence_file || '').trim())

const hasMultipleVisitSignals = (text) => {
  const nonEmptyLines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const bulletLikeCount = nonEmptyLines.filter((line) => /^(\-|\*|\u2022|\d+[.)])\s+/.test(line)).length
  return nonEmptyLines.length > 1 || bulletLikeCount > 0
}

const OtherActivities = () => {
  const { user, token } = useAuth()
  const [formData, setFormData] = useState({
    softwareDeveloped: '',
    institutionalVisits: [getEmptyVisitEntry()],
  })

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('other_activities')
        const parsed = res?.data
        if (!parsed) return

        const parsedVisits = Array.isArray(parsed.institutionalVisits)
          ? parsed.institutionalVisits.map(normalizeVisitEntry)
          : []

        setFormData({
          softwareDeveloped: parsed.softwareDeveloped || '',
          institutionalVisits: parsedVisits.length > 0 ? parsedVisits : [getEmptyVisitEntry()],
        })
      } catch (error) {
        console.error('Failed to load other activities data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleVisitChange = (index, value) => {
    const updatedVisits = [...formData.institutionalVisits]
    updatedVisits[index] = { ...updatedVisits[index], details: value }
    setFormData({ ...formData, institutionalVisits: updatedVisits })
  }

  const handleVisitFileChange = (index, file) => {
    const updatedVisits = [...formData.institutionalVisits]
    updatedVisits[index] = { ...updatedVisits[index], evidenceFile: file || null }
    setFormData({ ...formData, institutionalVisits: updatedVisits })
  }

  const clearVisitEvidence = (index) => {
    const updatedVisits = [...formData.institutionalVisits]
    updatedVisits[index] = { ...updatedVisits[index], evidenceFile: null, evidence_file: '' }
    setFormData({ ...formData, institutionalVisits: updatedVisits })
  }

  const addVisit = () => {
    setFormData({ ...formData, institutionalVisits: [...formData.institutionalVisits, getEmptyVisitEntry()] })
  }

  const removeVisit = (index) => {
    if (formData.institutionalVisits.length > 1) {
      const updatedVisits = formData.institutionalVisits.filter((_, i) => i !== index)
      setFormData({ ...formData, institutionalVisits: updatedVisits })
    }
  }

  const handleSave = async () => {
    if (!user?.id || !token) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    try {
      const normalizedVisits = (formData.institutionalVisits || []).map(normalizeVisitEntry)
      const activeVisits = normalizedVisits.filter(hasVisitContent)

      for (const visit of activeVisits) {
        if (!visit.details) {
          window.appToast('Please enter visit details for each added visit.')
          return false
        }

        if (hasMultipleVisitSignals(visit.details)) {
          window.appToast('Add only one visit per box. Use Add Another Visit for multiple visits.')
          return false
        }

        if (!hasVisitEvidence(visit)) {
          window.appToast('Evidence upload is compulsory for each added visit.')
          return false
        }
      }

      const payloadVisits = activeVisits.map((visit) => ({
        details: visit.details,
        evidence_file: visit.evidence_file || ''
      }))

      const multipart = new FormData()
      multipart.append('content', JSON.stringify({
        softwareDeveloped: '',
        institutionalVisits: payloadVisits
      }))

      activeVisits.forEach((visit, index) => {
        if (visit.evidenceFile) {
          multipart.append('visit_evidence_files', visit.evidenceFile)
          multipart.append('visit_evidence_indexes', String(index))
        }
      })

      const response = await fetch(`http://${window.location.hostname}:5001/api/legacy-sections/other_activities/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: multipart
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to save data')
      }

      setFormData({
        softwareDeveloped: '',
        institutionalVisits: payloadVisits.length > 0
          ? payloadVisits.map((visit) => normalizeVisitEntry(visit))
          : [getEmptyVisitEntry()]
      })

      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save other activities data:', error)
      window.appToast('Failed to save data. Please try again.')
      return false
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Other Activities</h1>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>
              Visits to other Institutions for Research / Industries for Collaborative Work
              <span style={{ color: '#d64550' }}>*</span>
            </label>
            <p style={{ margin: '0.35rem 0 0.65rem 0', color: '#5b6472', fontSize: '0.92rem' }}>
              Add only one visit in one box. Use Add Another Visit for multiple visits.
            </p>
            {formData.institutionalVisits.map((visit, index) => (
              <div key={index} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <textarea
                    rows="4"
                    value={visit.details || ''}
                    onChange={(e) => handleVisitChange(index, e.target.value)}
                    placeholder="Enter one visit detail only..."
                    style={{ flex: 1 }}
                  />

                  <div style={{ width: '220px' }}>
                    <div style={{ marginBottom: '0.35rem', fontSize: '0.86rem', fontWeight: 600, color: '#22314f' }}>
                      Upload Evidence (PDF)
                      <span style={{ color: '#d64550' }}>*</span>
                    </div>
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      border: '2px dashed #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9',
                      cursor: 'pointer',
                      gap: '0.5rem',
                      minHeight: '145px'
                    }}>
                      <Upload size={22} color={(visit.evidenceFile || visit.evidence_file) ? '#28a745' : '#666'} />
                      <span style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', wordBreak: 'break-word' }}>
                        {visit.evidenceFile ? visit.evidenceFile.name : (visit.evidence_file || 'Upload Evidence (PDF)')}
                      </span>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <FilePreviewButton
                          file={visit.evidenceFile || visit.evidence_file}
                          style={{ width: '30px', height: '30px' }}
                        />
                        {(visit.evidenceFile || visit.evidence_file) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              clearVisitEvidence(index)
                            }}
                            title="Remove uploaded evidence"
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
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => handleVisitFileChange(index, e.target.files?.[0] || null)}
                        accept=".pdf"
                      />
                    </label>
                  </div>

                  {formData.institutionalVisits.length > 1 && (
                    <button
                      onClick={() => removeVisit(index)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        height: 'fit-content'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={addVisit}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#5cb85c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}
            >
              <Plus size={18} />
              Add Another Visit
            </button>
          </div>
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} />
    </div>
    </div>
  )
}

export default OtherActivities

