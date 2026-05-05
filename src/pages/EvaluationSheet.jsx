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
  const [exportLoading, setExportLoading] = useState(null);
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

  const handleExportPDF = async () => {
    if (!activeYear || submissions.length === 0) return showToast('No data to export', 'error');

    const logoUrl = window.location.origin + '/lnmiit-logo.png';

    // helpers
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Build section map: section_name -> array of rubrics
    const sectionMap = {};
    const sectionOrder = [];
    rubrics.forEach(r => {
      if (!sectionMap[r.section_name]) {
        sectionMap[r.section_name] = [];
        sectionOrder.push(r.section_name);
      }
      sectionMap[r.section_name].push(r);
    });

    const getSectionTotal = (subId, rubArr) =>
      rubArr.reduce((sum, r) => {
        const v = parseFloat(scores[subId + '||' + r.id]);
        return sum + (isFinite(v) ? v : 0);
      }, 0);

    const getSectionMax = (rubArr) =>
      rubArr.reduce((sum, r) => sum + (parseFloat(r.max_marks) || 0), 0);

    // PART 1: Summary table header
    const summaryHeaderCols = sectionOrder.map(sec => {
      const mx = getSectionMax(sectionMap[sec]);
      return `<th>${esc(sec)}<br/><span class="max-lbl">/ ${mx}</span></th>`;
    }).join('');

    const summaryRows = submissions.map((sub, idx) => {
      const secCells = sectionOrder.map(sec => {
        const st = getSectionTotal(sub.submission_id, sectionMap[sec]);
        const mx = getSectionMax(sectionMap[sec]);
        const pct = mx > 0 ? (st / mx) * 100 : 0;
        const cls = pct >= 75 ? 'score-hi' : pct >= 50 ? 'score-mid' : 'score-lo';
        const disp = st % 1 === 0 ? st : st.toFixed(2);
        return `<td class="${cls}">${disp}</td>`;
      }).join('');
      const total = getTotal(sub.submission_id);
      return `<tr>
        <td class="sno">${idx + 1}</td>
        <td class="name">${esc(sub.faculty_name || '-')}</td>
        <td class="dept">${esc(sub.department || '-')}</td>
        ${secCells}
        <td class="grand-total">${total}</td>
      </tr>`;
    }).join('');

    // PART 2: Per-faculty detail cards
    const detailCards = submissions.map((sub, idx) => {
      const sectionBlocks = sectionOrder.map(sec => {
        const secRubrics = sectionMap[sec];
        const secTotal = getSectionTotal(sub.submission_id, secRubrics);
        const secMax = getSectionMax(secRubrics);
        const secTotalDisp = secTotal % 1 === 0 ? secTotal : secTotal.toFixed(2);

        const rubricRows = secRubrics.map((r, ri) => {
          const score = scores[sub.submission_id + '||' + r.id];
          const val = (score === undefined || score === null || score === '') ? '-' : score;
          const pct = parseFloat(r.max_marks) > 0 ? ((parseFloat(score) || 0) / parseFloat(r.max_marks)) * 100 : 0;
          const barW = Math.min(pct, 100).toFixed(1);
          let label = r.sub_section || r.section_name;
          if (label.includes(':')) label = label.split(':').slice(1).join(':').trim();
          return `<tr>
            <td class="rno">${ri + 1}</td>
            <td class="rlabel">${esc(label)}</td>
            <td class="rmax">/ ${r.max_marks}</td>
            <td class="rscore">${val}</td>
            <td class="rbar"><div class="bar-wrap"><div class="bar-fill" style="width:${barW}%"></div></div></td>
          </tr>`;
        }).join('');

        return `<div class="sec-block">
          <div class="sec-header">
            <span class="sec-name">${esc(sec)}</span>
            <span class="sec-total">${secTotalDisp} / ${secMax}</span>
          </div>
          <table class="rubric-tbl">
            <thead><tr><th>#</th><th>Item</th><th>Max</th><th>Score</th><th>Progress</th></tr></thead>
            <tbody>${rubricRows}</tbody>
          </table>
        </div>`;
      }).join('');

      const pb = idx < submissions.length - 1 ? 'page-break' : '';
      return `<div class="faculty-card ${pb}">
        <div class="card-header">
          <div class="card-name">${idx + 1}. ${esc(sub.faculty_name || '-')}</div>
          <div class="card-meta">
            <span>${esc(sub.department || '-')}</span>
            <span>${esc(sub.designation || '-')}</span>
            <span class="grand-pill">Grand Total: <strong>${getTotal(sub.submission_id)}</strong></span>
          </div>
        </div>
        <div class="sections-grid">${sectionBlocks}</div>
      </div>`;
    }).join('');

    const css = `
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 12mm 10mm; }
  .doc-header { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px solid #1e3a8a; margin-bottom: 14px; }
  .doc-header img { height: 48px; }
  .doc-header-text .inst { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
  .doc-header-text h1 { font-size: 19px; color: #1e3a8a; font-weight: 800; margin-top: 2px; }
  .doc-meta { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .part-label { font-size: 13px; font-weight: 700; color: #1e3a8a; margin: 0 0 8px; padding: 4px 10px; background: #eff6ff; border-left: 4px solid #1e3a8a; border-radius: 3px; }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 6px; }
  .summary-table th { background: #1e3a8a; color: #fff; padding: 5px 6px; text-align: center; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.2px; vertical-align: bottom; border: 1px solid #1e3a8a; }
  .summary-table th .max-lbl { display: block; font-size: 8px; font-weight: 400; color: #93c5fd; margin-top: 2px; }
  .summary-table td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: center; vertical-align: middle; }
  .summary-table tr:nth-child(even) td { background: #f8fafc; }
  .summary-table td.sno { color: #94a3b8; width: 22px; }
  .summary-table td.name { text-align: left; font-weight: 600; color: #0f172a; min-width: 90px; }
  .summary-table td.dept { text-align: left; color: #475569; min-width: 80px; }
  .summary-table td.grand-total { font-weight: 800; font-size: 11px; color: #1e3a8a; background: #eff6ff !important; }
  .score-hi { color: #166534; font-weight: 600; }
  .score-mid { color: #92400e; font-weight: 600; }
  .score-lo { color: #991b1b; }
  .page-break-before { page-break-before: always; }
  .page-break { page-break-after: always; }
  .faculty-card { padding: 10px 0 6px; }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; background: #1e3a8a; color: #fff; padding: 8px 12px; border-radius: 5px 5px 0 0; margin-bottom: 8px; }
  .card-name { font-size: 13px; font-weight: 700; }
  .card-meta { display: flex; gap: 14px; align-items: center; font-size: 10px; color: #bfdbfe; }
  .grand-pill { background: #fff; color: #1e3a8a; padding: 2px 10px; border-radius: 20px; font-weight: 700; font-size: 11px; }
  .sections-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .sec-block { border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
  .sec-header { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  .sec-name { font-weight: 700; font-size: 9px; color: #334155; text-transform: uppercase; letter-spacing: 0.3px; }
  .sec-total { font-weight: 800; font-size: 11px; color: #1e3a8a; }
  .rubric-tbl { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  .rubric-tbl th { background: #e2e8f0; color: #475569; padding: 3px 5px; text-align: left; font-size: 7.5px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
  .rubric-tbl td { padding: 3px 5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .rubric-tbl tr:last-child td { border-bottom: none; }
  .rno { color: #94a3b8; width: 16px; text-align: center; }
  .rlabel { color: #334155; }
  .rmax { color: #94a3b8; width: 28px; text-align: right; font-size: 7.5px; }
  .rscore { font-weight: 700; color: #0f172a; width: 28px; text-align: center; }
  .rbar { width: 60px; }
  .bar-wrap { background: #e2e8f0; border-radius: 3px; height: 6px; width: 100%; overflow: hidden; }
  .bar-fill { background: #3b82f6; height: 100%; border-radius: 3px; }
`;

    const genDate = new Date().toLocaleString('en-IN');
    const html = `<!DOCTYPE html><html><head><title>Sheet1_${activeYear}</title><style>${css}</style></head><body>
<div class="doc-header">
  <img src="${logoUrl}" alt="LNMIIT Logo" onerror="this.style.display=\'none\'" />
  <div class="doc-header-text">
    <div class="inst">The LNM Institute of Information Technology, Jaipur</div>
    <h1>Evaluation Sheet 1 &#8212; ${activeYear}</h1>
    <div class="doc-meta">Generated: ${genDate} &nbsp;|&nbsp; ${submissions.length} Faculty &nbsp;|&nbsp; ${rubrics.length} Rubric Items</div>
  </div>
</div>
<div class="part-label">Part A &#8212; Summary: Section-wise Scores</div>
<table class="summary-table">
  <thead><tr><th>#</th><th>Faculty Name</th><th>Department</th>${summaryHeaderCols}<th>Grand Total</th></tr></thead>
  <tbody>${summaryRows}</tbody>
</table>
<div class="page-break-before">
  <div class="doc-header">
    <img src="${logoUrl}" alt="LNMIIT Logo" onerror="this.style.display=\'none\'" />
    <div class="doc-header-text">
      <div class="inst">The LNM Institute of Information Technology, Jaipur</div>
      <h1>Evaluation Sheet 1 &#8212; ${activeYear}</h1>
    </div>
  </div>
  <div class="part-label">Part B &#8212; Detail: Per-Faculty Rubric Breakdown</div>
  ${detailCards}
</div>
</body></html>`;

    try {
      const blob = await apiClient.post('/submissions/export/html-to-pdf', { html, filename: `Sheet1_${activeYear}.pdf` }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sheet1_${activeYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export PDF failed:', err);
      showToast('Failed to generate PDF', 'error');
    }
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

  const handleExportPDFClick = async () => {
    if (!activeYear || submissions.length === 0) return showToast('No data to export', 'error');
    setExportLoading('pdf');
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    try {
      await handleExportPDF();
    } finally {
      setTimeout(() => setExportLoading(null), 300);
    }
  };

  const handleExportCSVClick = async () => {
    if (!activeYear || submissions.length === 0) return showToast('No data to export', 'error');
    setExportLoading('csv');
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    try {
      handleExportCSV();
    } finally {
      setTimeout(() => setExportLoading(null), 300);
    }
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
            <button onClick={handleExportCSVClick} disabled={!!exportLoading} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#334155', opacity: exportLoading ? 0.7 : 1 }}>
              {exportLoading === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
            </button>
            <button onClick={handleExportPDFClick} disabled={!!exportLoading} style={{ padding: '6px 12px', background: '#1e3a8a', color: 'white', border: '1px solid #1e3a8a', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', opacity: exportLoading ? 0.75 : 1 }}>
              {exportLoading === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
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

