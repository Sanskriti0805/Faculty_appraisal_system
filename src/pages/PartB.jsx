import React, { useState } from 'react'
import { Plus, Trash2, Save, Upload, FileText, X, CheckCircle } from 'lucide-react'
import './FormPages.css'
import './PartB.css'

const PartB = () => {
  const [selectedSemester, setSelectedSemester] = useState('Odd Semester')
  const [goals, setGoals] = useState([
    { id: 1, semester: 'Odd Semester', teaching: '', research: '', contribution: '', outreach: '', description: '', evidenceFile: null }
  ])

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
    try {
      const response = await fetch('http://localhost:5001/api/goals/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: 1, // Mock faculty ID
          goals: goals
        })
      });

      const data = await response.json();
      if (data.success && showSuccess) {
        alert('Data saved successfully!');
      }
      return data.success;
    } catch (error) {
      console.error('Error saving goals:', error);
      if (showSuccess) alert('Failed to save data. Error: ' + error.message);
      return false;
    }
  }

  const handleSubmitFinal = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!window.confirm('Are you sure you want to submit the complete appraisal? This will lock the form for review.')) {
      return;
    }

    // Save current goals first
    const saveSuccessful = await handleSave(null, false);
    if (!saveSuccessful) {
      alert('Failed to save goals. Please try again before submitting.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/submissions/1/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' })
      });

      const data = await response.json();
      if (data.success) {
        alert('Appraisal submitted successfully! Redirecting in 2 seconds...');
        // Small delay to prevent "vanishing" UI
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        alert('Submission failed: ' + data.message);
      }
    } catch (error) {
      console.error('Error submitting appraisal:', error);
      alert('Failed to submit appraisal. Check console for details. Error: ' + error.message);
    }
  }

  const displayedGoals = goals.filter(goal => goal.semester === selectedSemester)

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">The LNMIIT, Jaipur</h1>
          <p className="page-subtitle" style={{ fontWeight: 600, color: '#1e3a5f' }}>Annual Performance Appraisal Form</p>
          <p className="page-subtitle" style={{ fontSize: '0.9rem' }}>
            (For all full-time Faculty who have completed one year or more of service at the LNMIIT <u>excluding</u> Distinguished/Research/Industry/Visiting Professors)
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button className="save-button" onClick={handleSave}>
            <Save size={18} />
            Save Changes
          </button>
          <button className="submit-button" onClick={handleSubmitFinal} style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            <CheckCircle size={18} />
            Submit for Review
          </button>
        </div>
      </div>

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
              <button
                className="add-course-btn"
                onClick={addRow}
              >
                <Plus size={18} />
                Add Row
              </button>
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
                  <th rowSpan="2" style={{ width: '4%', verticalAlign: 'middle', textAlign: 'center' }}>Action</th>
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
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={goal.research}
                        onChange={(e) => handleInputChange(goal.id, 'research', e.target.value)}
                        placeholder="%"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={goal.contribution}
                        onChange={(e) => handleInputChange(goal.id, 'contribution', e.target.value)}
                        placeholder="%"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={goal.outreach}
                        onChange={(e) => handleInputChange(goal.id, 'outreach', e.target.value)}
                        placeholder="%"
                      />
                    </td>
                    <td>
                      <textarea
                        value={goal.description}
                        onChange={(e) => handleInputChange(goal.id, 'description', e.target.value)}
                        placeholder="Description of goals..."
                        style={{ minHeight: '60px', width: '100%', resize: 'vertical' }}
                      />
                    </td>
                    <td>
                      <div className="compact-upload-wrapper" style={{ margin: '0 auto' }}>
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
                        {goal.evidenceFile && (
                          <button
                            className="compact-remove-btn"
                            onClick={() => handleInputChange(goal.id, 'evidenceFile', null)}
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
                        onClick={() => removeRow(goal.id)}
                        disabled={displayedGoals.length <= 0}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
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
        </div>
      </div>
    </div>
  )
}

export default PartB

