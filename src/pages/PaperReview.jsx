import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FILE_TYPES, getAcceptAttribute, handleValidatedFileInput } from '../utils/fileValidation'

const getEmptyReviewEntry = () => ({
  paperType: '',
  quartile: '',
  reviewDetails: ''
})

const JOURNAL_QUARTILES = ['Q1', 'Q2', 'Q3', 'Q4/SCOPUS', 'OTHERS']

const parseReviewType = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return { paperType: '', quartile: '' }

  if (raw.toLowerCase().startsWith('journal')) {
    const suffix = raw.includes('-') ? raw.split('-').slice(1).join('-').trim() : raw
    let quartile = JOURNAL_QUARTILES.find((q) => q.toLowerCase() === suffix.toLowerCase()) || ''
    const suffixLc = suffix.toLowerCase()

    if (!quartile && suffixLc.includes('q1')) quartile = 'Q1'
    if (!quartile && suffixLc.includes('q2')) quartile = 'Q2'
    if (!quartile && suffixLc.includes('q3')) quartile = 'Q3'
    if (!quartile && (suffixLc.includes('q4') || suffixLc.includes('scopus'))) quartile = 'Q4/SCOPUS'
    if (!quartile && suffixLc.includes('other')) quartile = 'OTHERS'

    return { paperType: 'Journal', quartile }
  }

  if (raw.toLowerCase().startsWith('conference')) {
    return { paperType: 'Conference', quartile: '' }
  }

  return { paperType: raw, quartile: '' }
}

const toStoredReviewType = (paperType, quartile) => {
  const normalizedPaperType = String(paperType || '').trim()
  const normalizedQuartile = String(quartile || '').trim()

  if (normalizedPaperType === 'Journal' && normalizedQuartile) {
    return `Journal - ${normalizedQuartile}`
  }

  return normalizedPaperType
}

const hasReviewContent = (entry) => Boolean(
  String(entry?.paperType || '').trim() ||
  String(entry?.reviewDetails || '').trim() ||
  entry?.evidenceFile ||
  entry?.evidence_file
)

const hasRequiredReviewFields = (entry) => Boolean(
  String(entry?.paperType || '').trim() &&
  (String(entry?.paperType || '').trim() !== 'Journal' || String(entry?.quartile || '').trim()) &&
  String(entry?.reviewDetails || '').trim()
)

const hasEvidenceAttached = (entry) => Boolean(entry?.evidenceFile || String(entry?.evidence_file || '').trim())

const hasMultiplePaperSignals = (text) => {
  const value = String(text || '')
  const nonEmptyLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const bulletLikeCount = nonEmptyLines.filter((line) => /^(\-|\*|\u2022|\d+[.)])\s+/.test(line)).length

  return nonEmptyLines.length > 1 || bulletLikeCount > 0
}

const normalizeDraftEntry = (entry) => ({
  paperType: String(entry?.paperType || '').trim(),
  quartile: String(entry?.quartile || '').trim(),
  reviewDetails: String(entry?.reviewDetails || '').trim(),
  evidenceFile: entry?.evidenceFile || null,
  evidence_file: entry?.evidence_file || ''
})

const mapStoredReview = (row) => {
  const parsedType = parseReviewType(row?.review_type)

  return {
    id: row?.id || null,
    paperType: parsedType.paperType,
    quartile: parsedType.quartile,
    reviewDetails: row?.journal_name || '',
    evidenceFile: null,
    evidence_file: row?.evidence_file || ''
  }
}

const formatReviewSummary = (entry) => {
  const parts = []
  if (entry?.paperType) parts.push(entry.paperType)
  if (entry?.paperType === 'Journal' && entry?.quartile) parts.push(entry.quartile)
  return parts.length > 0 ? parts.join(' · ') : 'Untitled Review'
}

