import React, { useState, useEffect } from 'react'
import { Plus, X, Upload, ExternalLink, Trash2, Eye, RotateCw, CheckCircle, BookOpen, Award, FileText, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import { publicationsService } from '../services/publicationsService'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import { useAuth } from '../context/AuthContext'
import { showConfirm } from '../utils/appDialogs'
import { FILE_TYPES, getAcceptAttribute, handleValidatedFileInput } from '../utils/fileValidation'

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
  editors: [getEmptyAuthor()],
  title: '',
  titleOfBook: '',
  publicationAgency: '',
  yearOfPublication: '',
  pagesFrom: '',
  pagesTo: '',
  details: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyJournalEntry = () => ({
  authors: [getEmptyAuthor()],
  title: '',
  journalName: '',
  yearOfPublication: '',
  volume: '',
  number: '',
  pagesFrom: '',
  pagesTo: '',
  details: '',
  quartile: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyConferenceEntry = () => ({
  authors: [getEmptyAuthor()],
  title: '',
  conferenceName: '',
  abbreviation: '',
  yearOfPublication: '',
  pagesFrom: '',
  pagesTo: '',
  city: '',
  state: '',
  country: '',
  publicationAgency: '',
  details: '',
  typeOfConference: '',
  dateFrom: '',
  dateTo: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyTextbookEntry = () => ({
  authors: [getEmptyAuthor()],
  editors: [getEmptyAuthor()],
  title: '',
  publicationAgency: '',
  yearOfPublication: '',
  details: '',
  evidenceFile: null,
  evidence_file: null
})

const getEmptyBookEditedEntry = () => ({
  authors: [getEmptyAuthor()],
  editors: [getEmptyAuthor()],
  title: '',
  publicationAgency: '',
  yearOfPublication: '',
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

const hasPersonValue = (list = []) => (
  Array.isArray(list) && list.some((person) => person?.first || person?.middle || person?.last)
)

const cleanPeople = (list = []) => (
  Array.isArray(list)
    ? list
        .map((person) => ({
          first: person?.first || '',
          middle: person?.middle || '',
          last: person?.last || ''
        }))
        .filter((person) => person.first || person.middle || person.last)
    : []
)

const hasTextValue = (value) => Boolean(value && String(value).trim())

const normalizeDateInput = (value) => {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
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

  // Summary State for Save-to-Review workflow
  const [showFinalSummary, setShowFinalSummary] = useState(false)
  const [summaryData, setSummaryData] = useState([])

  const markDraftChanged = () => {
    setShowFinalSummary(false)
  }

  const fetchPersistedPublications = async () => {
    try {
      const res = await publicationsService.getPublicationsByFaculty(user.id)
      setSummaryData(Array.isArray(res?.data) ? res.data : [])
    } catch (error) {
      console.error('Failed to refresh summary list:', error)
    }
  }

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
        authors: normalizePeople(data.authors),
        title: data.title || '',
        journalName: data.journal_name || '',
        yearOfPublication: data.year_of_publication || '',
        volume: data.volume || '',
        number: data.number || '',
        pagesFrom: data.pages_from || '',
        pagesTo: data.pages_to || '',
        details: data.details || data.title || '',
        quartile: data.quartile || data.sub_type || '',
        evidence_file: data.evidence_file
      }])
    } else if (data.publication_type === 'Conference') {
      setConferenceEntries([{
        authors: normalizePeople(data.authors),
        title: data.title || '',
        conferenceName: data.conference_name || '',
        abbreviation: data.abbreviation || '',
        yearOfPublication: data.year_of_publication || '',
        pagesFrom: data.pages_from || '',
        pagesTo: data.pages_to || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        publicationAgency: data.publication_agency || '',
        details: data.details || data.title || '',
        typeOfConference: data.type_of_conference || '',
        dateFrom: normalizeDateInput(data.date_from),
        dateTo: normalizeDateInput(data.date_to),
        evidence_file: data.evidence_file
      }])
    } else if (data.publication_type === 'Monographs') {
      if (data.sub_type === 'Book Chapter') {
        setBookChapterEntries([{
          authors: normalizePeople(data.authors),
          editors: normalizePeople(data.editors),
          title: data.title || '',
          titleOfBook: data.title_of_book || '',
          publicationAgency: data.publication_agency || '',
          yearOfPublication: data.year_of_publication || '',
          pagesFrom: data.pages_from || '',
          pagesTo: data.pages_to || '',
          details: data.details || data.title || '',
          evidence_file: data.evidence_file
        }])
      } else if (data.sub_type === 'Book') {
        setTextbookEntries([{
          authors: normalizePeople(data.authors),
          editors: normalizePeople(data.editors),
          title: data.title || data.title_of_book || '',
          publicationAgency: data.publication_agency || '',
          yearOfPublication: data.year_of_publication || '',
          details: data.details || data.title || '',
          evidence_file: data.evidence_file
        }])
      } else if (data.sub_type === 'Book Edited') {
        setBookEditedEntries([{
          authors: normalizePeople(data.authors),
          editors: normalizePeople(data.editors),
          title: data.title || data.title_of_book || '',
          publicationAgency: data.publication_agency || '',
          yearOfPublication: data.year_of_publication || '',
          details: data.details || data.title || '',
          evidence_file: data.evidence_file
        }])
      }
    } else if (data.publication_type === 'Any Other') {
      setOtherDetails(data.details || '')
      setOtherYear(data.year_of_publication || '')
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
    fetchPersistedPublications()
  }, [initialData, readOnly, user])

  const [journalEntries, setJournalEntries] = useState([getEmptyJournalEntry()])

  const [conferenceEntries, setConferenceEntries] = useState([getEmptyConferenceEntry()])

  const [bookChapterEntries, setBookChapterEntries] = useState([getEmptyBookChapterEntry()])
  const [textbookEntries, setTextbookEntries] = useState([getEmptyTextbookEntry()])
  const [bookEditedEntries, setBookEditedEntries] = useState([getEmptyBookEditedEntry()])

  const [otherDetails, setOtherDetails] = useState('')
  const [otherYear, setOtherYear] = useState('')
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
            authors: normalizePeople(entry.authors),
            title: entry.title || '',
            journalName: entry.journal_name || '',
            yearOfPublication: entry.year_of_publication || '',
            volume: entry.volume || '',
            number: entry.number || '',
            pagesFrom: entry.pages_from || '',
            pagesTo: entry.pages_to || '',
            details: entry.details || entry.title || '',
            quartile: entry.quartile || entry.sub_type || '',
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
            authors: normalizePeople(entry.authors),
            title: entry.title || '',
            conferenceName: entry.conference_name || '',
            abbreviation: entry.abbreviation || '',
            yearOfPublication: entry.year_of_publication || '',
            pagesFrom: entry.pages_from || '',
            pagesTo: entry.pages_to || '',
            city: entry.city || '',
            state: entry.state || '',
            country: entry.country || '',
            publicationAgency: entry.publication_agency || '',
            details: entry.details || entry.title || '',
            typeOfConference: entry.type_of_conference || '',
            dateFrom: normalizeDateInput(entry.date_from),
            dateTo: normalizeDateInput(entry.date_to),
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
        setOtherYear('')
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
                title: entry.title || '',
                titleOfBook: entry.title_of_book || '',
                publicationAgency: entry.publication_agency || '',
                yearOfPublication: entry.year_of_publication || '',
                pagesFrom: entry.pages_from || '',
                pagesTo: entry.pages_to || '',
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
                authors: normalizePeople(entry.authors),
                editors: normalizePeople(entry.editors),
                title: entry.title || entry.title_of_book || '',
                publicationAgency: entry.publication_agency || '',
                yearOfPublication: entry.year_of_publication || '',
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
                authors: normalizePeople(entry.authors),
                editors: normalizePeople(entry.editors),
                title: entry.title || entry.title_of_book || '',
                publicationAgency: entry.publication_agency || '',
                yearOfPublication: entry.year_of_publication || '',
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
    markDraftChanged()
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].authors = updatedEntries[bookIndex].authors || [getEmptyAuthor()]
      updatedEntries[bookIndex].authors.push({ first: '', middle: '', last: '' })
      setBookChapterEntries(updatedEntries)
    } else if (textbookIndex !== null) {
      const updatedEntries = [...textbookEntries]
      updatedEntries[textbookIndex].authors = updatedEntries[textbookIndex].authors || [getEmptyAuthor()]
      updatedEntries[textbookIndex].authors.push({ first: '', middle: '', last: '' })
      setTextbookEntries(updatedEntries)
    } else {
      setAuthors([...authors, { first: '', middle: '', last: '' }])
    }
  }

  const removeAuthor = (index, bookIndex = null, textbookIndex = null) => {
    markDraftChanged()
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].authors = updatedEntries[bookIndex].authors || [getEmptyAuthor()]
      if (updatedEntries[bookIndex].authors.length > 1) {
        updatedEntries[bookIndex].authors = updatedEntries[bookIndex].authors.filter((_, i) => i !== index)
        setBookChapterEntries(updatedEntries)
      }
    } else if (textbookIndex !== null) {
      const updatedEntries = [...textbookEntries]
      updatedEntries[textbookIndex].authors = updatedEntries[textbookIndex].authors || [getEmptyAuthor()]
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
    markDraftChanged()
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].authors = updatedEntries[bookIndex].authors || [getEmptyAuthor()]
      updatedEntries[bookIndex].authors[index][field] = value
      setBookChapterEntries(updatedEntries)
    } else if (textbookIndex !== null) {
      const updatedEntries = [...textbookEntries]
      updatedEntries[textbookIndex].authors = updatedEntries[textbookIndex].authors || [getEmptyAuthor()]
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
    markDraftChanged()
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].editors = updatedEntries[bookIndex].editors || [getEmptyAuthor()]
      updatedEntries[bookIndex].editors.push({ first: '', middle: '', last: '' })
      setBookChapterEntries(updatedEntries)
    } else {
      setEditors([...editors, { first: '', middle: '', last: '' }])
    }
  }

  const removeEditor = (index, bookIndex = null) => {
    markDraftChanged()
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].editors = updatedEntries[bookIndex].editors || [getEmptyAuthor()]
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
    markDraftChanged()
    if (bookIndex !== null) {
      const updatedEntries = [...bookChapterEntries]
      updatedEntries[bookIndex].editors = updatedEntries[bookIndex].editors || [getEmptyAuthor()]
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
    markDraftChanged()
    setBookChapterEntries([...bookChapterEntries, getEmptyBookChapterEntry()])
  }

  const removeBookChapterEntry = (index) => {
    if (bookChapterEntries.length > 1) {
      markDraftChanged()
      setBookChapterEntries(bookChapterEntries.filter((_, i) => i !== index))
    }
  }

  const updateBookEntryField = (index, field, value) => {
    markDraftChanged()
    const updatedEntries = [...bookChapterEntries]
    updatedEntries[index][field] = value
    setBookChapterEntries(updatedEntries)
  }

  const addTextbookEntry = () => {
    markDraftChanged()
    setTextbookEntries([...textbookEntries, getEmptyTextbookEntry()])
  }

  const removeTextbookEntry = (index) => {
    if (textbookEntries.length > 1) {
      markDraftChanged()
      setTextbookEntries(textbookEntries.filter((_, i) => i !== index))
    }
  }

  const updateTextbookEntryField = (index, field, value) => {
    markDraftChanged()
    const updatedEntries = [...textbookEntries]
    updatedEntries[index][field] = value
    setTextbookEntries(updatedEntries)
  }

  const addBookEditedEntry = () => {
    markDraftChanged()
    setBookEditedEntries([...bookEditedEntries, getEmptyBookEditedEntry()])
  }

  const removeBookEditedEntry = (index) => {
    if (bookEditedEntries.length > 1) {
      markDraftChanged()
      setBookEditedEntries(bookEditedEntries.filter((_, i) => i !== index))
    }
  }

  const addJournalEntry = () => {
    markDraftChanged()
    setJournalEntries([...journalEntries, getEmptyJournalEntry()])
  }

  const removeJournalEntry = (index) => {
    if (journalEntries.length > 1) {
      markDraftChanged()
      setJournalEntries(journalEntries.filter((_, i) => i !== index))
    }
  }

  const updateJournalEntryField = (index, field, value) => {
    markDraftChanged()
    const updatedEntries = [...journalEntries]
    updatedEntries[index][field] = value
    setJournalEntries(updatedEntries)
  }

  const addConferenceEntry = () => {
    markDraftChanged()
    setConferenceEntries([...conferenceEntries, getEmptyConferenceEntry()])
  }

  const removeConferenceEntry = (index) => {
    if (conferenceEntries.length > 1) {
      markDraftChanged()
      setConferenceEntries(conferenceEntries.filter((_, i) => i !== index))
    }
  }

  const updateConferenceEntryField = (index, field, value) => {
    markDraftChanged()
    const updatedEntries = [...conferenceEntries]
    updatedEntries[index][field] = value
    setConferenceEntries(updatedEntries)
  }

  const updateBookEditedEntryField = (index, field, value) => {
    markDraftChanged()
    const updatedEntries = [...bookEditedEntries]
    updatedEntries[index][field] = value
    setBookEditedEntries(updatedEntries)
  }

  const handleSave = async (e) => {
    if (readOnly) return false;
    if (e && e.preventDefault) e.preventDefault()

    // Second click on 'Save and Next' navigates to next page
    if (showFinalSummary) {
       return true;
    }

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
      const hasJournalValue = (entry) => (
        hasTextValue(entry?.details) ||
        hasTextValue(entry?.title) ||
        hasTextValue(entry?.journalName) ||
        hasTextValue(entry?.yearOfPublication) ||
        hasTextValue(entry?.volume) ||
        hasTextValue(entry?.number) ||
        hasTextValue(entry?.pagesFrom) ||
        hasTextValue(entry?.pagesTo) ||
        hasAuthorValue(entry?.authors) ||
        Boolean(entry?.quartile)
      )
      const hasConferenceValue = (entry) => (
        hasTextValue(entry?.details) ||
        hasTextValue(entry?.title) ||
        hasTextValue(entry?.conferenceName) ||
        hasTextValue(entry?.abbreviation) ||
        hasTextValue(entry?.yearOfPublication) ||
        hasTextValue(entry?.pagesFrom) ||
        hasTextValue(entry?.pagesTo) ||
        hasTextValue(entry?.city) ||
        hasTextValue(entry?.state) ||
        hasTextValue(entry?.country) ||
        hasTextValue(entry?.publicationAgency) ||
        hasAuthorValue(entry?.authors) ||
        Boolean(entry?.typeOfConference) ||
        Boolean(entry?.dateFrom) ||
        Boolean(entry?.dateTo)
      )
      const buildJournalPayload = (entry, evidencePayload) => ({
        ...publicationData,
        sub_type: entry.quartile,
        title: entry.title,
        journal_name: entry.journalName,
        year_of_publication: entry.yearOfPublication || null,
        volume: entry.volume,
        number: entry.number,
        pages_from: entry.pagesFrom || null,
        pages_to: entry.pagesTo || null,
        details: entry.details,
        authors: cleanPeople(entry.authors),
        evidence_file: evidencePayload.evidence_file,
        existing_evidence_file: evidencePayload.existing_evidence_file
      })
      const buildConferencePayload = (entry, evidencePayload) => ({
        ...publicationData,
        sub_type: 'Conference',
        title: entry.title,
        conference_name: entry.conferenceName,
        abbreviation: entry.abbreviation,
        year_of_publication: entry.yearOfPublication || null,
        pages_from: entry.pagesFrom || null,
        pages_to: entry.pagesTo || null,
        type_of_conference: entry.typeOfConference,
        date_from: normalizeDateInput(entry.dateFrom),
        date_to: normalizeDateInput(entry.dateTo),
        city: entry.city,
        state: entry.state,
        country: entry.country,
        publication_agency: entry.publicationAgency,
        details: entry.details,
        authors: cleanPeople(entry.authors),
        evidence_file: evidencePayload.evidence_file,
        existing_evidence_file: evidencePayload.existing_evidence_file
      })
      const hasMonographValue = (entry) => (
        hasTextValue(entry?.details) ||
        hasTextValue(entry?.title) ||
        hasTextValue(entry?.titleOfBook) ||
        hasTextValue(entry?.publicationAgency) ||
        hasTextValue(entry?.yearOfPublication) ||
        hasTextValue(entry?.pagesFrom) ||
        hasTextValue(entry?.pagesTo) ||
        hasAuthorValue(entry?.authors) ||
        hasAuthorValue(entry?.editors)
      )
      const buildMonographPayload = (entry, evidencePayload, includeBookTitle = false) => ({
        ...publicationData,
        title: entry.title,
        title_of_book: includeBookTitle ? entry.titleOfBook : entry.title,
        year_of_publication: entry.yearOfPublication || null,
        publication_agency: entry.publicationAgency,
        pages_from: entry.pagesFrom || null,
        pages_to: entry.pagesTo || null,
        details: entry.details,
        authors: cleanPeople(entry.authors),
        editors: cleanPeople(entry.editors),
        evidence_file: evidencePayload.evidence_file,
        existing_evidence_file: evidencePayload.existing_evidence_file
      })

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
          const hasQuartile = Boolean(entry.quartile)

          const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file)
          const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file)

          if (!hasJournalValue(entry) && !hasEvidence) continue

          if (!hasAuthorValue(entry.authors)) {
            window.appToast('Please provide at least one author for the journal entry.')
            return false
          }
          if (!hasTextValue(entry.title) || !hasTextValue(entry.journalName) || !hasTextValue(entry.yearOfPublication)) {
            window.appToast('Please provide paper title, journal name, and year of publication for the journal entry.')
            return false
          }
          if (!hasQuartile) {
            window.appToast('Please select a quartile for the journal entry.')
            return false
          }

          if (!hasEvidence) {
            window.appToast('Please upload evidence for journal paper entry.')
            return false
          }

          const entryData = buildJournalPayload(entry, evidencePayload)
          await createAndTrack(entryData)
        }
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        await fetchPersistedPublications()
        setShowFinalSummary(true)
        window.appToast('Journal drafts saved successfully! Review your entries in the summary list below.')
        return false
      } else if (publicationType === 'Conference') {
        for (const entry of conferenceEntries) {
          const hasType = Boolean(entry.typeOfConference)
          const hasDateFrom = Boolean(entry.dateFrom)
          const hasDateTo = Boolean(entry.dateTo)

          const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file)
          const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file)

          if (!hasConferenceValue(entry) && !hasEvidence) continue

          if (!hasAuthorValue(entry.authors)) {
            window.appToast('Please provide at least one author for the conference entry.')
            return false
          }
          if (!hasTextValue(entry.title) || !hasTextValue(entry.conferenceName) || !hasTextValue(entry.yearOfPublication)) {
            window.appToast('Please provide paper title, conference name, and year of publication for the conference entry.')
            return false
          }
          if (!hasType) {
            window.appToast('Please select the type of conference for the conference entry.')
            return false
          }

          if (!hasDateFrom || !hasDateTo) {
            window.appToast('Please provide both Date From and Date To for the conference entry.')
            return false
          }

          if (!hasEvidence) {
            window.appToast('Please upload evidence for conference paper entry.')
            return false
          }

          const entryData = buildConferencePayload(entry, evidencePayload)
          await createAndTrack(entryData)
        }
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        await fetchPersistedPublications()
        setShowFinalSummary(true)
        window.appToast('Conference drafts saved successfully! Review your entries in the summary list below.')
        return false
      } else if (publicationType === 'Monographs') {
        if (!bookSubType) {
          window.appToast('Please select a monograph sub-type before saving.')
          return false
        }

        publicationData.sub_type = bookSubType
        if (bookSubType === 'Book Chapter') {
          for (const entry of bookChapterEntries) {
            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file);
            const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file);

            if (!hasMonographValue(entry) && !hasEvidence) continue;

            if (!hasAuthorValue(entry.authors)) {
              window.appToast('Please provide at least one author for the book chapter entry.');
              return false;
            }
            if (!hasTextValue(entry.title) || !hasTextValue(entry.titleOfBook) || !hasTextValue(entry.yearOfPublication)) {
              window.appToast('Please provide chapter title, title of book, and year of publication for the book chapter entry.');
              return false;
            }
            if (!hasEvidence) {
              window.appToast('Upload Evidence is mandatory when Book Chapter Details are provided.');
              return false;
            }

            const entryData = buildMonographPayload(entry, evidencePayload, true)
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          await fetchPersistedPublications()
          setShowFinalSummary(true)
          window.appToast('Book chapter drafts saved successfully! Review your entries in the summary list below.')
          return false
        } else if (bookSubType === 'Book') {
          for (const entry of textbookEntries) {
            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file);
            const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file);

            if (!hasMonographValue(entry) && !hasEvidence) continue;

            if (!hasAuthorValue(entry.authors)) {
              window.appToast('Please provide at least one author for the book entry.');
              return false;
            }
            if (!hasTextValue(entry.title) || !hasTextValue(entry.yearOfPublication)) {
              window.appToast('Please provide book title and year of publication for the book entry.');
              return false;
            }
            if (!hasEvidence) {
              window.appToast('Upload Evidence is mandatory when Book Details are provided.');
              return false;
            }

            const entryData = buildMonographPayload(entry, evidencePayload)
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          await fetchPersistedPublications()
          setShowFinalSummary(true)
          window.appToast('Book drafts saved successfully! Review your entries in the summary list below.')
          return false
        } else if (bookSubType === 'Book Edited') {
          for (const entry of bookEditedEntries) {
            const evidencePayload = resolveEvidencePayload(entry.evidenceFile, entry.evidence_file);
            const hasEvidence = !!(evidencePayload.evidence_file || evidencePayload.existing_evidence_file);

            if (!hasMonographValue(entry) && !hasEvidence) continue;

            if (!hasAuthorValue(entry.editors)) {
              window.appToast('Please provide at least one editor for the book edited entry.');
              return false;
            }
            if (!hasTextValue(entry.title) || !hasTextValue(entry.yearOfPublication)) {
              window.appToast('Please provide book title and year of publication for the book edited entry.');
              return false;
            }
            if (!hasEvidence) {
              window.appToast('Upload Evidence is mandatory when Book Edited Details are provided.');
              return false;
            }

            const entryData = buildMonographPayload(entry, evidencePayload)
            await createAndTrack(entryData)
          }
          await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
          await refreshPublications()
          await fetchPersistedPublications()
          setShowFinalSummary(true)
          window.appToast('Book edited drafts saved successfully! Review your entries in the summary list below.')
          return false
        }
      } else if (publicationType === 'Any Other') {
        if (!otherDetails || !otherDetails.trim()) {
          window.appToast('Please provide details for Any Other publication type.')
          return false
        }
        if (!otherYear) {
          window.appToast('Please provide year of publication for Any Other publication type.')
          return false
        }

        const evidencePayload = resolveEvidencePayload(evidenceFile, persistedEvidenceFile)
        publicationData.sub_type = 'Other'
        publicationData.year_of_publication = otherYear
        publicationData.details = otherDetails
        publicationData.evidence_file = evidencePayload.evidence_file
        publicationData.existing_evidence_file = evidencePayload.existing_evidence_file

        const response = await createAndTrack(publicationData)
        await deleteIgnoringNotFound(publicationsService.deletePublication, idsToDelete)
        await refreshPublications()
        
        // Populate summary for local view immediately
        await fetchPersistedPublications()
        setShowFinalSummary(true)
        
        window.appToast('Research Publications saved successfully! Review your entries in the summary list below.')
        return false; // Stay on page to show summary
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

  const renderEntryPeople = (label, people = [getEmptyAuthor()], handlers = {}, required = true) => (
    <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#2c3e50' }}>
        {label}{required && <span style={{ color: '#d64550' }}>*</span>}
      </label>
      {(people && people.length ? people : [getEmptyAuthor()]).map((person, personIndex) => (
        <div key={personIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          {['first', 'middle', 'last'].map((field) => (
            <input
              key={field}
              type="text"
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={person?.[field] || ''}
              onChange={(e) => handlers.onChange?.(personIndex, field, e.target.value)}
              style={{ flex: 1, padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
              disabled={readOnly}
            />
          ))}
          {!readOnly && people.length > 1 && (
            <button
              type="button"
              onClick={() => handlers.onRemove?.(personIndex)}
              style={{ padding: '0.5rem', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={() => handlers.onAdd?.()}
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
          Add {label.replace("'s Name", '')}
        </button>
      )}
    </div>
  )

  const updatePersonInList = (entry, field, personIndex, key, value) => {
    const people = [...(entry[field] || [getEmptyAuthor()])]
    people[personIndex] = { ...people[personIndex], [key]: value }
    return people
  }

  const removePersonFromList = (entry, field, personIndex) => (
    (entry[field] || [getEmptyAuthor()]).filter((_, i) => i !== personIndex)
  )

  const hasEvidenceForEntry = (entry) => Boolean(entry?.evidenceFile || entry?.evidence_file)
  const canAppendJournal = (entry) => (
    hasPersonValue(entry?.authors) &&
    hasTextValue(entry?.title) &&
    hasTextValue(entry?.journalName) &&
    hasTextValue(entry?.yearOfPublication) &&
    Boolean(entry?.quartile) &&
    hasEvidenceForEntry(entry)
  )
  const canAppendConference = (entry) => (
    hasPersonValue(entry?.authors) &&
    hasTextValue(entry?.title) &&
    hasTextValue(entry?.conferenceName) &&
    hasTextValue(entry?.yearOfPublication) &&
    Boolean(entry?.typeOfConference) &&
    Boolean(entry?.dateFrom) &&
    Boolean(entry?.dateTo) &&
    hasEvidenceForEntry(entry)
  )
  const canAppendBookChapter = (entry) => (
    hasPersonValue(entry?.authors) &&
    hasTextValue(entry?.title) &&
    hasTextValue(entry?.titleOfBook) &&
    hasTextValue(entry?.yearOfPublication) &&
    hasEvidenceForEntry(entry)
  )
  const canAppendBook = (entry) => (
    hasPersonValue(entry?.authors) &&
    hasTextValue(entry?.title) &&
    hasTextValue(entry?.yearOfPublication) &&
    hasEvidenceForEntry(entry)
  )
  const canAppendBookEdited = (entry) => (
    hasPersonValue(entry?.editors) &&
    hasTextValue(entry?.title) &&
    hasTextValue(entry?.yearOfPublication) &&
    hasEvidenceForEntry(entry)
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

          {renderEntryPeople("Author's Name", entry.authors, {
            onChange: (personIndex, field, value) => updateJournalEntryField(index, 'authors', updatePersonInList(entry, 'authors', personIndex, field, value)),
            onAdd: () => updateJournalEntryField(index, 'authors', [...(entry.authors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateJournalEntryField(index, 'authors', removePersonFromList(entry, 'authors', personIndex))
          })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Paper Title <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.title || ''}
                onChange={(e) => updateJournalEntryField(index, 'title', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Journal Name <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.journalName || ''}
                onChange={(e) => updateJournalEntryField(index, 'journalName', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Year of Publication <span style={{ color: 'red' }}>*</span></label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={entry.yearOfPublication || ''}
                onChange={(e) => updateJournalEntryField(index, 'yearOfPublication', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Volume</label>
              <input
                type="text"
                value={entry.volume || ''}
                onChange={(e) => updateJournalEntryField(index, 'volume', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Issue / Number</label>
              <input
                type="text"
                value={entry.number || ''}
                onChange={(e) => updateJournalEntryField(index, 'number', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Pages From - To</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={entry.pagesFrom || ''}
                  onChange={(e) => updateJournalEntryField(index, 'pagesFrom', e.target.value)}
                  placeholder="From"
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
                <input
                  type="text"
                  value={entry.pagesTo || ''}
                  onChange={(e) => updateJournalEntryField(index, 'pagesTo', e.target.value)}
                  placeholder="To"
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Additional Publication Details</label>
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
                  accept={getAcceptAttribute(FILE_TYPES.documents)}
                  onChange={(e) => handleValidatedFileInput(
                    e,
                    (file) => updateJournalEntryField(index, 'evidenceFile', file),
                    { allowedExtensions: FILE_TYPES.documents, label: 'Journal evidence' }
                  )}
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
          disabled={!(journalEntries.length > 0 && canAppendJournal(journalEntries[journalEntries.length - 1]))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (journalEntries.length > 0 && canAppendJournal(journalEntries[journalEntries.length - 1])) ? 'pointer' : 'not-allowed',
            opacity: (journalEntries.length > 0 && canAppendJournal(journalEntries[journalEntries.length - 1])) ? 1 : 0.6,
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

          {renderEntryPeople("Author's Name", entry.authors, {
            onChange: (personIndex, field, value) => updateConferenceEntryField(index, 'authors', updatePersonInList(entry, 'authors', personIndex, field, value)),
            onAdd: () => updateConferenceEntryField(index, 'authors', [...(entry.authors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateConferenceEntryField(index, 'authors', removePersonFromList(entry, 'authors', personIndex))
          })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Paper Title <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.title || ''}
                onChange={(e) => updateConferenceEntryField(index, 'title', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Conference Name <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.conferenceName || ''}
                onChange={(e) => updateConferenceEntryField(index, 'conferenceName', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Abbreviation</label>
              <input
                type="text"
                value={entry.abbreviation || ''}
                onChange={(e) => updateConferenceEntryField(index, 'abbreviation', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Year of Publication <span style={{ color: 'red' }}>*</span></label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={entry.yearOfPublication || ''}
                onChange={(e) => updateConferenceEntryField(index, 'yearOfPublication', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Pages From - To</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={entry.pagesFrom || ''}
                  onChange={(e) => updateConferenceEntryField(index, 'pagesFrom', e.target.value)}
                  placeholder="From"
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
                <input
                  type="text"
                  value={entry.pagesTo || ''}
                  onChange={(e) => updateConferenceEntryField(index, 'pagesTo', e.target.value)}
                  placeholder="To"
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="form-field-vertical">
              <label>Publication Agency</label>
              <input
                type="text"
                value={entry.publicationAgency || ''}
                onChange={(e) => updateConferenceEntryField(index, 'publicationAgency', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>City</label>
              <input
                type="text"
                value={entry.city || ''}
                onChange={(e) => updateConferenceEntryField(index, 'city', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>State</label>
              <input
                type="text"
                value={entry.state || ''}
                onChange={(e) => updateConferenceEntryField(index, 'state', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Country</label>
              <input
                type="text"
                value={entry.country || ''}
                onChange={(e) => updateConferenceEntryField(index, 'country', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Additional Conference Details</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Date From <span style={{ color: 'red' }}>*</span></label>
              <input
                type="date"
                value={entry.dateFrom}
                onChange={(e) => updateConferenceEntryField(index, 'dateFrom', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Date To <span style={{ color: 'red' }}>*</span></label>
              <input
                type="date"
                value={entry.dateTo}
                onChange={(e) => updateConferenceEntryField(index, 'dateTo', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
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
                  accept={getAcceptAttribute(FILE_TYPES.documents)}
                  onChange={(e) => handleValidatedFileInput(
                    e,
                    (file) => updateConferenceEntryField(index, 'evidenceFile', file),
                    { allowedExtensions: FILE_TYPES.documents, label: 'Conference evidence' }
                  )}
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
          disabled={!(conferenceEntries.length > 0 && canAppendConference(conferenceEntries[conferenceEntries.length - 1]))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (conferenceEntries.length > 0 && canAppendConference(conferenceEntries[conferenceEntries.length - 1])) ? 'pointer' : 'not-allowed',
            opacity: (conferenceEntries.length > 0 && canAppendConference(conferenceEntries[conferenceEntries.length - 1])) ? 1 : 0.6,
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

          {renderEntryPeople("Author's Name", entry.authors, {
            onChange: (personIndex, field, value) => updateBookEntryField(index, 'authors', updatePersonInList(entry, 'authors', personIndex, field, value)),
            onAdd: () => updateBookEntryField(index, 'authors', [...(entry.authors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateBookEntryField(index, 'authors', removePersonFromList(entry, 'authors', personIndex))
          })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Chapter Title <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.title || ''}
                onChange={(e) => updateBookEntryField(index, 'title', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Title of Book <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.titleOfBook || ''}
                onChange={(e) => updateBookEntryField(index, 'titleOfBook', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
          </div>

          {renderEntryPeople("Editor's Name", entry.editors, {
            onChange: (personIndex, field, value) => updateBookEntryField(index, 'editors', updatePersonInList(entry, 'editors', personIndex, field, value)),
            onAdd: () => updateBookEntryField(index, 'editors', [...(entry.editors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateBookEntryField(index, 'editors', removePersonFromList(entry, 'editors', personIndex))
          }, false)}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Publication Agency / Publisher</label>
              <input
                type="text"
                value={entry.publicationAgency || ''}
                onChange={(e) => updateBookEntryField(index, 'publicationAgency', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Year of Publication <span style={{ color: 'red' }}>*</span></label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={entry.yearOfPublication || ''}
                onChange={(e) => updateBookEntryField(index, 'yearOfPublication', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Pages From - To</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={entry.pagesFrom || ''}
                  onChange={(e) => updateBookEntryField(index, 'pagesFrom', e.target.value)}
                  placeholder="From"
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
                <input
                  type="text"
                  value={entry.pagesTo || ''}
                  onChange={(e) => updateBookEntryField(index, 'pagesTo', e.target.value)}
                  placeholder="To"
                  style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Additional Book Chapter Details</label>
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
                  accept={getAcceptAttribute(FILE_TYPES.documents)}
                  onChange={(e) => handleValidatedFileInput(
                    e,
                    (file) => updateBookEntryField(index, 'evidenceFile', file),
                    { allowedExtensions: FILE_TYPES.documents, label: 'Book chapter evidence' }
                  )}
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
          disabled={!(bookChapterEntries.length > 0 && canAppendBookChapter(bookChapterEntries[bookChapterEntries.length - 1]))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (bookChapterEntries.length > 0 && canAppendBookChapter(bookChapterEntries[bookChapterEntries.length - 1])) ? 'pointer' : 'not-allowed',
            opacity: (bookChapterEntries.length > 0 && canAppendBookChapter(bookChapterEntries[bookChapterEntries.length - 1])) ? 1 : 0.6,
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

          {renderEntryPeople("Author's Name", entry.authors, {
            onChange: (personIndex, field, value) => updateBookEditedEntryField(index, 'authors', updatePersonInList(entry, 'authors', personIndex, field, value)),
            onAdd: () => updateBookEditedEntryField(index, 'authors', [...(entry.authors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateBookEditedEntryField(index, 'authors', removePersonFromList(entry, 'authors', personIndex))
          }, false)}

          {renderEntryPeople("Editor's Name", entry.editors, {
            onChange: (personIndex, field, value) => updateBookEditedEntryField(index, 'editors', updatePersonInList(entry, 'editors', personIndex, field, value)),
            onAdd: () => updateBookEditedEntryField(index, 'editors', [...(entry.editors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateBookEditedEntryField(index, 'editors', removePersonFromList(entry, 'editors', personIndex))
          })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Book Title <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.title || ''}
                onChange={(e) => updateBookEditedEntryField(index, 'title', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Publication Agency / Publisher</label>
              <input
                type="text"
                value={entry.publicationAgency || ''}
                onChange={(e) => updateBookEditedEntryField(index, 'publicationAgency', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Year of Publication <span style={{ color: 'red' }}>*</span></label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={entry.yearOfPublication || ''}
                onChange={(e) => updateBookEditedEntryField(index, 'yearOfPublication', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Additional Book Details</label>
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
                  accept={getAcceptAttribute(FILE_TYPES.documents)}
                  onChange={(e) => handleValidatedFileInput(
                    e,
                    (file) => updateBookEditedEntryField(index, 'evidenceFile', file),
                    { allowedExtensions: FILE_TYPES.documents, label: 'Book edited evidence' }
                  )}
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
          disabled={!(bookEditedEntries.length > 0 && canAppendBookEdited(bookEditedEntries[bookEditedEntries.length - 1]))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (bookEditedEntries.length > 0 && canAppendBookEdited(bookEditedEntries[bookEditedEntries.length - 1])) ? 'pointer' : 'not-allowed',
            opacity: (bookEditedEntries.length > 0 && canAppendBookEdited(bookEditedEntries[bookEditedEntries.length - 1])) ? 1 : 0.6,
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

          {renderEntryPeople("Author's Name", entry.authors, {
            onChange: (personIndex, field, value) => updateTextbookEntryField(index, 'authors', updatePersonInList(entry, 'authors', personIndex, field, value)),
            onAdd: () => updateTextbookEntryField(index, 'authors', [...(entry.authors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateTextbookEntryField(index, 'authors', removePersonFromList(entry, 'authors', personIndex))
          })}

          {renderEntryPeople("Editor's Name", entry.editors, {
            onChange: (personIndex, field, value) => updateTextbookEntryField(index, 'editors', updatePersonInList(entry, 'editors', personIndex, field, value)),
            onAdd: () => updateTextbookEntryField(index, 'editors', [...(entry.editors || [getEmptyAuthor()]), getEmptyAuthor()]),
            onRemove: (personIndex) => updateTextbookEntryField(index, 'editors', removePersonFromList(entry, 'editors', personIndex))
          }, false)}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-field-vertical">
              <label>Book Title <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={entry.title || ''}
                onChange={(e) => updateTextbookEntryField(index, 'title', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Publication Agency / Publisher</label>
              <input
                type="text"
                value={entry.publicationAgency || ''}
                onChange={(e) => updateTextbookEntryField(index, 'publicationAgency', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
            <div className="form-field-vertical">
              <label>Year of Publication <span style={{ color: 'red' }}>*</span></label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={entry.yearOfPublication || ''}
                onChange={(e) => updateTextbookEntryField(index, 'yearOfPublication', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
            <label>Additional Book Details</label>
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
                  accept={getAcceptAttribute(FILE_TYPES.documents)}
                  onChange={(e) => handleValidatedFileInput(
                    e,
                    (file) => updateTextbookEntryField(index, 'evidenceFile', file),
                    { allowedExtensions: FILE_TYPES.documents, label: 'Book evidence' }
                  )}
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
          disabled={!(textbookEntries.length > 0 && canAppendBook(textbookEntries[textbookEntries.length - 1]))}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#5cb85c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (textbookEntries.length > 0 && canAppendBook(textbookEntries[textbookEntries.length - 1])) ? 'pointer' : 'not-allowed',
            opacity: (textbookEntries.length > 0 && canAppendBook(textbookEntries[textbookEntries.length - 1])) ? 1 : 0.6,
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
      <div className="form-field-vertical" style={{ marginBottom: '1.5rem' }}>
        <label>Year of Publication <span style={{ color: 'red' }}>*</span></label>
        <input
          type="number"
          min="1900"
          max="2100"
          value={otherYear}
          onChange={(e) => {
            markDraftChanged()
            setOtherYear(e.target.value)
          }}
          style={{ width: '100%', padding: '0.5rem', border: readOnly ? 'none' : '1px solid #ddd', borderRadius: '4px', background: readOnly ? 'transparent' : 'white' }}
          disabled={readOnly}
        />
      </div>

      <label>Details<span style={{ color: '#d64550' }}>*</span></label>
      <textarea
        rows="8"
        value={otherDetails}
        onChange={(e) => {
          markDraftChanged()
          setOtherDetails(e.target.value)
        }}
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
              accept={getAcceptAttribute(FILE_TYPES.documents)}
              onChange={(e) => handleValidatedFileInput(
                e,
                (file) => {
                  markDraftChanged()
                  setEvidenceFile(file)
                },
                { allowedExtensions: FILE_TYPES.documents, label: 'Publication evidence' }
              )}
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
                    markDraftChanged()
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

  const handleDeletePublication = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Publication',
      message: 'Are you sure you want to delete this publication? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    })

    if (!confirmed) return

    try {
      await publicationsService.deletePublication(id)
      await fetchPersistedPublications()
      window.appToast('Publication deleted successfully.')
    } catch (error) {
      console.error('Failed to delete publication:', error)
      window.appToast('Failed to delete publication. Please try again.')
    }
  }

  const renderFinalSummary = () => {
    const hasAnyData = summaryData.length > 0
    if (!showFinalSummary && !hasAnyData) return null

    return (
      <div className="final-summary-section" style={{ 
        marginTop: '3rem', 
        padding: '2rem', 
        background: '#fff', 
        borderRadius: '12px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #3182ce', paddingBottom: '0.5rem' }}>
          <h2 style={{ color: '#1e3a5f', margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={24} color="#3182ce" /> Final Structured List (Confirmed Publications)
          </h2>
          <button 
            onClick={fetchPersistedPublications}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.5rem 1rem', 
              background: '#f7fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              color: '#4a5568', 
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
            title="Refresh list"
            onMouseOver={(e) => e.currentTarget.style.background = '#edf2f7'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f7fafc'}
          >
            <RotateCw size={16} /> Refresh
          </button>
        </div>
        
        {!hasAnyData && showFinalSummary && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No saved publications found in the database.</p>
            <p style={{ fontSize: '0.9rem' }}>If you just added data, it might take a moment to reflect here. Try clicking "Refresh".</p>
          </div>
        )}

        {hasAnyData && (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="summary-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Details</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Category/Level</th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: '#4a5568', fontWeight: '600', width: '100px' }}>Evidence</th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: '#4a5568', fontWeight: '600', width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((pub) => {
                  const isJournal = pub.publication_type === 'Journal'
                  const isConference = pub.publication_type === 'Conference'
                  const isMonograph = pub.publication_type === 'Monographs'
                  
                  let typeIcon = <FileText size={18} color="#718096" />
                  if (isJournal) typeIcon = <BookOpen size={18} color="#3182ce" />
                  if (isConference) typeIcon = <Users size={18} color="#38a169" />
                  if (isMonograph) typeIcon = <Award size={18} color="#d69e2e" />

                  return (
                    <tr key={pub.id} style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', color: '#2d3748' }}>
                          {typeIcon}
                          {pub.publication_type} {pub.sub_type && pub.sub_type !== pub.publication_type ? `(${pub.sub_type})` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#4a5568', fontSize: '0.95rem', maxWidth: '400px' }}>
                        <div style={{ maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pub.title || pub.title_of_book || pub.details}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#4a5568' }}>
                        {pub.quartile || pub.type_of_conference || '—'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {pub.evidence_file ? (
                          <a 
                            href={`http://${window.location.hostname}:5001/uploads/${pub.evidence_file}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            title="View Document"
                            style={{ color: '#3182ce', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', borderRadius: '4px', background: '#ebf8ff' }}
                          >
                            <Eye size={18} />
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {!readOnly && (
                          <button 
                            onClick={() => handleDeletePublication(pub.id)} 
                            style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Delete Entry"
                            onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

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
              onChange={(e) => {
                markDraftChanged()
                setPublicationType(e.target.value)
              }}
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
                onChange={(e) => {
                  markDraftChanged()
                  setBookSubType(e.target.value)
                }}
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
          
          {renderFinalSummary()}
        </div>
      </div>
    </div>
  )
}

export default ResearchPublications
