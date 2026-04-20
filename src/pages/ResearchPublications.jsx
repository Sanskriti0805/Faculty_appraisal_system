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
  details: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyJournalEntry = () => ({
  details: '',
  quartile: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyConferenceEntry = () => ({
  details: '',
  typeOfConference: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyTextbookEntry = () => ({
  details: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyBookEditedEntry = () => ({
  details: '',
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
      setJournalEntries([{
        details: data.details || data.title || '',
        quartile: data.quartile || '',
        evidence_file: data.evidence_file
      }])
    } else if (data.publication_type === 'Conference') {
      setConferenceEntries([{
        details: data.details || data.title || '',
        typeOfConference: data.type_of_conference || '',
        evidence_file: data.evidence_file
      }])
    } else if (data.publication_type === 'Monographs') {
      if (data.sub_type === 'Book Chapter') {
        setBookChapterEntries([{
          details: data.details || data.title || '',
          evidence_file: data.evidence_file
        }])
      } else if (data.sub_type === 'Book') {
        setTextbookEntries([{
          details: data.details || data.title || '',
          evidence_file: data.evidence_file
        }])
      } else if (data.sub_type === 'Book Edited') {
        setBookEditedEntries([{
          details: data.details || data.title || '',
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

  const [journalEntries, setJournalEntries] = useState([getEmptyJournalEntry()])

  const [conferenceEntries, setConferenceEntries] = useState([getEmptyConferenceEntry()])

  const [bookChapterEntries, setBookChapterEntries] = useState([getEmptyBookChapterEntry()])
  const [textbookEntries, setTextbookEntries] = useState([getEmptyTextbookEntry()])
  const [bookEditedEntries, setBookEditedEntries] = useState([getEmptyBookEditedEntry()])

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
      const journals = rows.filter((p) => p.publication_type === 'Journal')
      if (journals.length > 0) {
        setJournalEntries(
          journals.map((entry) => ({
            details: entry.details || entry.title || '',
            quartile: entry.quartile || '',
            evidenceFile: null,
            evidence_file: entry.evidence_file || null
          }))
        )
      } else {
        setPublicationId(null)
        setJournalEntries([getEmptyJournalEntry()])
        setEvidenceFile(null)
        setPersistedEvidenceFile('')
      }
      return
    }

    if (publicationType === 'Conference') {
      const conferences = rows.filter((p) => p.publication_type === 'Conference')
      if (conferences.length > 0) {
        setConferenceEntries(
          conferences.map((entry) => ({
            details: entry.details || entry.title || '',
            typeOfConference: entry.type_of_conference || '',
            evidenceFile: null,
            evidence_file: entry.evidence_file || null
          }))
        )
      } else {
        setPublicationId(null)
        setConferenceEntries([getEmptyConferenceEntry()])
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
                details: entry.details || entry.title || '',
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
                details: entry.details || entry.title || '',
                evidenceFile: null,
                evidence_file: entry.evidence_file || null
              }))
            : [getEmptyTextbookEntry()]
        )
      }

      if (bookSubType === 'Book Edited') {
        setBookEditedEntries(
          monographs.length > 0
            ? monographs.map((entry) => ({
                details: entry.details || entry.title || '',
                evidenceFile: null,
                evidence_file: entry.evidence_file || null
              }))
            : [getEmptyBookEditedEntry()]
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
    setBookChapterEntries([...bookChapterEntries, getEmptyBookChapterEntry()])
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
    setTextbookEntries([...textbookEntries, getEmptyTextbookEntry()])
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

  const addBookEditedEntry = () => {
    setBookEditedEntries([...bookEditedEntries, getEmptyBookEditedEntry()])
  }

  const removeBookEditedEntry = (index) => {
    if (bookEditedEntries.length > 1) {
      setBookEditedEntries(bookEditedEntries.filter((_, i) => i !== index))
    }
  }

  const addJournalEntry = () => {
    setJournalEntries([...journalEntries, getEmptyJournalEntry()])
  }

  const removeJournalEntry = (index) => {
    if (journalEntries.length > 1) {
      setJournalEntries(journalEntries.filter((_, i) => i !== index))
    }
  }

  const updateJournalEntryField = (index, field, value) => {
    const updatedEntries = [...journalEntries]
    updatedEntries[index][field] = value
    setJournalEntries(updatedEntries)
  }

  const addConferenceEntry = () => {
    setConferenceEntries([...conferenceEntries, getEmptyConferenceEntry()])
  }

  const removeConferenceEntry = (index) => {
    if (conferenceEntries.length > 1) {
      setConferenceEntries(conferenceEntries.filter((_, i) => i !== index))
    }
  }

  const updateConferenceEntryField = (index, field, value) => {
    const updatedEntries = [...conferenceEntries]
    updatedEntries[index][field] = value
    setConferenceEntries(updatedEntries)
  }

  const updateBookEditedEntryField = (index, field, value) => {
    const updatedEntries = [...bookEditedEntries]
    updatedEntries[index][field] = value
    setBookEditedEntries(updatedEntries)
  }

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    setLoading(true)
    const createdIds = []
    try {
      const facultyId = user?.id
      if (!facultyId) {
        window.appToast('Unable to identify logged-in faculty. Please login again.')
        return false
      }



      if (publicationType === 'Monographs' && !bookSubType) {
        window.appToast('Please select a monograph sub-type before saving.')
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
        window.appToast('Please select a publication type.')
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
        for (const entry of journalEntries) {
          const hasDetails = entry.details && entry.details.trim()
          const hasQuartile = Boolean(entry.quartile)
          const hasAnything = hasDetails || hasQuartile

          if (!hasAnything) continue

          if (hasDetails && !hasQuartile) {
            window.appToast('Please select a quartile for the journal entry.')
            return false
          }

          const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file)
          const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file)
          
          if (!hasEvidence) {
            window.appToast('Please upload evidence for journal paper entry.')
            return false
          }

          const entryData = {
            ...publicationData,
            sub_type: 'Journal',
            title: entry.details.substring(0, 255),
            details: entry.details,
            quartile: entry.quartile,
            evidence_file: evidencePayload.evidence_file,
            existing_evidence_file: evidencePayload.existing_evidence_file
          }
          await createAndTrack(entryData)
        }
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        window.appToast('Journal drafts saved successfully!')
        setPublicationId(null)
        return true
      } else if (publicationType === 'Conference') {
        for (const entry of conferenceEntries) {
          const hasDetails = entry.details && entry.details.trim()
          const hasType = Boolean(entry.typeOfConference)
          const hasAnything = hasDetails || hasType

          if (!hasAnything) continue

          if (hasDetails && !hasType) {
            window.appToast('Please select the type of conference for the conference entry.')
            return false
          }

          const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file)
          const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file)
          
          if (!hasEvidence) {
            window.appToast('Please upload evidence for conference paper entry.')
            return false
          }

          const entryData = {
            ...publicationData,
            sub_type: 'Conference',
            title: entry.details.substring(0, 255),
            details: entry.details,
            type_of_conference: entry.typeOfConference,
            evidence_file: evidencePayload.evidence_file,
            existing_evidence_file: evidencePayload.existing_evidence_file
          }
          await createAndTrack(entryData)
        }
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        window.appToast('Conference drafts saved successfully!')
        setPublicationId(null)
        return true
      } else if (publicationType === 'Monographs') {
        if (!bookSubType) {
          window.appToast('Please select a monograph sub-type before saving.')
          return false
        }

        publicationData.sub_type = bookSubType
        if (bookSubType === 'Book Chapter') {
          for (const entry of bookChapterEntries) {
            const hasDetails = entry.details && entry.details.trim();
            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file);
            const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file);

            if (!hasDetails && !hasEvidence) continue;

            if (hasDetails && !hasEvidence) {
              window.appToast('Upload Evidence is mandatory when Book Chapter Details are provided.');
              return false;
            }

            const entryData = {
              ...publicationData,
              details: entry.details,
              evidence_file: evidencePayload.evidence_file,
              existing_evidence_file: evidencePayload.existing_evidence_file
            }
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          window.appToast('Book chapter drafts saved successfully!')
          setPublicationId(null)
          return true
        } else if (bookSubType === 'Book') {
          for (const entry of textbookEntries) {
            const hasDetails = entry.details && entry.details.trim();
            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file);
            const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file);

            if (!hasDetails && !hasEvidence) continue;

            if (hasDetails && !hasEvidence) {
              window.appToast('Upload Evidence is mandatory when Book Details are provided.');
              return false;
            }

            const entryData = {
              ...publicationData,
              details: entry.details,
              evidence_file: evidencePayload.evidence_file,
              existing_evidence_file: evidencePayload.existing_evidence_file
            }
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          window.appToast('Book drafts saved successfully!')
          setPublicationId(null)
          return true
        } else if (bookSubType === 'Book Edited') {
          for (const entry of bookEditedEntries) {
            const hasDetails = entry.details && entry.details.trim();
            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file);
            const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file);

            if (!hasDetails && !hasEvidence) continue;

            if (hasDetails && !hasEvidence) {
              window.appToast('Upload Evidence is mandatory when Book Edited Details are provided.');
              return false;
            }

            const entryData = {
              ...publicationData,
              details: entry.details,
              evidence_file: evidencePayload.evidence_file,
              existing_evidence_file: evidencePayload.existing_evidence_file
            }
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          window.appToast('Book edited drafts saved successfully!')
          setPublicationId(null)
          return true
        }
      } else if (publicationType === 'Any Other') {
        if (!otherDetails || !otherDetails.trim()) {
          window.appToast('Please provide details for Any Other publication type.')
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
        window.appToast('Draft saved successfully!')
        setPublicationId(response?.data?.id || null)
        return true
      }
    } catch (error) {
      if (createdIds.length > 0) {
        await Promise.allSettled(createdIds.map((id) => publicationsService.deletePublication(id)))
      }
      console.error('Error saving publication:', error)
      window.appToast('Failed to save publication. Error: ' + error.message)
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
      {journalEntries.map((entry, index) => (
        <div key={index} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fdfdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Journal Entry #{index + 1}</h3>
            {!readOnly && journalEntries.length > 1 && (
              <button
                onClick={() => removeJournalEntry(index)}
                style={{ padding: '0.4rem', color: '#ff4444', cursor: 'pointer', background: 'none', border: '1px solid #ff4444', borderRadius: '4px' }}
              >
                <X size={16} /> Remove Entry
              </button>
            )}
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Publication Details <span style={{ color: 'red' }}>*</span></label>
            <textarea
              rows="5"
              value={entry.details}
              onChange={(e) => updateJournalEntryField(index, 'details', e.target.value)}
              placeholder="Author's Name, Title of Paper, Name of Journal, Year of Publication, Pages (From - To)"
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
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Quartile <span style={{ color: 'red' }}>*</span></label>
            <select
              value={entry.quartile}
              onChange={(e) => updateJournalEntryField(index, 'quartile', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
              disabled={readOnly}
            >
              <option value="">Select Quartile</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4 / SCOPUS</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {readOnly ? (
            entry.evidence_file && (
              <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
                <label>Evidence</label>
                <a
                  href={`http://${window.location.hostname}:5001/uploads/${entry.evidence_file}`}
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
              <label>Upload Evidence <span style={{ color: 'red' }}>*</span></label>
              <div style={{
                border: '2px dashed #ddd',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#f9f9f9'
              }}>
                <input
                  type="file"
                  id={`evidence-upload-journal-${index}`}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => updateJournalEntryField(index, 'evidenceFile', e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor={`evidence-upload-journal-${index}`}
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
                    {entry.evidenceFile?.name || entry.evidence_file || 'Click to upload or drag and drop'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                  </span>
                  <FilePreviewButton file={entry.evidenceFile || entry.evidence_file} style={{ width: '32px', height: '32px' }} />
                  {(entry.evidenceFile || entry.evidence_file) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateJournalEntryField(index, 'evidenceFile', null)
                        updateJournalEntryField(index, 'evidence_file', null)
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
          onClick={addJournalEntry}
          disabled={!(journalEntries.length > 0 && journalEntries[journalEntries.length - 1]?.details?.trim() && (journalEntries[journalEntries.length - 1].evidenceFile || journalEntries[journalEntries.length - 1].evidence_file))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (journalEntries.length > 0 && journalEntries[journalEntries.length - 1]?.details?.trim() && (journalEntries[journalEntries.length - 1].evidenceFile || journalEntries[journalEntries.length - 1].evidence_file)) ? 'pointer' : 'not-allowed',
            opacity: (journalEntries.length > 0 && journalEntries[journalEntries.length - 1]?.details?.trim() && (journalEntries[journalEntries.length - 1].evidenceFile || journalEntries[journalEntries.length - 1].evidence_file)) ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1rem',
            marginBottom: '2rem'
          }}
        >
          <Plus size={18} />
          Add Another Journal
        </button>
      )}
    </>
  )

  const renderConferenceForm = () => (
    <>
      {conferenceEntries.map((entry, index) => (
        <div key={index} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fdfdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Conference Entry #{index + 1}</h3>
            {!readOnly && conferenceEntries.length > 1 && (
              <button
                onClick={() => removeConferenceEntry(index)}
                style={{ padding: '0.4rem', color: '#ff4444', cursor: 'pointer', background: 'none', border: '1px solid #ff4444', borderRadius: '4px' }}
              >
                <X size={16} /> Remove Entry
              </button>
            )}
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Conference Details <span style={{ color: 'red' }}>*</span></label>
            <textarea
              rows="6"
              value={entry.details}
              onChange={(e) => updateConferenceEntryField(index, 'details', e.target.value)}
              placeholder="Author's Name, Title of Paper, Name of Conference, Abbreviation of Conference, Date (From -To), Pages (From - To), Venue(City, State, Country), Publication Agency"
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
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Type of Conference <span style={{ color: 'red' }}>*</span></label>
            <select
              value={entry.typeOfConference}
              onChange={(e) => updateConferenceEntryField(index, 'typeOfConference', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white', appearance: readOnly ? 'none' : 'auto' }}
              disabled={readOnly}
            >
              <option value="">-- Select Type --</option>
              <option value="International">International</option>
              <option value="National">National</option>
            </select>
          </div>

          {readOnly ? (
            entry.evidence_file && (
              <div className="form-field-vertical" style={{ marginTop: '1.5rem' }}>
                <label>Evidence</label>
                <a
                  href={`http://${window.location.hostname}:5001/uploads/${entry.evidence_file}`}
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
              <label>Upload Evidence <span style={{ color: 'red' }}>*</span></label>
              <div style={{
                border: '2px dashed #ddd',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#f9f9f9'
              }}>
                <input
                  type="file"
                  id={`evidence-upload-conference-${index}`}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => updateConferenceEntryField(index, 'evidenceFile', e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor={`evidence-upload-conference-${index}`}
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
                    {entry.evidenceFile?.name || entry.evidence_file || 'Click to upload or drag and drop'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                  </span>
                  <FilePreviewButton file={entry.evidenceFile || entry.evidence_file} style={{ width: '32px', height: '32px' }} />
                  {(entry.evidenceFile || entry.evidence_file) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateConferenceEntryField(index, 'evidenceFile', null)
                        updateConferenceEntryField(index, 'evidence_file', null)
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
          onClick={addConferenceEntry}
          disabled={!(conferenceEntries.length > 0 && conferenceEntries[conferenceEntries.length - 1]?.details?.trim() && (conferenceEntries[conferenceEntries.length - 1].evidenceFile || conferenceEntries[conferenceEntries.length - 1].evidence_file))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (conferenceEntries.length > 0 && conferenceEntries[conferenceEntries.length - 1]?.details?.trim() && (conferenceEntries[conferenceEntries.length - 1].evidenceFile || conferenceEntries[conferenceEntries.length - 1].evidence_file)) ? 'pointer' : 'not-allowed',
            opacity: (conferenceEntries.length > 0 && conferenceEntries[conferenceEntries.length - 1]?.details?.trim() && (conferenceEntries[conferenceEntries.length - 1].evidenceFile || conferenceEntries[conferenceEntries.length - 1].evidence_file)) ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1rem',
            marginBottom: '2rem'
          }}
        >
          <Plus size={18} />
          Add Another Conference
        </button>
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

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Book Chapter Details <span style={{ color: 'red' }}>*</span></label>
            <textarea
              rows="4"
              value={entry.details}
              onChange={(e) => updateBookEntryField(index, 'details', e.target.value)}
              placeholder="Author Name, Title of Book, Editors Name, Publication Agency , Year of Publication, Pages (From - To)"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: readOnly ? 'none' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                background: readOnly ? 'transparent' : 'white',
                fontFamily: 'inherit'
              }}
              disabled={readOnly}
            />
          </div>

          {readOnly ? (
            entry.evidence_file && (
              <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
                <label>Evidence</label>
                <a
                  href={`http://${window.location.hostname}:5001/uploads/${entry.evidence_file}`}
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
              <label>Upload Evidence <span style={{ color: 'red' }}>*</span></label>
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
        </div>
      ))}

      {!readOnly && (
        <button
          onClick={addBookChapterEntry}
          disabled={!(bookChapterEntries.length > 0 && bookChapterEntries[bookChapterEntries.length - 1]?.details?.trim() && (bookChapterEntries[bookChapterEntries.length - 1].evidenceFile || bookChapterEntries[bookChapterEntries.length - 1].evidence_file))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (bookChapterEntries.length > 0 && bookChapterEntries[bookChapterEntries.length - 1]?.details?.trim() && (bookChapterEntries[bookChapterEntries.length - 1].evidenceFile || bookChapterEntries[bookChapterEntries.length - 1].evidence_file)) ? 'pointer' : 'not-allowed',
            opacity: (bookChapterEntries.length > 0 && bookChapterEntries[bookChapterEntries.length - 1]?.details?.trim() && (bookChapterEntries[bookChapterEntries.length - 1].evidenceFile || bookChapterEntries[bookChapterEntries.length - 1].evidence_file)) ? 1 : 0.6,
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

  const renderBookEditedForm = () => (
    <>
      {bookEditedEntries.map((entry, index) => (
        <div key={index} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fdfdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Book Edited Entry #{index + 1}</h3>
            {!readOnly && bookEditedEntries.length > 1 && (
              <button
                onClick={() => removeBookEditedEntry(index)}
                style={{ padding: '0.4rem', color: '#ff4444', cursor: 'pointer', background: 'none', border: '1px solid #ff4444', borderRadius: '4px' }}
              >
                <X size={16} /> Remove Entry
              </button>
            )}
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Book Details <span style={{ color: 'red' }}>*</span></label>
            <textarea
              rows="4"
              value={entry.details}
              onChange={(e) => updateBookEditedEntryField(index, 'details', e.target.value)}
              placeholder="Author Name, Title of Textbook, Editors Name, Publication Agency , Year of Publication, Publisher Address ( City , State , Country)"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: readOnly ? 'none' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                background: readOnly ? 'transparent' : 'white',
                fontFamily: 'inherit'
              }}
              disabled={readOnly}
            />
          </div>

          {readOnly ? (
            entry.evidence_file && (
              <div className="form-field-vertical">
                <label>Evidence</label>
                <a
                  href={`http://${window.location.hostname}:5001/uploads/${entry.evidence_file}`}
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
            <div className="form-field-vertical">
              <label>Upload Evidence <span style={{ color: 'red' }}>*</span></label>
              <div style={{
                border: '2px dashed #ddd',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                backgroundColor: '#f9f9f9'
              }}>
                <input
                  type="file"
                  id={`evidence-upload-book-edited-${index}`}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => updateBookEditedEntryField(index, 'evidenceFile', e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor={`evidence-upload-book-edited-${index}`}
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
                        updateBookEditedEntryField(index, 'evidenceFile', null)
                        updateBookEditedEntryField(index, 'evidence_file', null)
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
          onClick={addBookEditedEntry}
          disabled={!(bookEditedEntries.length > 0 && bookEditedEntries[bookEditedEntries.length - 1]?.details?.trim() && (bookEditedEntries[bookEditedEntries.length - 1].evidenceFile || bookEditedEntries[bookEditedEntries.length - 1].evidence_file))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (bookEditedEntries.length > 0 && bookEditedEntries[bookEditedEntries.length - 1]?.details?.trim() && (bookEditedEntries[bookEditedEntries.length - 1].evidenceFile || bookEditedEntries[bookEditedEntries.length - 1].evidence_file)) ? 'pointer' : 'not-allowed',
            opacity: (bookEditedEntries.length > 0 && bookEditedEntries[bookEditedEntries.length - 1]?.details?.trim() && (bookEditedEntries[bookEditedEntries.length - 1].evidenceFile || bookEditedEntries[bookEditedEntries.length - 1].evidence_file)) ? 1 : 0.6,
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

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Book Details <span style={{ color: 'red' }}>*</span></label>
            <textarea
              rows="4"
              value={entry.details}
              onChange={(e) => updateTextbookEntryField(index, 'details', e.target.value)}
              placeholder="Author's Name, Title of Textbook, Editors Name, Publication Agency , Year of Publication, Publisher's Address ( City , State , Country)"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: readOnly ? 'none' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                background: readOnly ? 'transparent' : 'white',
                fontFamily: 'inherit'
              }}
              disabled={readOnly}
            />
          </div>

          {readOnly ? (
            entry.evidence_file && (
              <div className="form-field-vertical">
                <label>Evidence</label>
                <a
                  href={`http://${window.location.hostname}:5001/uploads/${entry.evidence_file}`}
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
              <label>Upload Evidence <span style={{ color: 'red' }}>*</span></label>
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
          disabled={!(textbookEntries.length > 0 && textbookEntries[textbookEntries.length - 1]?.details?.trim() && (textbookEntries[textbookEntries.length - 1].evidenceFile || textbookEntries[textbookEntries.length - 1].evidence_file))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (textbookEntries.length > 0 && textbookEntries[textbookEntries.length - 1]?.details?.trim() && (textbookEntries[textbookEntries.length - 1].evidenceFile || textbookEntries[textbookEntries.length - 1].evidence_file)) ? 'pointer' : 'not-allowed',
            opacity: (textbookEntries.length > 0 && textbookEntries[textbookEntries.length - 1]?.details?.trim() && (textbookEntries[textbookEntries.length - 1].evidenceFile || textbookEntries[textbookEntries.length - 1].evidence_file)) ? 1 : 0.6,
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
              href={`http://${window.location.hostname}:5001/uploads/${initialData.evidence_file}`}
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
          <label>Upload Evidence <span style={{ color: 'red' }}>*</span></label>
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
            <p className="page-subtitle">Publications in Refereed Journals & Conferences</p>
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
                <option value="Book Edited">Book Edited</option>
              </select>
            </div>
          )}

          {publicationType === 'Monographs' && bookSubType === 'Book Chapter' && renderBookChapterForm()}
          {publicationType === 'Monographs' && bookSubType === 'Book' && renderBookForm()}
          {publicationType === 'Monographs' && bookSubType === 'Book Edited' && renderBookEditedForm()}
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
