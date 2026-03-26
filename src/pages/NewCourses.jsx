import React, { useState } from 'react'
import { Save, Plus, Trash2, Upload } from 'lucide-react'
import './FormPages.css'
import { coursesService } from '../services/coursesService'

const NewCourses = () => {
  const [ugProgram, setUgProgram] = useState('')
  const [mastersProgram, setMastersProgram] = useState('')
  const [loading, setLoading] = useState(false)
  
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

  const handleSave = async () => {
    setLoading(true)
    try {
      const facultyId = 1 // TODO: Replace with actual logged-in faculty ID
      
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
          cif_file: course.cifFile
        })),
        ...mastersCourses.map(course => ({
          faculty_id: facultyId,
          level_type: 'Masters',
          program: mastersProgram,
          course_name: course.courseName,
          course_code: course.courseCode,
          level: course.level,
          remarks: course.remarks,
          cif_file: course.cifFile
        })),
        ...doctoralCourses.map(course => ({
          faculty_id: facultyId,
          level_type: 'Doctoral',
          program: '',
          course_name: course.courseName,
          course_code: course.courseCode,
          level: course.level,
          remarks: course.remarks,
          cif_file: course.cifFile
        }))
      ]

      // Save each course
      const promises = allCourses
        .filter(course => course.course_name && course.course_code) // Only save filled courses
        .map(course => coursesService.createNewCourse(course))

      await Promise.all(promises)
      
      alert('Data saved successfully!')
      console.log('Saved courses to database')
    } catch (error) {
      console.error('Error saving courses:', error)
      alert('Error saving data: ' + (error.response?.data?.message || error.message))
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
            <label style={{ fontWeight: '500' }}>Select Program:</label>
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
                      {course.cifFile ? course.cifFile.name : 'Choose file'}
                    </span>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(section, course.id, e.target.files[0])}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
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
          <p className="page-subtitle">Section 6: New Courses Developed</p>
        </div>
        <button className="save-button" onClick={handleSave} disabled={loading}>
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
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
    </div>
  )
}

export default NewCourses

