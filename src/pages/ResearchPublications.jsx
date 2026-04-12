import React, { useState, useEffect } from 'react'
import { Plus, X, Upload, ExternalLink } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import { publicationsService } from '../services/publicationsService'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'

const isNotFoundError = (error) => error?.response?.status === 404

const deleteIgnoringNotFound = async (deleteFn, ids) => {
  const validIds = (ids || []).filter((id) => Number.isFinite(Number(id)))
  const results = await Promise.allSettled(validIds.map((id) => deleteFn(id)))

  const firstRealError = results.find(
    (result) => result.status === 'rejected' && !isNotFoundError(result.reason)
  )

  if (firstRealError) {
    throw firstRealError.reason
  }
}

const getEmptyAuthor = () => ({ first: '', middle: '', last: '' })

const getEmptyBookChapterEntry = () => ({
  authors: [getEmptyAuthor()],
  yearOfPublication: '2026',
  titleOfBook: '',
  pagesFrom: '',
  pagesTo: '',
  publicationAgency: '',
  editors: [getEmptyAuthor()],
  evidenceFile: null,
  evidence_file: null
})

const getEmptyTextbookEntry = () => ({
  authors: [getEmptyAuthor()],
  titleOfBook: '',
  yearOfPublication: '2026',
  publicationAgency: '',
  city: '',
  state: '',
  country: '',
  evidenceFile: null,
  evidence_file: null
})

const byLatest = (a, b) => {
  const bTs = b?.created_at ? new Date(b.created_at).getTime() : Number(b?.id || 0)
  const aTs = a?.created_at ? new Date(a.created_at).getTime() : Number(a?.id || 0)
  return bTs - aTs
}

const normalizePeople = (value) => {
  const parsed = typeof value === 'string'
    ? (() => {
        try {
          const json = JSON.parse(value)
          return Array.isArray(json) ? json : []
        } catch (_) {
          return []
        }
      })()
    : (Array.isArray(value) ? value : [])

  const normalized = parsed.map((person) => ({
    first: person?.first ?? person?.firstName ?? person?.first_name ?? '',
    middle: person?.middle ?? person?.middleName ?? person?.middle_name ?? '',
    last: person?.last ?? person?.lastName ?? person?.last_name ?? ''
  }))

  return normalized.length > 0 ? normalized : [{ first: '', middle: '', last: '' }]
}

