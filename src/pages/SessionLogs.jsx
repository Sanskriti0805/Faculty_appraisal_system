import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, FileText, LayoutList, ChevronDown, Eye, Calendar } from 'lucide-react';
import apiClient from '../services/api';
import './DofaOfficeDashboard.css';
import './SessionLogs.css';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const sortAcademicYearsDesc = (years = []) => {
  const parseStart = (year) => {
    const first = String(year || '').split('-')[0];
    const value = Number(first);
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  };

  return [...years].sort((a, b) => {
    const diff = parseStart(b) - parseStart(a);
    if (diff !== 0) return diff;
    return String(b || '').localeCompare(String(a || ''));
  });
};

const SessionLogs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = location.pathname.startsWith('/Dofa-office') ? '/Dofa-office' : '/Dofa';

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [activeSessionYear, setActiveSessionYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [yearFilter, setYearFilter] = useState('all');
  const [filter, setFilter] = useState('all');
  const [activeFormType, setActiveFormType] = useState('A');
  const [loadError, setLoadError] = useState('');

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(null);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initialize = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const activeYear = await fetchActiveSessionYear();
      await fetchSubmissions(activeYear);
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Unable to load logs data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessionYear = async () => {
    try {
      const data = await apiClient.get('/sessions/active');
      const year = data?.data?.academic_year || '';
      setActiveSessionYear(year);
      return year;
    } catch {
      setActiveSessionYear('');
      return '';
    }
  };

  const fetchSubmissions = async (currentYear = '') => {
    try {
      const [submissionsData, sessionsData] = await Promise.all([
        apiClient.get('/submissions'),
        apiClient.get('/sessions')
      ]);

      const data = submissionsData;
      if (!data.success) {
        setSubmissions([]);
        setAvailableYears([]);
        setLoadError(data.message || 'Unable to load submissions');
        return;
      }

      const allSubs = Array.isArray(data.data) ? data.data : [];
      const previousSessionSubs = allSubs.filter((s) => {
        const year = String(s.academic_year || '').trim();
        return year && year !== currentYear;
      });
      setSubmissions(previousSessionSubs);

      const submissionYears = [...new Set(
        previousSessionSubs
          .map((s) => String(s.academic_year || '').trim())
          .filter(Boolean)
      )];

      const allSessions = Array.isArray(sessionsData?.data) ? sessionsData.data : [];
      const closedSessionYears = [...new Set(
        allSessions
          .filter((s) => String(s.status || '').toLowerCase() === 'closed')
          .map((s) => String(s.academic_year || '').trim())
          .filter((year) => !!year && year !== currentYear)
      )];

      const historicalYears = sortAcademicYearsDesc([...new Set([...submissionYears, ...closedSessionYears])]);

      setAvailableYears(historicalYears);
      if (historicalYears.length > 0) {
        setYearFilter(historicalYears[0]);
      } else {
        setYearFilter('all');
      }
      setLoadError('');
    } catch (error) {
      console.error('Error loading session logs:', error);
      setSubmissions([]);
      setAvailableYears([]);
      setLoadError(error?.response?.data?.message || error?.message || 'Unable to load submissions');
    }
  };

  const matchesFilter = (status, activeFilter) => {
    if (activeFilter === 'all') return true;
    const normalized = String(status || '').toLowerCase();
    if (activeFilter === 'submitted') return ['submitted', 'submitted_hod', 'hod_approved'].includes(normalized);
    if (activeFilter === 'under_review') return ['under_review', 'under_review_hod'].includes(normalized);
    return normalized === activeFilter;
  };

  const statusLabel = (submission) => {
    const status = String(submission?.status || '').toLowerCase();
    const formType = String(submission?.form_type || 'A').toUpperCase() === 'B' ? 'Form B' : 'Form A';
    const textMap = {
      draft: 'Draft',
      submitted: 'Submitted to DoFA',
      submitted_hod: 'Submitted to HoD',
      hod_approved: 'HoD Approved - Pending DoFA',
      under_review: 'Under DoFA Review',
      under_review_hod: 'Under HoD Review',
      approved: 'Approved',
      sent_back: 'Sent Back'
    };
    return `${formType} - ${textMap[status] || submission?.status || 'Unknown'}`;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const historicalSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const year = String(s.academic_year || '').trim();
      if (!year || year === activeSessionYear) return false;
      if (yearFilter !== 'all' && year !== yearFilter) return false;
      return true;
    });
  }, [submissions, activeSessionYear, yearFilter]);

  const combinedEntries = useMemo(() => {
    const map = new Map();

    historicalSubmissions.forEach((submission) => {
      const key = `${submission.faculty_id || submission.email || submission.faculty_name}_${submission.academic_year || 'Unknown'}`;
      const formType = String(submission.form_type || 'A').toUpperCase() === 'B' ? 'B' : 'A';

      if (!map.has(key)) {
        map.set(key, {
          key,
          academic_year: submission.academic_year,
          faculty_name: submission.faculty_name,
          faculty_id: submission.faculty_id,
          email: submission.email,
          department: submission.department,
          forms: { A: null, B: null }
        });
      }

      map.get(key).forms[formType] = submission;
    });

    return Array.from(map.values());
  }, [historicalSubmissions]);

  const selectedRows = useMemo(() => {
    return combinedEntries
      .map((entry) => {
        const selectedSubmission = entry.forms[activeFormType];
        return {
          ...entry,
          selectedFormType: activeFormType,
          selectedSubmission
        };
      })
      .filter((entry) => entry.selectedSubmission && matchesFilter(entry.selectedSubmission.status, filter));
  }, [combinedEntries, activeFormType, filter]);

  const grouped = useMemo(() => {
    return selectedRows.reduce((acc, entry) => {
      const year = entry.academic_year || 'Unknown';
      if (!acc[year]) acc[year] = [];
      acc[year].push(entry);
      return acc;
    }, {});
  }, [selectedRows]);

  const yearsToShow = useMemo(() => {
    const years = Object.keys(grouped).sort().reverse();
    if (yearFilter === 'all') return years;
    return grouped[yearFilter] ? [yearFilter] : [];
  }, [grouped, yearFilter]);

  const handleExportSummaryPDF = () => {
    setExportLoading('summary');
    setExportDropdownOpen(false);
    try {
      const yearLabel = yearFilter === 'all' ? 'All Academic Years' : yearFilter;
      const subs = selectedRows.map((r) => r.selectedSubmission).filter(Boolean);

      if (subs.length === 0) {
        window.appToast('No historical submissions found for the selected year.');
        return;
      }

      const byYear = subs.reduce((acc, s) => {
        const yr = s.academic_year || 'Unknown';
        if (!acc[yr]) acc[yr] = [];
        acc[yr].push(s);
        return acc;
      }, {});

      let tableRows = '';
      Object.keys(byYear).sort().reverse().forEach((yr) => {
        byYear[yr].forEach((s, i) => {
          tableRows += `<tr>
            <td>${i === 0 ? `<strong>${yr}</strong>` : ''}</td>
            <td>${s.faculty_name || '-'}</td>
            <td>${s.department || '-'}</td>
            <td>${s.designation || '-'}</td>
            <td>${s.email || '-'}</td>
            <td>${s.form_type || 'A'}</td>
            <td>${statusLabel(s)}</td>
            <td>${s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
          </tr>`;
        });
      });

      const logoUrl = window.location.origin + '/lnmiit-logo.png';
      const html = `<!DOCTYPE html>
<html><head><title>Session Logs Summary - ${yearLabel}</title>
<style>
  @page { size: A4 landscape; margin: 16mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; }
  .header-container { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; }
  .header-container img { max-height: 70px; margin-right: 20px; }
  .header-text { display: flex; flex-direction: column; }
  .header-inst { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
  h1 { font-size: 24px; color: #1e3a8a; margin: 4px 0 0 0; }
  .meta { font-size: 12px; color: #475569; margin-bottom: 20px; text-align: center; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a8a; color: white; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 20px; font-size: 10px; color: #9ca3af; text-align: center; }
</style></head><body>
<div class="header-container">
  <img src="${logoUrl}" alt="LNMIIT Logo" />
  <div class="header-text">
    <div class="header-inst">The LNM Institute of Information Technology, Jaipur</div>
    <h1>Historical Session Summary</h1>
  </div>
</div>
<p class="meta">Active Session Excluded: <strong>${activeSessionYear || 'N/A'}</strong> &nbsp;|&nbsp; View: <strong>${yearLabel}</strong> &nbsp;|&nbsp; Records: <strong>${subs.length}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
<table>
  <thead><tr><th>Academic Year</th><th>Faculty Name</th><th>Department</th><th>Designation</th><th>Email</th><th>Form</th><th>Status</th><th>Submitted On</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<p class="footer">DoFA Session Logs</p>
</body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 400);
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportFormsPDF = async () => {
    setExportLoading('forms');
    setExportDropdownOpen(false);
    try {
      const yearLabel = yearFilter === 'all' ? 'All Academic Years' : yearFilter;
      const subs = selectedRows.map((r) => r.selectedSubmission).filter(Boolean);

      if (subs.length === 0) {
        window.appToast('No historical submissions found for the selected year.');
        return;
      }

      const token = localStorage.getItem('auth_token');
      const allData = [];
      for (const sub of subs) {
        try {
          const data = await apiClient.get(`/submissions/${sub.id}`);
          if (data.success) allData.push(data.data);
        } catch (e) {
          console.warn(`Could not fetch submission ${sub.id}`);
        }
      }

      const facultySections = allData.map(({ submission: s, facultyInfo, courses, publications, grants, patents, awards, newCourses }) => `
        <div class="faculty-block">
          <div class="faculty-header">
            <h2>${s.faculty_name}</h2>
            <div class="faculty-meta-grid">
              <div><label>Department</label><span>${s.department || '-'}</span></div>
              <div><label>Designation</label><span>${facultyInfo?.designation || s.designation || '-'}</span></div>
              <div><label>Email</label><span>${s.email || '-'}</span></div>
              <div><label>Academic Year</label><span>${s.academic_year}</span></div>
              <div><label>Form Type</label><span>Form ${s.form_type || 'A'}</span></div>
              <div><label>Status</label><span>${statusLabel(s)}</span></div>
            </div>
          </div>

          <h3>Courses Taught (${(courses || []).length})</h3>
          ${(courses || []).length > 0 ? `<table><thead><tr><th>Course Name</th><th>Code</th><th>Semester</th><th>Program</th><th>Enrollment</th></tr></thead><tbody>
          ${(courses || []).map(c => `<tr><td>${c.course_name || '-'}</td><td>${c.course_code || '-'}</td><td>${c.semester || '-'}</td><td>${c.program || '-'}</td><td>${c.enrollment || '-'}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Research Publications (${(publications || []).length})</h3>
          ${(publications || []).length > 0 ? `<table><thead><tr><th>Type</th><th>Sub-type</th><th>Title</th><th>Year</th><th>Journal / Conference</th></tr></thead><tbody>
          ${(publications || []).map(p => `<tr><td>${p.publication_type || ''}</td><td>${p.sub_type || ''}</td><td>${p.title || ''}</td><td>${p.year_of_publication || ''}</td><td>${p.journal_name || p.conference_name || ''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Research Grants (${(grants || []).length})</h3>
          ${(grants || []).length > 0 ? `<table><thead><tr><th>Project</th><th>Agency</th><th>Amount</th><th>Role</th></tr></thead><tbody>
          ${(grants || []).map(g => `<tr><td>${g.project_name || ''}</td><td>${g.funding_agency || ''}</td><td>${g.amount_in_lakhs || 0}</td><td>${g.role || ''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Patents (${(patents || []).length})</h3>
          ${(patents || []).length > 0 ? `<table><thead><tr><th>Type</th><th>Title</th><th>Agency</th></tr></thead><tbody>
          ${(patents || []).map(p => `<tr><td>${p.patent_type || ''}</td><td>${p.title || ''}</td><td>${p.agency || ''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Awards (${(awards || []).length})</h3>
          ${(awards || []).length > 0 ? `<table><thead><tr><th>Award</th><th>Agency</th><th>Year</th></tr></thead><tbody>
          ${(awards || []).map(a => `<tr><td>${a.award_name || ''}</td><td>${a.awarding_agency || ''}</td><td>${a.year || ''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>New Courses (${(newCourses || []).length})</h3>
          ${(newCourses || []).length > 0 ? `<table><thead><tr><th>Course Name</th><th>Code</th><th>Level</th><th>Program</th></tr></thead><tbody>
          ${(newCourses || []).map(c => `<tr><td>${c.course_name || ''}</td><td>${c.course_code || ''}</td><td>${c.level || ''}</td><td>${c.program || ''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}
        </div>
      `).join('');

      const logoUrl = window.location.origin + '/lnmiit-logo.png';
      const html = `<!DOCTYPE html>
<html><head><title>Session Logs Forms - ${yearLabel}</title>
<style>
  @page { size: A4 portrait; margin: 16mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; }
  
  /* Cover Page Styles */
  .cover-page {
    height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    page-break-after: always;
    border: 6px solid #1e3a8a;
    padding: 40px;
    box-sizing: border-box;
  }
  .cover-page img { max-height: 120px; margin-bottom: 30px; }
  .cover-page .inst-name { font-size: 16px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; }
  .cover-page h1 { font-size: 32px; color: #1e3a8a; margin-bottom: 10px; }
  .cover-page h2 { font-size: 20px; color: #64748b; font-weight: 400; margin-bottom: 40px; }
  .cover-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 30px; background: #f8fafc; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0; width: 80%; }
  .meta-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .meta-item label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-item span { font-size: 16px; font-weight: 700; color: #0f172a; }

  /* Content Styles */
  .faculty-block { page-break-after: always; padding: 12px 0; }
  .faculty-block:last-child { page-break-after: auto; }
  .faculty-header { background: #f8fafc; border: 1px solid #e2e8f0; border-top: 4px solid #1e3a8a; padding: 16px; border-radius: 6px; margin-bottom: 20px; }
  .faculty-header h2 { font-size: 18px; color: #1e3a8a; margin: 0 0 14px 0; }
  .faculty-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
  .faculty-meta-grid div label { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .faculty-meta-grid div span { font-weight: 600; font-size: 12px; color: #1e293b; }
  h3 { font-size: 14px; color: #1e3a8a; margin: 20px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
  th { background: #f1f5f9; color: #334155; padding: 8px 10px; text-align: left; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; font-size: 10px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #fafafa; }
  .none { color: #94a3b8; font-style: italic; font-size: 11px; margin: 4px 0 12px; }
</style></head><body>

<div class="cover-page">
  <img src="${logoUrl}" alt="LNMIIT Logo" />
  <div class="inst-name">The LNM Institute of Information Technology, Jaipur</div>
  <h1>Historical Session Forms</h1>
  <h2>Faculty Appraisal Bulk Export</h2>
  <div class="cover-meta">
    <div class="meta-item"><label>View Academic Year</label><span>${yearLabel}</span></div>
    <div class="meta-item"><label>Faculty Records</label><span>${allData.length}</span></div>
    <div class="meta-item"><label>Generated</label><span>${new Date().toLocaleDateString('en-IN')}</span></div>
  </div>
</div>

${facultySections}
</body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 600);
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadSubmissionPdf = async (submission) => {
    try {
      const res = await fetch(`${API}/submissions/${submission.id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) {
        window.appToast('Failed to download PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${submission.faculty_name || 'faculty'}_${submission.academic_year || 'session'}_appraisal.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.appToast('Failed to download PDF');
    }
  };

  const buildAndPrint = (title, htmlBody) => {
    const logoUrl = window.location.origin + '/lnmiit-logo.png';
    
    // Extract title from htmlBody if present, else use param title
    const h1Match = htmlBody.match(/<h1>(.*?)<\/h1>/);
    const displayTitle = h1Match ? h1Match[1] : title;
    
    // Replace the h1 in htmlBody with our new header
    const cleanBody = htmlBody.replace(/<h1>.*?<\/h1>/, `
      <div class="header-container">
        <img src="${logoUrl}" alt="LNMIIT Logo" />
        <div class="header-text">
          <div class="header-inst">The LNM Institute of Information Technology, Jaipur</div>
          <h1>${displayTitle}</h1>
        </div>
      </div>
    `);

    const html = `<!DOCTYPE html>
<html><head><title>${title}</title>
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
</style></head><body>${cleanBody}</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  const ensureSingleYearSelected = () => {
    if (yearFilter === 'all') {
      window.appToast('Select a specific academic year to download Sheet 1/2/3 PDFs.');
      return null;
    }
    return yearFilter;
  };

  const handleDownloadSheet1PDF = async () => {
    const selectedYear = ensureSingleYearSelected();
    if (!selectedYear) return;

    try {
      setExportLoading('sheet1');
      const data = await apiClient.get(`/evaluation?academic_year=${encodeURIComponent(selectedYear)}`);
      if (!data?.success) throw new Error('Failed to fetch Sheet 1 data');

      const rubricCols = (data.rubrics || []).map((r) => `<th>${r.sub_section || r.section_name}</th>`).join('');
      const scoreMap = {};
      (data.scores || []).forEach((s) => { scoreMap[`${s.submission_id}||${s.rubric_id}`] = s.score; });

      const rows = (data.submissions || []).map((sub, idx) => {
        const scores = (data.rubrics || []).map((r) => {
          const v = scoreMap[`${sub.submission_id}||${r.id}`];
          return `<td>${v == null ? '' : v}</td>`;
        }).join('');
        const total = (data.rubrics || []).reduce((sum, r) => {
          const v = parseFloat(scoreMap[`${sub.submission_id}||${r.id}`]);
          return sum + (Number.isFinite(v) ? v : 0);
        }, 0);
        return `<tr>
          <td>${idx + 1}</td>
          <td>${sub.faculty_name || '-'}</td>
          <td>${sub.department || '-'}</td>
          ${scores}
          <td><strong>${total.toFixed(2)}</strong></td>
        </tr>`;
      }).join('');

      buildAndPrint(
        `Sheet1_${selectedYear}`,
        `<h1>Evaluation Sheet 1 - ${selectedYear}</h1>
         <p class="meta">Historical locked session export. Generated ${new Date().toLocaleString('en-IN')}</p>
         <table><thead><tr><th>S.No</th><th>Faculty</th><th>Department</th>${rubricCols}<th>Total</th></tr></thead><tbody>${rows}</tbody></table>`
      );
    } catch (err) {
      window.appToast(err.message || 'Unable to export Sheet 1 PDF');
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadSheet2PDF = async () => {
    const selectedYear = ensureSingleYearSelected();
    if (!selectedYear) return;

    try {
      setExportLoading('sheet2');
      const data = await apiClient.get(`/evaluation/sheet2?academic_year=${encodeURIComponent(selectedYear)}`);
      if (!data?.success) throw new Error('Failed to fetch Sheet 2 data');

      const rows = (data.data || []).map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.faculty_name || '-'}</td>
          <td>${item.department || '-'}</td>
          <td>${item.total_score || 0}</td>
          <td>${item.research_remarks || '-'}</td>
          <td>${item.teaching_feedback || '-'}</td>
          <td>${item.overall_feedback || '-'}</td>
          <td><strong>${item.final_grade || '-'}</strong></td>
        </tr>`).join('');

      buildAndPrint(
        `Sheet2_${selectedYear}`,
        `<h1>Evaluation Sheet 2 - ${selectedYear}</h1>
         <p class="meta">Historical locked session export. Generated ${new Date().toLocaleString('en-IN')}</p>
         <table><thead><tr><th>S.No</th><th>Faculty</th><th>Department</th><th>Total Score</th><th>Research Remarks</th><th>Teaching Feedback</th><th>Overall Feedback</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table>`
      );
    } catch (err) {
      window.appToast(err.message || 'Unable to export Sheet 2 PDF');
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadSheet3PDF = async () => {
    const selectedYear = ensureSingleYearSelected();
    if (!selectedYear) return;

    try {
      setExportLoading('sheet3');
      const data = await apiClient.get(`/evaluation/sheet3?academic_year=${encodeURIComponent(selectedYear)}`);
      if (!data?.success) throw new Error('Failed to fetch Sheet 3 data');

      const rows = (data.data || []).map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.faculty_name || '-'}</td>
          <td>${item.department || '-'}</td>
          <td>${item.total_score || 0}</td>
          <td><strong>${item.final_grade || '-'}</strong></td>
          <td>${item.increment_percentage == null ? '0%' : `${item.increment_percentage}%`}</td>
        </tr>`).join('');

      buildAndPrint(
        `Sheet3_${selectedYear}`,
        `<h1>Evaluation Sheet 3 - ${selectedYear}</h1>
         <p class="meta">Historical locked session export. Generated ${new Date().toLocaleString('en-IN')}</p>
         <table><thead><tr><th>S.No</th><th>Faculty</th><th>Department</th><th>Total Score</th><th>Final Grade</th><th>Increment %</th></tr></thead><tbody>${rows}</tbody></table>`
      );
    } catch (err) {
      window.appToast(err.message || 'Unable to export Sheet 3 PDF');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="Dofa-office-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Session Logs</h1>
          <p className="dashboard-subtitle">Session logs and exports by academic year. Active session ({activeSessionYear || 'N/A'}) is excluded.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="year-filter-select"
          >
            <option value="all">All Academic Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          <div className="export-dropdown-wrapper" ref={exportDropdownRef}>
            <button
              className={`export-btn ${exportLoading ? 'export-btn-loading' : ''}`}
              onClick={() => setExportDropdownOpen((o) => !o)}
              disabled={!!exportLoading}
            >
              {exportLoading ? (
                <><span className="export-spinner" />Exporting...</>
              ) : (
                <><Download size={16} />Export Data<ChevronDown size={14} style={{ marginLeft: 2 }} /></>
              )}
            </button>

            {exportDropdownOpen && (
              <div className="export-dropdown-menu">
                <button className="export-dropdown-item" onClick={handleExportFormsPDF}>
                  <div className="export-item-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
                    <FileText size={16} />
                  </div>
                  <div className="export-item-text">
                    <strong>Faculty Forms PDF</strong>
                    <span>Full forms for selected academic year(s)</span>
                  </div>
                </button>
                <button className="export-dropdown-item" onClick={handleExportSummaryPDF}>
                  <div className="export-item-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    <LayoutList size={16} />
                  </div>
                  <div className="export-item-text">
                    <strong>Submission Summary PDF</strong>
                    <span>Summary table by year, faculty, and status</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="filters-section" style={{ marginBottom: '1rem' }}>
        <div className="filter-buttons">
          {['all', 'submitted', 'under_review', 'approved', 'sent_back', 'draft'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'under_review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="filters-section" style={{ marginBottom: '1rem', justifyContent: 'flex-start' }}>
        <div className="filter-buttons" style={{ gap: 8 }}>
          <button className="filter-btn" onClick={handleDownloadSheet1PDF} disabled={!!exportLoading}>Download Sheet 1 PDF</button>
          <button className="filter-btn" onClick={handleDownloadSheet2PDF} disabled={!!exportLoading}>Download Sheet 2 PDF</button>
          <button className="filter-btn" onClick={handleDownloadSheet3PDF} disabled={!!exportLoading}>Download Sheet 3 PDF</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading historical session logs...</div>
      ) : loadError ? (
        <div className="empty-state"><p>{loadError}</p></div>
      ) : yearsToShow.length === 0 ? (
        <div className="empty-state"><p>No academic year logs found.</p></div>
      ) : (
        yearsToShow.map((year) => (
          <div key={year} className="submissions-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="card-title"><Calendar size={22} /> Academic Year: {year} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#5a6c7d' }}>({grouped[year].length} submission{grouped[year].length !== 1 ? 's' : ''})</span></h2>
            <div className="table-container">
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Faculty Name</th>
                    <th>Department</th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Form</span>
                        <select
                          value={activeFormType}
                          onChange={(e) => setActiveFormType(String(e.target.value || 'A').toUpperCase() === 'B' ? 'B' : 'A')}
                          style={{
                            border: '1px solid #bbf7d0',
                            background: '#f0fdf4',
                            color: '#166534',
                            borderRadius: '6px',
                            padding: '4px 6px',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}
                          aria-label="Select form type for logs table"
                        >
                          <option value="A">Form A</option>
                          <option value="B">Form B</option>
                        </select>
                      </div>
                    </th>
                    <th>Session Lock</th>
                    <th>Status</th>
                    <th>Submitted On</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[year].map((entry) => {
                    const submission = entry.selectedSubmission;
                    return (
                    <tr key={entry.key}>
                      <td>
                        <div className="faculty-info">
                          <span className="faculty-name">{entry.faculty_name}</span>
                          <span className="faculty-email">{entry.email}</span>
                        </div>
                      </td>
                      <td>{entry.department || '-'}</td>
                      <td>Form {entry.selectedFormType}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: Number(submission.session_locked || 0) === 1 ? '1px solid #86efac' : '1px solid #cbd5e1',
                            background: Number(submission.session_locked || 0) === 1 ? '#dcfce7' : '#f8fafc',
                            color: Number(submission.session_locked || 0) === 1 ? '#166534' : '#475569'
                          }}
                        >
                          {Number(submission.session_locked || 0) === 1 ? 'Locked' : 'Not Locked'}
                        </span>
                      </td>
                      <td>{statusLabel(submission)}</td>
                      <td>{formatDate(submission.submitted_at)}</td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          <button
                            className="action-btn btn-view"
                            onClick={() => navigate(`${basePath}/review/${submission.id}`)}
                            title="View submission"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="action-btn btn-download"
                            onClick={() => handleDownloadSubmissionPdf(submission)}
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SessionLogs;
