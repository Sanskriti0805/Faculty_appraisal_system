import React, { useState } from 'react'
import { useEffect } from 'react'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import './FormPages.css'
import { coursesService } from '../services/coursesService'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'

const isNotFoundError = (error) => error?.response?.status === 404

const deleteIgnoringNotFound = async (deleteFn, ids) => {
  const validIds = (ids || []).filter(id => Number.isFinite(Number(id)))
  const results = await Promise.allSettled(validIds.map(id => deleteFn(id)))

  const firstRealError = results.find(
    result => result.status === 'rejected' && !isNotFoundError(result.reason)
  )

  if (firstRealError) {
    throw firstRealError.reason
  }
}

const hasNewCourseRowData = (course) => {
  if (!course) return false
  return Boolean(
    (course.course_name && String(course.course_name).trim()) ||
    (course.course_code && String(course.course_code).trim()) ||
    (course.level && String(course.level).trim()) ||
    (course.remarks && String(course.remarks).trim()) ||
    course.cif_file ||
    course.existing_cif_file
  )
}

const NewCourses = () => {
  const { user } = useAuth()
  const [ugProgram, setUgProgram] = useState('')
  const [mastersProgram, setMastersProgram] = useState('')
  const [loading, setLoading] = useState(false)
  const [persistedCourseIds, setPersistedCourseIds] = useState([])
  
  const [ugCourses, setUgCourses] = useState([
    { id: 1, courseName: '', courseCode: '', level: '', remarks: '', cifFile: null }
  ])
  
  const [mastersCourses, setMastersCourses] = useState([
    { id: 1, courseName: '', courseCode: '', level: '', remarks: '', cifFile: null }
  ])
  
  const [doctoralCourses, setDoctoralCourses] = useState([
    { id: 1, courseName: '', courseCode: '', level: '', remarks: '', cifFile: null }
  ])

  const ugPrograms = ['B.Tech', 'B.Tech-M.Tech', 'B.Sc-M.Sc']
  const mastersPrograms = ['M.Tech']
  const ugLevelOptions = ['1', '2', '3', '4']
  const mastersLevelOptions = ['5', '6']
  const doctoralLevelOptions = ['7', '8']

  useEffect(() => {
    if (!user?.id) return

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const details = await apiClient.get(`/submissions/${mySub.data.id}`)
        const rows = Array.isArray(details?.data?.newCourses) ? details.data.newCourses : []
        if (rows.length === 0) return

        const mapRow = (row) => ({
          id: row.id,
          courseName: row.course_name || '',
          courseCode: row.course_code || '',
          level: row.level || '',
          remarks: row.remarks || '',
          cifFile: null,
          cif_file: row.cif_file || null
        })

        const ugRows = rows.filter((r) => r.level_type === 'UG').map(mapRow)
        const mastersRows = rows.filter((r) => r.level_type === 'Masters').map(mapRow)
        const doctoralRows = rows.filter((r) => r.level_type === 'Doctoral').map(mapRow)
        setPersistedCourseIds(rows.map(r => r.id).filter(Boolean))

        if (ugRows.length > 0) {
          setUgCourses(ugRows)
          setUgProgram(rows.find((r) => r.level_type === 'UG')?.program || '')
        }
        if (mastersRows.length > 0) {
          setMastersCourses(mastersRows)
          setMastersProgram(rows.find((r) => r.level_type === 'Masters')?.program || '')
        }
        if (doctoralRows.length > 0) {
          setDoctoralCourses(doctoralRows)
        }
      } catch (error) {
        console.error('Failed to prefill new courses:', error)
      }
    }

    hydrateExisting()
  }, [user])

  const addCourse = (section) => {
    const newCourse = {
      id: Date.now(),
      courseName: '',
      courseCode: '',
      level: '',
      remarks: '',
      cifFile: null
    }
    
    if (section === 'ug') {
      setUgCourses([...ugCourses, newCourse])
    } else if (section === 'masters') {
      setMastersCourses([...mastersCourses, newCourse])
    } else if (section === 'doctoral') {
      setDoctoralCourses([...doctoralCourses, newCourse])
    }
  }

  const removeCourse = (section, id) => {
    if (section === 'ug') {
      setUgCourses(ugCourses.filter(course => course.id !== id))
    } else if (section === 'masters') {
      setMastersCourses(mastersCourses.filter(course => course.id !== id))
    } else if (section === 'doctoral') {
      setDoctoralCourses(doctoralCourses.filter(course => course.id !== id))
    }
  }

  const updateCourse = (section, id, field, value) => {
    const updateArray = (courses) => 
      courses.map(course => 
        course.id === id ? { ...course, [field]: value } : course
      )
    
    if (section === 'ug') {
      setUgCourses(updateArray(ugCourses))
    } else if (section === 'masters') {
      setMastersCourses(updateArray(mastersCourses))
    } else if (section === 'doctoral') {
      setDoctoralCourses(updateArray(doctoralCourses))
    }
  }

  const handleFileUpload = (section, id, file) => {
    updateCourse(section, id, 'cifFile', file)
  }

  const clearUploadedFile = (section, id) => {
    const clearArray = (courses) =>
      courses.map((course) =>
        course.id === id
          ? { ...course, cifFile: null, cif_file: null }
          : course
      )

    if (section === 'ug') {
      setUgCourses(clearArray(ugCourses))
    } else if (section === 'masters') {
      setMastersCourses(clearArray(mastersCourses))
    } else if (section === 'doctoral') {
      setDoctoralCourses(clearArray(doctoralCourses))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
      const facultyId = authUser?.id
      if (!facultyId) {
        window.appToast('Session expired. Please login again.')
        return false
      }
      
      // Collect all courses from all sections
      const allCourses = [
        ...ugCourses.map(course => ({
          faculty_id: facultyId,
          level_type: 'UG',
          program: ugProgram,
          course_name: course.courseName,
          course_code: course.courseCode,
          level: course.level,
          remarks: course.remarks,
          cif_file: course.cifFile,
          existing_cif_file: course.cif_file || null
        })),
        ...mastersCourses.map(course => ({
          faculty_id: facultyId,
          level_type: 'Masters',
          program: mastersProgram,
          course_name: course.courseName,
          course_code: course.courseCode,
          level: course.level,
          remarks: course.remarks,
          cif_file: course.cifFile,
          existing_cif_file: course.cif_file || null
        })),
        ...doctoralCourses.map(course => ({
          faculty_id: facultyId,
          level_type: 'Doctoral',
          program: '',
          course_name: course.courseName,
          course_code: course.courseCode,
          level: course.level,
          remarks: course.remarks,
          cif_file: course.cifFile,
          existing_cif_file: course.cif_file || null
        }))
      ]

      // Save each course - only NEW courses (without ID from previous submission)
      await deleteIgnoringNotFound((id) => apiClient.delete(`/courses/new/${id}`), persistedCourseIds)

      const promises = allCourses
        .filter(course => hasNewCourseRowData(course))
        .map(course => coursesService.createNewCourse(course))

      const createdResponses = await Promise.all(promises)
      const createdIds = createdResponses
        .map(response => response?.data?.id)
        .filter(id => Number.isFinite(Number(id)))

      setPersistedCourseIds(createdIds)
      
      window.appToast('Data saved successfully!')
      console.log('Saved courses to database')
      return true
    } catch (error) {
      console.error('Error saving courses:', error)
      window.appToast('Error saving data: ' + (error.response?.data?.message || error.message))
      return false
    } finally {
      setLoading(false)
    }
  }

  const renderCourseTable = (section, courses, showProgramDropdown = false, programs = [], selectedProgram = '', setProgram = null, levelOptions = []) => (
    <div className="form-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>{section === 'ug' ? 'UG' : section === 'masters' ? 'Masters Level' : 'Doctoral Level'}</h3>
        {showProgramDropdown && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500' }}>Select Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setProgram(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}
            >
              <option value="">-- Select Program --</option>
              {programs.map(prog => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '200px' }}>Course Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>Course Code</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '120px' }}>Level</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '200px' }}>Remarks</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>Upload CIF</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', width: '80px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, index) => (
              <tr key={course.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="text"
                    value={course.courseName}
                    onChange={(e) => updateCourse(section, course.id, 'courseName', e.target.value)}
                    placeholder="Enter course name"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="text"
                    value={course.courseCode}
                    onChange={(e) => updateCourse(section, course.id, 'courseCode', e.target.value)}
                    placeholder="Enter code"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <select
                    value={course.level}
                    onChange={(e) => updateCourse(section, course.id, 'level', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">Select</option>
                    {levelOptions.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="text"
                    value={course.remarks}
                    onChange={(e) => updateCourse(section, course.id, 'remarks', e.target.value)}
                    placeholder="Enter remarks"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}>
                    <Upload size={16} />
                    <span style={{ fontSize: '0.875rem' }}>
                      {course.cifFile ? course.cifFile.name : (course.cif_file || 'Choose file')}
                    </span>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(section, course.id, e.target.files[0])}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                  <FilePreviewButton
                    file={course.cifFile || course.cif_file}
                    style={{ width: '32px', height: '32px', marginLeft: '0.5rem' }}
                  />
                  {(course.cifFile || course.cif_file) && (
                    <button
                      type="button"
                      onClick={() => clearUploadedFile(section, course.id)}
                      title="Remove uploaded document"
                      style={{
                        width: '32px',
                        height: '32px',
                        marginLeft: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <button
                    onClick={() => removeCourse(section, course.id)}
                    disabled={courses.length === 1}
                    style={{
                      padding: '0.5rem',
                      border: 'none',
                      backgroundColor: courses.length === 1 ? '#e0e0e0' : '#ff4444',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: courses.length === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => addCourse(section)}
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
          fontSize: '0.875rem'
        }}
      >
        <Plus size={16} />
        Add Course
      </button>
    </div>
  )

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Courses Developed</h1>
        </div>
      </div>

      <div className="form-card">
        {renderCourseTable('ug', ugCourses, true, ugPrograms, ugProgram, setUgProgram, ugLevelOptions)}
      </div>

      <div className="form-card">
        {renderCourseTable('masters', mastersCourses, true, mastersPrograms, mastersProgram, setMastersProgram, mastersLevelOptions)}
      </div>

      <div className="form-card">
        {renderCourseTable('doctoral', doctoralCourses, false, [], '', null, doctoralLevelOptions)}
      </div>

      <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
  )
}

export default NewCourses

