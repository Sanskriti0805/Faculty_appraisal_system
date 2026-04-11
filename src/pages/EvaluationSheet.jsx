import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import './EvaluationSheet.css';

const EvaluationSheet = () => {
  const [rubrics, setRubrics] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [rerunning, setRerunning] = useState(null); // submissionId being re-run
  const saveTimers = useRef({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // apiClient response interceptor already returns res.data
      const data = await apiClient.get('/evaluation');
      
      if (data && data.success) {
        setRubrics(data.rubrics || []);
        setSubmissions(data.submissions || []);
        
        const scoreMap = {};
        (data.scores || []).forEach(s => {
          scoreMap[`${s.submission_id}||${s.rubric_id}`] = s.score;
        });
        setScores(scoreMap);

        const remarkMap = {};
        (data.remarks || []).forEach(r => {
          if (!remarkMap[r.submission_id]) remarkMap[r.submission_id] = r.remark;
        });
        setRemarks(remarkMap);
      } else {
        throw new Error(data?.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Error loading evaluation data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getScore = (subId, rubId) => {
    const val = scores[`${subId}||${rubId}`];
    return val === undefined || val === null ? '' : val;
  };

  const getTotal = (subId) => {
    let total = 0;
    rubrics.forEach(rub => {
      const val = parseFloat(scores[`${subId}||${rub.id}`]);
      if (!isNaN(val)) total += val;
    });
    return total % 1 === 0 ? total : total.toFixed(2);
  };

  const handleScoreChange = (subId, rubId, value) => {
    const key = `${subId}||${rubId}`;
    setScores(prev => ({ ...prev, [key]: value }));

    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      persistScore(subId, rubId, value);
    }, 700);
  };

  const persistScore = async (subId, rubId, value) => {
    try {
      const data = await apiClient.post('/evaluation/scores', {
        submission_id: subId,
        rubric_id: rubId,
        score: parseFloat(value) || 0
      });
      if (!data.success) showToast(data.message || 'Score validation failed', 'error');
    } catch {
      showToast('Error saving score', 'error');
    }
  };

  const handleRemarkChange = (subId, value) => {
    setRemarks(prev => ({ ...prev, [subId]: value }));

    if (saveTimers.current[`remark-${subId}`]) clearTimeout(saveTimers.current[`remark-${subId}`]);
    saveTimers.current[`remark-${subId}`] = setTimeout(() => {
      persistRemark(subId, value);
    }, 1000);
  };

  const persistRemark = async (subId, value) => {
    try {
      await apiClient.post('/evaluation/remarks', {
        submission_id: subId,
        remark: value
      });
    } catch {
      showToast('Error saving remark', 'error');
    }
  };

  const rerunAllocation = async (sub) => {
    setRerunning(sub.submission_id);
    try {
      const data = await apiClient.post(`/evaluation/rerun-allocation/${sub.submission_id}`);
      if (data.success) {
        showToast(`Re-allocated! Total: ${data.total}`);
        await fetchData(); // refresh all scores before enabling UI
      } else {
        showToast(data.message || 'Re-run failed', 'error');
      }
    } catch {
      showToast('Error re-running allocation', 'error');
    } finally {
      setRerunning(null);
    }
  };

  // Group rubrics by section_name and then sub-groups within sections
  const sections = [];
  rubrics.forEach(r => {
    let sec = sections.find(s => s.name === r.section_name);
    if (!sec) {
      sec = { name: r.section_name, rubrics: [], groups: [] };
      sections.push(sec);
    }
    sec.rubrics.push(r);

    // Sub-group logic: Extract prefix before colon if it exists
    let groupPrefix = "";
    if (r.sub_section.includes(':')) {
      groupPrefix = r.sub_section.split(':')[0].trim();
      // Clean up common prefixes like "a)", "b)", etc. if present
      groupPrefix = groupPrefix.replace(/^[a-z]\)\s*/i, '');

      // Shorten specific long labels for cleaner UI
      if (groupPrefix.toLowerCase().includes('greater than or equal to 50')) {
        groupPrefix = "Students >= 50";
      } else if (groupPrefix.toLowerCase().includes('less than 50')) {
        groupPrefix = "Students < 50";
      }
    }

    let lastGroup = sec.groups[sec.groups.length - 1];
    if (lastGroup && lastGroup.name === groupPrefix) {
      lastGroup.count++;
    } else {
      sec.groups.push({ name: groupPrefix, count: 1 });
    }
  });

  if (loading) return <div className="eval-loading">Loading Evaluation Data...</div>;

  return (
    <div className="eval-sheet-container">
      {toast && <div className={`eval-toast eval-toast--${toast.type}`}>{toast.message}</div>}
      
      <div className="eval-header">
        <h1>Evaluation Sheet - Sheet 1</h1>
        <p>Faculty Appraisal Consolidated Scores</p>
      </div>

      <div className="eval-table-wrapper">
        <table className="eval-main-table">
          <thead>
            {/* Top Level Category Row */}
            <tr>
              <th rowSpan={4} className="eval-sticky-left sno">S.No.</th>
              <th rowSpan={4} className="eval-sticky-left faculty-name">Name of Faculty</th>
              <th rowSpan={4}>Designation</th>
              <th rowSpan={4}>Regular/ Visiting</th>
              <th rowSpan={4}>Dept</th>
              
              {sections.map(sec => (
                <th key={sec.name} colSpan={sec.rubrics.length} className="eval-section-header">
                  {sec.name}
                </th>
              ))}
              
              <th rowSpan={4} className="eval-total-header">Grand Total</th>
              <th rowSpan={4} className="eval-remarks-header">Remarks</th>
            </tr>

            {/* Sub-group labels (e.g. "no. of students is greater than or equal to 50") */}
            <tr>
              {sections.map(sec => 
                sec.groups.map((group, gIdx) => (
                  <th 
                    key={`${sec.name}-group-${gIdx}`} 
                    colSpan={group.count} 
                    className="eval-subgroup-header"
                  >
                    {group.name || ''}
                  </th>
                ))
              )}
            </tr>

            {/* Sub-section headers (Rubric items) */}
            <tr>
              {sections.map(sec => 
                sec.rubrics.map(rub => {
                  // Clean up the sub_section text for better display
                  let label = rub.sub_section;
                  if (label.includes(':')) {
                    label = label.split(':')[1].trim();
                  }
                  return (
                    <th key={rub.id} className="eval-rubric-label" title={rub.sub_section}>
                      <div className="rubric-label-text">{label}</div>
                    </th>
                  );
                })
              )}
            </tr>

            {/* Max Marks Row */}
            <tr>
              {sections.map(sec => 
                sec.rubrics.map(rub => (
                  <th key={`max-${rub.id}`} className="eval-max-marks">
                    {rub.max_marks}
                  </th>
                ))
              )}
            </tr>
          </thead>
          
          <tbody>
            {submissions.map((sub, idx) => (
              <tr key={sub.submission_id} className={idx % 2 === 0 ? 'eval-row-even' : 'eval-row-odd'}>
                <td className="eval-sticky-left sno">{idx + 1}</td>
                <td className="eval-sticky-left faculty-name">
                  <div className="faculty-name-main">{sub.faculty_name}</div>
                  <button 
                    className="rerun-btn"
                    onClick={() => rerunAllocation(sub)}
                    disabled={rerunning === sub.submission_id}
                    title="Re-run Auto-Allocation"
                  >
                    {rerunning === sub.submission_id ? 'Running...' : 'Re-calculate'}
                  </button>
                </td>
                <td><div className="cell-content">{sub.designation || '—'}</div></td>
                <td>{sub.regular_visiting || 'Regular'}</td>
                <td>{sub.department || '—'}</td>
                
                {sections.map(sec => 
                  sec.rubrics.map(rub => (
                    <td key={`${sub.submission_id}-${rub.id}`} className="eval-score-cell">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={rub.max_marks}
                        value={getScore(sub.submission_id, rub.id)}
                        onChange={(e) => handleScoreChange(sub.submission_id, rub.id, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                  ))
                )}
                
                <td className="eval-total-cell">
                  <strong>{getTotal(sub.submission_id)}</strong>
                </td>
                <td className="eval-remarks-cell">
                  <textarea
                    className="eval-remark-textarea"
                    value={remarks[sub.submission_id] || ''}
                    onChange={(e) => handleRemarkChange(sub.submission_id, e.target.value)}
                    placeholder="Enter remarks..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="eval-footer">
        <Link to="/dofa/sheet2" className="eval-next-btn">
          Next - Sheet 2 &rarr;
        </Link>
      </div>
    </div>
  );
};

export default EvaluationSheet;
