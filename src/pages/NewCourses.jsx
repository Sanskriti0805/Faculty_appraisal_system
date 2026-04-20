import React, { useState, useEffect } from 'react'
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
    (course.level_type && String(course.level_type).trim()) ||
    (course.remarks && String(course.remarks).trim()) ||
    course.cif_file ||
    course.existing_cif_file
  )
}

const NewCourses = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [persistedCourseIds, setPersistedCourseIds] = useState([])
  
  const [courses, setCourses] = useState([
    { id: 1, courseName: '', courseCode: '', levelType: '', program: '', level: '', remarks: '', cifFile: null }
  ])

  const levelTypeOptions = ['UG', 'PG', 'Doctoral']

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
          levelType: row.level_type === 'Masters' ? 'PG' : (row.level_type || ''),
          program: row.program || '',
          level: row.level || '',
          remarks: row.remarks || '',
          cifFile: null,
          cif_file: row.cif_file || null
        })

        const mappedCourses = rows.map(mapRow)
        if (mappedCourses.length > 0) {
          setCourses(mappedCourses)
          setPersistedCourseIds(mappedCourses.map(r => r.id).filter(Boolean))
        }
      } catch (error) {
        console.error('Failed to prefill new courses:', error)
      }
    }

    hydrateExisting()
  }, [user])

  const addCourse = () => {
    const newCourse = {
      id: Date.now(),
      courseName: '',
      courseCode: '',
      levelType: '',
      program: '',
      level: '',
      remarks: '',
      cifFile: null
    }
    setCourses([...courses, newCourse])
  }

  const removeCourse = (id) => {
    setCourses(courses.filter(course => course.id !== id))
  }

  const updateCourse = (id, field, value) => {
    setCourses(courses.map(course => {
      if (course.id === id) {
        const result = { ...course, [field]: value }
        // reset program and level when levelType changes
        if (field === 'levelType') {
           result.program = ''
           result.level = ''
        } else if (field === 'program') {
           result.level = ''
        }
        return result
      }
      return course
    }))
  }

  const handleFileUpload = (id, file) => {
    updateCourse(id, 'cifFile', file)
  }

  const clearUploadedFile = (id) => {
    setCourses(courses.map(course =>
      course.id === id ? { ...course, cifFile: null, cif_file: null } : course
    ))
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
      
      const allCourses = courses.map(course => ({
        faculty_id: facultyId,
        level_type: course.levelType === 'PG' ? 'PG' : course.levelType,
        program: course.program,
        course_name: course.courseName,
        course_code: course.courseCode,
        level: course.level,
        remarks: course.remarks,
        cif_file: course.cifFile,
        existing_cif_file: course.cif_file || null
      }))

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
      return true
    } catch (error) {
      console.error('Error saving courses:', error)
      window.appToast('Error saving data: ' + (error.response?.data?.message || error.message))
      return false
    } finally {
      setLoading(false)
    }
  }

  const getProgramOptions = (levelType) => {
    if (levelType === 'UG') return ['B.Tech', 'B.Tech-M.Tech', 'B.Sc-M.Sc']
    if (levelType === 'PG') return ['M.Tech', 'MS', 'B.Tech-M.Tech']
    return []
  }

  const getLevelOptions = (levelType, program) => {
    if (levelType === 'UG') return ['1', '2', '3', '4']
    if (levelType === 'PG') {
      if (program === 'B.Tech-M.Tech') return ['5']
      return ['5', '6']
    }
    if (levelType === 'Doctoral') return ['7', '8']
    return ['1', '2', '3', '4', '5', '6', '7', '8']
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Courses Developed</h1>
          <p className="page-subtitle">Add details about newly developed courses</p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section">
          <div style={{ overflowX: 'auto', padding: '1rem 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>Course Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '100px' }}>Course Code</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '130px' }}>Level Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '140px' }}>Program</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '100px' }}>Level</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>Remarks</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '150px' }}>Upload CIF</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '60px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="text"
                        value={course.courseName}
                        onChange={(e) => updateCourse(course.id, 'courseName', e.target.value)}
                        placeholder="Course name"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="text"
                        value={course.courseCode}
                        onChange={(e) => updateCourse(course.id, 'courseCode', e.target.value)}
                        placeholder="Code"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={course.levelType}
                        onChange={(e) => updateCourse(course.id, 'levelType', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="">Select Level</option>
                        {levelTypeOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={course.program}
                        onChange={(e) => updateCourse(course.id, 'program', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        disabled={!course.levelType || getProgramOptions(course.levelType).length === 0}
                      >
                        <option value="">Select</option>
                        {getProgramOptions(course.levelType).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={course.level}
                        onChange={(e) => updateCourse(course.id, 'level', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        disabled={!course.levelType || !course.program}
                      >
                        <option value="">Select</option>
                        {getLevelOptions(course.levelType, course.program).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="text"
                        value={course.remarks}
                        onChange={(e) => updateCourse(course.id, 'remarks', e.target.value)}
                        placeholder="Remarks"
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
                        backgroundColor: '#f9f9f9',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}>
                        <Upload size={16} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', textOverflow: 'ellipsis', overflow: 'hidden' }} title={(course.cifFile ? course.cifFile.name : course.cif_file) || 'Choose file'}>
                          {course.cifFile ? course.cifFile.name : (course.cif_file || 'Choose file')}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(course.id, e.target.files[0])}
                          style={{ display: 'none' }}
                          accept=".pdf,.doc,.docx"
                        />
                      </label>
                      <div style={{ display: 'flex', marginTop: '4px' }}>
                        <FilePreviewButton
                          file={course.cifFile || course.cif_file}
                          style={{ width: '28px', height: '28px' }}
                        />
                        {(course.cifFile || course.cif_file) && (
                          <button
                            type="button"
                            onClick={() => clearUploadedFile(course.id)}
                            title="Remove uploaded document"
                            style={{
                              width: '28px',
                              height: '28px',
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
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => removeCourse(course.id)}
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
            onClick={addCourse}
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
      </div>

      <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
  )
}

export default NewCourses
