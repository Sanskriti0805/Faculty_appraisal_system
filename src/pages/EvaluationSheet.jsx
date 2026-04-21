import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../services/api';
import './EvaluationSheet.css';

const EvaluationSheet = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/Dofa-office') ? '/Dofa-office' : '/Dofa';
  const [rubrics, setRubrics] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState({});
  const [activeYear, setActiveYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [rerunning, setRerunning] = useState(null); // submissionId being re-run
  const saveTimers = useRef({});

  useEffect(() => { initializePage(); }, []);

  const initializePage = async () => {
    setLoading(true);
    try {
      const sessionRes = await apiClient.get('/sessions/active');
      const year = sessionRes?.data?.academic_year || '';
      setActiveYear(year);
      if (!year) {
        setRubrics([]);
        setSubmissions([]);
        setScores({});
        setRemarks({});
        return;
      }
      await fetchData(year);
    } catch {
      showToast('Unable to detect active session year', 'error');
      setRubrics([]);
      setSubmissions([]);
      setScores({});
      setRemarks({});
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (academicYear = activeYear) => {
    if (!academicYear) return;
    try {
      // apiClient response interceptor already returns res.data
      const data = await apiClient.get(`/evaluation?academic_year=${encodeURIComponent(academicYear)}`);
      
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
        await fetchData(activeYear); // refresh all scores before enabling UI
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

  const handleExportPDF = () => {
    if (!activeYear || submissions.length === 0) return showToast('No data to export', 'error');
    
    const rubricCols = rubrics.map(r => `<th>${r.sub_section || r.section_name}</th>`).join('');
    const rows = submissions.map((sub, idx) => {
      const scoreCells = rubrics.map((r) => `<td>${getScore(sub.submission_id, r.id)}</td>`).join('');
      return `<tr>
        <td>${idx + 1}</td>
        <td>${sub.faculty_name || '-'}</td>
        <td>${sub.department || '-'}</td>
        ${scoreCells}
        <td><strong>${getTotal(sub.submission_id)}</strong></td>
      </tr>`;
    }).join('');

    const logoUrl = window.location.origin + '/lnmiit-logo.png';
    const displayTitle = `Evaluation Sheet 1 - ${activeYear}`;
    
    const html = `<!DOCTYPE html>
<html><head><title>Sheet1_${activeYear}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; }
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
  <table><thead><tr><th>S.No</th><th>Faculty</th><th>Department</th>${rubricCols}<th>Total</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleExportCSV = () => {
    if (!activeYear || submissions.length === 0) return showToast('No data to export', 'error');
    const headers = ['S.No.', 'Faculty Name', 'Department'];
    rubrics.forEach(r => headers.push(`"${(r.sub_section || r.section_name).replace(/"/g, '""')}"`));
    headers.push('Total Score', 'Remarks');
    
    const csvRows = [headers.join(',')];
    submissions.forEach((sub, idx) => {
      const row = [idx + 1, `"${sub.faculty_name || ''}"`, `"${sub.department || ''}"`];
      rubrics.forEach(r => row.push(getScore(sub.submission_id, r.id)));
      row.push(getTotal(sub.submission_id), `"${(remarks[sub.submission_id] || '').replace(/"/g, '""')}"`);
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sheet1_${activeYear}.csv`;
    link.click();
  };

  if (loading) return <div className="eval-loading">Loading Evaluation Data...</div>;

  return (
    <div className="eval-sheet-container">
      {toast && <div className={`eval-toast eval-toast--${toast.type}`}>{toast.message}</div>}
      
      <div className="eval-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Evaluation Sheet - Sheet 1</h1>
            <p>Faculty Appraisal Consolidated Scores {activeYear ? `(${activeYear})` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExportCSV} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              Export CSV
            </button>
            <button onClick={handleExportPDF} style={{ padding: '6px 12px', background: '#1e3a8a', color: 'white', border: '1px solid #1e3a8a', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {!activeYear && (
        <div className="eval-loading" style={{ height: 'auto', padding: '10px 14px', marginBottom: 12 }}>
          No active appraisal session found. Sheet 1 will open when a session is released.
        </div>
      )}

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
                <td><div className="cell-content">{sub.designation || '-'}</div></td>
                <td>{sub.regular_visiting || 'Regular'}</td>
                <td>{sub.department || '-'}</td>
                
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
        <Link to={`${basePath}/sheet2`} className="eval-next-btn">
          Next - Sheet 2 &rarr;
        </Link>
      </div>
    </div>
  );
};

export default EvaluationSheet;

