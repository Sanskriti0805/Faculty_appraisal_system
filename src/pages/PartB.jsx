import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Upload, FileText, X, CheckCircle, ExternalLink } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FormPages.css'
import './PartB.css'
import FormActions from '../components/FormActions'
import { useAuth } from '../context/AuthContext'
import FilePreviewButton from '../components/FilePreviewButton'
import { useSubmission } from '../context/SubmissionContext'

// ── Submission Success Popup ──────────────────────────────────────────────
const SubmissionSuccessPopup = ({ academicYear, deadline, onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 24, backdropFilter: 'blur(4px)'
  }}>
    <div style={{
      background: '#fff', borderRadius: 20, padding: '40px 36px',
      maxWidth: 520, width: '100%', textAlign: 'center',
      boxShadow: '0 24px 80px rgba(0,0,0,0.15)', animation: 'popupIn 0.35s ease-out'
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'linear-gradient(135deg,#059669,#10b981)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px'
      }}>
        <CheckCircle size={38} color="#fff" />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
        Form Submitted Successfully!
      </h2>
      <p style={{ color: '#475569', lineHeight: 1.7, margin: '0 0 20px', fontSize: '0.95rem' }}>
        Dear Faculty, your appraisal forms <strong>(Form A &amp; Form B)</strong> for <strong>{academicYear}</strong> have been submitted.
      </p>
      {deadline && (
        <div style={{
          background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
          border: '1px solid #93c5fd', borderRadius: 12,
          padding: '14px 20px', margin: '0 0 20px'
        }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e40af' }}>
            <strong>Submission Deadline:</strong> {deadline}
          </p>
        </div>
      )}
      <p style={{ color: '#64748b', lineHeight: 1.7, margin: '0 0 24px', fontSize: '0.88rem' }}>
        You can <strong>view your submitted form</strong> and <strong>request changes</strong> to specific sections if needed — but only before the submission deadline. If the deadline has passed, no further edits will be allowed.
      </p>
      <button
        onClick={onClose}
        style={{
          padding: '13px 36px', background: 'linear-gradient(135deg,#034da2,#0466d6)',
          color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem',
          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: '0 4px 14px rgba(3,77,162,0.3)'
        }}
      >
        Got it — Go to Dashboard
      </button>
    </div>
    <style>{`
      @keyframes popupIn {
        from { opacity: 0; transform: scale(0.88) translateY(20px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
    `}</style>
  </div>
)

