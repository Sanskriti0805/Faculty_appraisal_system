import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../services/api';
import './EvaluationSheet3.css';

const EvaluationSheet3 = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/Dofa-office') ? '/Dofa-office' : '/Dofa';
  const [data, setData] = useState([]);
  const [gradeIncrements, setGradeIncrements] = useState({});
  const [availableGrades, setAvailableGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeSessionYear, setActiveSessionYear] = useState('');
  const [sessionLockState, setSessionLockState] = useState({ locked: false });
  const [sessionLockLoading, setSessionLockLoading] = useState(false);

  const isOfficePath = basePath === '/Dofa-office';

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    try {
      const targetYear = await fetchTargetYear();
      if (targetYear) {
        await Promise.all([fetchData(targetYear), fetchSessionLockState(targetYear)]);
      } else {
        setData([]);
        setAvailableGrades([]);
        setGradeIncrements({});
        setSessionLockState({ locked: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetYear = async () => {
    try {
      const res = await apiClient.get('/sessions/active');
      const year = res?.data?.academic_year || '';
      if (year) {
        setActiveSessionYear(year);
        return year;
      }
    } catch {
      // Fall back to Sheet 3 derived year when active session API is unavailable.
    }
    return '';
  };

  const fetchSessionLockState = async (preferredYear = '') => {
    let targetYear = preferredYear || activeSessionYear;
    if (!targetYear && data.length > 0) {
      targetYear = data[0]?.academic_year || '';
    }
    if (!targetYear) {
      setSessionLockState({ locked: false });
      return;
    }

    try {
      const res = await apiClient.get(`/submissions/session-lock?academic_year=${encodeURIComponent(targetYear)}`);
      if (res?.success) {
        setActiveSessionYear(res?.data?.academic_year || targetYear);
        setSessionLockState(res.data || { academic_year: targetYear, locked: false });
        return;
      }
    } catch {
      // Keep unlocked fallback state.
    }

    setActiveSessionYear(targetYear);
    setSessionLockState({ academic_year: targetYear, locked: false });
  };

  const fetchData = async (academicYear = activeSessionYear) => {
    if (!academicYear) return;
    try {
      const res = await apiClient.get(`/evaluation/sheet3?academic_year=${encodeURIComponent(academicYear)}`);
      if (res.success) {
        setData(res.data || []);
        const activeGrades = res.availableGrades || [];
        setAvailableGrades(activeGrades);
        const incMap = {};
        (res.gradeIncrements || []).forEach(item => {
          if (activeGrades.includes(item.grade)) {
            incMap[item.grade] = item.increment_percentage;
          }
        });
        setGradeIncrements(incMap);
        setActiveSessionYear(academicYear);
      }
    } catch (err) {
      showToast('Error loading Sheet 3 data', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === '') return '0%';
    return `${value}%`;
  };

  const handleIncChange = (grade, value) => {
    setGradeIncrements(prev => ({ ...prev, [grade]: value }));
  };

  const applyIncrements = async () => {
    try {
      if (sessionLockState?.locked) {
        showToast(`Session ${activeSessionYear || ''} is final-locked. Increments cannot be changed.`, 'error');
        return;
      }

      setLoading(true);
      const incArray = availableGrades.map((grade) => ({
        grade,
        increment_percentage: gradeIncrements[grade] || 0
      }));
      await apiClient.post('/evaluation/grade-increments', { increments: incArray });
      const res = await apiClient.post('/evaluation/apply-increments');
      if (res.success) {
        showToast('Increments applied successfully');
        await fetchData();
        await fetchSessionLockState();
      }
    } catch {
      showToast('Error applying increments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionLockToggle = async (nextLocked) => {
    const targetYear = activeSessionYear || data[0]?.academic_year;
    if (!targetYear) {
      showToast('Academic year is unavailable. Unable to change lock state.', 'error');
      return;
    }

    if (nextLocked) {
      const ok = window.confirm(
        `Final-lock session ${targetYear}? This will freeze Sheet 1/2/3 edits and all review actions (except view/download) until DoFA unlocks.`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `Unlock session ${targetYear}? This will re-enable evaluation and review actions for this academic year.`
      );
      if (!ok) return;
    }

    try {
      setSessionLockLoading(true);
      const res = await apiClient.put('/submissions/session-lock', {
        academic_year: targetYear,
        locked: nextLocked
      });
      if (res?.success) {
        showToast(res.message || `Session ${targetYear} ${nextLocked ? 'locked' : 'unlocked'} successfully`);
        await fetchSessionLockState(targetYear);
        await fetchData();
      } else {
        showToast(res?.message || 'Unable to update session lock state.', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Unable to update session lock state.', 'error');
    } finally {
      setSessionLockLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!activeSessionYear || data.length === 0) return showToast('No data to export', 'error');
    
    const rows = data.map((item, idx) => {
      const incrementStr = formatPercent(item.increment_percentage);
      return `<tr>
        <td>${idx + 1}</td>
        <td>${item.faculty_name || '-'}</td>
        <td>${item.department || '-'}</td>
        <td>${item.research_remarks || '-'}</td>
        <td>${item.research_marks || 0}</td>
        <td>${item.teaching_feedback || '-'}</td>
        <td>${item.teaching_marks || 0}</td>
        <td>${item.overall_feedback || '-'}</td>
        <td>${item.total_score || 0}</td>
        <td><strong>${item.final_grade || '-'}</strong></td>
        <td>${incrementStr}</td>
      </tr>`;
    }).join('');

    const logoUrl = window.location.origin + '/lnmiit-logo.png';
    const displayTitle = `Evaluation Sheet 3 - ${activeSessionYear}`;
    
    const html = `<!DOCTYPE html>
<html><head><title>Sheet3_${activeSessionYear}</title>
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
    <thead><tr><th>S.No</th><th>Faculty</th><th>Department</th><th>Research Feedback</th><th>Research Marks</th><th>Teaching Feedback</th><th>Teacher Section Total Marks</th><th>Overall Feedback</th><th>Total Score</th><th>Final Grade</th><th>Increment %</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleExportCSV = () => {
    if (!activeSessionYear || data.length === 0) return showToast('No data to export', 'error');
    const headers = ['S.No.', 'Faculty Name', 'Department', 'Research Feedback', 'Research Marks', 'Teaching Feedback', 'Teacher Section Total Marks', 'Overall Feedback', 'Total Score', 'Final Grade', 'Increment %'];
    const csvRows = [headers.join(',')];
    data.forEach((item, idx) => {
      const incrementStr = formatPercent(item.increment_percentage);
      const row = [
        idx + 1, 
        csvValue(item.faculty_name), 
        csvValue(item.department),
        csvValue(item.research_remarks),
        item.research_marks || 0,
        csvValue(item.teaching_feedback),
        item.teaching_marks || 0,
        csvValue(item.overall_feedback),
        item.total_score || 0,
        csvValue(item.final_grade),
        csvValue(incrementStr)
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sheet3_${activeSessionYear}.csv`;
    link.click();
  };

  const handleExportAllPDF = async () => {
    if (!activeSessionYear) return showToast('No active session to export', 'error');

    try {
      const [sheet1, sheet2, sheet3] = await Promise.all([
        apiClient.get(`/evaluation?academic_year=${encodeURIComponent(activeSessionYear)}`),
        apiClient.get(`/evaluation/sheet2?academic_year=${encodeURIComponent(activeSessionYear)}`),
        apiClient.get(`/evaluation/sheet3?academic_year=${encodeURIComponent(activeSessionYear)}`)
      ]);

      if (!sheet1?.success || !sheet2?.success || !sheet3?.success) {
        throw new Error('Unable to fetch all sheets');
      }

      const logoUrl = window.location.origin + '/lnmiit-logo.png';
      const genDate = new Date().toLocaleString('en-IN');
      const yr = activeSessionYear;

      // ── helpers ────────────────────────────────────────────────────────
      const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const fmtPct = (v) => (v === null || v === undefined || v === '') ? '0%' : v + '%';

      // ── SHEET 1 data ────────────────────────────────────────────────────
      const s1Rubrics = sheet1.rubrics || [];
      const s1Subs   = sheet1.submissions || [];
      const s1Scores = sheet1.scores || [];

      const scoreMap = {};
      s1Scores.forEach(s => { scoreMap[s.submission_id + '||' + s.rubric_id] = s.score; });

      // Build section map for Sheet 1
      const sectionMap = {};
      const sectionOrder = [];
      s1Rubrics.forEach(r => {
        if (!sectionMap[r.section_name]) {
          sectionMap[r.section_name] = [];
          sectionOrder.push(r.section_name);
        }
        sectionMap[r.section_name].push(r);
      });

      const getSectionTotal = (subId, rubArr) =>
        rubArr.reduce((sum, r) => {
          const v = parseFloat(scoreMap[subId + '||' + r.id]);
          return sum + (isFinite(v) ? v : 0);
        }, 0);

      const getSectionMax = (rubArr) =>
        rubArr.reduce((sum, r) => sum + (parseFloat(r.max_marks) || 0), 0);

      const getGrandTotal = (subId) => {
        const t = s1Rubrics.reduce((sum, r) => {
          const v = parseFloat(scoreMap[subId + '||' + r.id]);
          return sum + (isFinite(v) ? v : 0);
        }, 0);
        return t % 1 === 0 ? t : t.toFixed(2);
      };

      // Sheet 1 — summary table
      const s1SummaryHeaderCols = sectionOrder.map(sec => {
        const mx = getSectionMax(sectionMap[sec]);
        return `<th>${esc(sec)}<br/><span class="max-lbl">/ ${mx}</span></th>`;
      }).join('');

      const s1SummaryRows = s1Subs.map((sub, idx) => {
        const secCells = sectionOrder.map(sec => {
          const st = getSectionTotal(sub.submission_id, sectionMap[sec]);
          const mx = getSectionMax(sectionMap[sec]);
          const pct = mx > 0 ? (st / mx) * 100 : 0;
          const cls = pct >= 75 ? 'score-hi' : pct >= 50 ? 'score-mid' : 'score-lo';
          const disp = st % 1 === 0 ? st : st.toFixed(2);
          return `<td class="${cls}">${disp}</td>`;
        }).join('');
        return `<tr><td class="sno">${idx + 1}</td><td class="fname">${esc(sub.faculty_name || '-')}</td><td class="fdept">${esc(sub.department || '-')}</td>${secCells}<td class="grand-total">${getGrandTotal(sub.submission_id)}</td></tr>`;
      }).join('');

      // Sheet 1 — per-faculty detail cards
      const s1DetailCards = s1Subs.map((sub, idx) => {
        const sectionBlocks = sectionOrder.map(sec => {
          const secRubrics = sectionMap[sec];
          const secTotal = getSectionTotal(sub.submission_id, secRubrics);
          const secMax = getSectionMax(secRubrics);
          const secTotalDisp = secTotal % 1 === 0 ? secTotal : secTotal.toFixed(2);
          const rubricRows = secRubrics.map((r, ri) => {
            const score = scoreMap[sub.submission_id + '||' + r.id];
            const val = (score === undefined || score === null || score === '') ? '-' : score;
            const pct = parseFloat(r.max_marks) > 0 ? ((parseFloat(score) || 0) / parseFloat(r.max_marks)) * 100 : 0;
            const barW = Math.min(pct, 100).toFixed(1);
            let label = r.sub_section || r.section_name;
            if (label.includes(':')) label = label.split(':').slice(1).join(':').trim();
            return `<tr><td class="rno">${ri + 1}</td><td class="rlabel">${esc(label)}</td><td class="rmax">/ ${r.max_marks}</td><td class="rscore">${val}</td><td class="rbar"><div class="bar-wrap"><div class="bar-fill" style="width:${barW}%"></div></div></td></tr>`;
          }).join('');
          return `<div class="sec-block"><div class="sec-header"><span class="sec-name">${esc(sec)}</span><span class="sec-total">${secTotalDisp} / ${secMax}</span></div><table class="rubric-tbl"><thead><tr><th>#</th><th>Item</th><th>Max</th><th>Score</th><th>Progress</th></tr></thead><tbody>${rubricRows}</tbody></table></div>`;
        }).join('');
        const pb = idx < s1Subs.length - 1 ? 'page-break' : '';
        return `<div class="faculty-card ${pb}"><div class="card-header"><div class="card-name">${idx + 1}. ${esc(sub.faculty_name || '-')}</div><div class="card-meta"><span>${esc(sub.department || '-')}</span><span>${esc(sub.designation || '-')}</span><span class="grand-pill">Grand Total: <strong>${getGrandTotal(sub.submission_id)}</strong></span></div></div><div class="sections-grid">${sectionBlocks}</div></div>`;
      }).join('');

      // ── SHEET 2 rows ────────────────────────────────────────────────────
      const s2Rows = (sheet2.data || []).map((item, idx) => {
        const gradeColor = { A: '#166534', B: '#1e40af', C: '#92400e', D: '#991b1b' }[String(item.final_grade || '').charAt(0).toUpperCase()] || '#334155';
        return `<tr>
          <td class="sno">${idx + 1}</td>
          <td class="fname">${esc(item.faculty_name || '-')}</td>
          <td class="fdept">${esc(item.department || '-')}</td>
          <td class="feedback-cell">${esc(item.research_remarks || '-')}</td>
          <td class="score-cell score-hi">${item.research_marks || 0}</td>
          <td class="feedback-cell">${esc(item.teaching_feedback || '-')}</td>
          <td class="score-cell">${item.teaching_marks || 0}</td>
          <td class="feedback-cell">${esc(item.overall_feedback || '-')}</td>
          <td class="score-cell grand-total">${item.total_score || 0}</td>
          <td class="grade-cell" style="color:${gradeColor};">${esc(item.final_grade || '-')}</td>
        </tr>`;
      }).join('');

      // ── SHEET 3 rows ────────────────────────────────────────────────────
      const s3Rows = (sheet3.data || []).map((item, idx) => {
        const gradeColor = { A: '#166534', B: '#1e40af', C: '#92400e', D: '#991b1b' }[String(item.final_grade || '').charAt(0).toUpperCase()] || '#334155';
        const incPct = parseFloat(item.increment_percentage) || 0;
        const incBg = incPct > 0 ? '#dcfce7' : '#f1f5f9';
        const incTxt = incPct > 0 ? '#166534' : '#64748b';
        return `<tr>
          <td class="sno">${idx + 1}</td>
          <td class="fname">${esc(item.faculty_name || '-')}</td>
          <td class="fdept">${esc(item.department || '-')}</td>
          <td class="feedback-cell">${esc(item.research_remarks || '-')}</td>
          <td class="score-cell score-hi">${item.research_marks || 0}</td>
          <td class="feedback-cell">${esc(item.teaching_feedback || '-')}</td>
          <td class="score-cell">${item.teaching_marks || 0}</td>
          <td class="feedback-cell">${esc(item.overall_feedback || '-')}</td>
          <td class="score-cell grand-total">${item.total_score || 0}</td>
          <td class="grade-cell" style="color:${gradeColor};">${esc(item.final_grade || '-')}</td>
          <td><span style="background:${incBg};color:${incTxt};padding:2px 8px;border-radius:20px;font-weight:700;font-size:9px;">${fmtPct(item.increment_percentage)}</span></td>
        </tr>`;
      }).join('');

      // ── CSS ─────────────────────────────────────────────────────────────
      const css = `
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 12mm 10mm; }

  /* Header */
  .doc-header { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px solid #1e3a8a; margin-bottom: 14px; }
  .doc-header img { height: 48px; }
  .doc-header-text .inst { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
  .doc-header-text h1 { font-size: 19px; color: #1e3a8a; font-weight: 800; margin-top: 2px; }
  .doc-meta { font-size: 10px; color: #94a3b8; margin-top: 2px; }

  /* Part label */
  .part-label { font-size: 13px; font-weight: 700; color: #1e3a8a; margin: 0 0 10px; padding: 5px 12px; background: #eff6ff; border-left: 4px solid #1e3a8a; border-radius: 3px; }
  .sheet-label { font-size: 11px; font-weight: 700; color: #475569; margin: 0 0 8px; padding: 4px 10px; background: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 3px; }

  /* Page breaks */
  .page-break { page-break-after: always; }
  .page-break-before { page-break-before: always; }

  /* Sheet 1 — Summary table */
  .summary-table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 6px; }
  .summary-table th { background: #1e3a8a; color: #fff; padding: 5px 6px; text-align: center; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.2px; vertical-align: bottom; border: 1px solid #1e3a8a; }
  .summary-table th .max-lbl { display: block; font-size: 8px; font-weight: 400; color: #93c5fd; margin-top: 2px; }
  .summary-table td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: center; vertical-align: middle; }
  .summary-table tr:nth-child(even) td { background: #f8fafc; }
  .summary-table td.sno { color: #94a3b8; width: 20px; }
  .summary-table td.fname { text-align: left; font-weight: 600; color: #0f172a; min-width: 90px; }
  .summary-table td.fdept { text-align: left; color: #475569; min-width: 80px; }
  .summary-table td.grand-total { font-weight: 800; font-size: 11px; color: #1e3a8a; background: #eff6ff !important; }
  .score-hi { color: #166534; font-weight: 600; }
  .score-mid { color: #92400e; font-weight: 600; }
  .score-lo { color: #991b1b; }

  /* Sheet 1 — Faculty detail cards */
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

  /* Sheet 2 & 3 — wide tables */
  .wide-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .wide-table th { background: #1e3a8a; color: #fff; padding: 6px 8px; text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.2px; border: 1px solid #1e3a8a; }
  .wide-table td { border: 1px solid #e8edf3; padding: 5px 8px; vertical-align: top; font-size: 9px; }
  .wide-table tr:nth-child(even) td { background: #f8fafc; }
  .wide-table td.sno { color: #94a3b8; width: 20px; text-align: center; }
  .wide-table td.fname { font-weight: 600; color: #0f172a; min-width: 90px; }
  .wide-table td.fdept { color: #475569; min-width: 70px; }
  .wide-table td.feedback-cell { color: #334155; max-width: 140px; font-style: italic; font-size: 8.5px; }
  .wide-table td.score-cell { text-align: center; font-weight: 700; width: 40px; }
  .wide-table td.grand-total { font-weight: 800; font-size: 10px; color: #1e3a8a; background: #eff6ff !important; text-align: center; }
  .wide-table td.grade-cell { font-weight: 800; font-size: 12px; text-align: center; width: 36px; }
`;

      // ── HTML ─────────────────────────────────────────────────────────────
      const headerBlock = (subtitle) => `<div class="doc-header">
  <img src="${logoUrl}" alt="LNMIIT Logo" onerror="this.style.display='none'" />
  <div class="doc-header-text">
    <div class="inst">The LNM Institute of Information Technology, Jaipur</div>
    <h1>Evaluation Sheets 1, 2 &amp; 3 &#8212; ${yr}</h1>
    <div class="doc-meta">${subtitle}</div>
  </div>
</div>`;

      const html = `<!DOCTYPE html><html><head><title>Evaluation_All_Sheets_${yr}</title>
<style>${css}</style></head><body>

${headerBlock('Consolidated Export &nbsp;|&nbsp; Generated: ' + genDate + ' &nbsp;|&nbsp; ' + s1Subs.length + ' Faculty')}

<div class="part-label">Sheet 1 &#8212; Part A: Section-wise Score Summary</div>
<table class="summary-table">
  <thead><tr><th>#</th><th>Faculty Name</th><th>Department</th>${s1SummaryHeaderCols}<th>Grand Total</th></tr></thead>
  <tbody>${s1SummaryRows}</tbody>
</table>

<div class="page-break-before">
  ${headerBlock('Sheet 1 &#8212; Part B: Per-Faculty Rubric Breakdown')}
  <div class="part-label">Sheet 1 &#8212; Part B: Per-Faculty Rubric Breakdown</div>
  ${s1DetailCards}
</div>

<div class="page-break-before">
  ${headerBlock('Sheet 2 &#8212; Research, Teaching &amp; Consolidated Grading')}
  <div class="part-label">Sheet 2 &#8212; Research, Teaching &amp; Consolidated Grading</div>
  <table class="wide-table">
    <thead><tr>
      <th>#</th><th>Faculty Name</th><th>Department</th>
      <th>Research Feedback</th><th>Research Marks</th>
      <th>Teaching Feedback</th><th>Teacher Section Marks</th>
      <th>Overall Feedback</th><th>Total Score</th><th>Grade</th>
    </tr></thead>
    <tbody>${s2Rows}</tbody>
  </table>
</div>

<div class="page-break-before">
  ${headerBlock('Sheet 3 &#8212; Grade-based Salary Increment Summary')}
  <div class="part-label">Sheet 3 &#8212; Grade-based Salary Increment Summary</div>
  <table class="wide-table">
    <thead><tr>
      <th>#</th><th>Faculty Name</th><th>Department</th>
      <th>Research Feedback</th><th>Research Marks</th>
      <th>Teaching Feedback</th><th>Teacher Section Marks</th>
      <th>Overall Feedback</th><th>Total Score</th><th>Final Grade</th><th>Increment %</th>
    </tr></thead>
    <tbody>${s3Rows}</tbody>
  </table>
</div>

</body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 700);
    } catch {
      showToast('Error exporting consolidated sheets', 'error');
    }
  };


  if (loading) return <div className="eval3-loading">Loading Sheet 3...</div>;

  return (
    <div className="eval3-container">
      {toast && <div className={`eval3-toast eval3-toast--${toast.type}`}>{toast.message}</div>}

      <div className="eval3-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Evaluation - Sheet 3</h1>
            <p>Grade-based Salary Increments Summary</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleExportCSV} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#334155' }}>
              Export CSV
            </button>
            <button onClick={handleExportPDF} style={{ padding: '6px 12px', background: '#1e3a8a', color: 'white', border: '1px solid #1e3a8a', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Download PDF
            </button>
            <button onClick={handleExportAllPDF} style={{ padding: '6px 12px', background: '#0f172a', color: 'white', border: '1px solid #0f172a', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Download All Sheets PDF
            </button>
            <Link to={`${basePath}/sheet2`} className="back-btn" style={{ marginLeft: '12px' }}>
              &larr; Back to Sheet 2
            </Link>
          </div>
        </div>
      </div>

      <div className={`eval3-lock-banner ${sessionLockState?.locked ? 'locked' : 'unlocked'}`}>
        <div>
          <h3>Session Lock Status</h3>
          <p>
            {activeSessionYear ? `${activeSessionYear}: ` : ''}
            {sessionLockState?.locked
              ? 'Final-locked. Sheet 1/2/3 data and review actions are frozen.'
              : 'Unlocked. You can still apply grading, increments, and reviews.'}
          </p>
          {!activeSessionYear && (
            <p style={{ marginTop: 6 }}>No active appraisal session found. Sheet 3 will open when a session is released.</p>
          )}
        </div>
        <div className="eval3-lock-actions">
          {!sessionLockState?.locked && (
            <button
              className="session-lock-btn"
              onClick={() => handleSessionLockToggle(true)}
              disabled={sessionLockLoading || !activeSessionYear}
              title="Lock this session after verifying Sheet 3 increments"
            >
              {sessionLockLoading ? 'Working...' : 'Final Lock Session'}
            </button>
          )}
          {sessionLockState?.locked && !isOfficePath && (
            <button
              className="session-unlock-btn"
              onClick={() => handleSessionLockToggle(false)}
              disabled={sessionLockLoading || !activeSessionYear}
              title="DoFA-only action to re-open this session"
            >
              {sessionLockLoading ? 'Working...' : 'Unlock Session'}
            </button>
          )}
        </div>
      </div>

      <div className="eval3-inc-config">
        <h2>Set Increment Percentage by Grade</h2>
        {sessionLockState?.locked && (
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
            This academic session is final-locked. Increment settings are read-only.
          </p>
        )}
        {availableGrades.length === 0 ? (
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>
            No grades found in Sheet 2. Please finalise grades in Sheet 2 first.
          </p>
        ) : (
          <>
            <div className="inc-rules-grid">
              {availableGrades.map(grade => (
                <div key={grade} className="inc-rule-card">
                  <label>Grade {grade}</label>
                  <div className="inc-input-wrapper">
                    <input
                      type="number"
                      className="inc-input"
                      placeholder="0"
                      value={gradeIncrements[grade] || ''}
                      onChange={(e) => handleIncChange(grade, e.target.value)}
                      disabled={sessionLockState?.locked}
                    />
                    <span>%</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="apply-inc-btn" onClick={applyIncrements} disabled={sessionLockState?.locked}>
              Apply Increments to All Faculty
            </button>
          </>
        )}
      </div>

      <div className="eval3-table-wrapper">
        <table className="eval3-table">
          <colgroup>
            <col /><col /><col /><col /><col /><col /><col /><col /><col /><col /><col />
          </colgroup>
          <thead>
            <tr>
              <th>S.No</th>
              <th title="Faculty Name">Faculty Name</th>
              <th title="Department">Department</th>
              <th title="Research Feedback">Research Feedback</th>
              <th title="Research Marks">Research Marks</th>
              <th title="Teaching Feedback">Teaching Feedback</th>
              <th title="Teacher Section Total Marks">Teacher Section Total Marks</th>
              <th title="Overall Feedback">Overall Feedback</th>
              <th title="Total Score">Total Score</th>
              <th title="Grade">Grade</th>
              <th title="Increment Percentage">Increment %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={item.submission_id}>
                <td style={{ color: '#94a3b8', fontWeight: 500 }}>{idx + 1}</td>
                <td style={{ fontWeight: 600, color: '#1e293b' }} title={item.faculty_name || ''}>{item.faculty_name}</td>
                <td style={{ color: '#64748b' }} title={item.department || ''}>{item.department}</td>
                <td className="eval3-feedback" title={item.research_remarks || ''}>{item.research_remarks || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {item.research_marks || 0}
                </td>
                <td className="eval3-feedback" title={item.teaching_feedback || ''}>{item.teaching_feedback || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{item.teaching_marks || 0}</td>
                <td className="eval3-feedback" title={item.overall_feedback || ''}>{item.overall_feedback || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {item.total_score || 0}
                </td>
                <td className="eval3-grade" title={item.final_grade || ''}>{item.final_grade || '-'}</td>
                <td className="eval3-increment">
                  {formatPercent(item.increment_percentage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvaluationSheet3;
