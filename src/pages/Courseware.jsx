import React, { useState, useEffect } from 'react'
import { Upload, FileText, X, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const Courseware = () => {
  const location = useLocation()
  const { user } = useAuth()
  const [entries, setEntries] = useState([
    { type: '', details: '', link: '', labManualFile: null }
  ])

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('courseware')
        const data = res?.data
        if (data && Array.isArray(data)) {
          setEntries(data.map(item => ({
            type: item.type || '',
            details: item.courseware || '',
            link: item.link || '',
            labManualFile: item.labManualFile || null
          })))
        } else if (data && typeof data === 'object' && data.type) {
           // Fallback for old single-entry data
           setEntries([{
            type: data.type || '',
            details: data.courseware || '',
            link: data.link || '',
            labManualFile: data.labManualFile || null
           }])
        }
      } catch (error) {
        console.error('Failed to load courseware data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleInputChange = (index, field, value) => {
    setEntries((prev) => {
      const newEntries = [...prev]
      newEntries[index] = { ...newEntries[index], [field]: value }
      // Reset conditional fields when type changes
      if (field === 'type') {
        newEntries[index].link = ''
        newEntries[index].labManualFile = null
      }
      return newEntries
    })
  }

  const addEntry = () => {
    setEntries([...entries, { type: '', details: '', link: '', labManualFile: null }])
  }

  const removeEntry = (index) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index))
    } else {
      setEntries([{ type: '', details: '', link: '', labManualFile: null }])
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    // Validation
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const detailsFilled = entry.details && entry.details.trim()
      
      if (entry.type === 'Laboratory Manual Developed') {
        if (detailsFilled && !entry.labManualFile) {
          window.appToast(`Please upload the Lab Manual file for entry ${i + 1} since details are entered.`)
          return false
        }
        if (entry.labManualFile && !detailsFilled) {
          window.appToast(`Please provide details for the uploaded Laboratory Manual in entry ${i + 1}.`)
          return false
        }
      }

      if (entry.type === 'Text-Books') {
        if (detailsFilled && !(entry.link && entry.link.trim())) {
          window.appToast(`Please provide the link to the text-book for entry ${i + 1} since details are entered.`)
          return false
        }
        if (entry.link && entry.link.trim() && !detailsFilled) {
          window.appToast(`Please provide details for the text-book link in entry ${i + 1}.`)
          return false
        }
      }
    }

    try {
      const payload = entries.map(entry => ({
        type: entry.type,
        courseware: entry.details,
        link: entry.link,
        labManualFile: (entry.labManualFile instanceof File) ? entry.labManualFile.name : entry.labManualFile
      }))

      await legacySectionsService.saveSection('courseware', payload)
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save courseware data:', error)
      window.appToast('Failed to save data. Please try again.')
      return false
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Courseware / Course Material / Laboratory Manual Developed / Text-Books / Course Notes Published</h1>
        </div>
      </div>

      {entries.map((entry, index) => (
        <div key={index} className="form-card" style={{ marginBottom: '2rem' }}>
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Entry #{index + 1}</h3>
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(index)}
                  style={{ color: '#ff4444', background: 'none', border: '1px solid #ff4444', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem' }}
                >
                  <X size={14} /> Remove
                </button>
              )}
            </div>

            <div className="form-field-vertical">
              <label>Select Type</label>
              <select
                value={entry.type}
                onChange={(e) => handleInputChange(index, 'type', e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="Courseware">Courseware</option>
                <option value="Course Material">Course Material</option>
                <option value="Laboratory Manual Developed">Laboratory Manual Developed</option>
                <option value="Text-Books">Text-Books</option>
                <option value="Course Notes Published">Course Notes Published</option>
              </select>
            </div>

            {entry.type === 'Text-Books' && (
              <div className="form-field-vertical">
                <label>Link <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={entry.link}
                  onChange={(e) => handleInputChange(index, 'link', e.target.value)}
                  placeholder="Enter link to text-book..."
                />
              </div>
            )}

            <div className="form-field-vertical">
              <label>Details <span style={{ color: 'red' }}>*</span></label>
              <textarea
                rows="5"
                value={entry.details}
                onChange={(e) => handleInputChange(index, 'details', e.target.value)}
                placeholder="Enter details..."
                disabled={!entry.type}
              />
            </div>

            {entry.type === 'Laboratory Manual Developed' && (
              <div className="form-field-vertical" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                <label style={{ marginBottom: 0 }}>Upload Lab Manual (PDF) <span style={{ color: 'red' }}>*</span></label>
                <div className="compact-upload-wrapper" style={{ justifyContent: 'flex-start' }}>
                  <input
                    type="file"
                    id={`lab-manual-upload-${index}`}
                    accept=".pdf"
                    onChange={(e) => handleInputChange(index, 'labManualFile', e.target.files[0])}
                    className="file-input-hidden"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor={`lab-manual-upload-${index}`}
                    className={`compact-upload-btn ${entry.labManualFile ? 'has-file' : ''}`}
                    title={entry.labManualFile ? (entry.labManualFile.name || entry.labManualFile) : "Upload PDF"}
                  >
                    {(entry.labManualFile) ? <FileText size={18} /> : <Upload size={18} />}
                  </label>
                  {entry.labManualFile && (
                    <button
                      className="compact-remove-btn"
                      onClick={() => handleInputChange(index, 'labManualFile', null)}
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <FilePreviewButton
                    file={entry.labManualFile}
                    style={{ width: '32px', height: '32px' }}
                  />
                  {entry.labManualFile && (
                    <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#555', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.labManualFile.name || entry.labManualFile}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={addEntry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <Plus size={20} />
          Add Another Entry
        </button>
      </div>

      <FormActions onSave={handleSave} currentPath={location.pathname} />
    </div>
  )
}

export default Courseware
