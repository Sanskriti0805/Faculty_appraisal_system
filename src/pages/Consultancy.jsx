import React, { useState } from 'react'
import { Save, Upload, Plus, Trash2 } from 'lucide-react'
import './FormPages.css'

const Consultancy = () => {
  const [consultancies, setConsultancies] = useState([
    {
      id: 1,
      organisation: '',
      project: '',
      role: '',
      duration: '',
      amount: '',
      year: '2026',
      evidenceFile: null
    }
  ])

  const handleAddConsultancy = () => {
    const newId = consultancies.length > 0 ? Math.max(...consultancies.map(c => c.id)) + 1 : 1
    setConsultancies([...consultancies, {
      id: newId,
      organisation: '',
      project: '',
      role: '',
      duration: '',
      amount: '',
      year: '2026',
      evidenceFile: null
    }])
  }

  const handleRemoveConsultancy = (id) => {
    if (consultancies.length === 1) {
      alert('You must have at least one consultancy field')
      return
    }
    setConsultancies(consultancies.filter(c => c.id !== id))
  }

  const handleFieldChange = (id, field, value) => {
    setConsultancies(consultancies.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const handleFileChange = (id, file) => {
    setConsultancies(consultancies.map(c =>
      c.id === id ? { ...c, evidenceFile: file } : c
    ))
  }

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/submissions/consultancy/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: 1,
          consultancy: consultancies
        })
      });
      const data = await response.json();
      if (data.success) alert('Data saved successfully!');
    } catch (error) {
      console.error('Error saving consultancy:', error);
      alert('Failed to save data.');
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Consultancy, if any (Please provide details.)</h1>
          <p className="page-subtitle">Section 20</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="courses-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Organisation</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Project</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Role</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Duration</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Amount</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', width: '100px' }}>Year</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '80px' }}>Evidence</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {consultancies.map((consultancy) => (
                <tr key={consultancy.id}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.organisation}
                      onChange={(e) => handleFieldChange(consultancy.id, 'organisation', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.project}
                      onChange={(e) => handleFieldChange(consultancy.id, 'project', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.role}
                      onChange={(e) => handleFieldChange(consultancy.id, 'role', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.duration}
                      onChange={(e) => handleFieldChange(consultancy.id, 'duration', e.target.value)}
                      placeholder="e.g. 6 months"
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.amount}
                      onChange={(e) => handleFieldChange(consultancy.id, 'amount', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <select
                      value={consultancy.year}
                      onChange={(e) => handleFieldChange(consultancy.id, 'year', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      {Array.from({ length: 30 }, (_, i) => 2026 - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                    <input
                      type="file"
                      id={`file-${consultancy.id}`}
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileChange(consultancy.id, e.target.files[0])}
                    />
                    <label htmlFor={`file-${consultancy.id}`} style={{ cursor: 'pointer', color: consultancy.evidenceFile ? '#5cb85c' : '#5b8fc7' }}>
                      <Upload size={18} />
                    </label>
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRemoveConsultancy(consultancy.id)}
                      style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleAddConsultancy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '0.5rem'
          }}
        >
          <Plus size={18} />
          Add Row
        </button>
      </div>
    </div>
  )
}

export default Consultancy
