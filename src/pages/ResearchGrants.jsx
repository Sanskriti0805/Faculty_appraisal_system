import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ExternalLink, Upload } from 'lucide-react'
import './CoursesTaught.css'
import { grantsService } from '../services/grantsService'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'

const isNotFoundError = (error) => error?.response?.status === 404

// Format date for display and input (YYYY-MM-DD format)
const formatDateForInput = (dateValue) => {
  if (!dateValue) return ''
  // If it's already a string in YYYY-MM-DD format, return it
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue
  }
  // If it's a string with time component, extract the date part
  if (typeof dateValue === 'string') {
    return dateValue.split('T')[0] || dateValue.substring(0, 10)
  }
  // If it's a Date object, format it
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0]
  }
  return ''
}

const deleteIgnoringNotFound = async (deleteFn, ids) => {
  const validIds = (ids || []).filter(id => Number.isFinite(Number(id)))
  const results = await Promise.allSettled(validIds.map(id => deleteFn(id)))

  const firstRealError = results.find(
    result => result.status === 'rejected' && !isNotFoundError(result.reason)
  )

  if (firstRealError) {
    throw firstRealError.reason
  }
}

const ReadOnlyField = ({ value, readOnly, children }) => (
  readOnly
    ? <div className="readonly-table-text">{value === null || value === undefined || value === '' ? '—' : String(value)}</div>
    : children
)

