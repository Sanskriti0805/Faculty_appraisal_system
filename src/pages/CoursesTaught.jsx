import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Upload, FileText, X, ExternalLink } from 'lucide-react'
import apiClient from '../services/api';
import './CoursesTaught.css'

const CoursesTaught = ({ initialData, readOnly }) => {
  const [selectedSection, setSelectedSection] = useState('courses')
  const [selectedSemester, setSelectedSemester] = useState('fall')

  const [fallCourses, setFallCourses] = useState([
    { id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  const [springCourses, setSpringCourses] = useState([
    { id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  const [summerCourses, setSummerCourses] = useState([
    { id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  // Projects Guided data
  const [fallProjects, setFallProjects] = useState([
    { id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null },
  ])

  const [springProjects, setSpringProjects] = useState([
    { id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null },
  ])

  const [summerProjects, setSummerProjects] = useState([
    { id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null },
  ])

  useEffect(() => {
    if (initialData) {
      const { courses, projects } = initialData;
      if (courses) {
        setFallCourses(courses.filter(c => c.semester === 'Fall').map(c => ({
          id: c.id, title: c.course_name, percentage: c.percentage || '', students: c.enrollment, feedback: c.feedback_score, remarks: c.remarks || '', evidence_file: c.evidence_file
        })) || [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }]);

        setSpringCourses(courses.filter(c => c.semester === 'Spring').map(c => ({
          id: c.id, title: c.course_name, percentage: c.percentage || '', students: c.enrollment, feedback: c.feedback_score, remarks: c.remarks || '', evidence_file: c.evidence_file
        })) || [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }]);

        setSummerCourses(courses.filter(c => c.semester === 'Summer').map(c => ({
          id: c.id, title: c.course_name, percentage: c.percentage || '', students: c.enrollment, feedback: c.feedback_score, remarks: c.remarks || '', evidence_file: c.evidence_file
        })) || [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }]);
      }
    }
  }, [initialData])

  const handleInputChange = (semester, index, field, value) => {
    if (readOnly) return;
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
    if (readOnly) return;
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
        projectType: '',
        role: '',
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
    if (readOnly) return;
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

  const handleSave = async () => {
    if (readOnly) return;
    try {
      // Save Courses
      const allCourses = [
        ...fallCourses.map(c => ({ ...c, semester: 'Fall' })),
        ...springCourses.map(c => ({ ...c, semester: 'Spring' })),
        ...summerCourses.map(c => ({ ...c, semester: 'Summer' }))
      ];

      for (const course of allCourses) {
        if (course.title) {
          await apiClient.post('/courses', {
            faculty_id: 1,
            course_name: course.title,
            semester: course.semester,
            enrollment: course.students === '' ? null : parseInt(course.students),
            feedback_score: course.feedback === '' ? null : parseFloat(course.feedback),
            status: 'submitted'
          });
        }
      }

      alert('Data saved successfully!');
    } catch (error) {
      console.error('Error saving courses:', error);
      alert('Failed to save data. Please check if all numeric fields are valid.');
    }
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
          {!readOnly && (
            <button
              className="add-course-btn"
              onClick={() => addCourse(semester)}
            >
              <Plus size={18} />
              {selectedSection === 'courses' ? 'Add Course' : 'Add Project'}
            </button>
          )}
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
            <th style={{ width: '20%' }}>% of Course taught alone</th>
            <th style={{ width: '15%' }}>Students Taught</th>
            <th style={{ width: '20%' }}>Feedback Score</th>
            <th style={{ width: '12%' }}>Remarks</th>
            {!readOnly && <th style={{ width: '5%' }}>Action</th>}
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
                  disabled={readOnly}
                  placeholder={readOnly ? '' : "Enter course title"}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={course.percentage}
                  onChange={(e) => handleInputChange(semester, index, 'percentage', e.target.value)}
                  disabled={readOnly}
                  placeholder={readOnly ? '' : "e.g., 100%"}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={course.students}
                  onChange={(e) => handleInputChange(semester, index, 'students', e.target.value)}
                  disabled={readOnly}
                />
              </td>
              <td>
                <div className="feedback-container">
                  <input
                    type="number"
                    step="0.001"
                    value={course.feedback}
                    onChange={(e) => handleInputChange(semester, index, 'feedback', e.target.value)}
                    disabled={readOnly}
                    className="feedback-input"
                  />

                  {readOnly ? (
                    course.evidence_file ? (
                      <a href={`http://${window.location.hostname}:5000/uploads/${course.evidence_file}`} target="_blank" rel="noopener noreferrer" className="compact-upload-btn has-file">
                        <ExternalLink size={18} />
                      </a>
                    ) : null
                  ) : (
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
                      >
                        {course.feedbackFile ? <FileText size={18} /> : <Upload size={18} />}
                      </label>
                    </div>
                  )}
                </div>
              </td>
              <td>
                <input
                  type="text"
                  value={course.remarks}
                  onChange={(e) => handleInputChange(semester, index, 'remarks', e.target.value)}
                  disabled={readOnly}
                />
              </td>
              {!readOnly && (
                <td>
                  <button className="delete-btn" onClick={() => removeCourse(semester, index)} disabled={courses.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
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
            <th style={{ width: '15%' }}>Project Title</th>
            <th style={{ width: '12%' }}>Type</th>
            <th style={{ width: '12%' }}>Role</th>
            <th style={{ width: '15%' }}>Student</th>
            <th style={{ width: '10%' }}>Duration</th>
            <th style={{ width: '12%' }}>Outcome</th>
            <th style={{ width: '12%' }}>Remarks</th>
            <th style={{ width: '7%' }}>Evidence</th>
            {!readOnly && <th style={{ width: '5%' }}>Action</th>}
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
                  disabled={readOnly}
                />
              </td>
              <td>
                <select value={project.projectType} onChange={(e) => handleInputChange(semester, index, 'projectType', e.target.value)} disabled={readOnly}>
                  <option value="">Select Type</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="MS">MS</option>
                  <option value="LUSIP">LUSIP</option>
                  <option value="Mini Project">Mini Project</option>
                  <option value="M.Sc.">M.Sc.</option>
                  <option value="SLI">SLI</option>
                  <option value="Other Projects">Other Projects</option>
                </select>
              </td>
              <td>
                <select value={project.role} onChange={(e) => handleInputChange(semester, index, 'role', e.target.value)} disabled={readOnly}>
                  <option value="">Select Role</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Co-Supervisor">Co-Supervisor</option>
                </select>
              </td>
              <td><input type="text" value={project.studentName} onChange={(e) => handleInputChange(semester, index, 'studentName', e.target.value)} disabled={readOnly} /></td>
              <td><input type="text" value={project.duration} onChange={(e) => handleInputChange(semester, index, 'duration', e.target.value)} disabled={readOnly} /></td>
              <td><input type="text" value={project.outcome} onChange={(e) => handleInputChange(semester, index, 'outcome', e.target.value)} disabled={readOnly} /></td>
              <td><input type="text" value={project.remarks} onChange={(e) => handleInputChange(semester, index, 'remarks', e.target.value)} disabled={readOnly} /></td>
              <td>
                {readOnly ? (
                  project.evidence_file ? (
                    <a href={`http://${window.location.hostname}:5000/uploads/${project.evidence_file}`} target="_blank" rel="noopener noreferrer" className="compact-upload-btn has-file">
                      <ExternalLink size={18} />
                    </a>
                  ) : <span style={{ color: '#ccc' }}>None</span>
                ) : (
                  <div className="compact-upload-wrapper">
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
                    >
                      {project.certificateFile ? <FileText size={18} /> : <Upload size={18} />}
                    </label>
                  </div>
                )}
              </td>
              {!readOnly && (
                <td>
                  <button className="delete-btn" onClick={() => removeCourse(semester, index)} disabled={projects.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className={`courses-taught ${readOnly ? 'read-only-mode' : ''}`}>
      {!readOnly && (
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
      )}

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
            <option value="projects">4.2: Projects Guided</option>
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
