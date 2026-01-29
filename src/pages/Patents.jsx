import React, { useState } from 'react'
import { Save, Plus, Trash2, Upload, X } from 'lucide-react'
import './FormPages.css'

const Patents = () => {
  const [selectedType, setSelectedType] = useState('')
  const [authors, setAuthors] = useState([{ firstName: '', lastName: '' }])
  
  const [grantedPatents, setGrantedPatents] = useState([
    { 
      id: 1, 
      title: '', 
      agency: '', 
      month: '',
      certificateFile: null,
      authors: [{ firstName: '', lastName: '' }],
      publicationId: ''
    }
  ])

  const [publishedPatents, setPublishedPatents] = useState([
    { 
      id: 1, 
      title: '', 
      agency: '', 
      month: '',
      certificateFile: null,
      authors: [{ firstName: '', lastName: '' }],
      publicationId: ''
    }
  ])

  const [appliedPatents, setAppliedPatents] = useState([
    { 
      id: 1, 
      title: '', 
      agency: '', 
      month: '',
      certificateFile: null,
      authors: [{ firstName: '', lastName: '' }],
      publicationId: ''
    }
  ])

  const handleGrantedInputChange = (index, field, value) => {
    const updated = [...grantedPatents]
    updated[index][field] = value
    setGrantedPatents(updated)
  }

  const handlePublishedInputChange = (index, field, value) => {
    const updated = [...publishedPatents]
    updated[index][field] = value
    setPublishedPatents(updated)
  }

  const handleAppliedInputChange = (index, field, value) => {
    const updated = [...appliedPatents]
    updated[index][field] = value
    setAppliedPatents(updated)
  }

  const addAuthor = (patentIndex) => {
    const updated = [...grantedPatents]
    updated[patentIndex].authors.push({ firstName: '', lastName: '' })
    setGrantedPatents(updated)
  }

  const removeAuthor = (patentIndex, authorIndex) => {
    const updated = [...grantedPatents]
    if (updated[patentIndex].authors.length > 1) {
      updated[patentIndex].authors.splice(authorIndex, 1)
      setGrantedPatents(updated)
    }
  }

  const updateAuthor = (patentIndex, authorIndex, field, value) => {
    const updated = [...grantedPatents]
    updated[patentIndex].authors[authorIndex][field] = value
    setGrantedPatents(updated)
  }

  const addGrantedPatent = () => {
    setGrantedPatents([...grantedPatents, {
      id: Date.now(),
      title: '',
      agency: '',
      month: '',
      certificateFile: null,
      authors: [{ firstName: '', lastName: '' }],
      publicationId: ''
    }])
  }

  const addPublishedPatent = () => {
    setPublishedPatents([...publishedPatents, {
      id: Date.now(),
      title: '',
      agency: '',
      month: '',
      certificateFile: null,
      authors: [{ firstName: '', lastName: '' }],
      publicationId: ''
    }])
  }

  const addAppliedPatent = () => {
    setAppliedPatents([...appliedPatents, {
      id: Date.now(),
      title: '',
      agency: '',
      month: '',
      certificateFile: null,
      authors: [{ firstName: '', lastName: '' }],
      publicationId: ''
    }])
  }

  const addPublishedAuthor = (patentIndex) => {
    const updated = [...publishedPatents]
    updated[patentIndex].authors.push({ firstName: '', lastName: '' })
    setPublishedPatents(updated)
  }

  const removePublishedAuthor = (patentIndex, authorIndex) => {
    const updated = [...publishedPatents]
    if (updated[patentIndex].authors.length > 1) {
      updated[patentIndex].authors.splice(authorIndex, 1)
      setPublishedPatents(updated)
    }
  }

  const updatePublishedAuthor = (patentIndex, authorIndex, field, value) => {
    const updated = [...publishedPatents]
    updated[patentIndex].authors[authorIndex][field] = value
    setPublishedPatents(updated)
  }

  const addAppliedAuthor = (patentIndex) => {
    const updated = [...appliedPatents]
    updated[patentIndex].authors.push({ firstName: '', lastName: '' })
    setAppliedPatents(updated)
  }

  const removeAppliedAuthor = (patentIndex, authorIndex) => {
    const updated = [...appliedPatents]
    if (updated[patentIndex].authors.length > 1) {
      updated[patentIndex].authors.splice(authorIndex, 1)
      setAppliedPatents(updated)
    }
  }

  const updateAppliedAuthor = (patentIndex, authorIndex, field, value) => {
    const updated = [...appliedPatents]
    updated[patentIndex].authors[authorIndex][field] = value
    setAppliedPatents(updated)
  }

  const handlePublishedFileUpload = (index, file) => {
    const updated = [...publishedPatents]
    updated[index].certificateFile = file
    setPublishedPatents(updated)
  }

  const handleAppliedFileUpload = (index, file) => {
    const updated = [...appliedPatents]
    updated[index].certificateFile = file
    setAppliedPatents(updated)
  }

  const removeGrantedPatent = (index) => {
    if (grantedPatents.length > 1) {
      setGrantedPatents(grantedPatents.filter((_, i) => i !== index))
    }
  }

  const removePublishedPatent = (index) => {
    if (publishedPatents.length > 1) {
      setPublishedPatents(publishedPatents.filter((_, i) => i !== index))
    }
  }

  const removeAppliedPatent = (index) => {
    if (appliedPatents.length > 1) {
      setAppliedPatents(appliedPatents.filter((_, i) => i !== index))
    }
  }

  const handleFileUpload = (index, file) => {
    const updated = [...grantedPatents]
    updated[index].certificateFile = file
    setGrantedPatents(updated)
  }

  const handleSave = () => {
    const data = {
      type: selectedType,
      ...(selectedType === 'granted' && { patents: grantedPatents }),
      ...(selectedType === 'published' && { patents: publishedPatents }),
      ...(selectedType === 'applied' && { patents: appliedPatents })
    }
    console.log('Saving patents data:', data)
    alert('Data saved successfully!')
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patents</h1>
          <p className="page-subtitle">Section 12: Patents Information</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div className="form-field-vertical" style={{ marginBottom: '2rem' }}>
            <label style={{ fontSize: '1.1rem', fontWeight: '500', color: '#2c3e50' }}>
              Select Patent Type<span style={{ color: '#d64550' }}>*</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select Type --</option>
              <option value="granted">a) Patents granted</option>
              <option value="published">b) Patents published</option>
              <option value="applied">c) Patents applied for</option>
            </select>
          </div>

          {/* Patents Granted */}
          {selectedType === 'granted' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Patents Granted</h3>
                <button
                  onClick={addGrantedPatent}
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
                    fontSize: '0.9rem'
                  }}
                >
                  <Plus size={16} />
                  Add Patent
                </button>
              </div>

              {grantedPatents.map((patent, patentIndex) => (
                <div key={patent.id} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#2c3e50' }}>Patent {patentIndex + 1}</h4>
                    <button
                      onClick={() => removeGrantedPatent(patentIndex)}
                      disabled={grantedPatents.length === 1}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: grantedPatents.length === 1 ? '#e0e0e0' : '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: grantedPatents.length === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-field-vertical">
                      <label>Title<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.title}
                        onChange={(e) => handleGrantedInputChange(patentIndex, 'title', e.target.value)}
                        placeholder="Patent title"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>Granting Agency<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.agency}
                        onChange={(e) => handleGrantedInputChange(patentIndex, 'agency', e.target.value)}
                        placeholder="Agency name"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-field-vertical">
                      <label>Month<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="month"
                        value={patent.month}
                        onChange={(e) => handleGrantedInputChange(patentIndex, 'month', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>Upload Certificate</label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#fff'
                      }}>
                        <Upload size={16} />
                        <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {patent.certificateFile ? patent.certificateFile.name : 'Choose file'}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(patentIndex, e.target.files[0])}
                          style={{ display: 'none' }}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                    </div>

                    <div className="form-field-vertical">
                      <label>Publication ID<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.publicationId}
                        onChange={(e) => handleGrantedInputChange(patentIndex, 'publicationId', e.target.value)}
                        placeholder="Publication ID"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Authors Section */}
                  <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', backgroundColor: '#fff' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500', color: '#2c3e50' }}>
                      Authors<span style={{ color: '#d64550' }}>*</span>
                    </label>
                    {patent.authors.map((author, authorIndex) => (
                      <div key={authorIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={author.firstName}
                          onChange={(e) => updateAuthor(patentIndex, authorIndex, 'firstName', e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={author.lastName}
                          onChange={(e) => updateAuthor(patentIndex, authorIndex, 'lastName', e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        {patent.authors.length > 1 && (
                          <button
                            onClick={() => removeAuthor(patentIndex, authorIndex)}
                            style={{ 
                              padding: '0.5rem', 
                              backgroundColor: '#ff4444', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addAuthor(patentIndex)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: '#5b8fc7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Plus size={16} />
                      Add Author
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Patents Published */}
          {selectedType === 'published' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Patents Published</h3>
                <button
                  onClick={addPublishedPatent}
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
                    fontSize: '0.9rem'
                  }}
                >
                  <Plus size={16} />
                  Add Patent
                </button>
              </div>

              {publishedPatents.map((patent, patentIndex) => (
                <div key={patent.id} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#2c3e50' }}>Patent {patentIndex + 1}</h4>
                    <button
                      onClick={() => removePublishedPatent(patentIndex)}
                      disabled={publishedPatents.length === 1}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: publishedPatents.length === 1 ? '#e0e0e0' : '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: publishedPatents.length === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-field-vertical">
                      <label>Title<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.title}
                        onChange={(e) => handlePublishedInputChange(patentIndex, 'title', e.target.value)}
                        placeholder="Patent title"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>Granting Agency<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.agency}
                        onChange={(e) => handlePublishedInputChange(patentIndex, 'agency', e.target.value)}
                        placeholder="Agency name"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-field-vertical">
                      <label>Month<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="month"
                        value={patent.month}
                        onChange={(e) => handlePublishedInputChange(patentIndex, 'month', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>Upload Certificate</label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#fff'
                      }}>
                        <Upload size={16} />
                        <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {patent.certificateFile ? patent.certificateFile.name : 'Choose file'}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => handlePublishedFileUpload(patentIndex, e.target.files[0])}
                          style={{ display: 'none' }}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                    </div>

                    <div className="form-field-vertical">
                      <label>Publication ID<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.publicationId}
                        onChange={(e) => handlePublishedInputChange(patentIndex, 'publicationId', e.target.value)}
                        placeholder="Publication ID"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Authors Section */}
                  <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', backgroundColor: '#fff' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500', color: '#2c3e50' }}>
                      Authors<span style={{ color: '#d64550' }}>*</span>
                    </label>
                    {patent.authors.map((author, authorIndex) => (
                      <div key={authorIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={author.firstName}
                          onChange={(e) => updatePublishedAuthor(patentIndex, authorIndex, 'firstName', e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={author.lastName}
                          onChange={(e) => updatePublishedAuthor(patentIndex, authorIndex, 'lastName', e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        {patent.authors.length > 1 && (
                          <button
                            onClick={() => removePublishedAuthor(patentIndex, authorIndex)}
                            style={{ 
                              padding: '0.5rem', 
                              backgroundColor: '#ff4444', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addPublishedAuthor(patentIndex)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: '#5b8fc7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Plus size={16} />
                      Add Author
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Patents Applied For */}
          {selectedType === 'applied' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Patents Applied For</h3>
                <button
                  onClick={addAppliedPatent}
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
                    fontSize: '0.9rem'
                  }}
                >
                  <Plus size={16} />
                  Add Patent
                </button>
              </div>

              {appliedPatents.map((patent, patentIndex) => (
                <div key={patent.id} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#2c3e50' }}>Patent {patentIndex + 1}</h4>
                    <button
                      onClick={() => removeAppliedPatent(patentIndex)}
                      disabled={appliedPatents.length === 1}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: appliedPatents.length === 1 ? '#e0e0e0' : '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: appliedPatents.length === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-field-vertical">
                      <label>Title<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.title}
                        onChange={(e) => handleAppliedInputChange(patentIndex, 'title', e.target.value)}
                        placeholder="Patent title"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>Granting Agency<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.agency}
                        onChange={(e) => handleAppliedInputChange(patentIndex, 'agency', e.target.value)}
                        placeholder="Agency name"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-field-vertical">
                      <label>Month<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="month"
                        value={patent.month}
                        onChange={(e) => handleAppliedInputChange(patentIndex, 'month', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div className="form-field-vertical">
                      <label>Upload Certificate</label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#fff'
                      }}>
                        <Upload size={16} />
                        <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {patent.certificateFile ? patent.certificateFile.name : 'Choose file'}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => handleAppliedFileUpload(patentIndex, e.target.files[0])}
                          style={{ display: 'none' }}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                    </div>

                    <div className="form-field-vertical">
                      <label>Publication ID<span style={{ color: '#d64550' }}>*</span></label>
                      <input
                        type="text"
                        value={patent.publicationId}
                        onChange={(e) => handleAppliedInputChange(patentIndex, 'publicationId', e.target.value)}
                        placeholder="Publication ID"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Authors Section */}
                  <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', backgroundColor: '#fff' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500', color: '#2c3e50' }}>
                      Authors<span style={{ color: '#d64550' }}>*</span>
                    </label>
                    {patent.authors.map((author, authorIndex) => (
                      <div key={authorIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={author.firstName}
                          onChange={(e) => updateAppliedAuthor(patentIndex, authorIndex, 'firstName', e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={author.lastName}
                          onChange={(e) => updateAppliedAuthor(patentIndex, authorIndex, 'lastName', e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        {patent.authors.length > 1 && (
                          <button
                            onClick={() => removeAppliedAuthor(patentIndex, authorIndex)}
                            style={{ 
                              padding: '0.5rem', 
                              backgroundColor: '#ff4444', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addAppliedAuthor(patentIndex)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: '#5b8fc7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Plus size={16} />
                      Add Author
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Patents

