import React, { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import './CoursesTaught.css'

const SubmittedProposals = () => {
  const [proposals, setProposals] = useState([
    { 
      id: 1, 
      title: '', 
      fundingAgency: '', 
      grantAmount: '', 
      duration: '', 
      submissionDate: '',
      status: '',
      role: '' 
    },
  ])

  const handleInputChange = (index, field, value) => {
    const updated = [...proposals]
    updated[index][field] = value
    setProposals(updated)
  }

  const addProposal = () => {
    const newProposal = { 
      id: Date.now(), 
      title: '', 
      fundingAgency: '', 
      grantAmount: '', 
      duration: '', 
      submissionDate: '',
      status: '',
      role: '' 
    }
    setProposals([...proposals, newProposal])
  }

  const removeProposal = (index) => {
    if (proposals.length > 1) {
      setProposals(proposals.filter((_, i) => i !== index))
    }
  }

  const handleSave = () => {
    console.log('Saving proposals data:', proposals)
    alert('Data saved successfully!')
  }

  return (
    <div className="courses-taught">
      <div className="page-header">
        <div>
          <h1 className="page-title">Submitted Research Proposals</h1>
          <p className="page-subtitle">Section 11: Brief information on any submitted proposal to external agency for sponsored research & development grants</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="semester-section">
        <div className="semester-header">
          <h3>Submitted Proposals Information</h3>
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
                <th style={{ width: '20%' }}>Title of the External Project proposal Submitted</th>
                <th style={{ width: '15%' }}>Funding Agency</th>
                <th style={{ width: '13%' }}>Amount of Grant Sought</th>
                <th style={{ width: '13%' }}>Duration of Project as proposed</th>
                <th style={{ width: '17%' }}>Date of Submission and Current Status</th>
                <th style={{ width: '14%' }}>Your Role (PI/Co-PI/Co-Investigator)</th>
                <th style={{ width: '8%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal, index) => (
                <tr key={proposal.id}>
                  <td>
                    <input
                      type="text"
                      value={proposal.title}
                      onChange={(e) => handleInputChange(index, 'title', e.target.value)}
                      placeholder="Project title"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={proposal.fundingAgency}
                      onChange={(e) => handleInputChange(index, 'fundingAgency', e.target.value)}
                      placeholder="Funding agency"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={proposal.grantAmount}
                      onChange={(e) => handleInputChange(index, 'grantAmount', e.target.value)}
                      placeholder="Grant amount"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={proposal.duration}
                      onChange={(e) => handleInputChange(index, 'duration', e.target.value)}
                      placeholder="Duration"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={proposal.submissionDate}
                      onChange={(e) => handleInputChange(index, 'submissionDate', e.target.value)}
                      placeholder="Date and status"
                    />
                  </td>
                  <td>
                    <select
                      value={proposal.role}
                      onChange={(e) => handleInputChange(index, 'role', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d8e0',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                      }}
                    >
                      <option value="">Select role</option>
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
    </div>
  )
}

export default SubmittedProposals