const PaperReview = () => {
  const { user, token } = useAuth()
  const [formData, setFormData] = useState(getEmptyReviewEntry())
  const [submittedReviews, setSubmittedReviews] = useState([])
  const [persistedReviewIds, setPersistedReviewIds] = useState([])
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [persistedEvidenceFile, setPersistedEvidenceFile] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const rows = Array.isArray(details?.data?.paperReviews) ? details.data.paperReviews : []
        const mappedRows = rows
          .slice()
          .sort((a, b) => {
            const aTs = a?.created_at ? new Date(a.created_at).getTime() : Number(a?.id || 0)
            const bTs = b?.created_at ? new Date(b.created_at).getTime() : Number(b?.id || 0)
            return aTs - bTs
          })
          .map(mapStoredReview)

        setSubmittedReviews(mappedRows)
        setPersistedReviewIds(rows.map((row) => row?.id).filter((id) => Number.isFinite(Number(id))))
        setFormData(getEmptyReviewEntry())
        setEvidenceFile(null)
        setPersistedEvidenceFile('')
      } catch (error) {
        console.error('Failed to prefill paper reviews:', error)
      }
    }

    hydrateExisting()
  }, [user])

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const resetDraft = () => {
    setFormData(getEmptyReviewEntry())
    setEvidenceFile(null)
    setPersistedEvidenceFile('')
    setFileInputKey((prev) => prev + 1)
  }

  const handleAddSection = () => {
    const draftEntry = { ...formData, evidenceFile, evidence_file: persistedEvidenceFile }

    if (!hasReviewContent(draftEntry)) {
      window.appToast('Please fill in the current section before adding another one.')
      return
    }

    if (!hasRequiredReviewFields(draftEntry)) {
      window.appToast('Please complete Type of Paper, Quartile (for Journal), and Review details before adding another section.')
      return
    }

    if (!hasEvidenceAttached(draftEntry)) {
      window.appToast('Please upload Evidence (PDF) before adding this section.')
      return
    }

    if (hasMultiplePaperSignals(draftEntry.reviewDetails)) {
      window.appToast('Add only one paper per comment box. Use Add Section for each additional paper.')
      return
    }

    setSubmittedReviews((prev) => [...prev, normalizeDraftEntry(draftEntry)])
    resetDraft()
    window.appToast('Section added. You can now enter another review.')
  }

  const handleRemoveSection = (index) => {
    setSubmittedReviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId || !token) {
        window.appToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      const draftEntry = { ...formData, evidenceFile, evidence_file: persistedEvidenceFile }
      const draftHasContent = hasReviewContent(draftEntry)

      if (draftHasContent && !hasRequiredReviewFields(draftEntry)) {
        window.appToast('Please complete Type of Paper, Quartile (for Journal), and Review details before saving.')
        return false
      }

      if (draftHasContent && !hasEvidenceAttached(draftEntry)) {
        window.appToast('Please upload Evidence (PDF) before saving this section.')
        return false
      }

      const hasMissingEvidenceInSections = submittedReviews.some((entry) => !hasEvidenceAttached(entry))
      if (hasMissingEvidenceInSections) {
        window.appToast('Every added section must include both details and Evidence (PDF).')
        return false
      }

      if (draftHasContent && hasMultiplePaperSignals(draftEntry.reviewDetails)) {
        window.appToast('Add only one paper per comment box. Use Add Section for each additional paper.')
        return false
      }

      const hasInvalidSavedRows = submittedReviews.some((entry) => hasMultiplePaperSignals(entry.reviewDetails))
      if (hasInvalidSavedRows) {
        window.appToast('One or more added sections include multiple papers. Keep one paper per section.')
        return false
      }

      const entriesToSave = [...submittedReviews]
      if (draftHasContent) {
        entriesToSave.push(normalizeDraftEntry(draftEntry))
      }

      if (entriesToSave.length === 0) {
        window.appToast('Data saved successfully!')
        return true
      }

      await Promise.all(persistedReviewIds.map((id) => fetch(`http://${window.location.hostname}:5001/api/activities/paper-reviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })))

      const responses = await Promise.all(entriesToSave.map((entry) => {
        const formDataObj = new FormData()
        formDataObj.append('faculty_id', facultyId)
        formDataObj.append('review_type', toStoredReviewType(entry.paperType || 'Journal', entry.quartile || ''))
        formDataObj.append('journal_name', String(entry.reviewDetails || '').trim().substring(0, 255))
        formDataObj.append('tier', '')
        formDataObj.append('number_of_papers', 1)
        formDataObj.append('month_of_review', new Date().toISOString().split('T')[0])

        if (entry.evidenceFile) {
          formDataObj.append('evidence_file', entry.evidenceFile)
        } else if (entry.evidence_file) {
          formDataObj.append('existing_evidence_file', entry.evidence_file)
        }

        return fetch(`http://${window.location.hostname}:5001/api/activities/paper-reviews`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataObj
        })
      }))

      const settled = await Promise.all(responses.map(async (response) => {
        let payload = null
        try {
          payload = await response.json()
        } catch {
          payload = null
        }

        if (!response.ok) {
          return {
            ok: false,
            message: payload?.message || `Failed to save paper review (HTTP ${response.status})`
          }
        }

        return {
          ok: true,
          id: payload?.id || payload?.data?.id || null
        }
      }))

      const failed = settled.find((item) => !item.ok)
      if (failed) {
        throw new Error(failed.message)
      }

      const createdIds = settled
        .map((item) => item.id)
        .filter((id) => Number.isFinite(Number(id)))

      if (entriesToSave.length > 0 && createdIds.length === 0) {
        throw new Error('Paper reviews were not saved. Please try again.')
      }

      setPersistedReviewIds(createdIds)
      setSubmittedReviews(entriesToSave)
      resetDraft()
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving review:', error)
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
          <h1 className="page-title">Review of research papers for Tier-1/2 refereed internal research journals</h1>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Type of Paper<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={formData.paperType}
                onChange={(e) => {
                  const nextType = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    paperType: nextType,
                    quartile: nextType === 'Journal' ? prev.quartile : ''
                  }))
                }}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              >
                <option value="">-- Select Type --</option>
                <option value="Journal">Journal</option>
                <option value="Conference">Conference</option>
              </select>
            </div>
          </div>

          {formData.paperType === 'Journal' && (
            <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
              <label>Quartile<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={formData.quartile || ''}
                onChange={(e) => handleInputChange('quartile', e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              >
                <option value="">-- Select Quartile --</option>
                {JOURNAL_QUARTILES.map((quartile) => (
                  <option key={quartile} value={quartile}>{quartile}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-field-vertical">
            <label>
              Review of research papers for Tier-1/2 refereed internal research journals
              <span style={{ color: '#d64550' }}>*</span>
            </label>
            <p style={{ margin: '0 0 0.5rem 0', color: '#5b6472', fontSize: '0.9rem' }}>
              Add one paper in one comment box. Use Add Section for multiple papers.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <textarea
                rows="10"
                value={formData.reviewDetails}
                onChange={(e) => handleInputChange('reviewDetails', e.target.value)}
                placeholder="Enter details for one paper only (e.g., Journal/Conference name, paper title, year)."
                style={{ flex: 1 }}
              />
              <div style={{ width: '200px' }}>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#22314f', fontWeight: 600 }}>
                  Upload Evidence (PDF)
                  <span style={{ color: '#d64550' }}>*</span>
                </div>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  gap: '0.5rem',
                  height: '100%',
                  minHeight: '200px'
                }}>
                  <Upload size={24} color={(evidenceFile || persistedEvidenceFile) ? '#28a745' : '#666'} />
                  <span style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center' }}>
                    {evidenceFile ? evidenceFile.name : (persistedEvidenceFile || 'Upload Evidence (PDF)')}
                  </span>
                  <FilePreviewButton
                    file={evidenceFile || persistedEvidenceFile}
                    style={{ width: '32px', height: '32px' }}
                  />
                  {(evidenceFile || persistedEvidenceFile) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEvidenceFile(null)
                        setPersistedEvidenceFile('')
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
                  <input
                    key={fileInputKey}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => handleValidatedFileInput(
                      e,
                      setEvidenceFile,
                      { allowedExtensions: FILE_TYPES.pdfOnly, label: 'Paper review evidence' }
                    )}
                    accept={getAcceptAttribute(FILE_TYPES.pdfOnly)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <p style={{ margin: 0, color: '#5b6472', fontSize: '0.95rem' }}>
              Add another section to keep multiple reviews in this submission. Each section requires both details and evidence.
            </p>
            <button
              type="button"
              onClick={handleAddSection}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minWidth: '220px',
                minHeight: '54px',
                padding: '0.95rem 1.4rem',
                border: '2px solid #304c89',
                borderRadius: '12px',
                background: '#304c89',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.2px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(48, 76, 137, 0.22)'
              }}
            >
              <Plus size={18} />
              Add Section
            </button>
          </div>

          {submittedReviews.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.05rem', color: '#22314f' }}>
                Added Sections ({submittedReviews.length})
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {submittedReviews.map((entry, index) => (
                  <div
                    key={`${entry.id || 'draft'}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      alignItems: 'flex-start',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '1rem',
                      background: '#fafbfd'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
                        {formatReviewSummary(entry)}
                      </div>
                      <div style={{ color: '#5b6472', marginBottom: '0.25rem' }}>
                        {entry.reviewDetails || 'No details entered'}
                      </div>
                      {(entry.evidenceFile || entry.evidence_file) && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', color: '#5b6472' }}>
                          <span>
                            File: {entry.evidenceFile?.name || entry.evidence_file}
                          </span>
                          <FilePreviewButton
                            file={entry.evidenceFile || entry.evidence_file}
                            style={{ width: '28px', height: '28px' }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(index)}
                      title="Remove section"
                      style={{
                        width: '34px',
                        height: '34px',
                        border: '1px solid #d1d8e0',
                        borderRadius: '8px',
                        background: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
    </div>
  )
}

export default PaperReview