const ResearchGrants = ({ initialData, readOnly }) => {
  const { user } = useAuth()
  const hasHydratedEditable = useRef(false)
  const [selectedType, setSelectedType] = useState('')
  const [loading, setLoading] = useState(false)
  const [persistedGrantIds, setPersistedGrantIds] = useState([])
  const [persistedProposalIds, setPersistedProposalIds] = useState([])

  const [grants, setGrants] = useState([
    {
      id: 1,
      projectName: '',
      fundingAgency: '',
      currency: 'INR',
      grantAmount: '',
      amountInLakhs: '',
      duration: '',
      researchers: '',
      role: '',
      evidenceFile: null
    },
  ])

  const [proposals, setProposals] = useState([
    {
      id: 1,
      title: '',
      fundingAgency: '',
      currency: 'INR',
      grantAmount: '',
      amountInLakhs: '',
      duration: '',
      submissionDate: '',
      status: '',
      role: '',
      evidenceFile: null
    },
  ])

  useEffect(() => {
    if (initialData) {
      if (initialData.grants) {
        setPersistedGrantIds(initialData.grants.map(g => g.id).filter(Boolean))
        setGrants(initialData.grants.map(g => ({
          id: g.id,
          projectName: g.project_name,
          fundingAgency: g.funding_agency,
          currency: g.currency,
          grantAmount: g.grant_amount,
          amountInLakhs: g.amount_in_lakhs,
          duration: g.duration,
          researchers: g.researchers,
          role: g.role,
          evidence_file: g.evidence_file
        })) || [{ id: 1, projectName: '', fundingAgency: '', currency: 'INR', grantAmount: '', amountInLakhs: '', duration: '', researchers: '', role: '', evidenceFile: null }])
      }
      if (initialData.proposals) {
        setPersistedProposalIds(initialData.proposals.map(p => p.id).filter(Boolean))
        setProposals(initialData.proposals.map(p => ({
          id: p.id,
          title: p.title,
          fundingAgency: p.funding_agency,
          currency: p.currency,
          grantAmount: p.grant_amount,
          amountInLakhs: p.amount_in_lakhs,
          duration: p.duration,
          submissionDate: formatDateForInput(p.submission_date),
          status: p.status,
          role: p.role,
          evidence_file: p.evidence_file
        })) || [{ id: 1, title: '', fundingAgency: '', currency: 'INR', grantAmount: '', amountInLakhs: '', duration: '', submissionDate: '', status: '', role: '', evidenceFile: null }])
      }

      if (Array.isArray(initialData.grants) && initialData.grants.length > 0) {
        setSelectedType('grants')
      } else if (Array.isArray(initialData.proposals) && initialData.proposals.length > 0) {
        setSelectedType('proposals')
      }
    }
  }, [initialData])

  useEffect(() => {
    // For editable mode, hydrate form with already saved entries.
    if (readOnly || initialData || !user?.id || hasHydratedEditable.current) return

    const loadExisting = async () => {
      try {
        const [grantsResp, proposalsResp] = await Promise.all([
          grantsService.getGrantsByFaculty(user.id),
          grantsService.getProposalsByFaculty(user.id)
        ])

        const fetchedGrants = Array.isArray(grantsResp?.data) ? grantsResp.data : []
        const fetchedProposals = Array.isArray(proposalsResp?.data) ? proposalsResp.data : []

        if (fetchedGrants.length > 0) {
          setPersistedGrantIds(fetchedGrants.map(g => g.id).filter(Boolean))
          setGrants(fetchedGrants.map(g => ({
            id: g.id,
            projectName: g.project_name || '',
            fundingAgency: g.funding_agency || '',
            currency: g.currency || 'INR',
            grantAmount: g.grant_amount || '',
            amountInLakhs: g.amount_in_lakhs || '',
            duration: g.duration || '',
            researchers: g.researchers || '',
            role: g.role || '',
            evidence_file: g.evidence_file || null,
            evidenceFile: null
          })))
          setSelectedType('grants')
        }

        if (fetchedProposals.length > 0) {
          setPersistedProposalIds(fetchedProposals.map(p => p.id).filter(Boolean))
          setProposals(fetchedProposals.map(p => ({
            id: p.id,
            title: p.title || '',
            fundingAgency: p.funding_agency || '',
            currency: p.currency || 'INR',
            grantAmount: p.grant_amount || '',
            amountInLakhs: p.amount_in_lakhs || '',
            duration: p.duration || '',
            submissionDate: formatDateForInput(p.submission_date),
            status: p.status || '',
            role: p.role || '',
            evidence_file: p.evidence_file || null,
            evidenceFile: null
          })))
          if (fetchedGrants.length === 0) {
            setSelectedType('proposals')
          }
        }

        hasHydratedEditable.current = true
      } catch (error) {
        console.error('Failed to load existing grants/proposals:', error)
      }
    }

    loadExisting()
  }, [initialData, readOnly, user?.id])

  const handleGrantInputChange = (index, field, value) => {
    const updated = [...grants]
    updated[index][field] = value
    setGrants(updated)
  }

  const handleProposalInputChange = (index, field, value) => {
    const updated = [...proposals]
    updated[index][field] = value
    setProposals(updated)
  }

  const addGrant = () => {
    const newGrant = {
      id: Date.now(),
      projectName: '',
      fundingAgency: '',
      currency: 'INR',
      grantAmount: '',
      amountInLakhs: '',
      duration: '',
      researchers: '',
      role: '',
      evidenceFile: null
    }
    setGrants([...grants, newGrant])
  }

  const handleFileUpload = (index, file) => {
    const updated = [...grants]
    updated[index].evidenceFile = file
    setGrants(updated)
  }

  const addProposal = () => {
    const newProposal = {
      id: Date.now(),
      title: '',
      fundingAgency: '',
      currency: 'INR',
      grantAmount: '',
      amountInLakhs: '',
      duration: '',
      submissionDate: '',
      status: '',
      role: '',
      evidenceFile: null
    }
    setProposals([...proposals, newProposal])
  }

  const removeGrant = (index) => {
    if (grants.length > 1) {
      setGrants(grants.filter((_, i) => i !== index))
    }
  }

  const removeProposal = (index) => {
    if (proposals.length > 1) {
      setProposals(proposals.filter((_, i) => i !== index))
    }
  }

  const handleSave = async () => {
    if (!selectedType) {
      alert('Please select a type first')
      return false
    }

    setLoading(true)
    try {
      const facultyId = user?.id
      if (!facultyId) {
        alert('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      if (selectedType === 'grants') {
        const nextPersistedIds = []
        const currentIds = new Set()

        for (const grant of grants) {
          if (!grant.projectName && !grant.fundingAgency && !grant.grantAmount && !grant.amountInLakhs && !grant.duration && !grant.researchers && !grant.role && !grant.evidenceFile) {
            continue
          }

          const grantData = {
            faculty_id: facultyId,
            grant_type: 'External',
            project_name: grant.projectName,
            funding_agency: grant.fundingAgency,
            currency: grant.currency,
            grant_amount: grant.grantAmount,
            amount_in_lakhs: grant.amountInLakhs,
            duration: grant.duration,
            researchers: grant.researchers,
            role: grant.role,
            evidence_file: grant.evidenceFile
          }

          if (persistedGrantIds.includes(grant.id)) {
            currentIds.add(grant.id)
            await grantsService.updateGrant(grant.id, grantData)
            nextPersistedIds.push(grant.id)
          } else {
            const created = await grantsService.createGrant(grantData)
            const createdId = created?.data?.id
            if (Number.isFinite(Number(createdId))) {
              nextPersistedIds.push(createdId)
            }
          }
        }

        const removedIds = persistedGrantIds.filter(id => !currentIds.has(id))
        if (removedIds.length > 0) {
          await deleteIgnoringNotFound(grantsService.deleteGrant, removedIds)
        }

        setPersistedGrantIds(nextPersistedIds)
        setPersistedProposalIds([])
      } else if (selectedType === 'proposals') {
        const nextPersistedIds = []
        const currentIds = new Set()

        for (const proposal of proposals) {
          if (!proposal.title && !proposal.fundingAgency && !proposal.grantAmount && !proposal.amountInLakhs && !proposal.duration && !proposal.submissionDate && !proposal.status && !proposal.role && !proposal.evidenceFile) {
            continue
          }

          const proposalData = {
            faculty_id: facultyId,
            title: proposal.title,
            funding_agency: proposal.fundingAgency,
            currency: proposal.currency,
            grant_amount: proposal.grantAmount,
            amount_in_lakhs: proposal.amountInLakhs,
            duration: proposal.duration,
            submission_date: proposal.submissionDate,
            status: proposal.status,
            role: proposal.role,
            evidence_file: proposal.evidenceFile
          }

          if (persistedProposalIds.includes(proposal.id)) {
            currentIds.add(proposal.id)
            await grantsService.updateProposal(proposal.id, proposalData)
            nextPersistedIds.push(proposal.id)
          } else {
            const created = await grantsService.createProposal(proposalData)
            const createdId = created?.data?.id
            if (Number.isFinite(Number(createdId))) {
              nextPersistedIds.push(createdId)
            }
          }
        }

        const removedIds = persistedProposalIds.filter(id => !currentIds.has(id))
        if (removedIds.length > 0) {
          await deleteIgnoringNotFound(grantsService.deleteProposal, removedIds)
        }

        setPersistedProposalIds(nextPersistedIds)
        setPersistedGrantIds([])
      }

      alert('Data saved successfully!')
      return true
    } catch (error) {
      console.error(`Error saving ${selectedType}:`, error)
      alert('Error saving data: ' + (error.response?.data?.message || error.message))
      return false
    } finally {
      setLoading(false)
    }
  }

  const hasGrantRows = grants.some(g => g.projectName || g.fundingAgency || g.grantAmount || g.duration || g.researchers || g.role)
  const hasProposalRows = proposals.some(p => p.title || p.fundingAgency || p.grantAmount || p.duration || p.submissionDate || p.status || p.role)
  const showGrantsTable = readOnly ? hasGrantRows : selectedType === 'grants'
  const showProposalsTable = readOnly ? hasProposalRows : selectedType === 'proposals'

  return (
    <div className={`courses-taught ${readOnly ? 'read-only-mode' : ''}`}>
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">External Sponsored Research & Development Grants received/submitted during this Academic Session</h1>
            <p className="page-subtitle">External Sponsored Research Grants & Submitted Proposals</p>
          </div>
        </div>
      )}

      {/* Type Selection */}
      {!readOnly && (
      <div className="semester-section" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontSize: '1.1rem',
            fontWeight: '500',
            color: '#2c3e50'
          }}>
            Select Type<span style={{ color: '#d64550' }}>*</span>
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: readOnly ? 'none' : '1px solid #d1d8e0',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: readOnly ? 'default' : 'pointer',
              background: readOnly ? 'transparent' : 'white',
              appearance: readOnly ? 'none' : 'auto',
              fontWeight: readOnly ? '600' : 'normal'
            }}
            disabled={readOnly}
          >
            <option value="">-- Select Type --</option>
            <option value="grants">Type 1: External Grants Received</option>
            <option value="proposals">Type 2: Submitted Research Proposals</option>
          </select>
        </div>
      </div>
      )}

      {/* External Grants Received Table */}
      {
        showGrantsTable && (
          <div className="semester-section">
            <div className="semester-header">
              <h3>External Grants Received</h3>
              {!readOnly && (
                <button
                  className="add-course-btn"
                  onClick={addGrant}
                >
                  <Plus size={18} />
                  Add Grant
                </button>
              )}
            </div>

            <div className="table-container">
              <table className="courses-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>Name of Externally Sponsored Projects Sanctioned</th>
                    <th style={{ width: '10%' }}>Funding Agency</th>
                    <th style={{ width: '7%' }}>Currency</th>
                    <th style={{ width: '9%' }}>Approved Grant Amount</th>
                    <th style={{ width: '9%' }}>Amount in Lakhs</th>
                    <th style={{ width: '12%' }}>Duration (in years) and Type of Project</th>
                    <th style={{ width: '10%' }}>Number of JRFs/SRFs/PDFs supported</th>
                    <th style={{ width: '9%' }}>Your Role</th>
                    <th style={{ width: '11%' }}>{readOnly ? 'Evidence' : 'Upload Evidence'}</th>
                    {!readOnly && <th style={{ width: '5%' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {grants.map((grant, index) => (
                    <tr key={grant.id}>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.projectName}>
                          <input
                            type="text"
                            value={grant.projectName}
                            onChange={(e) => handleGrantInputChange(index, 'projectName', e.target.value)}
                            placeholder={readOnly ? '' : 'Project name'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.fundingAgency}>
                          <input
                            type="text"
                            value={grant.fundingAgency}
                            onChange={(e) => handleGrantInputChange(index, 'fundingAgency', e.target.value)}
                            placeholder={readOnly ? '' : 'Funding agency'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.currency}>
                          <select
                            value={grant.currency}
                            onChange={(e) => handleGrantInputChange(index, 'currency', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: readOnly ? 'none' : '1px solid #d1d8e0',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              background: readOnly ? 'transparent' : 'white',
                              appearance: readOnly ? 'none' : 'auto'
                            }}
                            disabled={readOnly}
                          >
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="Other">Other</option>
                          </select>
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.grantAmount}>
                          <input
                            type="text"
                            value={grant.grantAmount}
                            onChange={(e) => handleGrantInputChange(index, 'grantAmount', e.target.value)}
                            placeholder={readOnly ? '' : 'Amount'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.amountInLakhs}>
                          <input
                            type="text"
                            value={grant.amountInLakhs}
                            onChange={(e) => handleGrantInputChange(index, 'amountInLakhs', e.target.value)}
                            placeholder={readOnly ? '' : 'In Lakhs*'}
                            style={{ backgroundColor: readOnly ? 'transparent' : '#fffef0', border: readOnly ? 'none' : '1px solid #ddd' }}
                            disabled={readOnly}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.duration}>
                          <input
                            type="text"
                            value={grant.duration}
                            onChange={(e) => handleGrantInputChange(index, 'duration', e.target.value)}
                            placeholder={readOnly ? '' : 'Duration and type'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.researchers}>
                          <input
                            type="text"
                            value={grant.researchers}
                            onChange={(e) => handleGrantInputChange(index, 'researchers', e.target.value)}
                            placeholder={readOnly ? '' : 'Number'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={grant.role}>
                          <select
                            value={grant.role}
                            onChange={(e) => handleGrantInputChange(index, 'role', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: readOnly ? 'none' : '1px solid #d1d8e0',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              background: readOnly ? 'transparent' : 'white',
                              appearance: readOnly ? 'none' : 'auto'
                            }}
                            disabled={readOnly}
                          >
                            <option value="">Select</option>
                            <option value="PI">PI</option>
                            <option value="Co-PI">Co-PI</option>
                            <option value="Co-Investigator">Co-Investigator</option>
                          </select>
                        </ReadOnlyField>
                      </td>
                      <td>
                        {readOnly ? (
                          grant.evidence_file && (
                            <a
                              href={`http://${window.location.hostname}:5000/uploads/${grant.evidence_file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#5b8fc7', textDecoration: 'none', fontSize: '0.85rem' }}
                            >
                              <ExternalLink size={14} /> View
                            </a>
                          )
                        ) : (
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            border: '1px solid #d1d8e0',
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9',
                            fontSize: '0.85rem'
                          }}>
                            <Upload size={14} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {grant.evidenceFile ? grant.evidenceFile.name : 'Choose file'}
                            </span>
                            <FilePreviewButton file={grant.evidenceFile || grant.evidence_file} style={{ width: '28px', height: '28px' }} />
                            <input
                              type="file"
                              onChange={(e) => handleFileUpload(index, e.target.files[0])}
                              style={{ display: 'none' }}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                          </label>
                        )}
                      </td>
                      {!readOnly && (
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => removeGrant(index)}
                            disabled={grants.length === 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Submitted Research Proposals Table */}
      {
        showProposalsTable && (
          <div className="semester-section">
            <div className="semester-header">
              <h3>Submitted Research Proposals</h3>
              {!readOnly && (
                <button
                  className="add-course-btn"
                  onClick={addProposal}
                >
                  <Plus size={18} />
                  Add Proposal
                </button>
              )}
            </div>

            <div className="table-container">
              <table className="courses-table">
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Title of the External Project Proposal Submitted</th>
                    <th style={{ width: '14%' }}>Funding Agency</th>
                    <th style={{ width: '8%' }}>Currency</th>
                    <th style={{ width: '11%' }}>Amount of Grant Sought</th>
                    <th style={{ width: '11%' }}>Amount in Lakhs</th>
                    <th style={{ width: '12%' }}>Duration of Project as Proposed</th>
                    <th style={{ width: '12%' }}>Date of Submission and Current Status</th>
                    <th style={{ width: '10%' }}>Your Role</th>
                    <th style={{ width: '11%' }}>{readOnly ? 'Evidence' : 'Upload Evidence'}</th>
                    {!readOnly && <th style={{ width: '5%' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal, index) => (
                    <tr key={proposal.id}>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.title}>
                          <input
                            type="text"
                            value={proposal.title}
                            onChange={(e) => handleProposalInputChange(index, 'title', e.target.value)}
                            placeholder={readOnly ? '' : 'Project title'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.fundingAgency}>
                          <input
                            type="text"
                            value={proposal.fundingAgency}
                            onChange={(e) => handleProposalInputChange(index, 'fundingAgency', e.target.value)}
                            placeholder={readOnly ? '' : 'Funding agency'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.currency}>
                          <select
                            value={proposal.currency}
                            onChange={(e) => handleProposalInputChange(index, 'currency', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: readOnly ? 'none' : '1px solid #d1d8e0',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              background: readOnly ? 'transparent' : 'white',
                              appearance: readOnly ? 'none' : 'auto'
                            }}
                            disabled={readOnly}
                          >
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="Other">Other</option>
                          </select>
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.grantAmount}>
                          <input
                            type="text"
                            value={proposal.grantAmount}
                            onChange={(e) => handleProposalInputChange(index, 'grantAmount', e.target.value)}
                            placeholder={readOnly ? '' : 'Amount'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.amountInLakhs}>
                          <input
                            type="text"
                            value={proposal.amountInLakhs}
                            onChange={(e) => handleProposalInputChange(index, 'amountInLakhs', e.target.value)}
                            placeholder={readOnly ? '' : 'In Lakhs*'}
                            style={{ backgroundColor: readOnly ? 'transparent' : '#fffef0', border: readOnly ? 'none' : '1px solid #ddd' }}
                            disabled={readOnly}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.duration}>
                          <input
                            type="text"
                            value={proposal.duration}
                            onChange={(e) => handleProposalInputChange(index, 'duration', e.target.value)}
                            placeholder={readOnly ? '' : 'Duration'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.submissionDate}>
                          <input
                            type="date"
                            value={proposal.submissionDate}
                            onChange={(e) => handleProposalInputChange(index, 'submissionDate', e.target.value)}
                            placeholder={readOnly ? '' : 'Date'}
                            disabled={readOnly}
                            style={{ border: readOnly ? 'none' : '1px solid #ddd', background: readOnly ? 'transparent' : 'white' }}
                          />
                        </ReadOnlyField>
                      </td>
                      <td>
                        <ReadOnlyField readOnly={readOnly} value={proposal.role}>
                          <select
                            value={proposal.role}
                            onChange={(e) => handleProposalInputChange(index, 'role', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: readOnly ? 'none' : '1px solid #d1d8e0',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              background: readOnly ? 'transparent' : 'white',
                              appearance: readOnly ? 'none' : 'auto'
                            }}
                            disabled={readOnly}
                          >
                            <option value="">Select</option>
                            <option value="PI">PI</option>
                            <option value="Co-PI">Co-PI</option>
                            <option value="Co-Investigator">Co-Investigator</option>
                          </select>
                        </ReadOnlyField>
                      </td>
                      <td>
                        {readOnly ? (
                          proposal.evidence_file && (
                            <a
                              href={`http://${window.location.hostname}:5000/uploads/${proposal.evidence_file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#5b8fc7', textDecoration: 'none', fontSize: '0.85rem' }}
                            >
                              <ExternalLink size={14} /> View
                            </a>
                          )
                        ) : (
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            border: '1px solid #d1d8e0',
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9',
                            fontSize: '0.85rem'
                          }}>
                            <Upload size={14} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {proposal.evidenceFile ? proposal.evidenceFile.name : 'Choose file'}
                            </span>
                            <FilePreviewButton file={proposal.evidenceFile || proposal.evidence_file} style={{ width: '28px', height: '28px' }} />
                            <input
                              type="file"
                              onChange={(e) => {
                                const updated = [...proposals]
                                updated[index].evidenceFile = e.target.files[0]
                                setProposals(updated)
                              }}
                              style={{ display: 'none' }}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                          </label>
                        )}
                      </td>
                      {!readOnly && (
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => removeProposal(index)}
                            disabled={proposals.length === 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {readOnly && !showGrantsTable && !showProposalsTable && (
        <div className="semester-section" style={{ padding: '1.5rem' }}>
          <p className="msv-no-data" style={{ margin: 0 }}>
            No research grant/proposal entries were submitted.
          </p>
        </div>
      )}

      {selectedType && !readOnly && (
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
      )}

      {!selectedType && !readOnly && (
        <FormActions onSave={() => Promise.resolve(true)} currentPath={window.location.pathname} />
      )}
    </div>
  )
}

export default ResearchGrants

