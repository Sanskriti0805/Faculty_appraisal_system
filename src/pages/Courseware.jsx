import React, { useState } from 'react'
import { useEffect } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const Courseware = () => {
  const location = useLocation()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    type: '',
    courseware: '',
    link: '',
    labManualFile: null,
  })

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('courseware')
        const parsed = res?.data
        if (!parsed) return
        setFormData({
          type: parsed.type || '',
          courseware: parsed.courseware || '',
          link: parsed.link || '',
          labManualFile: parsed.labManualFile || null,
        })
      } catch (error) {
        console.error('Failed to load courseware data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!user?.id) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    try {
      await legacySectionsService.saveSection('courseware', {
        type: formData.type,
        courseware: formData.courseware,
        link: formData.link,
        labManualFile: formData.labManualFile?.name || null,
      })
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
          <p className="page-subtitle">Courseware and Learning Materials</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical">
            <label>Select Type:</label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
            >
              <option value="">Select Type</option>
              <option value="Courseware">Courseware</option>
              <option value="Course Material">Course Material</option>
              <option value="Laboratory Manual Developed">Laboratory Manual Developed</option>
              <option value="Text-Books">Text-Books</option>
              <option value="Course Notes Published">Course Notes Published</option>
            </select>
          </div>

          {formData.type === 'Text-Books' && (
            <div className="form-field-vertical">
              <label>Link:</label>
              <input
                type="text"
                value={formData.link}
                onChange={(e) => handleInputChange('link', e.target.value)}
                placeholder="Enter link to text-book..."
              />
            </div>
          )}

          <div className="form-field-vertical">
            <label>Details:</label>
            <textarea
              rows="8"
              value={formData.courseware}
              onChange={(e) => handleInputChange('courseware', e.target.value)}
              placeholder="Enter details..."
              disabled={!formData.type}
            />
          </div>

          {formData.type === 'Laboratory Manual Developed' && (
            <div className="form-field-vertical" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
              <label style={{ marginBottom: 0 }}>Upload Lab Manual (PDF):</label>
              <div className="compact-upload-wrapper" style={{ justifyContent: 'flex-start' }}>
                <input
                  type="file"
                  id="lab-manual-upload"
                  accept=".pdf"
                  onChange={(e) => handleInputChange('labManualFile', e.target.files[0])}
                  className="file-input-hidden"
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="lab-manual-upload"
                  className={`compact-upload-btn ${formData.labManualFile ? 'has-file' : ''}`}
                  title={formData.labManualFile ? formData.labManualFile.name : "Upload PDF"}
                >
                  {formData.labManualFile ? <FileText size={18} /> : <Upload size={18} />}
                </label>
                {formData.labManualFile && (
                  <button
                    className="compact-remove-btn"
                    onClick={() => handleInputChange('labManualFile', null)}
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                )}
                <FilePreviewButton
                  file={formData.labManualFile}
                  style={{ width: '32px', height: '32px' }}
                />
                {formData.labManualFile && (
                  <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#555' }}>
                    {formData.labManualFile.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <FormActions onSave={handleSave} currentPath={location.pathname} />
    </div>
  )
}

export default Courseware

