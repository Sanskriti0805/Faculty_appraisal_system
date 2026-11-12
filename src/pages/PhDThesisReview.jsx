import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import './FormPages.css'
import { API_BASE_URL } from '../config/api'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FILE_TYPES, getAcceptAttribute, handleValidatedFileInput } from '../utils/fileValidation'

const REVIEW_TYPES = ['PhD Thesis Reviewer', 'PhD Thesis Examiner']

const getEmptyRow = () => ({
  id: Date.now() + Math.random(),
  reviewType: '',
  institutionName: '',
  evidenceFile: null,
  evidence_file: null
})

const hasRowData = (row) => Boolean(
  row.reviewType ||
  String(row.institutionName || '').trim() ||
  row.evidenceFile ||
  row.evidence_file
)

const PhDThesisReview = () => {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [persistedIds, setPersistedIds] = useState([])
  const [rows, setRows] = useState([getEmptyRow()])

  useEffect(() => {
    if (!user?.id) return

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const saved = Array.isArray(details?.data?.phdThesisReviews) ? details.data.phdThesisReviews : []
        if (saved.length === 0) return

        setRows(saved.map((row) => ({
          id: row.id,
          reviewType: row.review_type || '',
          institutionName: row.institution_name || '',
          evidenceFile: null,
          evidence_file: row.evidence_file || null
        })))
        setPersistedIds(saved.map((row) => row.id).filter((id) => Number.isFinite(Number(id))))
      } catch (error) {
        console.error('Failed to prefill PhD thesis reviews:', error)
      }
    }

    hydrateExisting()
  }, [user])

  const addRow = () => setRows((prev) => [...prev, getEmptyRow()])

  const removeRow = (id) => setRows((prev) => prev.filter((row) => row.id !== id))

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const clearEvidence = (id) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, evidenceFile: null, evidence_file: null } : row)))
  }

  const handleSave = async () => {
    const filledRows = rows.filter(hasRowData)

    const incomplete = filledRows.find((row) => !row.reviewType || !String(row.institutionName || '').trim())
    if (incomplete) {
      window.appToast('Please select the Type and enter the Name of Institution for every PhD thesis entry.')
      return false
    }

    setLoading(true)
    try {
      if (!user?.id || !token) {
        window.appToast('Session expired. Please login again.')
        return false
      }

      await Promise.all(persistedIds.map((id) => fetch(`${API_BASE_URL}/activities/phd-thesis-reviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })))

      // Saved one after another so the entries keep the order they were entered in.
      const responses = []
      for (const row of filledRows) {
        const payload = new FormData()
        payload.append('faculty_id', user.id)
        payload.append('review_type', row.reviewType)
        payload.append('institution_name', String(row.institutionName).trim())
        if (row.evidenceFile) {
          payload.append('evidence_file', row.evidenceFile)
        } else if (row.evidence_file) {
          payload.append('existing_evidence_file', row.evidence_file)
        }

        responses.push(await fetch(`${API_BASE_URL}/activities/phd-thesis-reviews`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: payload
        }))
      }

      const results = await Promise.all(responses.map(async (response) => {
        let body = null
        try {
          body = await response.json()
        } catch {
          body = null
        }
        return { ok: response.ok, id: body?.id || null, message: body?.message }
      }))

      const failed = results.find((result) => !result.ok)
      if (failed) throw new Error(failed.message || 'Failed to save PhD thesis entry')

      setPersistedIds(results.map((result) => result.id).filter((id) => Number.isFinite(Number(id))))
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving PhD thesis reviews:', error)
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
          <h1 className="page-title">PhD Thesis Reviewer / Examiner</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#5a6477', fontSize: '0.9rem' }}>
            Add one entry for each PhD thesis you reviewed or examined during this academic session
            (for Tier-1/2 institutes only). 5 points per thesis, up to a maximum of 10 points.
          </p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div style={{ overflowX: 'auto', padding: '1rem 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '200px' }}>Type <span style={{ color: 'red' }}>*</span></th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '260px' }}>Name of Institution <span style={{ color: 'red' }}>*</span></th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '180px' }}>Evidence (optional)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '60px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={row.reviewType}
                        onChange={(e) => updateRow(row.id, 'reviewType', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="">Select Type</option>
                        {REVIEW_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="text"
                        value={row.institutionName}
                        onChange={(e) => updateRow(row.id, 'institutionName', e.target.value)}
                        placeholder="Name of institution"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#f9f9f9',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}>
                        <Upload size={16} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', textOverflow: 'ellipsis', overflow: 'hidden' }} title={(row.evidenceFile ? row.evidenceFile.name : row.evidence_file) || 'Choose file'}>
                          {row.evidenceFile ? row.evidenceFile.name : (row.evidence_file || 'Choose file')}
                        </span>
                        <input
                          key={`${row.id}-${row.evidenceFile ? 'file' : 'empty'}`}
                          type="file"
                          onChange={(e) => handleValidatedFileInput(
                            e,
                            (file) => updateRow(row.id, 'evidenceFile', file),
                            { allowedExtensions: FILE_TYPES.documents, label: 'Evidence file' }
                          )}
                          style={{ display: 'none' }}
                          accept={getAcceptAttribute(FILE_TYPES.documents)}
                        />
                      </label>
                      <div style={{ display: 'flex', marginTop: '4px' }}>
                        <FilePreviewButton
                          file={row.evidenceFile || row.evidence_file}
                          style={{ width: '28px', height: '28px' }}
                        />
                        {(row.evidenceFile || row.evidence_file) && (
                          <button
                            type="button"
                            onClick={() => clearEvidence(row.id)}
                            title="Remove uploaded document"
                            style={{
                              width: '28px',
                              height: '28px',
                              marginLeft: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        style={{
                          padding: '0.5rem',
                          border: 'none',
                          backgroundColor: rows.length === 1 ? '#e0e0e0' : '#ff4444',
                          color: 'white',
                          borderRadius: '4px',
                          cursor: rows.length === 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#5b6e9f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Plus size={16} />
            Add Thesis
          </button>
        </div>
      </div>

      <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
  )
}

export default PhDThesisReview