const ResearchPublications = ({ initialData, readOnly }) => {
  const { user } = useAuth()
  const [publicationId, setPublicationId] = useState(null) // Track if editing existing publication
  const [allPublications, setAllPublications] = useState([])
  const [publicationType, setPublicationType] = useState('')
  const [bookSubType, setBookSubType] = useState('')
  const [authors, setAuthors] = useState([getEmptyAuthor()])
  const [editors, setEditors] = useState([getEmptyAuthor()])
  const [loading, setLoading] = useState(false)

  const hydrateFromPublication = (data, options = { updateSelectors: false }) => {
    if (!data) return

    setPublicationId(data.id || null) // Store ID to prevent duplicate creation
    if (options.updateSelectors) {
      setPublicationType(data.publication_type || '')
      setBookSubType(data.sub_type || '')
    }

    setAuthors(normalizePeople(data.authors))
    setEditors(normalizePeople(data.editors))

    setPersistedEvidenceFile(data.evidence_file || '')
    setEvidenceFile(null)

    if (data.publication_type === 'Journal') {
      setJournalData({
        titleOfPaper: data.title || '',
        quartile: data.quartile || '',
        yearOfPublication: data.year_of_publication || '2026',
        nameOfJournal: data.journal_name || '',
        volume: data.volume || '',
        number: data.number || '',
        pagesFrom: data.pages_from || '',
        pagesTo: data.pages_to || ''
      })
    } else if (data.publication_type === 'Conference') {
      setConferenceData({
        titleOfPaper: data.title || '',
        fullNameOfConference: data.conference_name || '',
        abbreviation: data.abbreviation || '',
        dateFrom: data.date_from ? data.date_from.split('T')[0] : '',
        dateTo: data.date_to ? data.date_to.split('T')[0] : '',
        typeOfConference: data.type_of_conference || 'International',
        pagesFrom: data.pages_from || '',
        pagesTo: data.pages_to || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        publicationAgency: data.publication_agency || ''
      })
    } else if (data.publication_type === 'Monographs') {
      if (data.sub_type === 'Book Chapter') {
        setBookChapterEntries([{
          authors: normalizePeople(data.authors),
          editors: normalizePeople(data.editors),
          titleOfBook: data.title || '',
          yearOfPublication: data.year_of_publication || '2026',
          publicationAgency: data.publication_agency || '',
          pagesFrom: data.pages_from || '',
          pagesTo: data.pages_to || '',
          evidence_file: data.evidence_file
        }])
      } else if (data.sub_type === 'Book') {
        setTextbookEntries([{
          authors: normalizePeople(data.authors),
          titleOfBook: data.title || '',
          yearOfPublication: data.year_of_publication || '2026',
          publicationAgency: data.publication_agency || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          evidence_file: data.evidence_file
        }])
      }
    } else if (data.publication_type === 'Any Other') {
      setOtherDetails(data.details || '')
    }
  }

  useEffect(() => {
    if (!initialData) return
    const rows = Array.isArray(initialData) ? initialData : [initialData]
    setAllPublications(rows)
  }, [initialData])

  useEffect(() => {
    // For editable mode, show latest saved publication to avoid blank form after sent_back unlock.
    if (readOnly || initialData || !user?.id) return

    const loadAllPublications = async () => {
      try {
        const res = await publicationsService.getPublicationsByFaculty(user.id)
        const publications = Array.isArray(res?.data) ? res.data : []
        setAllPublications(publications)
      } catch (error) {
        console.error('Failed to load existing publications:', error)
      }
    }

    loadAllPublications()
  }, [initialData, readOnly, user])

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

  const [bookChapterEntries, setBookChapterEntries] = useState([getEmptyBookChapterEntry()])
  const [textbookEntries, setTextbookEntries] = useState([getEmptyTextbookEntry()])

  const [otherDetails, setOtherDetails] = useState('')
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [persistedEvidenceFile, setPersistedEvidenceFile] = useState('')

  useEffect(() => {
    if (!publicationType) {
      setPublicationId(null)
      return
    }

    const rows = Array.isArray(allPublications) ? allPublications : []

    if (publicationType === 'Journal') {
      const match = [...rows].filter((p) => p.publication_type === 'Journal').sort(byLatest)[0]
      if (match) {
        hydrateFromPublication(match, { updateSelectors: false })
      } else {
        setPublicationId(null)
        setAuthors([getEmptyAuthor()])
        setEditors([getEmptyAuthor()])
        setJournalData({
          titleOfPaper: '', quartile: '', yearOfPublication: '2026', nameOfJournal: '', volume: '', number: '', pagesFrom: '', pagesTo: ''
        })
        setEvidenceFile(null)
        setPersistedEvidenceFile('')
      }
      return
    }

    if (publicationType === 'Conference') {
      const match = [...rows].filter((p) => p.publication_type === 'Conference').sort(byLatest)[0]
      if (match) {
        hydrateFromPublication(match, { updateSelectors: false })
      } else {
        setPublicationId(null)
        setAuthors([getEmptyAuthor()])
        setEditors([getEmptyAuthor()])
        setConferenceData({
          titleOfPaper: '', fullNameOfConference: '', abbreviation: '', dateFrom: '', dateTo: '', typeOfConference: 'International', pagesFrom: '', pagesTo: '', city: '', state: '', country: '', publicationAgency: ''
        })
        setEvidenceFile(null)
        setPersistedEvidenceFile('')
      }
      return
    }

    if (publicationType === 'Any Other') {
      const match = [...rows]
        .filter((p) => p.publication_type === 'Any Other' || p.sub_type === 'Other')
        .sort(byLatest)[0]
      if (match) {
        hydrateFromPublication(match, { updateSelectors: false })
      } else {
        setPublicationId(null)
        setOtherDetails('')
        setEvidenceFile(null)
        setPersistedEvidenceFile('')
      }
      return
    }

    if (publicationType === 'Monographs') {
      setPublicationId(null)
      setEvidenceFile(null)
      setPersistedEvidenceFile('')
      if (!bookSubType) return

      const monographs = rows.filter(
        (p) => p.publication_type === 'Monographs' && p.sub_type === bookSubType
      )

      if (bookSubType === 'Book Chapter') {
        setBookChapterEntries(
          monographs.length > 0
            ? monographs.map((entry) => ({
                authors: normalizePeople(entry.authors),
                editors: normalizePeople(entry.editors),
                titleOfBook: entry.title || '',
                yearOfPublication: entry.year_of_publication || '2026',
                publicationAgency: entry.publication_agency || '',
                pagesFrom: entry.pages_from || '',
                pagesTo: entry.pages_to || '',
                evidenceFile: null,
                evidence_file: entry.evidence_file || null
              }))
            : [getEmptyBookChapterEntry()]
        )
      }

      if (bookSubType === 'Book') {
        setTextbookEntries(
          monographs.length > 0
            ? monographs.map((entry) => ({
                authors: normalizePeople(entry.authors),
                titleOfBook: entry.title || '',
                yearOfPublication: entry.year_of_publication || '2026',
                publicationAgency: entry.publication_agency || '',
                city: entry.city || '',
                state: entry.state || '',
                country: entry.country || '',
                evidenceFile: null,
                evidence_file: entry.evidence_file || null
              }))
            : [getEmptyTextbookEntry()]
        )
      }
    }
  }, [publicationType, bookSubType, allPublications])

  const resolveEvidencePayload = (fileValue, existingFileValue = '') => {
    if (typeof File !== 'undefined' && fileValue instanceof File) {
      return {
        evidence_file: fileValue,
        existing_evidence_file: null
      }
    }

    const existing = typeof fileValue === 'string' && fileValue.trim()
      ? fileValue
      : (existingFileValue || '')

    return {
      evidence_file: null,
      existing_evidence_file: existing || null
    }
  }

  const addAuthor = (bookIndex = null, textbookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].authors.push({ first: '', middle: '', last: '' })
      setBookChapterEntries(updatedEntries)
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
      const updatedEntries = [...bookChapterEntries]
      if (updatedEntries[bookIndex].authors.length > 1) {
        updatedEntries[bookIndex].authors = updatedEntries[bookIndex].authors.filter((_, i) => i !== index)
        setBookChapterEntries(updatedEntries)
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
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].authors[index][field] = value
      setBookChapterEntries(updatedEntries)
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
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].editors.push({ first: '', middle: '', last: '' })
      setBookChapterEntries(updatedEntries)
    } else {
      setEditors([...editors, { first: '', middle: '', last: '' }])
    }
  }

  const removeEditor = (index, bookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      if (updatedEntries[bookIndex].editors.length > 1) {
        updatedEntries[bookIndex].editors = updatedEntries[bookIndex].editors.filter((_, i) => i !== index)
        setBookChapterEntries(updatedEntries)
      }
    } else {
      if (editors.length > 1) {
        setEditors(editors.filter((_, i) => i !== index))
      }
    }
  }

  const updateEditor = (index, field, value, bookIndex = null) => {
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].editors[index][field] = value
      setBookChapterEntries(updatedEntries)
    } else {
      const updatedEditors = editors.map((editor, i) =>
        i === index ? { ...editor, [field]: value } : editor
      )
      setEditors(updatedEditors)
    }
  }

  const addBookChapterEntry = () => {
    setBookChapterEntries([...bookChapterEntries, {
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

  const removeBookChapterEntry = (index) => {
    if (bookChapterEntries.length > 1) {
      setBookChapterEntries(bookChapterEntries.filter((_, i) => i !== index))
    }
  }

  const updateBookEntryField = (index, field, value) => {
    const updatedEntries = [...bookChapterEntries]
    updatedEntries[index][field] = value
    setBookChapterEntries(updatedEntries)
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

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    setLoading(true)
    const createdIds = []
    try {
      const facultyId = user?.id
      if (!facultyId) {
        alert('Unable to identify logged-in faculty. Please login again.')
        return false
      }

      if (publicationType === 'Conference' && (!conferenceData.dateFrom || !conferenceData.dateTo)) {
        alert('Date From and Date To are required for conference publications.')
        return false
      }

      if (publicationType === 'Monographs' && !bookSubType) {
        alert('Please select a monograph sub-type before saving.')
        return false
      }

      const refreshPublications = async () => {
        const res = await publicationsService.getPublicationsByFaculty(facultyId)
        setAllPublications(Array.isArray(res?.data) ? res.data : [])
      }

      const createAndTrack = async (payload) => {
        const response = await publicationsService.createPublication(payload)
        const createdId = response?.data?.id
        if (Number.isFinite(Number(createdId))) {
          createdIds.push(createdId)
        }
        return response
      }

      const hasAuthorValue = (list = []) => list.some((p) => p.first || p.middle || p.last)

      const matchesCurrentSelection = (row) => {
        if (!row) return false
        if (publicationType === 'Journal') return row.publication_type === 'Journal'
        if (publicationType === 'Conference') return row.publication_type === 'Conference'
        if (publicationType === 'Any Other') {
          return row.publication_type === 'Any Other' || row.sub_type === 'Other'
        }
        if (publicationType === 'Monographs') {
          return row.publication_type === 'Monographs' && row.sub_type === bookSubType
        }
        return false
      }

      if (!publicationType) {
        alert('Please select a publication type.')
        return false
      }

      const idsToDelete = (Array.isArray(allPublications) ? allPublications : [])
        .filter(matchesCurrentSelection)
        .map((row) => row.id)
        .filter(Boolean)

      const publicationData = {
        faculty_id: facultyId,
        publication_type: publicationType,
        status: 'draft'
      }

      if (publicationType === 'Journal') {
        if (!hasAuthorValue(authors) || !journalData.titleOfPaper || !journalData.nameOfJournal || !journalData.yearOfPublication) {
          alert('Please complete required Journal fields: Authors, Title, Journal Name, Year of Publication.')
          return false
        }

        const evidencePayload = resolveEvidencePayload(evidenceFile, persistedEvidenceFile)
        publicationData.sub_type = 'Journal'
        publicationData.title = journalData.titleOfPaper
        publicationData.journal_name = journalData.nameOfJournal
        publicationData.volume = journalData.volume
        publicationData.number = journalData.number
        publicationData.pages_from = journalData.pagesFrom
        publicationData.pages_to = journalData.pagesTo
        publicationData.year_of_publication = journalData.yearOfPublication
        publicationData.quartile = journalData.quartile
        publicationData.authors = authors
        publicationData.evidence_file = evidencePayload.evidence_file
        publicationData.existing_evidence_file = evidencePayload.existing_evidence_file

        const response = await createAndTrack(publicationData)
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        alert('Journal draft saved successfully!')
        setPublicationId(response?.data?.id || null)
        return true
      } else if (publicationType === 'Conference') {
        if (!hasAuthorValue(authors) || !conferenceData.titleOfPaper || !conferenceData.fullNameOfConference) {
          alert('Please complete required Conference fields: Authors, Title, Full Conference Name.')
          return false
        }

        const evidencePayload = resolveEvidencePayload(evidenceFile, persistedEvidenceFile)
        publicationData.sub_type = 'Conference'
        publicationData.title = conferenceData.titleOfPaper
        publicationData.conference_name = conferenceData.fullNameOfConference
        publicationData.abbreviation = conferenceData.abbreviation
        publicationData.date_from = conferenceData.dateFrom || null
        publicationData.date_to = conferenceData.dateTo || null
        publicationData.type_of_conference = conferenceData.typeOfConference
        publicationData.pages_from = conferenceData.pagesFrom
        publicationData.pages_to = conferenceData.pagesTo
        publicationData.city = conferenceData.city
        publicationData.state = conferenceData.state
        publicationData.country = conferenceData.country
        publicationData.publication_agency = conferenceData.publicationAgency
        publicationData.authors = authors
        publicationData.evidence_file = evidencePayload.evidence_file
        publicationData.existing_evidence_file = evidencePayload.existing_evidence_file

        const response = await createAndTrack(publicationData)
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        alert('Conference draft saved successfully!')
        setPublicationId(response?.data?.id || null)
        return true
      } else if (publicationType === 'Monographs') {
        if (!bookSubType) {
          alert('Please select a monograph sub-type before saving.')
          return false
        }

        publicationData.sub_type = bookSubType
        if (bookSubType === 'Book Chapter') {
          for (const entry of bookChapterEntries) {
            if (!hasAuthorValue(entry.authors) || !entry.titleOfBook || !entry.yearOfPublication || !entry.publicationAgency) {
              alert('Please complete required Book Chapter fields in every entry: Authors, Title, Year, Publication Agency.')
              return false
            }

            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file)
            const entryData = {
              ...publicationData,
              authors: entry.authors,
              year_of_publication: entry.yearOfPublication,
              title: entry.titleOfBook,
              pages_from: entry.pagesFrom,
              pages_to: entry.pagesTo,
              publication_agency: entry.publicationAgency,
              editors: entry.editors,
              evidence_file: evidencePayload.evidence_file,
              existing_evidence_file: evidencePayload.existing_evidence_file
            }
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          alert('Book chapter drafts saved successfully!')
          setPublicationId(null)
          return true
        } else if (bookSubType === 'Book') {
          for (const entry of textbookEntries) {
            if (!hasAuthorValue(entry.authors) || !entry.titleOfBook || !entry.yearOfPublication || !entry.publicationAgency || !entry.city || !entry.state || !entry.country) {
              alert('Please complete required Book fields in every entry: Authors, Title, Year, Publication Agency, City, State, Country.')
              return false
            }

            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file)
            const entryData = {
              ...publicationData,
              authors: entry.authors,
              year_of_publication: entry.yearOfPublication,
              title: entry.titleOfBook,
              publication_agency: entry.publicationAgency,
              city: entry.city,
              state: entry.state,
              country: entry.country,
              evidence_file: evidencePayload.evidence_file,
              existing_evidence_file: evidencePayload.existing_evidence_file
            }
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          alert('Book drafts saved successfully!')
          setPublicationId(null)
          return true
        }
      } else if (publicationType === 'Any Other') {
        if (!otherDetails || !otherDetails.trim()) {
          alert('Please provide details for Any Other publication type.')
          return false
        }

        const evidencePayload = resolveEvidencePayload(evidenceFile, persistedEvidenceFile)
        publicationData.sub_type = 'Other'
        publicationData.details = otherDetails
        publicationData.evidence_file = evidencePayload.evidence_file
        publicationData.existing_evidence_file = evidencePayload.existing_evidence_file

        const response = await createAndTrack(publicationData)
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        alert('Draft saved successfully!')
        setPublicationId(response?.data?.id || null)
        return true
      }
    } catch (error) {
      if (createdIds.length > 0) {
        await Promise.allSettled(createdIds.map((id) => publicationsService.deletePublication(id)))
      }
      console.error('Error saving publication:', error)
      alert('Failed to save publication. Error: ' + error.message)
      return false
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
            style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
          <input
            type="text"
            placeholder="Middle"
            value={author.middle}
            onChange={(e) => updateAuthor(index, 'middle', e.target.value, bookIndex, textbookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
          <input
            type="text"
            placeholder="Last"
            value={author.last}
            onChange={(e) => updateAuthor(index, 'last', e.target.value, bookIndex, textbookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
          {!readOnly && currentAuthors.length > 1 && (
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
      {!readOnly && (
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
      )}
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
            style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
          <input
            type="text"
            placeholder="Middle"
            value={editor.middle}
            onChange={(e) => updateEditor(index, 'middle', e.target.value, bookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
          <input
            type="text"
            placeholder="Last"
            value={editor.last}
            onChange={(e) => updateEditor(index, 'last', e.target.value, bookIndex)}
            style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
          {!readOnly && currentEditors.length > 1 && (
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
      {!readOnly && (
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
      )}
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
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-vertical">
          <label>Quartile</label>
          <select
            value={journalData.quartile}
            onChange={(e) => setJournalData({ ...journalData, quartile: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
            disabled={readOnly}
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
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
            disabled={readOnly}
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
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-vertical">
          <label>Volume<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={journalData.volume}
            onChange={(e) => setJournalData({ ...journalData, volume: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
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
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
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
              style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
            />
            <input
              type="text"
              placeholder="To"
              value={journalData.pagesTo}
              onChange={(e) => setJournalData({ ...journalData, pagesTo: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {readOnly ? (
        initialData?.evidence_file && (
          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Evidence</label>
            <a
              href={`http://${window.location.hostname}:5000/uploads/${initialData.evidence_file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="evidence-link"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
            >
              <ExternalLink size={18} /> View Journal Paper Evidence
            </a>
          </div>
        )
      ) : (
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
                {evidenceFile?.name || persistedEvidenceFile || 'Click to upload or drag and drop'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
              </span>
              <FilePreviewButton file={evidenceFile || persistedEvidenceFile} style={{ width: '32px', height: '32px' }} />
              {(evidenceFile || persistedEvidenceFile) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setEvidenceFile(null)
                    setPersistedEvidenceFile('')
                  }}
                  title="Remove uploaded document"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid #d1d8e0',
                    borderRadius: '6px',
                    background: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>
      )}
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
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-vertical">
          <label>Full Name of Conference<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="text"
            value={conferenceData.fullNameOfConference}
            onChange={(e) => setConferenceData({ ...conferenceData, fullNameOfConference: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
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
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-vertical">
          <label>Date From<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="date"
            value={conferenceData.dateFrom}
            onChange={(e) => setConferenceData({ ...conferenceData, dateFrom: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-vertical">
          <label>Date To<span style={{ color: '#d64550' }}>*</span></label>
          <input
            type="date"
            value={conferenceData.dateTo}
            onChange={(e) => setConferenceData({ ...conferenceData, dateTo: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
            disabled={readOnly}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-field-vertical">
          <label>Type of Conference<span style={{ color: '#d64550' }}>*</span></label>
          <select
            value={conferenceData.typeOfConference}
            onChange={(e) => setConferenceData({ ...conferenceData, typeOfConference: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
            disabled={readOnly}
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
              style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
            />
            <input
              type="text"
              placeholder="To"
              value={conferenceData.pagesTo}
              onChange={(e) => setConferenceData({ ...conferenceData, pagesTo: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
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
              style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
            />
          </div>

          <div className="form-field-vertical">
            <label>State<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={conferenceData.state}
              onChange={(e) => setConferenceData({ ...conferenceData, state: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
            />
          </div>

          <div className="form-field-vertical">
            <label>Country<span style={{ color: '#d64550' }}>*</span></label>
            <input
              type="text"
              value={conferenceData.country}
              onChange={(e) => setConferenceData({ ...conferenceData, country: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
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
          style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
          disabled={readOnly}
        />
      </div>

      {readOnly ? (
        initialData?.evidence_file && (
          <div className="form-field-vertical" style={{ marginTop: '1.5rem' }}>
            <label>Evidence</label>
            <a
              href={`http://${window.location.hostname}:5000/uploads/${initialData.evidence_file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="evidence-link"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
            >
              <ExternalLink size={18} /> View Conference Paper Evidence
            </a>
          </div>
        )
      ) : (
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
                {evidenceFile?.name || persistedEvidenceFile || 'Click to upload or drag and drop'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
              </span>
              <FilePreviewButton file={evidenceFile || persistedEvidenceFile} style={{ width: '32px', height: '32px' }} />
              {(evidenceFile || persistedEvidenceFile) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setEvidenceFile(null)
                    setPersistedEvidenceFile('')
                  }}
                  title="Remove uploaded document"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid #d1d8e0',
                    borderRadius: '6px',
                    background: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>
      )}
    </>
  )

  const renderBookChapterForm = () => (
    <>
      {bookChapterEntries.map((entry, index) => (
        <div key={index} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fdfdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Book Chapter Entry #{index + 1}</h3>
            {!readOnly && bookChapterEntries.length > 1 && (
              <button
                onClick={() => removeBookChapterEntry(index)}
                style={{ padding: '0.4rem', color: '#ff4444', cursor: 'pointer', background: 'none', border: '1px solid #ff4444', borderRadius: '4px' }}
              >
                <X size={16} /> Remove Chapter
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
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>

            <div className="form-field-vertical">
              <label>Year of Publication<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={entry.yearOfPublication}
                onChange={(e) => updateBookEntryField(index, 'yearOfPublication', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
                disabled={readOnly}
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
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
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
                  style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
                <input
                  type="text"
                  placeholder="To"
                  value={entry.pagesTo}
                  onChange={(e) => updateBookEntryField(index, 'pagesTo', e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {readOnly ? (
            entry.evidence_file && (
              <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
                <label>Evidence</label>
                <a
                  href={`http://${window.location.hostname}:5000/uploads/${entry.evidence_file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
                >
                  <ExternalLink size={18} /> View Book Chapter Evidence
                </a>
              </div>
            )
          ) : (
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
                  id={`evidence-upload-book-chapter-${index}`}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => updateBookEntryField(index, 'evidenceFile', e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor={`evidence-upload-book-chapter-${index}`}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Upload size={24} color="#5b8fc7" />
                  <span style={{ color: '#5b8fc7', fontSize: '0.9rem' }}>
                    {entry.evidenceFile?.name || entry.evidence_file || 'Click to upload'}
                  </span>
                  <FilePreviewButton file={entry.evidenceFile || entry.evidence_file} style={{ width: '32px', height: '32px' }} />
                  {(entry.evidenceFile || entry.evidence_file) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateBookEntryField(index, 'evidenceFile', null)
                        updateBookEntryField(index, 'evidence_file', null)
                      }}
                      title="Remove uploaded document"
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #d1d8e0',
                        borderRadius: '6px',
                        background: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>
            </div>
          )}

          {renderEditors(entry.editors, index)}
        </div>
      ))}

      {!readOnly && (
        <button
          onClick={addBookChapterEntry}
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
          Add Another Book Chapter
        </button>
      )}
    </>
  )

  const renderBookForm = () => (
    <>
      {textbookEntries.map((entry, index) => (
        <div key={index} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fdfdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Textbook Entry #{index + 1}</h3>
            {!readOnly && textbookEntries.length > 1 && (
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
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>

            <div className="form-field-vertical">
              <label>Year of Publication<span style={{ color: '#d64550' }}>*</span></label>
              <select
                value={entry.yearOfPublication}
                onChange={(e) => updateTextbookEntryField(index, 'yearOfPublication', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
                disabled={readOnly}
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
              style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
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
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>

              <div className="form-field-vertical">
                <label>State<span style={{ color: '#d64550' }}>*</span></label>
                <input
                  type="text"
                  value={entry.state}
                  onChange={(e) => updateTextbookEntryField(index, 'state', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>

              <div className="form-field-vertical">
                <label>Country<span style={{ color: '#d64550' }}>*</span></label>
                <input
                  type="text"
                  value={entry.country}
                  onChange={(e) => updateTextbookEntryField(index, 'country', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {readOnly ? (
            entry.evidence_file && (
              <div className="form-field-vertical">
                <label>Evidence</label>
                <a
                  href={`http://${window.location.hostname}:5000/uploads/${entry.evidence_file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
                >
                  <ExternalLink size={18} /> View Textbook Evidence
                </a>
              </div>
            )
          ) : (
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
                    {entry.evidenceFile?.name || entry.evidence_file || 'Click to upload'}
                  </span>
                  <FilePreviewButton file={entry.evidenceFile || entry.evidence_file} style={{ width: '32px', height: '32px' }} />
                  {(entry.evidenceFile || entry.evidence_file) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateTextbookEntryField(index, 'evidenceFile', null)
                        updateTextbookEntryField(index, 'evidence_file', null)
                      }}
                      title="Remove uploaded document"
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #d1d8e0',
                        borderRadius: '6px',
                        background: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
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
      )}
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
          border: readOnly ? 'none' : '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '1rem',
          fontFamily: 'inherit',
          background: readOnly ? 'transparent' : 'white'
        }}
        disabled={readOnly}
      />

      {readOnly ? (
        initialData?.evidence_file && (
          <div className="form-field-vertical" style={{ marginTop: '1.5rem' }}>
            <label>Evidence</label>
            <a
              href={`http://${window.location.hostname}:5000/uploads/${initialData.evidence_file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="evidence-link"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5b8fc7', fontWeight: '500', textDecoration: 'none' }}
            >
              <ExternalLink size={18} /> View Evidence
            </a>
          </div>
        )
      ) : (
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
                {evidenceFile?.name || persistedEvidenceFile || 'Click to upload or drag and drop'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
              </span>
              <FilePreviewButton file={evidenceFile || persistedEvidenceFile} style={{ width: '32px', height: '32px' }} />
              {(evidenceFile || persistedEvidenceFile) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setEvidenceFile(null)
                    setPersistedEvidenceFile('')
                  }}
                  title="Remove uploaded document"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid #d1d8e0',
                    borderRadius: '6px',
                    background: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  )
  return (
    <div className={`form-page ${readOnly ? 'read-only-mode' : ''}`}>
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Research Publications</h1>
            <p className="page-subtitle">Section 5.1: Publications in Refereed Journals & Conferences</p>
          </div>
        </div>
      )}

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
                border: readOnly ? 'none' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: readOnly ? 'default' : 'pointer',
                background: readOnly ? 'transparent' : 'white',
                appearance: readOnly ? 'none' : 'auto',
                fontWeight: readOnly ? '600' : 'normal'
              }}
              disabled={readOnly}
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
                  border: readOnly ? 'none' : '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: readOnly ? 'default' : 'pointer',
                  background: readOnly ? 'transparent' : 'white',
                  appearance: readOnly ? 'none' : 'auto',
                  fontWeight: readOnly ? '600' : 'normal'
                }}
                disabled={readOnly}
              >
                <option value="">-- Select Sub-Type --</option>
                <option value="Book">Book Published</option>
                <option value="Book Chapter">Book Chapter</option>
              </select>
            </div>
          )}

          {publicationType === 'Monographs' && bookSubType === 'Book Chapter' && renderBookChapterForm()}
          {publicationType === 'Monographs' && bookSubType === 'Book' && renderBookForm()}
          {publicationType === 'Journal' && renderJournalForm()}
          {publicationType === 'Conference' && renderConferenceForm()}
          {publicationType === 'Any Other' && renderAnyOtherForm()}

          {publicationType && !readOnly && (
            <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
          )}

          {!publicationType && !readOnly && (
            <FormActions onSave={() => Promise.resolve(true)} currentPath={window.location.pathname} />
          )}
        </div>
      </div>
    </div>
  )
}

export default ResearchPublications