const PartB = ({ initialData, readOnly }) => {
  const { user, token } = useAuth()
  const { submissionData, refetchSubmission } = useSubmission()
  const [submissionId, setSubmissionId] = useState(null)
  const [submissionStatus, setSubmissionStatus] = useState(null)
  const [sessionDeadline, setSessionDeadline] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState('Odd Semester')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [goals, setGoals] = useState([
    { id: 1, semester: 'Odd Semester', teaching: '', research: '', contribution: '', outreach: '', description: '', evidenceFile: null }
  ])

  // Fetch or create submission for current faculty
  useEffect(() => {
    if (!user || !token) return
    const fetchSubmission = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/submissions/my', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setSubmissionId(data.data.id)
          setSubmissionStatus(data.data.status)
        }

        // Also fetch active session deadline for popup
        const sessionRes = await fetch('http://localhost:5000/api/sessions/active')
        const sessionData = await sessionRes.json()
        if (sessionData.success && sessionData.data?.deadline) {
          setSessionDeadline(
            new Date(sessionData.data.deadline).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'long', year: 'numeric'
            })
          )
        }
      } catch (err) {
        console.error('Failed to fetch submission:', err)
      }
    }
    fetchSubmission()
  }, [user, token])

  useEffect(() => {
    const activeData = initialData || (submissionData && submissionData.goals ? submissionData.goals : null);
    if (activeData && Array.isArray(activeData) && activeData.length > 0) {
      setGoals(activeData.map(g => ({
        ...g,
        id: g.id || Math.random(),
        evidenceFile: g.evidence_file || null
      })))
    }
  }, [initialData, submissionData])

  const semesterOptions = [
    'Odd Semester',
    'Even Semester',
    'Summer Term'
  ]

  const handleInputChange = (id, field, value) => {
    setGoals(goals.map(goal =>
      goal.id === id ? { ...goal, [field]: value } : goal
    ))
  }

  const addRow = () => {
    setGoals([
      ...goals,
      {
        id: Date.now(),
        semester: selectedSemester,
        teaching: '',
        research: '',
        contribution: '',
        outreach: '',
        description: '',
        evidenceFile: null
      }
    ])
  }

  const removeRow = (id) => {
    const currentSemesterGoals = goals.filter(g => g.semester === selectedSemester)
    if (currentSemesterGoals.length > 0) {
      setGoals(goals.filter(goal => goal.id !== id))
    }
  }

  const handleSave = async (e, showSuccess = true) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validate that percentage fields only contain numbers
    for (const goal of goals) {
      if (
        (goal.teaching && isNaN(Number(goal.teaching))) ||
        (goal.research && isNaN(Number(goal.research))) ||
        (goal.contribution && isNaN(Number(goal.contribution))) ||
        (goal.outreach && isNaN(Number(goal.outreach)))
      ) {
        alert('Validation Error: Please ensure all time/effort percentage fields contain only valid numbers (e.g., 20 or 20.5), not letters or special characters.');
        return false;
      }
    }

    try {
      const response = await fetch('http://localhost:5000/api/goals/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          faculty_id: user?.id,
          goals: goals
        })
      });

      const data = await response.json();
      if (data.success) {
        if (showSuccess) {
          if (refetchSubmission) await refetchSubmission();
          alert('Data saved successfully!');
        }
        return true;
      } else {
        if (!showSuccess) alert('Failed to save data: ' + data.message);
        return false;
      }
    } catch (error) {
      console.error('Error saving goals:', error);
      if (showSuccess) alert('Failed to save data. Error: ' + error.message);
      return false;
    }
  }

  const handleSubmitFinal = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!user || !token) {
      alert('You must be logged in to submit.');
      return;
    }

    if (!submissionId) {
      alert('Submission record not found. Please try again.');
      return;
    }

    const isResubmitting = submissionStatus === 'sent_back'
    const confirmMsg = isResubmitting
      ? 'Are you sure you want to re-submit your updated appraisal? This will send the latest version for review.'
      : 'Are you sure you want to submit the complete appraisal? This will lock the form for review.'

    if (!window.confirm(confirmMsg)) {
      return;
    }

    // Save current goals first
    const saveSuccessful = await handleSave(null, false);
    if (!saveSuccessful) {
      // The handleSave function already displays the exact error message
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/submissions/${submissionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'submitted' })
      });

      const data = await response.json();
      if (data.success) {
        if (isResubmitting) {
          alert('✅ Appraisal re-submitted successfully! Your updated form has been sent for review.');
          window.location.href = '/';
        } else {
          // Show the styled popup for first-time submission
          setShowSuccessPopup(true);
        }
      } else {
        alert('Submission failed: ' + data.message);
      }
    } catch (error) {
      console.error('Error submitting appraisal:', error);
      alert('Failed to submit appraisal. Error: ' + error.message);
    }
  }

  const displayedGoals = goals.filter(goal => goal.semester === selectedSemester)

  return (
    <div className={`form-page ${readOnly ? 'read-only-mode' : ''}`}>
      {/* Submission Success Popup */}
      {showSuccessPopup && (
        <SubmissionSuccessPopup
          academicYear={user?.academic_year || 'current academic year'}
          deadline={sessionDeadline}
          onClose={() => { setShowSuccessPopup(false); window.location.href = '/'; }}
        />
      )}
      {!readOnly && (
        <div className="page-header">
          <div>
            <h1 className="page-title">The LNMIIT, Jaipur</h1>
            <p className="page-subtitle" style={{ fontWeight: 600, color: '#1e3a5f' }}>Annual Performance Appraisal Form</p>
            <p className="page-subtitle" style={{ fontSize: '0.9rem' }}>
              (For all full-time Faculty who have completed one year or more of service at the LNMIIT <u>excluding</u> Distinguished/Research/Industry/Visiting Professors)
            </p>
          </div>
        </div>
      )}

      <div className="form-card">
        <h2 className="section-header-text">Part-B: Goal setting for the academic year 2023-2024</h2>

        <div className="form-section">
          <div style={{ color: '#2c3e50', lineHeight: '1.6', fontSize: '1rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              This form is meant for setting goals in your respective domain of work in consultation with your Head of the Department/Dean/Centre Lead/Faculty-in-charge. At the start of every academic session or preferably a little before it, you shall be setting your own goals for the year in consultation with anyone or more of the colleagues you directly work with. At the end of the season the performance appraisal process shall also give you an opportunity to state that how much of each of the goals you set for the previous session have been met.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              As a faculty member of the Institute, every faculty colleague is expected to make a contribution by the way of Teaching/Research/Institutional Development/ contribution (including but not limited to administrative and the leadership responsibilities) and outreach. Since every faculty member is supposed to spend some percentage of time and effort in terms of teaching, research as well as Institutional contribution, unless otherwise discussed and agreed at the level of the HoD/Dean/Centre Lead/Director, it is expected that none of these goals are set to be zero percent.
            </p>
          </div>

          <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #3B5998' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#1e3a5f' }}>Note-</h4>
            <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#2c3e50', lineHeight: '1.6' }}>
              <li>
                In the most common cases, it may be a good idea to split your time and effort in the multiple of 20%(although it is not a rigid requirement)- For instance, a Faculty member may choose in consultation of the HoD to spend 40% of his time & effort in a given semester/term in teaching, 40% for research and remaining 20% could be either put into one of the two brackets of institute contribution and outreach or could be split into any appropriate percentage of 20 to be spent for these two modes of contribution. This may vary from faculty to faculty and also from Semester/Term to Semester/term. Therefore, the following table provides the opportunity involving 2 Semester and 1 Summer Term.
              </li>
            </ol>
          </div>

          <div className="table-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label htmlFor="semester-select" style={{ fontWeight: '600', color: '#1e3a5f', fontSize: '1rem' }}>Select Semester :</label>
                <div style={{ width: '250px' }}>
                  <select
                    id="semester-select"
                    className="section-dropdown"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                  >
                    {semesterOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          {!readOnly && (
            <button
              className="add-course-btn"
              onClick={addRow}
            >
              <Plus size={18} />
              Add Row
            </button>
          )}
        </div>

        <table className="courses-table">
          <thead>
            <tr>
              <th rowSpan="2" style={{ width: '5%', verticalAlign: 'middle', textAlign: 'center' }}>S.No.</th>
              <th colSpan="4" style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
                % Of planned time and efforts as chosen by you
              </th>
              <th rowSpan="2" style={{ width: '35%', verticalAlign: 'middle' }}>
                Please provide brief<br />
                information about<br />
                what you intend to<br />
                do during this period<br />
                against each of the<br />
                identifying goals
              </th>
              <th rowSpan="2" style={{ width: '8%', verticalAlign: 'middle', textAlign: 'center' }}>Upload Evidence (if available)</th>
              {!readOnly && <th rowSpan="2" style={{ width: '4%', verticalAlign: 'middle', textAlign: 'center' }}>Action</th>}
            </tr>
            <tr>
              <th style={{ width: '12%', textAlign: 'center' }}>Teaching</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Research</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Institute contribution</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Outreach</th>
            </tr>
          </thead>
          <tbody>
            {displayedGoals.map((goal, index) => (
              <tr key={goal.id}>
                <td className="course-number">{index + 1}</td>
                <td>
                  <input
                    type="text"
                    value={goal.teaching}
                    onChange={(e) => handleInputChange(goal.id, 'teaching', e.target.value)}
                    placeholder="%"
                    disabled={readOnly}
                    style={{ border: readOnly ? 'none' : '1px solid #ddd', background: 'transparent', textAlign: 'center' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={goal.research}
                    onChange={(e) => handleInputChange(goal.id, 'research', e.target.value)}
                    placeholder="%"
                    disabled={readOnly}
                    style={{ border: readOnly ? 'none' : '1px solid #ddd', background: 'transparent', textAlign: 'center' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={goal.contribution}
                    onChange={(e) => handleInputChange(goal.id, 'contribution', e.target.value)}
                    placeholder="%"
                    disabled={readOnly}
                    style={{ border: readOnly ? 'none' : '1px solid #ddd', background: 'transparent', textAlign: 'center' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={goal.outreach}
                    onChange={(e) => handleInputChange(goal.id, 'outreach', e.target.value)}
                    placeholder="%"
                    disabled={readOnly}
                    style={{ border: readOnly ? 'none' : '1px solid #ddd', background: 'transparent', textAlign: 'center' }}
                  />
                </td>
                <td>
                  <textarea
                    value={goal.description}
                    onChange={(e) => handleInputChange(goal.id, 'description', e.target.value)}
                    placeholder="Description of goals..."
                    style={{ minHeight: '60px', width: '100%', resize: 'vertical', border: readOnly ? 'none' : '1px solid #ddd', background: 'transparent' }}
                    disabled={readOnly}
                  />
                </td>
                <td>
                  <div className="compact-upload-wrapper" style={{ margin: '0 auto' }}>
                    {readOnly ? (
                      goal.evidenceFile && (
                        <a
                          href={`http://${window.location.hostname}:5000/uploads/${goal.evidenceFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="evidence-link"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5b8fc7' }}
                        >
                          <ExternalLink size={18} />
                        </a>
                      )
                    ) : (
                      <>
                        <input
                          type="file"
                          id={`evidence-upload-${goal.id}`}
                          accept=".pdf,image/*"
                          onChange={(e) => handleInputChange(goal.id, 'evidenceFile', e.target.files[0])}
                          className="file-input-hidden"
                        />
                        <label
                          htmlFor={`evidence-upload-${goal.id}`}
                          className={`compact-upload-btn ${goal.evidenceFile ? 'has-file' : ''}`}
                          title={goal.evidenceFile ? goal.evidenceFile.name : "Upload Evidence"}
                        >
                          {goal.evidenceFile ? <FileText size={18} /> : <Upload size={18} />}
                        </label>
                        <FilePreviewButton
                          file={goal.evidenceFile || goal.evidence_file}
                          style={{ width: '32px', height: '32px', marginLeft: '0.5rem' }}
                        />
                        {goal.evidenceFile && (
                          <button
                            className="compact-remove-btn"
                            onClick={() => handleInputChange(goal.id, 'evidenceFile', null)}
                            title="Remove file"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
                {!readOnly && (
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => removeRow(goal.id)}
                      disabled={displayedGoals.length <= 0}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {displayedGoals.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No goals added for {selectedSemester}. Click "Add Row" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h4 style={{ color: '#1e3a5f', marginBottom: '1rem' }}>Notes:</h4>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#2c3e50', lineHeight: '1.6' }}>
          <li style={{ marginBottom: '0.75rem' }}>
            In case, any faculty member is associated with more than one department, she/he needs to discuss with his primary department HoD about the goal details and that would be adequate for the purpose of the goal setting.
          </li>
          <li>
            Please note that this goal setting form is to set your respective targets and try to achieve these, These are aspirational in nature.
          </li>
        </ol>
        <div style={{ marginTop: '3rem', textAlign: 'right', fontWeight: 'bold', color: '#1e3a5f' }}>
          Signature
        </div>
      </div>
      {!readOnly && (
        <FormActions 
          onSave={() => handleSave(null)} 
          onSubmit={handleSubmitFinal}
          currentPath={window.location.pathname} 
          nextLabel="Submit for Review"
        />
      )}
    </div>
  )
}

export default PartB

