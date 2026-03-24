import React, { useState } from 'react'
import { Save, Plus, X, Upload } from 'lucide-react'
import './FormPages.css'
import { publicationsService } from '../services/publicationsService'

const ResearchPublications = () => {
  const [publicationType, setPublicationType] = useState('')
  const [bookSubType, setBookSubType] = useState('')
  const [authors, setAuthors] = useState([{ first: '', middle: '', last: '' }])
  const [editors, setEditors] = useState([{ first: '', middle: '', last: '' }])
  const [loading, setLoading] = useState(false)

  const [journalData, setJournalData] = useState({
    titleOfPaper: '',
    quartile: '',
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

  const [bookEntries, setBookEntries] = useState([
    {
      authors: [{ first: '', middle: '', last: '' }],
      yearOfPublication: '2026',
      titleOfBook: '',
      pagesFrom: '',
      pagesTo: '',
      publicationAgency: '',
      editors: [{ first: '', middle: '', last: '' }],
      evidenceFile: null
    }
  ])
  const [textbookEntries, setTextbookEntries] = useState([
    {
      authors: [{ first: '', middle: '', last: '' }],
      titleOfBook: '',
      yearOfPublication: '2026',
      publicationAgency: '',
      city: '',
      state: '',
      country: '',
      evidenceFile: null
    }
  ])

  const [otherDetails, setOtherDetails] = useState('')
  const [evidenceFile, setEvidenceFile] = useState(null)

  const addAuthor = (bookIndex = null, textbookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookEntries]
      updatedEntries[bookIndex].authors.push({ first: '', middle: '', last: '' })
      setBookEntries(updatedEntries)
    } else if (textbookIndex !== null) {
      const updatedEntries = [...textbookEntries]
      updatedEntries[textbookIndex].authors.push({ first: '', middle: '', last: '' })
      setTextbookEntries(updatedEntries)
    } else {
      setAuthors([...authors, { first: '', middle: '', last: '' }])
    }
  }

  const removeAuthor = (index, bookIndex = null, textbookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookEntries]
      if (updatedEntries[bookIndex].authors.length > 1) {
        updatedEntries[bookIndex].authors = updatedEntries[bookIndex].authors.filter((_, i) => i !== index)
        setBookEntries(updatedEntries)
      }
    } else if (textbookIndex !== null) {
      const updatedEntries = [...textbookEntries]
      if (updatedEntries[textbookIndex].authors.length > 1) {
        updatedEntries[textbookIndex].authors = updatedEntries[textbookIndex].authors.filter((_, i) => i !== index)
        setTextbookEntries(updatedEntries)
      }
    } else {
      if (authors.length > 1) {
        setAuthors(authors.filter((_, i) => i !== index))
      }
    }
  }

  const updateAuthor = (index, field, value, bookIndex = null, textbookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookEntries]
      updatedEntries[bookIndex].authors[index][field] = value
      setBookEntries(updatedEntries)
    } else if (textbookIndex !== null) {
      const updatedEntries = [...textbookEntries]
      updatedEntries[textbookIndex].authors[index][field] = value
      setTextbookEntries(updatedEntries)
    } else {
      const updatedAuthors = authors.map((author, i) =>
        i === index ? { ...author, [field]: value } : author
      )
      setAuthors(updatedAuthors)
    }
  }

  const addEditor = (bookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookEntries]
      updatedEntries[bookIndex].editors.push({ first: '', middle: '', last: '' })
      setBookEntries(updatedEntries)
    } else {
      setEditors([...editors, { first: '', middle: '', last: '' }])
    }
  }

  const removeEditor = (index, bookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookEntries]
      if (updatedEntries[bookIndex].editors.length > 1) {
        updatedEntries[bookIndex].editors = updatedEntries[bookIndex].editors.filter((_, i) => i !== index)
        setBookEntries(updatedEntries)
      }
    } else {
      if (editors.length > 1) {
        setEditors(editors.filter((_, i) => i !== index))
      }
    }
  }

  const updateEditor = (index, field, value, bookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookEntries]
      updatedEntries[bookIndex].editors[index][field] = value
      setBookEntries(updatedEntries)
    } else {
      const updatedEditors = editors.map((editor, i) =>
        i === index ? { ...editor, [field]: value } : editor
      )
      setEditors(updatedEditors)
    }
  }

  const addBookEntry = () => {
    setBookEntries([...bookEntries, {
      authors: [{ first: '', middle: '', last: '' }],
      yearOfPublication: '2026',
      titleOfBook: '',
      pagesFrom: '',
      pagesTo: '',
      publicationAgency: '',
      editors: [{ first: '', middle: '', last: '' }],
      evidenceFile: null
    }])
  }

  const removeBookEntry = (index) => {
    if (bookEntries.length > 1) {
      setBookEntries(bookEntries.filter((_, i) => i !== index))
    }
  }

  const updateBookEntryField = (index, field, value) => {
    const updatedEntries = [...bookEntries]
    updatedEntries[index][field] = value
    setBookEntries(updatedEntries)
  }

  const addTextbookEntry = () => {
    setTextbookEntries([...textbookEntries, {
      authors: [{ first: '', middle: '', last: '' }],
      titleOfBook: '',
      yearOfPublication: '2026',
      publicationAgency: '',
      city: '',
      state: '',
      country: '',
      evidenceFile: null
    }])
  }

  const removeTextbookEntry = (index) => {
    if (textbookEntries.length > 1) {
      setTextbookEntries(textbookEntries.filter((_, i) => i !== index))
    }
  }

  const updateTextbookEntryField = (index, field, value) => {
    const updatedEntries = [...textbookEntries]
    updatedEntries[index][field] = value
    setTextbookEntries(updatedEntries)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = 1 // TODO: Replace with actual logged-in faculty ID

      let publicationData = {
        faculty_id: facultyId,
        publication_type: publicationType,
        authors: authors
      }

      // Add type-specific data
      if (publicationType === 'Journal') {
        publicationData = {
          ...publicationData,
          title: journalData.titleOfPaper,
          quartile: journalData.quartile,
          year_of_publication: journalData.yearOfPublication,
          journal_name: journalData.nameOfJournal,
          volume: journalData.volume,
          number: journalData.number,
          pages_from: journalData.pagesFrom,
          pages_to: journalData.pagesTo
        }
      } else if (publicationType === 'Conference') {
        publicationData = {
          ...publicationData,
          title: conferenceData.titleOfPaper,
          conference_name: conferenceData.fullNameOfConference,
          abbreviation: conferenceData.abbreviation,
          date_from: conferenceData.dateFrom,
          date_to: conferenceData.dateTo,
          type_of_conference: conferenceData.typeOfConference,
          pages_from: conferenceData.pagesFrom,
          pages_to: conferenceData.pagesTo,
          city: conferenceData.city,
          state: conferenceData.state,
          country: conferenceData.country,
          publication_agency: conferenceData.publicationAgency
        }
      } else if (publicationType === 'Monographs') {
        publicationData.sub_type = bookSubType
        if (bookSubType === 'Book Chapter') {
          // Save multiple books
          for (const entry of bookEntries) {
            const entryData = {
              ...publicationData,
              authors: entry.authors,
              year_of_publication: entry.yearOfPublication,
              title_of_book: entry.titleOfBook,
              pages_from: entry.pagesFrom,
              pages_to: entry.pagesTo,
              publication_agency: entry.publicationAgency,
              editors: entry.editors
            }
            await publicationsService.createPublication(entryData)
          }
          alert('All books saved successfully!')
          setLoading(false)
          // Reset
          setPublicationType('')
          setBookEntries([{
            authors: [{ first: '', middle: '', last: '' }],
            yearOfPublication: '2026',
            titleOfBook: '',
            pagesFrom: '',
            pagesTo: '',
            publicationAgency: '',
            editors: [{ first: '', middle: '', last: '' }],
            evidenceFile: null
          }])
          return
        } else if (bookSubType === 'Book') {
          // Save multiple textbooks
          for (const entry of textbookEntries) {
            const entryData = {
              ...publicationData,
              authors: entry.authors,
              title_of_book: entry.titleOfBook,
              year_of_publication: entry.yearOfPublication,
              publication_agency: entry.publicationAgency,
              city: entry.city,
              state: entry.state,
              country: entry.country
            }
            await publicationsService.createPublication(entryData)
          }
          alert('All textbooks saved successfully!')
          setLoading(false)
          // Reset
          setPublicationType('')
          setTextbookEntries([{
            authors: [{ first: '', middle: '', last: '' }],
            titleOfBook: '',
            yearOfPublication: '2026',
            publicationAgency: '',
            city: '',
            state: '',
            country: '',
            evidenceFile: null
          }])
          return
        }
      } else if (publicationType === 'Any Other') {
        publicationData.details = otherDetails
      }

      await publicationsService.createPublication(publicationData)

      alert('Publication saved successfully!')
      console.log('Saved publication to database')

      // Reset form
      setPublicationType('')
      setBookSubType('')
      setAuthors([{ first: '', middle: '', last: '' }])
      setEditors([{ first: '', middle: '', last: '' }])
    } catch (error) {
      console.error('Error saving publication:', error)
      alert('Error saving publication: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const renderAuthors = (currentAuthors, bookIndex = null, textbookIndex = null) => (
    <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
        Author's Name<span style={{ color: '#d64550' }}>*</span>
      </label>
      {currentAuthors.map((author, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="First"
            value={author.first}
            onChange={(e) => updateAuthor(index, 'first', e.target.value, bookIndex, textbookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Middle"
            value={author.middle}
            onChange={(e) => updateAuthor(index, 'middle', e.target.value, bookIndex, textbookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Last"
            value={author.last}
            onChange={(e) => updateAuthor(index, 'last', e.target.value, bookIndex, textbookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          {currentAuthors.length > 1 && (
            <button
              onClick={() => removeAuthor(index, bookIndex, textbookIndex)}
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
        onClick={() => addAuthor(bookIndex, textbookIndex)}
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

  const renderEditors = (currentEditors, bookIndex = null) => (
    <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
        Editor's Name<span style={{ color: '#d64550' }}>*</span>
      </label>
      {currentEditors.map((editor, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="First"
            value={editor.first}
            onChange={(e) => updateEditor(index, 'first', e.target.value, bookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Middle"
            value={editor.middle}
            onChange={(e) => updateEditor(index, 'middle', e.target.value, bookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Last"
            value={editor.last}
            onChange={(e) => updateEditor(index, 'last', e.target.value, bookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          {currentEditors.length > 1 && (
            <button
              onClick={() => removeEditor(index, bookIndex)}
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
        onClick={() => addEditor(bookIndex)}
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
      {renderAuthors(authors)}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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
          <label>Quartile</label>
          <select
            value={journalData.quartile}
            onChange={(e) => setJournalData({ ...journalData, quartile: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">Select Quartile</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
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

      {/* Evidence File Upload */}
      <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
        <label>Upload Evidence</label>
        <div style={{
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '1.5rem',
          textAlign: 'center',
          backgroundColor: '#f9f9f9'
        }}>
          <input
            type="file"
            id="evidence-upload-journal"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setEvidenceFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="evidence-upload-journal"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Upload size={32} color="#5b8fc7" />
            <span style={{ color: '#5b8fc7', fontWeight: '500' }}>
              {evidenceFile ? evidenceFile.name : 'Click to upload or drag and drop'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>
              PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
            </span>
          </label>
        </div>
      </div>
    </>
  )

  const renderConferenceForm = () => (
    <>
      {renderAuthors(authors)}

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

      {/* Evidence File Upload */}
      <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
        <label>Upload Evidence</label>
        <div style={{
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '1.5rem',
          textAlign: 'center',
          backgroundColor: '#f9f9f9'
        }}>
          <input
            type="file"
            id="evidence-upload-conference"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setEvidenceFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="evidence-upload-conference"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Upload size={32} color="#5b8fc7" />
            <span style={{ color: '#5b8fc7', fontWeight: '500' }}>
              {evidenceFile ? evidenceFile.name : 'Click to upload or drag and drop'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>
              PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
            </span>
          </label>
        </div>
      </div>
    </>
  )

  const renderBookChapterForm = () => (
    <>
      {bookEntries.map((entry, index) => (
        <div key={index} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fdfdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Book Entry #{index + 1}</h3>
            {bookEntries.length > 1 && (
              <button
                onClick={() => removeBookEntry(index)}
                style={{ padding: '0.4rem', color: '#ff4444', cursor: 'pointer', background: 'none', border: '1px solid #ff4444', borderRadius: '4px' }}
              >
                <X size={16} /> Remove Book
              </button>
            )}
          </div>

          {renderAuthors(entry.authors, index)}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Title of Book<span style={{ color: '#d64550' }}>*</span></label>
              <input
                type="text"
                value={entry.titleOfBook}
                onChange={(e) => updateBookEntryField(index, 'titleOfBook', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div className="form-field-vertical">
              <label>Year of Publication<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={entry.yearOfPublication}
                onChange={(e) => updateBookEntryField(index, 'yearOfPublication', e.target.value)}
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
              <label>Publication Agency<span style={{ color: '#d64550' }}>*</span></label>
              <input
                type="text"
                value={entry.publicationAgency}
                onChange={(e) => updateBookEntryField(index, 'publicationAgency', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div className="form-field-vertical">
              <label>Pages<span style={{ color: '#d64550' }}>*</span></label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="From"
                  value={entry.pagesFrom}
                  onChange={(e) => updateBookEntryField(index, 'pagesFrom', e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="To"
                  value={entry.pagesTo}
                  onChange={(e) => updateBookEntryField(index, 'pagesTo', e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* Evidence File Upload (Specific to entry) */}
          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Upload Evidence</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <input
                type="file"
                id={`evidence-upload-book-${index}`}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => updateBookEntryField(index, 'evidenceFile', e.target.files[0])}
                style={{ display: 'none' }}
              />
              <label
                htmlFor={`evidence-upload-book-${index}`}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}
              >
                <Upload size={24} color="#5b8fc7" />
                <span style={{ color: '#5b8fc7', fontSize: '0.9rem' }}>
                  {entry.evidenceFile ? entry.evidenceFile.name : 'Click to upload'}
                </span>
              </label>
            </div>
          </div>

          {renderEditors(entry.editors, index)}
        </div>
      ))}

      <button
        onClick={addBookEntry}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#5cb85c',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1rem',
          marginBottom: '2rem'
        }}
      >
        <Plus size={18} />
        Add Another Book
      </button>
    </>
  )

  const renderBookForm = () => (
    <>
      {textbookEntries.map((entry, index) => (
        <div key={index} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fdfdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Textbook Entry #{index + 1}</h3>
            {textbookEntries.length > 1 && (
              <button
                onClick={() => removeTextbookEntry(index)}
                style={{ padding: '0.4rem', color: '#ff4444', cursor: 'pointer', background: 'none', border: '1px solid #ff4444', borderRadius: '4px' }}
              >
                <X size={16} /> Remove Textbook
              </button>
            )}
          </div>

          {renderAuthors(entry.authors, null, index)}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Title of Textbook<span style={{ color: '#d64550' }}>*</span></label>
              <input
                type="text"
                value={entry.titleOfBook}
                onChange={(e) => updateTextbookEntryField(index, 'titleOfBook', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div className="form-field-vertical">
              <label>Year of Publication<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={entry.yearOfPublication}
                onChange={(e) => updateTextbookEntryField(index, 'yearOfPublication', e.target.value)}
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
              value={entry.publicationAgency}
              onChange={(e) => updateTextbookEntryField(index, 'publicationAgency', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#2c3e50' }}>Address of Agency<span style={{ color: '#d64550' }}>*</span></h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-field-vertical">
                <label>City<span style={{ color: '#d64550' }}>*</span></label>
                <input
                  type="text"
                  value={entry.city}
                  onChange={(e) => updateTextbookEntryField(index, 'city', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div className="form-field-vertical">
                <label>State<span style={{ color: '#d64550' }}>*</span></label>
                <input
                  type="text"
                  value={entry.state}
                  onChange={(e) => updateTextbookEntryField(index, 'state', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div className="form-field-vertical">
                <label>Country<span style={{ color: '#d64550' }}>*</span></label>
                <input
                  type="text"
                  value={entry.country}
                  onChange={(e) => updateTextbookEntryField(index, 'country', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* Evidence File Upload (Specific to entry) */}
          <div className="form-field-vertical">
            <label>Upload Evidence</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <input
                type="file"
                id={`evidence-upload-textbook-${index}`}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => updateTextbookEntryField(index, 'evidenceFile', e.target.files[0])}
                style={{ display: 'none' }}
              />
              <label
                htmlFor={`evidence-upload-textbook-${index}`}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}
              >
                <Upload size={24} color="#5b8fc7" />
                <span style={{ color: '#5b8fc7', fontSize: '0.9rem' }}>
                  {entry.evidenceFile ? entry.evidenceFile.name : 'Click to upload'}
                </span>
              </label>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addTextbookEntry}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#5cb85c',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1rem',
          marginBottom: '2rem'
        }}
      >
        <Plus size={18} />
        Add Another Textbook
      </button>
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

      {/* Evidence File Upload */}
      <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
        <label>Upload Evidence</label>
        <div style={{
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '1.5rem',
          textAlign: 'center',
          backgroundColor: '#f9f9f9'
        }}>
          <input
            type="file"
            id="evidence-upload-other"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setEvidenceFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="evidence-upload-other"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Upload size={32} color="#5b8fc7" />
            <span style={{ color: '#5b8fc7', fontWeight: '500' }}>
              {evidenceFile ? evidenceFile.name : 'Click to upload or drag and drop'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>
              PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
            </span>
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Publications</h1>
          <p className="page-subtitle">Section 9: Research & Development - Research Publications</p>
        </div>
        <button className="save-button" onClick={handleSave} disabled={loading}>
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Changes'}
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
              <option value="Monographs">a) Research Monographs / Book / Textbooks Published</option>
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
                <option value="Book Chapter">Book</option>
                <option value="Book">Textbook Published</option>
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

