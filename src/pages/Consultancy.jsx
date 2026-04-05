import React, { useState, useEffect } from 'react'
import { Upload, Plus, Trash2, ExternalLink } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'

const Consultancy = ({ initialData, readOnly }) => {
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setConsultancies(initialData.map((c, index) => ({
        id: c.id || index + 1,
        organisation: c.organization || '',
        project: c.project_title || '',
        role: c.role || '',
        duration: c.duration || '',
        amount: c.amount || '',
        year: c.year || '2026',
        evidence_file: c.evidence_file // From backend
      })))
    }
  }, [initialData])

  const handleAddConsultancy = () => {
    if (readOnly) return;
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
    if (readOnly) return;
    if (consultancies.length === 1) {
      alert('You must have at least one consultancy field')
      return
    }
    setConsultancies(consultancies.filter(c => c.id !== id))
  }

  const handleFieldChange = (id, field, value) => {
    if (readOnly) return;
    setConsultancies(consultancies.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const handleFileChange = (id, file) => {
    if (readOnly) return;
    setConsultancies(consultancies.map(c =>
      c.id === id ? { ...c, evidenceFile: file } : c
    ))
  }

  const handleSave = async () => {
    if (readOnly) return true;
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const facultyId = user?.id || 1;; // TODO: Actual faculty ID

      const promises = consultancies.map(c => {
        const formData = new FormData();
        formData.append('faculty_id', facultyId);
        formData.append('organization', c.organisation);
        formData.append('project_title', c.project);
        formData.append('role', c.role);
        formData.append('duration', c.duration);
        formData.append('amount', c.amount);
        formData.append('year', c.year);
        if (c.evidenceFile) {
          formData.append('evidence_file', c.evidenceFile);
        }

        return fetch(`http://${window.location.hostname}:5000/api/consultancy`, {
          method: 'POST',
          body: formData
        });
      });

      await Promise.all(promises);
      alert('Data saved successfully!');
      return true
    } catch (error) {
      console.error('Error saving consultancy:', error);
      alert('Failed to save data. Error: ' + error.message);
      return false
    } finally {
      setLoading(false);
    }
  };

  const renderEvidenceCell = (consultancy) => {
    if (readOnly) {
      if (consultancy.evidence_file) {
        const baseUrl = `http://${window.location.hostname}:5000`;
        return (
          <a
            href={`${baseUrl}/uploads/${consultancy.evidence_file}`}
            target="_blank"
            rel="noopener noreferrer"
            className="evidence-link"
            title="View Evidence"
          >
            <ExternalLink size={18} />
          </a>
        );
      }
      return <span style={{ color: '#ccc' }}>No Evidence</span>;
    }

    return (
      <>
        <input
          type="file"
          id={`file-${consultancy.id}`}
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(consultancy.id, e.target.files[0])}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <label htmlFor={`file-${consultancy.id}`} style={{ cursor: 'pointer', color: consultancy.evidenceFile ? '#5cb85c' : '#5b8fc7' }}>
            <Upload size={18} />
          </label>
          <FilePreviewButton file={consultancy.evidenceFile || consultancy.evidence_file} />
        </div>
      </>
    );
  };

  return (
    <div className={`form-page ${readOnly ? 'read-only-mode' : ''}`}>
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Consultancy, if any (Please provide details.)</h1>
            <p className="page-subtitle">Section 20</p>
          </div>
        </div>
      )}

      <div className="form-card">
        {readOnly && <h3 className="section-title">Consultancy Projects</h3>}
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
                {!readOnly && <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '80px' }}>Action</th>}
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
                      disabled={readOnly}
                      style={{ width: '100%', padding: '0.4rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.project}
                      onChange={(e) => handleFieldChange(consultancy.id, 'project', e.target.value)}
                      disabled={readOnly}
                      style={{ width: '100%', padding: '0.4rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.role}
                      onChange={(e) => handleFieldChange(consultancy.id, 'role', e.target.value)}
                      disabled={readOnly}
                      style={{ width: '100%', padding: '0.4rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.duration}
                      onChange={(e) => handleFieldChange(consultancy.id, 'duration', e.target.value)}
                      disabled={readOnly}
                      placeholder={readOnly ? '' : "e.g. 6 months"}
                      style={{ width: '100%', padding: '0.4rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <input
                      type="text"
                      className="table-input"
                      value={consultancy.amount}
                      onChange={(e) => handleFieldChange(consultancy.id, 'amount', e.target.value)}
                      disabled={readOnly}
                      style={{ width: '100%', padding: '0.4rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                    <select
                      value={consultancy.year}
                      onChange={(e) => handleFieldChange(consultancy.id, 'year', e.target.value)}
                      disabled={readOnly}
                      style={{ width: '100%', padding: '0.4rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
                    >
                      {Array.from({ length: 30 }, (_, i) => 2026 - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                    {renderEvidenceCell(consultancy)}
                  </td>
                  {!readOnly && (
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveConsultancy(consultancy.id)}
                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!readOnly && (
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
        )}
        {!readOnly && (
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
      )}
    </div>
    </div>
  )
}

export default Consultancy
