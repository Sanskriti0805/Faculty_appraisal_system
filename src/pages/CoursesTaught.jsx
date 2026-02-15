import React, { useState } from 'react'
import { Plus, Trash2, Save, Upload, FileText, X } from 'lucide-react'
import './CoursesTaught.css'

const CoursesTaught = () => {
  const [selectedSection, setSelectedSection] = useState('courses')
  const [selectedSemester, setSelectedSemester] = useState('fall')

  const [fallCourses, setFallCourses] = useState([
    { id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
    { id: 2, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  const [springCourses, setSpringCourses] = useState([
    { id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
    { id: 2, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  const [summerCourses, setSummerCourses] = useState([
    { id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  // Projects Guided data
  const [fallProjects, setFallProjects] = useState([
    { id: 1, projectTitle: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null },
  ])

  const [springProjects, setSpringProjects] = useState([
    { id: 1, projectTitle: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null },
  ])

  const [summerProjects, setSummerProjects] = useState([
    { id: 1, projectTitle: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null },
  ])

  const handleInputChange = (semester, index, field, value) => {
    const updateItems = (items) => {
      const updated = [...items]
      updated[index][field] = value
      return updated
    }

    if (selectedSection === 'courses') {
      if (semester === 'fall') {
        setFallCourses(updateItems(fallCourses))
      } else if (semester === 'spring') {
        setSpringCourses(updateItems(springCourses))
      } else if (semester === 'summer') {
        setSummerCourses(updateItems(summerCourses))
      }
    } else {
      if (semester === 'fall') {
        setFallProjects(updateItems(fallProjects))
      } else if (semester === 'spring') {
        setSpringProjects(updateItems(springProjects))
      } else if (semester === 'summer') {
        setSummerProjects(updateItems(summerProjects))
      }
    }
  }

  const addCourse = (semester) => {
    if (selectedSection === 'courses') {
      const newCourse = {
        id: Date.now(),
        title: '',
        percentage: '',
        students: '',
        feedback: '',
        remarks: '',
        feedbackFile: null
      }

      if (semester === 'fall') {
        setFallCourses([...fallCourses, newCourse])
      } else if (semester === 'spring') {
        setSpringCourses([...springCourses, newCourse])
      } else if (semester === 'summer') {
        setSummerCourses([...summerCourses, newCourse])
      }
    } else {
      const newProject = {
        id: Date.now(),
        projectTitle: '',
        studentName: '',
        duration: '',
        outcome: '',

        remarks: '',
        certificateFile: null
      }

      if (semester === 'fall') {
        setFallProjects([...fallProjects, newProject])
      } else if (semester === 'spring') {
        setSpringProjects([...springProjects, newProject])
      } else if (semester === 'summer') {
        setSummerProjects([...summerProjects, newProject])
      }
    }
  }

  const removeCourse = (semester, index) => {
    if (selectedSection === 'courses') {
      if (semester === 'fall' && fallCourses.length > 1) {
        setFallCourses(fallCourses.filter((_, i) => i !== index))
      } else if (semester === 'spring' && springCourses.length > 1) {
        setSpringCourses(springCourses.filter((_, i) => i !== index))
      } else if (semester === 'summer' && summerCourses.length > 1) {
        setSummerCourses(summerCourses.filter((_, i) => i !== index))
      }
    } else {
      if (semester === 'fall' && fallProjects.length > 1) {
        setFallProjects(fallProjects.filter((_, i) => i !== index))
      } else if (semester === 'spring' && springProjects.length > 1) {
        setSpringProjects(springProjects.filter((_, i) => i !== index))
      } else if (semester === 'summer' && summerProjects.length > 1) {
        setSummerProjects(summerProjects.filter((_, i) => i !== index))
      }
    }
  }

  const handleSave = () => {
    const data = {
      courses: {
        fallCourses,
        springCourses,
        summerCourses,
      },
      projects: {
        fallProjects,
        springProjects,
        summerProjects,
      }
    }
    console.log('Saving data:', data)
    alert('Data saved successfully!')
  }

  const getCurrentItems = () => {
    if (selectedSection === 'courses') {
      if (selectedSemester === 'fall') return fallCourses
      if (selectedSemester === 'spring') return springCourses
      return summerCourses
    } else {
      if (selectedSemester === 'fall') return fallProjects
      if (selectedSemester === 'spring') return springProjects
      return summerProjects
    }
  }

  const getSemesterLabel = () => {
    if (selectedSemester === 'fall') return 'Fall / Odd Semester'
    if (selectedSemester === 'spring') return 'Spring / Even Semester'
    return 'Summer Term'
  }

  const getSectionTitle = () => {
    if (selectedSection === 'courses') {
      return '4.1: Courses Taught'
    }
    return '4.2: BTech/MTech/MS/LUSIP/SLI/Ph.D./Other Projects Guided / Co-Advised / Mentored'
  }

  const renderTable = (semester, items, semesterLabel) => {
    return (
      <div className="semester-section">
        <div className="semester-header">
          <h3>{semesterLabel}</h3>
          <button
            className="add-course-btn"
            onClick={() => addCourse(semester)}
          >
            <Plus size={18} />
            {selectedSection === 'courses' ? 'Add Course' : 'Add Project'}
          </button>
        </div>

        <div className="table-container">
          {selectedSection === 'courses' ? renderCoursesTable(semester, items) : renderProjectsTable(semester, items)}
        </div>
      </div>
    )
  }

  const renderCoursesTable = (semester, courses) => {
    return (
      <table className="courses-table">
        <thead>
          <tr>
            <th style={{ width: '8%' }}>Course</th>
            <th style={{ width: '25%' }}>Course Title/Name</th>
            <th style={{ width: '20%' }}>% of Course taught / handled alone, if there were two or more co-instructors</th>
            <th style={{ width: '15%' }}>Number of Students Taught</th>
            <th style={{ width: '25%' }}>Student Feedback Score</th>
            <th style={{ width: '15%' }}>Remarks, if any</th>
            <th style={{ width: '5%' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course, index) => (
            <tr key={course.id}>
              <td className="course-number">Course-{index + 1}</td>
              <td>
                <input
                  type="text"
                  value={course.title}
                  onChange={(e) => handleInputChange(semester, index, 'title', e.target.value)}
                  placeholder="Enter course title"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={course.percentage}
                  onChange={(e) => handleInputChange(semester, index, 'percentage', e.target.value)}
                  placeholder="e.g., 100% or 50%"
                />
              </td>
              <td>
                <input
                  type="number"
                  value={course.students}
                  onChange={(e) => handleInputChange(semester, index, 'students', e.target.value)}
                  placeholder="Number"
                />
              </td>
              <td>
                <div className="feedback-container">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="10"
                    value={course.feedback}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty or valid decimal with up to 3 decimal places
                      if (value === '' || /^\d*\.?\d{0,3}$/.test(value)) {
                        handleInputChange(semester, index, 'feedback', value);
                      }
                    }}
                    placeholder="e.g., 4.567"
                    className="feedback-input"
                  />

                  <div className="compact-upload-wrapper">
                    <input
                      type="file"
                      id={`file-upload-${semester}-${index}`}
                      accept=".pdf"
                      onChange={(e) => handleInputChange(semester, index, 'feedbackFile', e.target.files[0])}
                      className="file-input-hidden"
                    />
                    <label
                      htmlFor={`file-upload-${semester}-${index}`}
                      className={`compact-upload-btn ${course.feedbackFile ? 'has-file' : ''}`}
                      title={course.feedbackFile ? course.feedbackFile.name : "Upload PDF"}
                    >
                      {course.feedbackFile ? <FileText size={18} /> : <Upload size={18} />}
                    </label>
                    {course.feedbackFile && (
                      <button
                        className="compact-remove-btn"
                        onClick={() => handleInputChange(semester, index, 'feedbackFile', null)}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <input
                  type="text"
                  value={course.remarks}
                  onChange={(e) => handleInputChange(semester, index, 'remarks', e.target.value)}
                  placeholder="Any remarks"
                />
              </td>
              <td>
                <button
                  className="delete-btn"
                  onClick={() => removeCourse(semester, index)}
                  disabled={courses.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const renderProjectsTable = (semester, projects) => {
    return (
      <table className="courses-table">
        <thead>
          <tr>
            <th style={{ width: '20%' }}>Project Title</th>
            <th style={{ width: '20%' }}>Name of the Student</th>
            <th style={{ width: '15%' }}>Duration of Project</th>
            <th style={{ width: '20%' }}>Major Outcome</th>
            <th style={{ width: '15%' }}>Remarks, if any</th>
            <th style={{ width: '10%' }}>Upload Certificate</th>
            <th style={{ width: '5%' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <tr key={project.id}>
              <td>
                <input
                  type="text"
                  value={project.projectTitle}
                  onChange={(e) => handleInputChange(semester, index, 'projectTitle', e.target.value)}
                  placeholder="Enter project title"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={project.studentName}
                  onChange={(e) => handleInputChange(semester, index, 'studentName', e.target.value)}
                  placeholder="Student name"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={project.duration}
                  onChange={(e) => handleInputChange(semester, index, 'duration', e.target.value)}
                  placeholder="e.g., 6 months"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={project.outcome}
                  onChange={(e) => handleInputChange(semester, index, 'outcome', e.target.value)}
                  placeholder="Major outcome"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={project.remarks}
                  onChange={(e) => handleInputChange(semester, index, 'remarks', e.target.value)}
                  placeholder="Any remarks"
                />
              </td>
              <td>
                <div className="compact-upload-wrapper" style={{ margin: '0 auto' }}>
                  <input
                    type="file"
                    id={`cert-upload-${semester}-${index}`}
                    accept=".pdf"
                    onChange={(e) => handleInputChange(semester, index, 'certificateFile', e.target.files[0])}
                    className="file-input-hidden"
                  />
                  <label
                    htmlFor={`cert-upload-${semester}-${index}`}
                    className={`compact-upload-btn ${project.certificateFile ? 'has-file' : ''}`}
                    title={project.certificateFile ? project.certificateFile.name : "Upload PDF"}
                  >
                    {project.certificateFile ? <FileText size={18} /> : <Upload size={18} />}
                  </label>
                  {project.certificateFile && (
                    <button
                      className="compact-remove-btn"
                      onClick={() => handleInputChange(semester, index, 'certificateFile', null)}
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </td>
              <td>
                <button
                  className="delete-btn"
                  onClick={() => removeCourse(semester, index)}
                  disabled={projects.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="courses-taught">
      <div className="page-header">
        <div>
          <h1 className="page-title">Courses Taught & Projects Guided</h1>
          <p className="page-subtitle">{getSectionTitle()}</p>
        </div>
        <button className="save-button" onClick={handleSave}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="selector-container">
        <div className="section-selector">
          <label htmlFor="section-select">Select Section:</label>
          <select
            id="section-select"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="section-dropdown"
          >
            <option value="courses">4.1: Courses Taught</option>
            <option value="projects">4.2: Projects Guided / Co-Advised / Mentored</option>
          </select>
        </div>

        <div className="semester-selector">
          <label htmlFor="semester-select">Select Semester:</label>
          <select
            id="semester-select"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="semester-dropdown"
          >
            <option value="fall">Fall / Odd Semester</option>
            <option value="spring">Spring / Even Semester</option>
            <option value="summer">Summer Term</option>
          </select>
        </div>
      </div>

      {renderTable(selectedSemester, getCurrentItems(), getSemesterLabel())}
    </div>
  )
}

export default CoursesTaught

