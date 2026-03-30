import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import './EvaluationSheet2.css';

const EvaluationSheet2 = () => {
  const [data, setData] = useState([]);
  const [gradingParams, setGradingParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ mean: null, median: null, mode: null });
  const saveTimers = useRef({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/evaluation/sheet2');
      if (res.success) {
        setData(res.data || []);
        setGradingParams(res.gradingParameters || []);
      }
    } catch (err) {
      showToast('Error loading Sheet 2 data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRemarkChange = (submissionId, field, value) => {
    setData(prev => prev.map(item => 
      item.submission_id === submissionId ? { ...item, [field]: value } : item
    ));

    const key = `${submissionId}-${field}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      persistRemark(submissionId, field, value);
    }, 1000);
  };

  const persistRemark = async (submissionId, field, value) => {
    try {
      await apiClient.post('/evaluation/sheet2/remarks', { submission_id: submissionId, field, value });
    } catch {
      showToast('Error saving update', 'error');
    }
  };

  const calculateStats = () => {
    if (data.length === 0) return;
    const scores = data.map(d => d.total_score).sort((a, b) => a - b);
    
    // Mean
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Median
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
    
    // Mode
    const counts = {};
    scores.forEach(s => counts[s] = (counts[s] || 0) + 1);
    let maxCount = 0;
    let modeValue = null;
    for (const val in counts) {
      if (counts[val] > maxCount) {
        maxCount = counts[val];
        modeValue = val;
      }
    }

    setStats({
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      mode: modeValue
    });
  };

  const handleAddRule = () => {
    setGradingParams([...gradingParams, { condition_op: '>', threshold_value: 0, grade: '' }]);
  };

  const handleRemoveRule = (index) => {
    setGradingParams(gradingParams.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index, field, value) => {
    const newParams = [...gradingParams];
    newParams[index][field] = value;
    setGradingParams(newParams);
  };

  const saveGradingParams = async () => {
    try {
      await apiClient.post('/evaluation/grading-parameters', { parameters: gradingParams });
      showToast('Grading parameters saved');
    } catch {
      showToast('Error saving parameters', 'error');
    }
  };

  const applyGrading = async () => {
    try {
      setLoading(true);
      await saveGradingParams();
      const res = await apiClient.post('/evaluation/apply-grading');
      if (res.success) {
        showToast('Grading applied successfully');
        fetchData(); // Refresh to show new grades
      }
    } catch {
      showToast('Error applying grade', 'error');
      setLoading(false);
    }
  };

  if (loading) return <div className="eval2-loading">Loading Sheet 2...</div>;

  return (
    <div className="eval2-container">
      {toast && <div className={`eval2-toast eval2-toast--${toast.type}`}>{toast.message}</div>}

      <div className="eval2-header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h1>Evaluation — Sheet 2</h1>
            <p>Research, Teaching Feedback & Consolidated Grading</p>
          </div>
          <Link to="/dofa/sheet1" className="add-rule-btn" style={{textDecoration: 'none', display: 'flex', alignItems: 'center'}}>
            &larr; Back to Sheet 1
          </Link>
        </div>
      </div>

      <div className="eval2-stats-bar">
        <button className="calc-stats-btn" onClick={calculateStats}>Calculate Statistics</button>
        <div className="stat-item">
          <span className="stat-label">Mean</span>
          <span className="stat-value">{stats.mean || '—'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Median</span>
          <span className="stat-value">{stats.median || '—'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Mode</span>
          <span className="stat-value">{stats.mode || '—'}</span>
        </div>
      </div>

      <div className="eval2-grading-config">
        <h2>Grading Parameters Configuration</h2>
        <div className="grading-rules-list">
          {gradingParams.map((param, idx) => (
            <div key={idx} className="grading-rule-row">
              <span>If Total Score</span>
              <select 
                className="rule-select"
                value={param.condition_op}
                onChange={(e) => handleRuleChange(idx, 'condition_op', e.target.value)}
              >
                <option value=">">&gt;</option>
                <option value=">=">&ge;</option>
                <option value="<">&lt;</option>
                <option value="<=">&le;</option>
                <option value="=">=</option>
              </select>
              <input 
                type="number" 
                className="rule-input"
                value={param.threshold_value}
                onChange={(e) => handleRuleChange(idx, 'threshold_value', e.target.value)}
              />
              <span>then Grade</span>
              <input 
                type="text" 
                className="grade-input"
                placeholder="e.g. A"
                value={param.grade}
                onChange={(e) => handleRuleChange(idx, 'grade', e.target.value)}
              />
              <button className="remove-rule-btn" onClick={() => handleRemoveRule(idx)}>Remove</button>
            </div>
          ))}
        </div>
        <button className="add-rule-btn" onClick={handleAddRule}>+ Add Rule</button>
        <button className="apply-grading-btn" onClick={applyGrading}>Apply Grading to All</button>
      </div>

      <div className="eval2-table-wrapper">
        <table className="eval2-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Faculty Name</th>
              <th>Department</th>
              <th>Sheet 1 Total</th>
              <th>Research Remarks</th>
              <th>Teaching Feedback</th>
              <th>Overall Feedback</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={item.submission_id}>
                <td>{idx + 1}</td>
                <td style={{fontWeight: 600}}>{item.faculty_name}</td>
                <td>{item.department}</td>
                <td className="eval2-total-score">{item.total_score}</td>
                <td>
                  <textarea 
                    className="eval2-textarea"
                    value={item.research_remarks || ''}
                    onChange={(e) => handleRemarkChange(item.submission_id, 'research_remarks', e.target.value)}
                    placeholder="Research remarks..."
                  />
                </td>
                <td>
                  <textarea 
                    className="eval2-textarea"
                    value={item.teaching_feedback || ''}
                    onChange={(e) => handleRemarkChange(item.submission_id, 'teaching_feedback', e.target.value)}
                    placeholder="Teaching feedback..."
                  />
                </td>
                <td>
                  <textarea 
                    className="eval2-textarea"
                    value={item.overall_feedback || ''}
                    onChange={(e) => handleRemarkChange(item.submission_id, 'overall_feedback', e.target.value)}
                    placeholder="Overall feedback..."
                  />
                </td>
                <td className="eval2-grade-cell">{item.final_grade || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{marginTop: '30px', display: 'flex', justifyContent: 'flex-end'}}>
        <Link to="/dofa/sheet3" className="apply-grading-btn" style={{textDecoration: 'none'}}>
          Next — Sheet 3 &rarr;
        </Link>
      </div>
    </div>
  );
};

export default EvaluationSheet2;
