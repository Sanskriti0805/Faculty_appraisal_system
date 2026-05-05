import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../services/api';
import './EvaluationSheet2.css';

const EvaluationSheet2 = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/Dofa-office') ? '/Dofa-office' : '/Dofa';
  const [data, setData] = useState([]);
  const [gradingParams, setGradingParams] = useState([]);
  const [activeYear, setActiveYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ mean: null, median: null, mode: null, stdDev: null });
  const saveTimers = useRef({});

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    try {
      const sessionRes = await apiClient.get('/sessions/active');
      const year = sessionRes?.data?.academic_year || '';
      setActiveYear(year);
      if (!year) {
        setData([]);
        setGradingParams([]);
        return;
      }
      await fetchData(year);
    } catch {
      showToast('Unable to detect active session year', 'error');
      setData([]);
      setGradingParams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (academicYear = activeYear) => {
    if (!academicYear) return;
    try {
      const res = await apiClient.get(`/evaluation/sheet2?academic_year=${encodeURIComponent(academicYear)}`);
      if (res.success) {
        const rows = res.data || [];
        setData(rows);
        setGradingParams(res.gradingParameters || []);
        if (rows.length > 0) {
          calcStats(rows);
        }
      }
    } catch (err) {
      showToast('Error loading Sheet 2 data', 'error');
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

  const calcStats = (rows) => {
    const src = rows || data;
    if (src.length === 0) return;
    const scores = src.map(d => Number(d.total_score) || 0).sort((a, b) => a - b);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
    const counts = {};
    scores.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    let maxCount = 0, modes = [];
    for (const val in counts) {
      if (counts[val] > maxCount) { maxCount = counts[val]; modes = [val]; }
      else if (counts[val] === maxCount) modes.push(val);
    }
    const modeValue = (maxCount === 1 && scores.length > 1) ? 'None' : modes.join(', ');
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    setStats({ mean: mean.toFixed(2), median: median.toFixed(2), mode: modeValue, stdDev: stdDev.toFixed(2) });
  };

  const calculateStats = () => calcStats(null);

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
        await fetchData(activeYear);
      }
    } catch {
      showToast('Error applying grade', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!activeYear || data.length === 0) return showToast('No data to export', 'error');
    
    const rows = data.map((item, idx) => {
      return `<tr>
        <td>${idx + 1}</td>
        <td>${item.faculty_name || '-'}</td>
        <td>${item.department || '-'}</td>
        <td>${item.research_remarks || '-'}</td>
        <td>${item.research_marks || 0}</td>
        <td>${item.teaching_feedback || '-'}</td>
        <td></td>
        <td>${item.overall_feedback || '-'}</td>
        <td>${item.total_score || 0}</td>
        <td><strong>${item.final_grade || '-'}</strong></td>
      </tr>`;
    }).join('');

    const logoUrl = window.location.origin + '/lnmiit-logo.png';
    const displayTitle = `Evaluation Sheet 2 - ${activeYear}`;
    
    const html = `<!DOCTYPE html>
<html><head><title>Sheet2_${activeYear}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 14mm; }
  .header-container { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; }
  .header-container img { max-height: 55px; margin-right: 20px; }
  .header-text { display: flex; flex-direction: column; }
  .header-inst { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
  h1 { font-size: 22px; color: #1e3a8a; margin: 2px 0 0 0; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a8a; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
</style></head><body>
  <div class="header-container">
    <img src="${logoUrl}" alt="LNMIIT Logo" />
    <div class="header-text">
      <div class="header-inst">The LNM Institute of Information Technology, Jaipur</div>
      <h1>${displayTitle}</h1>
    </div>
  </div>
  <p class="meta">Exported from active session data. Generated: ${new Date().toLocaleString('en-IN')}</p>
  <table>
    <thead><tr><th>S.No</th><th>Faculty</th><th>Department</th><th>Research Feedback</th><th>Research Marks</th><th>Teaching Feedback</th><th>Teacher Section Total Marks</th><th>Overall Feedback</th><th>Total Score</th><th>Grade</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleExportCSV = () => {
    if (!activeYear || data.length === 0) return showToast('No data to export', 'error');
    const headers = ['S.No.', 'Faculty Name', 'Department', 'Research Feedback', 'Research Marks', 'Teaching Feedback', 'Teacher Section Total Marks', 'Overall Feedback', 'Total Score', 'Grade'];
    const csvRows = [headers.join(',')];
    data.forEach((item, idx) => {
      const row = [
        idx + 1, 
        `"${item.faculty_name || ''}"`, 
        `"${item.department || ''}"`,
        `"${(item.research_remarks || '').replace(/"/g, '""')}"`,
        item.research_marks || 0,
        `"${(item.teaching_feedback || '').replace(/"/g, '""')}"`,
        item.teaching_marks || 0,
        `"${(item.overall_feedback || '').replace(/"/g, '""')}"`,
        item.total_score || 0,
        `"${item.final_grade || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sheet2_${activeYear}.csv`;
    link.click();
  };

  if (loading) return <div className="eval2-loading">Loading Sheet 2...</div>;

  return (
    <div className="eval2-container">
      {toast && <div className={`eval2-toast eval2-toast--${toast.type}`}>{toast.message}</div>}

      <div className="eval2-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Evaluation - Sheet 2</h1>
            <p>Research, Teaching Feedback &amp; Consolidated Grading {activeYear ? `(${activeYear})` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleExportCSV} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              Export CSV
            </button>
            <button onClick={handleExportPDF} style={{ padding: '6px 12px', background: '#1e3a8a', color: 'white', border: '1px solid #1e3a8a', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Download PDF
            </button>
            <Link to={`${basePath}/sheet1`} className="add-rule-btn" style={{ textDecoration: 'none', marginLeft: '12px' }}>
              &larr; Back to Sheet 1
            </Link>
          </div>
        </div>
      </div>

      {!activeYear && (
        <div className="eval2-loading" style={{ height: 'auto', padding: '10px 14px', marginBottom: 12 }}>
          No active appraisal session found. Sheet 2 will open when a session is released.
        </div>
      )}

      {/* Statistics Bar */}
      <div className="eval2-stats-bar">
        <button className="calc-stats-btn" onClick={calculateStats}>Calculate Statistics</button>
        {[
          { label: 'Mean', value: stats.mean },
          { label: 'Median', value: stats.median },
          { label: 'Mode', value: stats.mode },
          { label: 'Std Dev', value: stats.stdDev },
        ].map(({ label, value }) => (
          <div className="stat-item" key={label}>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value || '-'}</span>
          </div>
        ))}
      </div>

      {/* Grading Config */}
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

      {/* Data Table */}
      <div className="eval2-table-wrapper">
        <table className="eval2-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Faculty Name</th>
              <th>Department</th>
              <th>Research Feedback</th>
              <th>Research Marks</th>
              <th>Teaching Feedback</th>
              <th>Teacher Section Total Marks</th>
              <th>Overall Feedback</th>
              <th>Total Score</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={item.submission_id}>
                <td style={{ color: '#94a3b8', fontWeight: 500 }}>{idx + 1}</td>
                <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.faculty_name}</td>
                <td style={{ color: '#64748b' }}>{item.department}</td>
                <td>
                  <textarea
                    className="eval2-textarea"
                    value={item.research_remarks || ''}
                    onChange={(e) => handleRemarkChange(item.submission_id, 'research_remarks', e.target.value)}
                    placeholder="Research remarks..."
                  />
                </td>
                <td className="eval2-total-score">{item.research_marks || 0}</td>
                <td>
                  <textarea
                    className="eval2-textarea"
                    value={item.teaching_feedback || ''}
                    onChange={(e) => handleRemarkChange(item.submission_id, 'teaching_feedback', e.target.value)}
                    placeholder="Teaching feedback..."
                  />
                </td>
                <td className="eval2-total-score">{item.teaching_marks || 0}</td>
                <td>
                  <textarea
                    className="eval2-textarea"
                    value={item.overall_feedback || ''}
                    onChange={(e) => handleRemarkChange(item.submission_id, 'overall_feedback', e.target.value)}
                    placeholder="Overall feedback..."
                  />
                </td>
                <td className="eval2-total-score">{item.total_score}</td>
                <td className="eval2-grade-cell">{item.final_grade || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <Link to={`${basePath}/sheet3`} className="apply-grading-btn" style={{ textDecoration: 'none' }}>
          Next - Sheet 3 &rarr;
        </Link>
      </div>
    </div>
  );
};

export default EvaluationSheet2;
