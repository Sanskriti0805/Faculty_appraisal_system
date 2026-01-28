import React, { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import './CoursesTaught.css'

const ResearchGrants = () => {
  const [grants, setGrants] = useState([
    { 
      id: 1, 
      projectName: '', 
      fundingAgency: '', 
      grantAmount: '', 
      duration: '', 
      researchers: '', 
      role: '' 
    },
  ])

  const handleInputChange = (index, field, value) => {
    const updated = [...grants]
    updated[index][field] = value
    setGrants(updated)
  }

  const addGrant = () => {
    const newGrant = { 
      id: Date.now(), 
      projectName: '', 
      fundingAgency: '', 
      grantAmount: '', 
      duration: '', 
      researchers: '', 
      role: '' 
    }
    setGrants([...grants, newGrant])
  }

  const removeGrant = (index) => {
    if (grants.length > 1) {
      setGrants(grants.filter((_, i) => i !== index))
    }
  }

  const handleSave = () => {
    console.log('Saving grants data:', grants)
    alert('Data saved successfully!')
  }

  return (
    <div className="courses-taught">
      <div className="page-header">
        <div>
          <h1 className="page-title">External Sponsored Research Grants</h1>
          <p className="page-subtitle">Section 10: External Sponsored Research & Development Grants received during this Academic Session</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="semester-section">
        <div className="semester-header">
          <h3>Research Grants Information</h3>
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
                <th style={{ width: '18%' }}>Name of Externally Sponsored Projects Sanctioned</th>
                <th style={{ width: '15%' }}>Funding Agency</th>
                <th style={{ width: '15%' }}>Approved Grant Amount for the Project (In Lakh INR)</th>
                <th style={{ width: '18%' }}>Duration (in years) and Type of Project (Single Institution / Multi-Institution/Individual Career Grant etc.)</th>
                <th style={{ width: '15%' }}>Number of JRFs/SRFs/PDFs supported, if any</th>
                <th style={{ width: '14%' }}>Your Role (PI/Co-PI/Co-Investigator)</th>
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
                      onChange={(e) => handleInputChange(index, 'projectName', e.target.value)}
                      placeholder="Project name"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={grant.fundingAgency}
                      onChange={(e) => handleInputChange(index, 'fundingAgency', e.target.value)}
                      placeholder="Funding agency"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={grant.grantAmount}
                      onChange={(e) => handleInputChange(index, 'grantAmount', e.target.value)}
                      placeholder="Amount in Lakh"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={grant.duration}
                      onChange={(e) => handleInputChange(index, 'duration', e.target.value)}
                      placeholder="Duration and type"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={grant.researchers}
                      onChange={(e) => handleInputChange(index, 'researchers', e.target.value)}
                      placeholder="Number of researchers"
                    />
                  </td>
                  <td>
                    <select
                      value={grant.role}
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
    </div>
  )
}

export default ResearchGrants

