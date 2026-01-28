import React, { useState } from 'react'
import { Save, Plus, X } from 'lucide-react'
import './FormPages.css'

const ResearchPublications = () => {
  const [publicationType, setPublicationType] = useState('')
  const [bookSubType, setBookSubType] = useState('')
  const [authors, setAuthors] = useState([{ first: '', middle: '', last: '' }])
  const [editors, setEditors] = useState([{ first: '', middle: '', last: '' }])
  
  const [journalData, setJournalData] = useState({
    titleOfPaper: '',
    yearOfPublication: '2026',
    nameOfJournal: '',
    volume: '',
    number: '',
    pagesFrom: '',
    pagesTo: ''
  })

  const [conferenceData, setConferenceData] = useState({
    titleOfPaper: '',
    fullNameOfConference: '',
    abbreviation: '',
    dateFrom: '',
    dateTo: '',
    typeOfConference: 'International',
    pagesFrom: '',
    pagesTo: '',
    city: '',
    state: '',
    country: '',
    publicationAgency: ''
  })

  const [bookChapterData, setBookChapterData] = useState({
    titleOfPaper: '',
    yearOfPublication: '2026',
    titleOfBook: '',
    pagesFrom: '',
    pagesTo: '',
    publicationAgency: ''
  })

  const [bookData, setBookData] = useState({
    titleOfBook: '',
    yearOfPublication: '2026',
    publicationAgency: '',
    city: '',
    state: '',
    country: ''
  })

  const [otherDetails, setOtherDetails] = useState('')

  const addAuthor = () => {
    setAuthors([...authors, { first: '', middle: '', last: '' }])
  }

  const removeAuthor = (index) => {
    if (authors.length > 1) {
      setAuthors(authors.filter((_, i) => i !== index))
    }
  }

  const updateAuthor = (index, field, value) => {
    const updatedAuthors = authors.map((author, i) => 
      i === index ? { ...author, [field]: value } : author
    )
    setAuthors(updatedAuthors)
  }

  const addEditor = () => {
    setEditors([...editors, { first: '', middle: '', last: '' }])
  }

  const removeEditor = (index) => {
    if (editors.length > 1) {
      setEditors(editors.filter((_, i) => i !== index))
    }
  }

  const updateEditor = (index, field, value) => {
    const updatedEditors = editors.map((editor, i) => 
      i === index ? { ...editor, [field]: value } : editor
    )
    setEditors(updatedEditors)
  }

  const handleSave = () => {
    const data = {
      type: publicationType,
      ...(publicationType === 'Monographs' && { subType: bookSubType }),
      authors,
      ...(publicationType === 'Journal' && journalData),
      ...(publicationType === 'Conference' && conferenceData),
      ...(publicationType === 'Monographs' && bookSubType === 'Book Chapter' && { ...bookChapterData, editors }),
      ...(publicationType === 'Monographs' && bookSubType === 'Book' && bookData),
      ...(publicationType === 'Any Other' && { details: otherDetails })
    }
    console.log('Saving data:', data)
    alert('Data saved successfully!')
  }

  const renderAuthors = () => (
    <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
        Author's Name<span style={{ color: '#d64550' }}>*</span>
      </label>
      {authors.map((author, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="First"
            value={author.first}
            onChange={(e) => updateAuthor(index, 'first', e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Middle"
            value={author.middle}
            onChange={(e) => updateAuthor(index, 'middle', e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Last"
            value={author.last}
            onChange={(e) => updateAuthor(index, 'last', e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          {authors.length > 1 && (
            <button
              onClick={() => removeAuthor(index)}
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
        onClick={addAuthor}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#5b8fc7',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '0.5rem'
        }}
      >
        <Plus size={16} />
        Add Author
      </button>
    </div>
  )

  const renderEditors = () => (
    <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
        Editor's Name<span style={{ color: '#d64550' }}>*</span>
      </label>
      {editors.map((editor, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="First"
            value={editor.first}
            onChange={(e) => updateEditor(index, 'first', e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Middle"
            value={editor.middle}
            onChange={(e) => updateEditor(index, 'middle', e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Last"
            value={editor.last}
            onChange={(e) => updateEditor(index, 'last', e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          {editors.length > 1 && (
            <button
              onClick={() => removeEditor(index)}
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
        onClick={addEditor}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#5b8fc7',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '0.5rem'
        }}
      >
        <Plus size={16} />
        Add Editor
      </button>
    </div>
  )

  const renderJournalForm = () => (
    <>
      {renderAuthors()}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Title of Paper<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={journalData.titleOfPaper}
            onChange={(e) => setJournalData({ ...journalData, titleOfPaper: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Year of Publication<span style={{ color: '#d64550' }}>*</span></label>
          <select
            value={journalData.yearOfPublication}
            onChange={(e) => setJournalData({ ...journalData, yearOfPublication: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            {Array.from({ length: 30 }, (_, i) => 2026 - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Name of Journal<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={journalData.nameOfJournal}
            onChange={(e) => setJournalData({ ...journalData, nameOfJournal: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Volume<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={journalData.volume}
            onChange={(e) => setJournalData({ ...journalData, volume: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Number<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={journalData.number}
            onChange={(e) => setJournalData({ ...journalData, number: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Pages<span style={{ color: '#d64550' }}>*</span></label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="From"
              value={journalData.pagesFrom}
              onChange={(e) => setJournalData({ ...journalData, pagesFrom: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="text"
              placeholder="To"
              value={journalData.pagesTo}
              onChange={(e) => setJournalData({ ...journalData, pagesTo: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>
    </>
  )

  const renderConferenceForm = () => (
    <>
      {renderAuthors()}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Title of Paper<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={conferenceData.titleOfPaper}
            onChange={(e) => setConferenceData({ ...conferenceData, titleOfPaper: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Full Name of Conference<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={conferenceData.fullNameOfConference}
            onChange={(e) => setConferenceData({ ...conferenceData, fullNameOfConference: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Abbreviation of Conference</label>
          <input
            type="text"
            value={conferenceData.abbreviation}
            onChange={(e) => setConferenceData({ ...conferenceData, abbreviation: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Date From<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="date"
            value={conferenceData.dateFrom}
            onChange={(e) => setConferenceData({ ...conferenceData, dateFrom: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Date To<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="date"
            value={conferenceData.dateTo}
            onChange={(e) => setConferenceData({ ...conferenceData, dateTo: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Type of Conference<span style={{ color: '#d64550' }}>*</span></label>
          <select
            value={conferenceData.typeOfConference}
            onChange={(e) => setConferenceData({ ...conferenceData, typeOfConference: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="International">International</option>
            <option value="National">National</option>
          </select>
        </div>
        
        <div className="form-field-vertical">
          <label>Pages<span style={{ color: '#d64550' }}>*</span></label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="From"
              value={conferenceData.pagesFrom}
              onChange={(e) => setConferenceData({ ...conferenceData, pagesFrom: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="text"
              placeholder="To"
              value={conferenceData.pagesTo}
              onChange={(e) => setConferenceData({ ...conferenceData, pagesTo: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
        <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#2c3e50' }}>Venue</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-field-vertical">
            <label>City<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={conferenceData.city}
              onChange={(e) => setConferenceData({ ...conferenceData, city: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-field-vertical">
            <label>State<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={conferenceData.state}
              onChange={(e) => setConferenceData({ ...conferenceData, state: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-field-vertical">
            <label>Country<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={conferenceData.country}
              onChange={(e) => setConferenceData({ ...conferenceData, country: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      <div className="form-field-vertical">
        <label>Publication Agency<span style={{ color: '#d64550' }}>*</span></label>
        <input
          type="text"
          value={conferenceData.publicationAgency}
          onChange={(e) => setConferenceData({ ...conferenceData, publicationAgency: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
    </>
  )

  const renderBookChapterForm = () => (
    <>
      {renderAuthors()}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Title of Paper<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={bookChapterData.titleOfPaper}
            onChange={(e) => setBookChapterData({ ...bookChapterData, titleOfPaper: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Year of Publication<span style={{ color: '#d64550' }}>*</span></label>
          <select
            value={bookChapterData.yearOfPublication}
            onChange={(e) => setBookChapterData({ ...bookChapterData, yearOfPublication: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            {Array.from({ length: 30 }, (_, i) => 2026 - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Title of Book<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={bookChapterData.titleOfBook}
            onChange={(e) => setBookChapterData({ ...bookChapterData, titleOfBook: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Pages<span style={{ color: '#d64550' }}>*</span></label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="From"
              value={bookChapterData.pagesFrom}
              onChange={(e) => setBookChapterData({ ...bookChapterData, pagesFrom: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="text"
              placeholder="To"
              value={bookChapterData.pagesTo}
              onChange={(e) => setBookChapterData({ ...bookChapterData, pagesTo: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
        <label>Publication Agency<span style={{ color: '#d64550' }}>*</span></label>
        <input
          type="text"
          value={bookChapterData.publicationAgency}
          onChange={(e) => setBookChapterData({ ...bookChapterData, publicationAgency: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>

      {renderEditors()}
    </>
  )

  const renderBookForm = () => (
    <>
      {renderAuthors()}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Title of Book<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={bookData.titleOfBook}
            onChange={(e) => setBookData({ ...bookData, titleOfBook: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div className="form-field-vertical">
          <label>Year of Publication<span style={{ color: '#d64550' }}>*</span></label>
          <select
            value={bookData.yearOfPublication}
            onChange={(e) => setBookData({ ...bookData, yearOfPublication: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            {Array.from({ length: 30 }, (_, i) => 2026 - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
        <label>Publication Agency<span style={{ color: '#d64550' }}>*</span></label>
        <input
          type="text"
          value={bookData.publicationAgency}
          onChange={(e) => setBookData({ ...bookData, publicationAgency: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>

      <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px' }}>
        <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#2c3e50' }}>Address of Agency<span style={{ color: '#d64550' }}>*</span></h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-field-vertical">
            <label>City<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={bookData.city}
              onChange={(e) => setBookData({ ...bookData, city: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-field-vertical">
            <label>State<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={bookData.state}
              onChange={(e) => setBookData({ ...bookData, state: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-field-vertical">
            <label>Country<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={bookData.country}
              onChange={(e) => setBookData({ ...bookData, country: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>
    </>
  )

  const renderAnyOtherForm = () => (
    <div className="form-field-vertical">
      <label>Details<span style={{ color: '#d64550' }}>*</span></label>
      <textarea
        rows="8"
        value={otherDetails}
        onChange={(e) => setOtherDetails(e.target.value)}
        placeholder="Provide details here"
        style={{ 
          width: '100%', 
          padding: '0.75rem', 
          border: '1px solid #ddd', 
          borderRadius: '4px',
          fontSize: '1rem',
          fontFamily: 'inherit'
        }}
      />
    </div>
  )

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Publications</h1>
          <p className="page-subtitle">Section 9: Research & Development - Research Publications</p>
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
              Select Publication Type<span style={{ color: '#d64550' }}>*</span>
            </label>
            <select
              value={publicationType}
              onChange={(e) => setPublicationType(e.target.value)}
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
              <option value="Monographs">a) Research Monographs / Books (not textbooks) and Book Chapters Published</option>
              <option value="Journal">b) Research Papers Published in Journals</option>
              <option value="Conference">c) Research Papers Published in Refereed Conference Proceedings</option>
              <option value="Any Other">d) Any other form of scholarly publications</option>
            </select>
          </div>

          {publicationType === 'Monographs' && (
            <div className="form-field-vertical" style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: '500', color: '#2c3e50' }}>
                Select Sub-Type<span style={{ color: '#d64550' }}>*</span>
              </label>
              <select
                value={bookSubType}
                onChange={(e) => setBookSubType(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Select Sub-Type --</option>
                <option value="Book Chapter">Book Chapter</option>
                <option value="Book">Book</option>
              </select>
            </div>
          )}

          {publicationType === 'Monographs' && bookSubType === 'Book Chapter' && renderBookChapterForm()}
          {publicationType === 'Monographs' && bookSubType === 'Book' && renderBookForm()}
          {publicationType === 'Journal' && renderJournalForm()}
          {publicationType === 'Conference' && renderConferenceForm()}
          {publicationType === 'Any Other' && renderAnyOtherForm()}

          {((publicationType === 'Monographs' && bookSubType) || (publicationType && publicationType !== 'Monographs')) && (
            <button
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#5cb85c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                marginTop: '2rem'
              }}
            >
              Save Publication
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResearchPublications

