import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Upload, FileText, X, ExternalLink } from 'lucide-react'
import apiClient from '../services/api';
import './CoursesTaught.css'
import FormActions from '../components/FormActions'
import FilePreviewButton from '../components/FilePreviewButton'
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

const ReadOnlyField = ({ value, readOnly, children }) => (
  readOnly
    ? <div className="readonly-table-text">{value === null || value === undefined || value === '' ? '—' : String(value)}</div>
    : children
)

const hasCourseRowData = (course) => {
  if (!course) return false
  return Boolean(
    (course.title && String(course.title).trim()) ||
    (course.percentage && String(course.percentage).trim()) ||
    (course.students !== '' && course.students !== null && course.students !== undefined) ||
    (course.feedback !== '' && course.feedback !== null && course.feedback !== undefined) ||
    (course.remarks && String(course.remarks).trim()) ||
    course.feedbackFile ||
    course.evidence_file
  )
}

const hasProjectRowData = (project) => {
  if (!project) return false
  return Boolean(
    (project.projectTitle && String(project.projectTitle).trim()) ||
    (project.projectType && String(project.projectType).trim()) ||
    (project.role && String(project.role).trim()) ||
    (project.studentName && String(project.studentName).trim()) ||
    (project.duration && String(project.duration).trim()) ||
    (project.outcome && String(project.outcome).trim()) ||
    (project.remarks && String(project.remarks).trim()) ||
    project.certificateFile ||
    project.evidence_file
  )
}

const CoursesTaught = ({ initialData, readOnly }) => {
  const { user } = useAuth()
  const [selectedSection, setSelectedSection] = useState('courses')
  const [selectedSemester, setSelectedSemester] = useState('fall')
  const [persistedCourseIds, setPersistedCourseIds] = useState([])

  const [fallCourses, setFallCourses] = useState([
    { id: 1, dbId: null, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  const [springCourses, setSpringCourses] = useState([
    { id: 1, dbId: null, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
  ])

  const [summerCourses, setSummerCourses] = useState([
    { id: 1, dbId: null, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null },
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
      const { courses } = initialData;
      if (courses) {
        const allRows = courses || []
        const courseRows = allRows.filter(c => (c.section || 'courses') !== 'projects')
        const projectRows = allRows.filter(c => c.section === 'projects')

        setPersistedCourseIds(allRows.map(c => c.id).filter(Boolean))
        setFallCourses(courseRows.filter(c => c.semester === 'Fall').map(c => ({
          id: c.id,
          title: c.course_name || '',
          percentage: c.percentage || '',
          students: c.enrollment,
          feedback: c.feedback_score,
          remarks: c.remarks || '',
          evidence_file: c.evidence_file || null,
          feedbackFile: null
        })) || [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }]);

        setSpringCourses(courseRows.filter(c => c.semester === 'Spring').map(c => ({
          id: c.id,
          title: c.course_name || '',
          percentage: c.percentage || '',
          students: c.enrollment,
          feedback: c.feedback_score,
          remarks: c.remarks || '',
          evidence_file: c.evidence_file || null,
          feedbackFile: null
        })) || [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }]);

        setSummerCourses(courseRows.filter(c => c.semester === 'Summer').map(c => ({
          id: c.id,
          title: c.course_name || '',
          percentage: c.percentage || '',
          students: c.enrollment,
          feedback: c.feedback_score,
          remarks: c.remarks || '',
          evidence_file: c.evidence_file || null,
          feedbackFile: null
        })) || [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }]);

        const mapProject = (p) => ({
          id: p.id,
          projectTitle: p.project_title || '',
          projectType: p.project_type || '',
          role: p.project_role || '',
          studentName: p.student_name || '',
          duration: p.project_duration || '',
          outcome: p.project_outcome || '',
          remarks: p.remarks || '',
          evidence_file: p.evidence_file || null,
          certificateFile: null
        })

        const fallProjectsRows = projectRows.filter(p => p.semester === 'Fall').map(mapProject)
        const springProjectsRows = projectRows.filter(p => p.semester === 'Spring').map(mapProject)
        const summerProjectsRows = projectRows.filter(p => p.semester === 'Summer').map(mapProject)

        setFallProjects(fallProjectsRows.length ? fallProjectsRows : [{ id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null }])
        setSpringProjects(springProjectsRows.length ? springProjectsRows : [{ id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null }])
        setSummerProjects(summerProjectsRows.length ? summerProjectsRows : [{ id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null }])
      }
    }
  }, [initialData])

  useEffect(() => {
    // Editable mode should show previously saved entries.
    if (readOnly || initialData || !user?.id) return

    const hydrateFromSubmission = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my')
        if (!mySub?.success || !mySub?.data?.id) return

        const subDetails = await apiClient.get(`/submissions/${mySub.data.id}`)
        if (!subDetails?.success) return

        const existingRows = Array.isArray(subDetails.data?.courses) ? subDetails.data.courses : []
        if (existingRows.length === 0) return

        const existingCourses = existingRows.filter(c => (c.section || 'courses') !== 'projects')
        const existingProjects = existingRows.filter(c => c.section === 'projects')

        setPersistedCourseIds(existingRows.map(c => c.id).filter(Boolean))

        const mapCourse = (c) => ({
          id: c.id,
          title: c.course_name || '',
          percentage: c.percentage || '',
          students: c.enrollment || '',
          feedback: c.feedback_score || '',
          remarks: c.remarks || '',
          evidence_file: c.evidence_file || null,
          feedbackFile: null
        })

        const fall = existingCourses.filter(c => c.semester === 'Fall').map(mapCourse)
        const spring = existingCourses.filter(c => c.semester === 'Spring').map(mapCourse)
        const summer = existingCourses.filter(c => c.semester === 'Summer').map(mapCourse)

        const mapProject = (p) => ({
          id: p.id,
          projectTitle: p.project_title || '',
          projectType: p.project_type || '',
          role: p.project_role || '',
          studentName: p.student_name || '',
          duration: p.project_duration || '',
          outcome: p.project_outcome || '',
          remarks: p.remarks || '',
          evidence_file: p.evidence_file || null,
          certificateFile: null
        })

        const fallProjectsRows = existingProjects.filter(p => p.semester === 'Fall').map(mapProject)
        const springProjectsRows = existingProjects.filter(p => p.semester === 'Spring').map(mapProject)
        const summerProjectsRows = existingProjects.filter(p => p.semester === 'Summer').map(mapProject)

        setFallCourses(fall.length ? fall : [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }])
        setSpringCourses(spring.length ? spring : [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }])
        setSummerCourses(summer.length ? summer : [{ id: 1, title: '', percentage: '', students: '', feedback: '', remarks: '', feedbackFile: null }])

        setFallProjects(fallProjectsRows.length ? fallProjectsRows : [{ id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null }])
        setSpringProjects(springProjectsRows.length ? springProjectsRows : [{ id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null }])
        setSummerProjects(summerProjectsRows.length ? summerProjectsRows : [{ id: 1, projectTitle: '', projectType: '', role: '', studentName: '', duration: '', outcome: '', remarks: '', certificateFile: null }])

        if (fall.length > 0) setSelectedSemester('fall')
        else if (spring.length > 0) setSelectedSemester('spring')
        else if (summer.length > 0) setSelectedSemester('summer')
      } catch (error) {
        console.error('Failed to prefill courses taught:', error)
      }
    }

    hydrateFromSubmission()
  }, [initialData, readOnly, user])

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

  const clearUploadedFile = (semester, index, sectionType = 'courses') => {
    if (readOnly) return

    const clearAtIndex = (items, fileField) => {
      const updated = [...items]
      updated[index] = {
        ...updated[index],
        [fileField]: null,
        evidence_file: null
      }
      return updated
    }

    if (sectionType === 'courses') {
      if (semester === 'fall') {
        setFallCourses(clearAtIndex(fallCourses, 'feedbackFile'))
      } else if (semester === 'spring') {
        setSpringCourses(clearAtIndex(springCourses, 'feedbackFile'))
      } else if (semester === 'summer') {
        setSummerCourses(clearAtIndex(summerCourses, 'feedbackFile'))
      }
      return
    }

    if (semester === 'fall') {
      setFallProjects(clearAtIndex(fallProjects, 'certificateFile'))
    } else if (semester === 'spring') {
      setSpringProjects(clearAtIndex(springProjects, 'certificateFile'))
    } else if (semester === 'summer') {
      setSummerProjects(clearAtIndex(summerProjects, 'certificateFile'))
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
    if (readOnly) return false;
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const facultyId = authUser?.id;
      if (!facultyId) {
        window.appToast('Session expired. Please login again.');
        return false;
      }

      await deleteIgnoringNotFound((id) => apiClient.delete(`/courses/${id}`), persistedCourseIds)

      // Save Courses from the current form state
      const allCourses = [
        ...fallCourses.map(c => ({ ...c, semester: 'Fall' })),
        ...springCourses.map(c => ({ ...c, semester: 'Spring' })),
        ...summerCourses.map(c => ({ ...c, semester: 'Summer' }))
      ];

      const createdIds = []
      for (const course of allCourses) {
        if (!hasCourseRowData(course)) continue;

        const formData = new FormData()
        formData.append('faculty_id', String(facultyId))
        formData.append('section', 'courses')
        formData.append('course_name', course.title)
        formData.append('semester', course.semester)
        formData.append('status', 'submitted')

        if (course.students !== '' && course.students !== null && course.students !== undefined) {
          formData.append('enrollment', String(parseInt(course.students)))
        }

        if (course.percentage !== '' && course.percentage !== null && course.percentage !== undefined) {
          formData.append('percentage', String(course.percentage))
        }

        if (course.feedback !== '' && course.feedback !== null && course.feedback !== undefined) {
          formData.append('feedback_score', String(parseFloat(course.feedback)))
        }

        if (course.feedbackFile instanceof File) {
          formData.append('evidence_file', course.feedbackFile)
        } else if (course.evidence_file) {
          formData.append('existing_evidence_file', course.evidence_file)
        }

        const created = await apiClient.post('/courses', formData);

        if (Number.isFinite(Number(created?.data?.id))) {
          createdIds.push(created.data.id)
        }
      }

      const allProjects = [
        ...fallProjects.map(p => ({ ...p, semester: 'Fall' })),
        ...springProjects.map(p => ({ ...p, semester: 'Spring' })),
        ...summerProjects.map(p => ({ ...p, semester: 'Summer' }))
      ]

      for (const project of allProjects) {
        if (!hasProjectRowData(project)) continue

        const formData = new FormData()
        formData.append('faculty_id', String(facultyId))
        formData.append('section', 'projects')
        formData.append('semester', project.semester)
        formData.append('project_title', project.projectTitle || '')
        formData.append('project_type', project.projectType || '')
        formData.append('project_role', project.role || '')
        formData.append('student_name', project.studentName || '')
        formData.append('project_duration', project.duration || '')
        formData.append('project_outcome', project.outcome || '')
        formData.append('remarks', project.remarks || '')
        formData.append('status', 'submitted')

        if (project.certificateFile instanceof File) {
          formData.append('evidence_file', project.certificateFile)
        } else if (project.evidence_file) {
          formData.append('existing_evidence_file', project.evidence_file)
        }

        const created = await apiClient.post('/courses', formData)
        if (Number.isFinite(Number(created?.data?.id))) {
          createdIds.push(created.data.id)
        }
      }

      setPersistedCourseIds(createdIds)

      window.appToast('Data saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving courses:', error);
      const message = error?.response?.data?.message || error.message || 'Please check the entered values.';
      window.appToast(`Failed to save data. ${message}`);
      return false;
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
                <ReadOnlyField readOnly={readOnly} value={course.title}>
                  <input
                    type="text"
                    value={course.title}
                    onChange={(e) => handleInputChange(semester, index, 'title', e.target.value)}
                    disabled={readOnly}
                    placeholder={readOnly ? '' : "Enter course title"}
                  />
                </ReadOnlyField>
              </td>
              <td>
                <ReadOnlyField readOnly={readOnly} value={course.percentage}>
                  <input
                    type="text"
                    value={course.percentage}
                    onChange={(e) => handleInputChange(semester, index, 'percentage', e.target.value)}
                    disabled={readOnly}
                    placeholder={readOnly ? '' : "e.g., 100%"}
                  />
                </ReadOnlyField>
              </td>
              <td>
                <ReadOnlyField readOnly={readOnly} value={course.students}>
                  <input
                    type="number"
                    value={course.students}
                    onChange={(e) => handleInputChange(semester, index, 'students', e.target.value)}
                    disabled={readOnly}
                  />
                </ReadOnlyField>
              </td>
              <td>
                <div className="feedback-container">
                  {readOnly ? (
                    <div className="readonly-table-text feedback-input">{course.feedback === null || course.feedback === undefined || course.feedback === '' ? '—' : String(course.feedback)}</div>
                  ) : (
                    <input
                      type="number"
                      step="0.001"
                      value={course.feedback}
                      onChange={(e) => handleInputChange(semester, index, 'feedback', e.target.value)}
                      disabled={readOnly}
                      className="feedback-input"
                    />
                  )}

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
                      <FilePreviewButton file={course.feedbackFile || course.evidence_file} style={{ width: '32px', height: '32px' }} />
                      {(course.feedbackFile || course.evidence_file) && (
                        <button
                          type="button"
                          onClick={() => clearUploadedFile(semester, index, 'courses')}
                          title="Remove uploaded document"
                          style={{
                            width: '32px',
                            height: '32px',
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
                    </div>
                  )}
                </div>
              </td>
              <td>
                <ReadOnlyField readOnly={readOnly} value={course.remarks}>
                  <input
                    type="text"
                    value={course.remarks}
                    onChange={(e) => handleInputChange(semester, index, 'remarks', e.target.value)}
                    disabled={readOnly}
                  />
                </ReadOnlyField>
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
                <ReadOnlyField readOnly={readOnly} value={project.projectTitle}>
                  <input
                    type="text"
                    value={project.projectTitle}
                    onChange={(e) => handleInputChange(semester, index, 'projectTitle', e.target.value)}
                    disabled={readOnly}
                  />
                </ReadOnlyField>
              </td>
              <td>
                <ReadOnlyField readOnly={readOnly} value={project.projectType}>
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
                </ReadOnlyField>
              </td>
              <td>
                <ReadOnlyField readOnly={readOnly} value={project.role}>
                  <select value={project.role} onChange={(e) => handleInputChange(semester, index, 'role', e.target.value)} disabled={readOnly}>
                    <option value="">Select Role</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Co-Supervisor">Co-Supervisor</option>
                  </select>
                </ReadOnlyField>
              </td>
              <td><ReadOnlyField readOnly={readOnly} value={project.studentName}><input type="text" value={project.studentName} onChange={(e) => handleInputChange(semester, index, 'studentName', e.target.value)} disabled={readOnly} /></ReadOnlyField></td>
              <td><ReadOnlyField readOnly={readOnly} value={project.duration}><input type="text" value={project.duration} onChange={(e) => handleInputChange(semester, index, 'duration', e.target.value)} disabled={readOnly} /></ReadOnlyField></td>
              <td><ReadOnlyField readOnly={readOnly} value={project.outcome}><input type="text" value={project.outcome} onChange={(e) => handleInputChange(semester, index, 'outcome', e.target.value)} disabled={readOnly} /></ReadOnlyField></td>
              <td><ReadOnlyField readOnly={readOnly} value={project.remarks}><input type="text" value={project.remarks} onChange={(e) => handleInputChange(semester, index, 'remarks', e.target.value)} disabled={readOnly} /></ReadOnlyField></td>
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
                    <FilePreviewButton file={project.certificateFile || project.evidence_file} style={{ width: '32px', height: '32px' }} />
                    {(project.certificateFile || project.evidence_file) && (
                      <button
                        type="button"
                        onClick={() => clearUploadedFile(semester, index, 'projects')}
                        title="Remove uploaded document"
                        style={{
                          width: '32px',
                          height: '32px',
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
      
      {!readOnly && (
        <FormActions 
          onSave={handleSave} 
          currentPath={window.location.pathname} 
        />
      )}
    </div>
  )
}

export default CoursesTaught
