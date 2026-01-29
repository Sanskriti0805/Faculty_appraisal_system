import React, { useState } from 'react'
import { Plus, Trash2, Save, Upload } from 'lucide-react'
import './CoursesTaught.css'

const ResearchGrants = () => {
  const [selectedType, setSelectedType] = useState('')
  
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
      role: '' 
    },
  ])

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
      role: '' 
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

  const handleSave = () => {
    const data = selectedType === 'grants' ? grants : proposals
    console.log(`Saving ${selectedType} data:`, data)
    alert('Data saved successfully!')
  }

  return (
    <div className="courses-taught">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research & Development</h1>
          <p className="page-subtitle">External Sponsored Research Grants & Submitted Proposals</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      {/* Type Selection */}
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
              border: '1px solid #d1d8e0',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <option value="">-- Select Type --</option>
            <option value="grants">Type 1: External Grants Received</option>
            <option value="proposals">Type 2: Submitted Research Proposals</option>
          </select>
        </div>
      </div>

      {/* External Grants Received Table */}
      {selectedType === 'grants' && (
        <div className="semester-section">
          <div className="semester-header">
            <h3>External Grants Received</h3>
            <button 
              className="add-course-btn"
              onClick={addGrant}
            >
              <Plus size={18} />
              Add Grant
            </button>
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
                  <th style={{ width: '11%' }}>Upload Evidence</th>
                  <th style={{ width: '5%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant, index) => (
                  <tr key={grant.id}>
                    <td>
                      <input
                        type="text"
                        value={grant.projectName}
                        onChange={(e) => handleGrantInputChange(index, 'projectName', e.target.value)}
                        placeholder="Project name"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={grant.fundingAgency}
                        onChange={(e) => handleGrantInputChange(index, 'fundingAgency', e.target.value)}
                        placeholder="Funding agency"
                      />
                    </td>
                    <td>
                      <select
                        value={grant.currency}
                        onChange={(e) => handleGrantInputChange(index, 'currency', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d8e0',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                        }}
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={grant.grantAmount}
                        onChange={(e) => handleGrantInputChange(index, 'grantAmount', e.target.value)}
                        placeholder="Amount"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={grant.amountInLakhs}
                        onChange={(e) => handleGrantInputChange(index, 'amountInLakhs', e.target.value)}
                        placeholder="In Lakhs*"
                        style={{ backgroundColor: '#fffef0' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={grant.duration}
                        onChange={(e) => handleGrantInputChange(index, 'duration', e.target.value)}
                        placeholder="Duration and type"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={grant.researchers}
                        onChange={(e) => handleGrantInputChange(index, 'researchers', e.target.value)}
                        placeholder="Number"
                      />
                    </td>
                    <td>
                      <select
                        value={grant.role}
                        onChange={(e) => handleGrantInputChange(index, 'role', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d8e0',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                        }}
                      >
                        <option value="">Select</option>
                        <option value="PI">PI</option>
                        <option value="Co-PI">Co-PI</option>
                        <option value="Co-Investigator">Co-Investigator</option>
                      </select>
                    </td>
                    <td>
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
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(index, e.target.files[0])}
                          style={{ display: 'none' }}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </label>
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => removeGrant(index)}
                        disabled={grants.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submitted Research Proposals Table */}
      {selectedType === 'proposals' && (
        <div className="semester-section">
          <div className="semester-header">
            <h3>Submitted Research Proposals</h3>
            <button 
              className="add-course-btn"
              onClick={addProposal}
            >
              <Plus size={18} />
              Add Proposal
            </button>
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
                  <th style={{ width: '14%' }}>Date of Submission and Current Status</th>
                  <th style={{ width: '10%' }}>Your Role</th>
                  <th style={{ width: '4%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal, index) => (
                  <tr key={proposal.id}>
                    <td>
                      <input
                        type="text"
                        value={proposal.title}
                        onChange={(e) => handleProposalInputChange(index, 'title', e.target.value)}
                        placeholder="Project title"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposal.fundingAgency}
                        onChange={(e) => handleProposalInputChange(index, 'fundingAgency', e.target.value)}
                        placeholder="Funding agency"
                      />
                    </td>
                    <td>
                      <select
                        value={proposal.currency}
                        onChange={(e) => handleProposalInputChange(index, 'currency', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d8e0',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                        }}
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposal.grantAmount}
                        onChange={(e) => handleProposalInputChange(index, 'grantAmount', e.target.value)}
                        placeholder="Amount"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposal.amountInLakhs}
                        onChange={(e) => handleProposalInputChange(index, 'amountInLakhs', e.target.value)}
                        placeholder="In Lakhs*"
                        style={{ backgroundColor: '#fffef0' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposal.duration}
                        onChange={(e) => handleProposalInputChange(index, 'duration', e.target.value)}
                        placeholder="Duration"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={proposal.submissionDate}
                        onChange={(e) => handleProposalInputChange(index, 'submissionDate', e.target.value)}
                        placeholder="Date and status"
                      />
                    </td>
                    <td>
                      <select
                        value={proposal.role}
                        onChange={(e) => handleProposalInputChange(index, 'role', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d8e0',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                        }}
                      >
                        <option value="">Select</option>
                        <option value="PI">PI</option>
                        <option value="Co-PI">Co-PI</option>
                        <option value="Co-Investigator">Co-Investigator</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => removeProposal(index)}
                        disabled={proposals.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResearchGrants

