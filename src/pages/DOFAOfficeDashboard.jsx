import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Mail, Download, Users, FileText, Clock, CheckSquare, Eye, CheckCircle, XCircle, Calendar, FileCode, Table, X, ChevronDown, LayoutList } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import './DofaOfficeDashboard.css';
import { showConfirm } from '../utils/appDialogs';

const API = `http://${window.location.hostname}:5000/api`;

const DofaOfficeDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalSubmissions: 0,
    submitted: 0,
    underReview: 0,
    approved: 0
  });
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);
  const [downloadModal, setDownloadModal] = useState({ open: false, submission: null });
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(null); // 'forms' | 'summary'
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchSubmissions();
  }, [filter, yearFilter]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStats = async () => {
    try {
      const params = yearFilter !== 'all' ? `?academic_year=${yearFilter}` : '';
      const response = await fetch(`${API}/submissions/stats${params}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (yearFilter !== 'all') params.set('academic_year', yearFilter);

      const url = `${API}/submissions${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data);
        const years = [...new Set(data.data.map(s => s.academic_year).filter(Boolean))].sort().reverse();
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (id, currentlyLocked) => {
    const action = currentlyLocked ? 'unlock' : 'lock';
    if (!(await showConfirm(`Are you sure you want to ${action} this submission?`))) return;

    try {
      await fetch(`${API}/submissions/${id}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: !currentlyLocked, locked_by: 1 })
      });
      window.appToast(`Submission ${action}ed successfully`);
      fetchSubmissions();
    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
    }
  };

  const handleSendReminder = async (submissionId, email, name) => {
    if (!(await showConfirm(`Send deadline reminder to ${name} (${email})?`))) return;
    try {
      const res = await fetch(`${API}/submissions/${submissionId}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        window.appToast(`âœ… Reminder sent to ${email}`);
      } else {
        window.appToast(`âš ï¸ ${data.message || 'Failed to send reminder'}`);
      }
    } catch (e) {
      console.error('Reminder error:', e);
      window.appToast('Error sending reminder. Check if email is configured in .env');
    }
  };

  const handleUpdateStatus = async (submissionId, status, facultyName) => {
    const labels = { approved: 'Approve', sent_back: 'Send Back', under_review: 'Mark Under Review' };
    if (!(await showConfirm(`${labels[status] || status} submission for ${facultyName}?`))) return;
    try {
      const res = await fetch(`${API}/submissions/${submissionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        window.appToast(`âœ… Status updated to "${status}"`);
        fetchSubmissions();
        fetchStats();
      } else {
        window.appToast(`âš ï¸ ${data.message}`);
      }
    } catch (e) {
      window.appToast('Error updating status');
    }
  };

  // -- Download Helpers -----------------------------------------------------

  const fetchSubmissionData = async (id) => {
    const res = await fetch(`${API}/submissions/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    });
    const data = await res.json();
    return data.success ? data.data : null;
  };

  const handleDownloadJSON = async (submission) => {
    setDownloadingFormat('json');
    try {
      const data = await fetchSubmissionData(submission.id);
      if (!data) return window.appToast('Could not fetch submission data');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${submission.faculty_name}_${submission.academic_year}_appraisal.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadModal({ open: false, submission: null });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadCSV = async (submission) => {
    setDownloadingFormat('csv');
    try {
      const headers = ['Faculty Name', 'Department', 'Email', 'Designation', 'Academic Year', 'Form Type', 'Status', 'Submitted Date'];
      const row = [
        submission.faculty_name,
        submission.department || '',
        submission.email || '',
        submission.designation || '',
        submission.academic_year,
        submission.form_type || 'A',
        submission.status,
        submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : ''
      ];
      const csvContent = [headers.join(','), row.map(c => `"${c}"`).join(',')].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${submission.faculty_name}_${submission.academic_year}_appraisal.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadModal({ open: false, submission: null });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadPDF = async (submission) => {
    setDownloadingFormat('pdf');
    try {
      const data = await fetchSubmissionData(submission.id);
      if (!data) return window.appToast('Could not fetch submission data');

      const { submission: sub, facultyInfo, publications, courses, grants, patents, awards, proposals, newCourses } = data;

      const html = `<!DOCTYPE html><html><head><title>${sub.faculty_name} - Appraisal ${sub.academic_year}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:30px;color:#222}
        h1{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px}
        h2{color:#2d4373;margin-top:24px;font-size:1.1rem;border-bottom:1px solid #ddd;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
        th{background:#f5f7fa;padding:8px;text-align:left;border:1px solid #ddd}
        td{padding:8px;border:1px solid #ddd}
        .meta{display:flex;gap:2rem;background:#f9fafb;padding:12px;border-radius:6px;margin-bottom:12px}
        .meta-item label{font-size:11px;color:#777;display:block}
        .meta-item span{font-weight:600}
      </style></head><body>
      <h1>Annual Performance Appraisal - Form ${sub.form_type || 'A'}</h1>
      <div class="meta">
        <div class="meta-item"><label>Name</label><span>${sub.faculty_name}</span></div>
        <div class="meta-item"><label>Department</label><span>${sub.department || 'N/A'}</span></div>
        <div class="meta-item"><label>Academic Year</label><span>${sub.academic_year}</span></div>
        <div class="meta-item"><label>Status</label><span>${sub.status}</span></div>
        <div class="meta-item"><label>Designation</label><span>${facultyInfo?.designation || 'N/A'}</span></div>
      </div>

      <h2>Part A - Courses Taught (${courses?.length || 0})</h2>
      <table><tr><th>Course Name</th><th>Code</th><th>Semester</th><th>Program</th><th>Enrollment</th></tr>
      ${(courses || []).map(c => `<tr><td>${c.course_name||''}</td><td>${c.course_code||''}</td><td>${c.semester||''}</td><td>${c.program||''}</td><td>${c.enrollment||''}</td></tr>`).join('')}
      </table>

      <h2>Research Publications (${publications?.length || 0})</h2>
      <table><tr><th>Type</th><th>Sub Type</th><th>Title</th><th>Year</th><th>Journal/Conference</th></tr>
      ${(publications || []).map(p => `<tr><td>${p.publication_type||''}</td><td>${p.sub_type||''}</td><td>${p.title||''}</td><td>${p.year_of_publication||''}</td><td>${p.journal_name||p.conference_name||''}</td></tr>`).join('')}
      </table>

      <h2>Research Grants (${grants?.length || 0})</h2>
      <table><tr><th>Project Name</th><th>Agency</th><th>Amount (Lakhs)</th><th>Role</th></tr>
      ${(grants || []).map(g => `<tr><td>${g.project_name||''}</td><td>${g.funding_agency||''}</td><td>${g.amount_in_lakhs||0}</td><td>${g.role||''}</td></tr>`).join('')}
      </table>

      <h2>Patents (${patents?.length || 0})</h2>
      <table><tr><th>Type</th><th>Title</th><th>Agency</th></tr>
      ${(patents || []).map(p => `<tr><td>${p.patent_type||''}</td><td>${p.title||''}</td><td>${p.agency||''}</td></tr>`).join('')}
      </table>

      <h2>Awards & Honours (${awards?.length || 0})</h2>
      <table><tr><th>Award</th><th>Agency</th><th>Year</th></tr>
      ${(awards || []).map(a => `<tr><td>${a.award_name||''}</td><td>${a.awarding_agency||''}</td><td>${a.year||''}</td></tr>`).join('')}
      </table>

      <h2>New Courses Developed (${newCourses?.length || 0})</h2>
      <table><tr><th>Course Name</th><th>Code</th><th>Level</th><th>Program</th></tr>
      ${(newCourses || []).map(c => `<tr><td>${c.course_name||''}</td><td>${c.course_code||''}</td><td>${c.level||''}</td><td>${c.program||''}</td></tr>`).join('')}
      </table>

      <h2>Submitted Proposals (${proposals?.length || 0})</h2>
      <table><tr><th>Title</th><th>Agency</th><th>Amount</th><th>Status</th></tr>
      ${(proposals || []).map(p => `<tr><td>${p.title||''}</td><td>${p.funding_agency||''}</td><td>${p.grant_amount||0}</td><td>${p.status||''}</td></tr>`).join('')}
      </table>

      ${((data?.dynamicData || []).length > 0 ? `
      <h2>Custom Sections</h2>
      ${(data.dynamicData || []).map(entry => {
        const section = entry?.section || {};
        const fields = entry?.fields || [];
        const fieldsHtml = fields.map(f => {
          const value = f.value;
          if (!value) return '';
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          return `<div style="margin:10px 0;"><strong>${f.label || f.field_type}:</strong> <span>${displayValue}</span></div>`;
        }).join('');
        return `<h3 style="color:#2d4373;margin-top:16px;font-size:1rem;border-bottom:1px solid #ddd;padding-bottom:4px;">${section.title || 'Custom Section'}</h3>${fieldsHtml}`;
      }).join('')}
      ` : '')}

      <p style="margin-top:40px;font-size:11px;color:#888">Generated on ${new Date().toLocaleString()}</p>
      </body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.print();
      setDownloadModal({ open: false, submission: null });
    } finally {
      setDownloadingFormat(null);
    }
  };

  // -- Bulk Export: Summary PDF (dashboard table view for all faculties) ----
  const handleExportSummaryPDF = () => {
    setExportLoading('summary');
    setExportDropdownOpen(false);
    try {
      const yearLabel = yearFilter === 'all' ? 'All Academic Years' : yearFilter;
      const subs = yearFilter === 'all' ? submissions : submissions.filter(s => s.academic_year === yearFilter);

      const statusText = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', sent_back: 'Sent Back' };

      // Group by academic year for the table
      const byYear = subs.reduce((acc, s) => {
        const yr = s.academic_year || 'Unknown';
        if (!acc[yr]) acc[yr] = [];
        acc[yr].push(s);
        return acc;
      }, {});

      let tableRows = '';
      Object.keys(byYear).sort().reverse().forEach(yr => {
        byYear[yr].forEach((s, i) => {
          tableRows += `<tr>
            <td>${i === 0 ? `<strong>${yr}</strong>` : ''}</td>
            <td>${s.faculty_name || '-'}</td>
            <td>${s.department || '-'}</td>
            <td>${s.designation || '-'}</td>
            <td>${s.email || '-'}</td>
            <td>${s.form_type || 'A'}</td>
            <td><span class="badge ${s.status}">${statusText[s.status] || s.status}</span></td>
            <td>${s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
          </tr>`;
        });
      });

      const html = `<!DOCTYPE html>
<html><head><title>Dofa Appraisal Summary - ${yearLabel}</title>
<style>
  @page { size: A4 landscape; margin: 16mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; }
  h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #6b7280; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a5f; color: white; padding: 8px 10px; text-align: left; font-size: 10px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .badge { padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  .badge.draft { background: #f3f4f6; color: #6b7280; }
  .badge.submitted { background: #dbeafe; color: #1e40af; }
  .badge.under_review { background: #fed7aa; color: #92400e; }
  .badge.approved { background: #bbf7d0; color: #166534; }
  .badge.sent_back { background: #fecaca; color: #991b1b; }
  .footer { margin-top: 20px; font-size: 10px; color: #9ca3af; }
</style></head><body>
<h1>Faculty Appraisal Submission Summary</h1>
<p class="meta">Academic Year: <strong>${yearLabel}</strong> &nbsp;|&nbsp; Total Records: <strong>${subs.length}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
<table>
  <thead><tr><th>Academic Year</th><th>Faculty Name</th><th>Department</th><th>Designation</th><th>Email</th><th>Form</th><th>Status</th><th>Submitted On</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<p class="footer">Dean of Faculty Affairs (Dofa) Office &mdash; Confidential Record</p>
</body></html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 400);
    } finally {
      setExportLoading(null);
    }
  };

  // -- Bulk Export: All Faculty Forms PDF (one PDF with all faculty detailed forms) --
  const handleExportFormsPDF = async () => {
    setExportLoading('forms');
    setExportDropdownOpen(false);
    try {
      const yearLabel = yearFilter === 'all' ? 'All Academic Years' : yearFilter;
      const subs = yearFilter === 'all' ? submissions : submissions.filter(s => s.academic_year === yearFilter);

      if (subs.length === 0) {
        window.appToast('No submissions found for the selected academic year.');
        return;
      }

      // Fetch full data for each submission
      const allData = [];
      for (const sub of subs) {
        try {
          const res = await fetch(`${API}/submissions/${sub.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
          });
          const data = await res.json();
          if (data.success) allData.push(data.data);
        } catch (e) {
          console.warn(`Could not fetch submission ${sub.id}`);
        }
      }

      const facultySections = allData.map(({ submission: s, facultyInfo, courses, publications, grants, patents, awards, newCourses, proposals, institutionalContributions, teachingInnovation }) => `
        <div class="faculty-block">
          <div class="faculty-header">
            <h2>${s.faculty_name}</h2>
            <div class="faculty-meta-grid">
              <div><label>Department</label><span>${s.department || '-'}</span></div>
              <div><label>Designation</label><span>${facultyInfo?.designation || s.designation || '-'}</span></div>
              <div><label>Email</label><span>${s.email || '-'}</span></div>
              <div><label>Academic Year</label><span>${s.academic_year}</span></div>
              <div><label>Form Type</label><span>Form ${s.form_type || 'A'}</span></div>
              <div><label>Status</label><span class="badge ${s.status}">${{ draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', sent_back: 'Sent Back' }[s.status] || s.status}</span></div>
              <div><label>Date of Submission</label><span>${s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not Submitted'}</span></div>
              ${s.total_score != null ? `<div><label>Total Score</label><span>${s.total_score}</span></div>` : ''}
            </div>
          </div>

          <h3>Courses Taught (${(courses || []).length})</h3>
          ${(courses || []).length > 0 ? `<table><thead><tr><th>Course Name</th><th>Code</th><th>Semester</th><th>Program</th><th>Enrollment</th><th>Feedback Score</th></tr></thead><tbody>
          ${(courses || []).map(c => `<tr><td>${c.course_name||'-'}</td><td>${c.course_code||'-'}</td><td>${c.semester||'-'}</td><td>${c.program||'-'}</td><td>${c.enrollment||'-'}</td><td>${c.feedback_score||'-'}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Research Publications (${(publications || []).length})</h3>
          ${(publications || []).length > 0 ? `<table><thead><tr><th>Type</th><th>Sub-type</th><th>Title</th><th>Year</th><th>Journal / Conference</th></tr></thead><tbody>
          ${(publications || []).map(p => `<tr><td>${p.publication_type||''}</td><td>${p.sub_type||''}</td><td>${p.title||''}</td><td>${p.year_of_publication||''}</td><td>${p.journal_name||p.conference_name||''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Research Grants (${(grants || []).length})</h3>
          ${(grants || []).length > 0 ? `<table><thead><tr><th>Project Title</th><th>Funding Agency</th><th>Amount (Lakhs)</th><th>Role</th></tr></thead><tbody>
          ${(grants || []).map(g => `<tr><td>${g.project_name||''}</td><td>${g.funding_agency||''}</td><td>${g.amount_in_lakhs||0}</td><td>${g.role||''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Patents (${(patents || []).length})</h3>
          ${(patents || []).length > 0 ? `<table><thead><tr><th>Type</th><th>Title</th><th>Agency</th></tr></thead><tbody>
          ${(patents || []).map(p => `<tr><td>${p.patent_type||''}</td><td>${p.title||''}</td><td>${p.agency||''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>Awards &amp; Honours (${(awards || []).length})</h3>
          ${(awards || []).length > 0 ? `<table><thead><tr><th>Award</th><th>Awarding Agency</th><th>Year</th></tr></thead><tbody>
          ${(awards || []).map(a => `<tr><td>${a.award_name||''}</td><td>${a.awarding_agency||''}</td><td>${a.year||''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}

          <h3>New Courses Developed (${(newCourses || []).length})</h3>
          ${(newCourses || []).length > 0 ? `<table><thead><tr><th>Course Name</th><th>Code</th><th>Level</th><th>Program</th></tr></thead><tbody>
          ${(newCourses || []).map(c => `<tr><td>${c.course_name||''}</td><td>${c.course_code||''}</td><td>${c.level||''}</td><td>${c.program||''}</td></tr>`).join('')}
          </tbody></table>` : '<p class="none">None recorded.</p>'}
        </div>
      `).join('');

      const html = `<!DOCTYPE html>
<html><head><title>Faculty Appraisal Forms - ${yearLabel}</title>
<style>
  @page { size: A4 portrait; margin: 16mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; }
  h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; }
  .cover-meta { font-size: 11px; color: #6b7280; margin-bottom: 10px; }
  .faculty-block { page-break-after: always; padding: 12px 0; }
  .faculty-block:last-child { page-break-after: auto; }
  .faculty-header { background: #f0f4f8; border-left: 4px solid #1e3a5f; padding: 12px 16px; border-radius: 4px; margin-bottom: 14px; }
  .faculty-header h2 { font-size: 16px; color: #1e3a5f; margin: 0 0 10px 0; }
  .faculty-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; }
  .faculty-meta-grid div label { display: block; font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.3px; }
  .faculty-meta-grid div span { font-weight: 600; font-size: 11px; }
  h3 { font-size: 12px; color: #374151; margin: 14px 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
  th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #fafafa; }
  .none { color: #9ca3af; font-style: italic; font-size: 10px; margin: 4px 0 8px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: 700; }
  .badge.draft { background: #f3f4f6; color: #6b7280; }
  .badge.submitted { background: #dbeafe; color: #1e40af; }
  .badge.under_review { background: #fed7aa; color: #92400e; }
  .badge.approved { background: #bbf7d0; color: #166534; }
  .badge.sent_back { background: #fecaca; color: #991b1b; }
</style></head><body>
<h1>Annual Performance Appraisal - Faculty Forms</h1>
<p class="cover-meta">Academic Year: <strong>${yearLabel}</strong> &nbsp;|&nbsp; Total Faculty: <strong>${allData.length}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
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

  const getStatusBadge = (status) => {
    const cls = { draft: 'status-draft', submitted: 'status-submitted', under_review: 'status-review', approved: 'status-approved', sent_back: 'status-sent-back' };
    const text = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', sent_back: 'Sent Back' };
    return <span className={`status-badge ${cls[status] || ''}`}>{text[status] || status}</span>;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const grouped = submissions.reduce((acc, s) => {
    const yr = s.academic_year || 'Unknown';
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(s);
    return acc;
  }, {});

  const yearsToShow = yearFilter === 'all' ? Object.keys(grouped).sort().reverse() : [yearFilter];

  return (
    <div className="Dofa-office-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dofa Office Dashboard</h1>
          <p className="dashboard-subtitle">Academic year-wise faculty appraisal management</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="year-filter-select"
          >
            <option value="all">All Academic Years</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          {/* Export Dropdown */}
          <div className="export-dropdown-wrapper" ref={exportDropdownRef}>
            <button
              className={`export-btn ${exportLoading ? 'export-btn-loading' : ''}`}
              onClick={() => setExportDropdownOpen(o => !o)}
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
                <button
                  className="export-dropdown-item"
                  onClick={handleExportFormsPDF}
                >
                  <div className="export-item-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
                    <FileText size={16} />
                  </div>
                  <div className="export-item-text">
                    <strong>Faculty Forms PDF</strong>
                    <span>Full appraisal forms for all faculty - combined PDF</span>
                  </div>
                </button>

                <button
                  className="export-dropdown-item"
                  onClick={handleExportSummaryPDF}
                >
                  <div className="export-item-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    <LayoutList size={16} />
                  </div>
                  <div className="export-item-text">
                    <strong>Submission Summary PDF</strong>
                    <span>Dashboard overview - name, dept, status, date, etc.</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Faculty</p>
            <h3 className="stat-value">{stats.totalFaculty}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-info">
          <div className="stat-icon"><FileText size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Submitted</p>
            <h3 className="stat-value">{stats.submitted}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Under Review</p>
            <h3 className="stat-value">{stats.underReview}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon"><CheckSquare size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Approved</p>
            <h3 className="stat-value">{stats.approved}</h3>
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="filters-section">
        <div className="filter-buttons">
          {['all', 'submitted', 'under_review', 'approved', 'sent_back', 'draft'].map(f => (
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

      {/* Submissions Table */}
      {loading ? (
        <div className="loading-state">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="empty-state"><p>No submissions found</p></div>
      ) : (
        yearsToShow.map(yr => (
          grouped[yr] ? (
            <div key={yr} className="submissions-card" style={{ marginBottom: '1.5rem' }}>
              <h2 className="card-title"><Calendar size={25} /> Academic Year: {yr} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#5a6c7d' }}>({grouped[yr].length} submission{grouped[yr].length !== 1 ? 's' : ''})</span></h2>
              <div className="table-container">
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th>Faculty Name</th>
                      <th>Department</th>
                      <th>Form</th>
                      <th>Status</th>
                      <th>Submitted On</th>
                      <th>Locked</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[yr].map(submission => (
                      <tr key={submission.id}>
                        <td>
                          <div className="faculty-info">
                            <span className="faculty-name">{submission.faculty_name}</span>
                            <span className="faculty-email">{submission.email}</span>
                          </div>
                        </td>
                        <td>{submission.department || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="form-type-badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>Form A</span>
                            <span className="form-type-badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>Form B</span>
                          </div>
                        </td>
                        <td>{getStatusBadge(submission.status)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(submission.submitted_at)}</td>
                        <td>
                          <span className={`lock-status ${submission.locked ? 'locked' : 'unlocked'}`}>
                            {submission.locked ? <><Lock size={14} /> Locked</> : <><Unlock size={14} /> Unlocked</>}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: 'center' }}>
                            <button
                              className="action-btn btn-view"
                              onClick={() => navigate(`/Dofa-office/review/${submission.id}`)}
                              title="View Full Form"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="action-btn btn-download"
                              onClick={() => setDownloadModal({ open: true, submission })}
                              title="Download Form"
                            >
                              <Download size={16} />
                            </button>

                            {submission.status !== 'approved' && (
                              <button
                                className="action-btn btn-approve"
                                onClick={() => handleUpdateStatus(submission.id, 'approved', submission.faculty_name)}
                                title="Approve Submission"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}

                            {submission.status !== 'sent_back' && submission.status !== 'draft' && (
                              <button
                                className="action-btn btn-send-back"
                                onClick={() => handleUpdateStatus(submission.id, 'sent_back', submission.faculty_name)}
                                title="Send Back for Changes"
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                            <button
                              className={`action-btn ${submission.locked ? 'btn-unlock' : 'btn-lock'}`}
                              onClick={() => handleToggleLock(submission.id, submission.locked)}
                              title={submission.locked ? 'Unlock' : 'Lock'}
                            >
                              {submission.locked ? <Unlock size={16} /> : <Lock size={16} />}
                            </button>

                            <button
                              className="action-btn btn-reminder"
                              onClick={() => handleSendReminder(submission.id, submission.email, submission.faculty_name)}
                              title="Send Reminder Email"
                            >
                              <Mail size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        ))
      )}

      {/* Download Modal */}
      {downloadModal.open && downloadModal.submission && (
        <div className="download-modal-overlay" onClick={() => setDownloadModal({ open: false, submission: null })}>
          <div className="download-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Export Appraisal Form</h2>
                <p className="modal-subtitle">{downloadModal.submission.faculty_name} - {downloadModal.submission.academic_year}</p>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setDownloadModal({ open: false, submission: null })}
                aria-label="Close dialog"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-content">
              <p className="modal-description">Choose a format to download the appraisal form:</p>

              <div className="export-options">
                {/* PDF Option */}
                <button
                  className={`export-option ${downloadingFormat === 'pdf' ? 'loading' : ''}`}
                  onClick={() => handleDownloadPDF(downloadModal.submission)}
                  disabled={downloadingFormat !== null}
                >
                  <div className="option-icon pdf-icon">
                    <FileText size={28} />
                  </div>
                  <div className="option-content">
                    <h3>PDF Document</h3>
                    <p>Formatted report with all data tables and sections</p>
                  </div>
                  {downloadingFormat === 'pdf' && <div className="spinner"></div>}
                </button>

                {/* JSON Option */}
                <button
                  className={`export-option ${downloadingFormat === 'json' ? 'loading' : ''}`}
                  onClick={() => handleDownloadJSON(downloadModal.submission)}
                  disabled={downloadingFormat !== null}
                >
                  <div className="option-icon json-icon">
                    <FileCode size={28} />
                  </div>
                  <div className="option-content">
                    <h3>JSON Data</h3>
                    <p>Structured data format for integration with other tools</p>
                  </div>
                  {downloadingFormat === 'json' && <div className="spinner"></div>}
                </button>

                {/* CSV Option */}
                <button
                  className={`export-option ${downloadingFormat === 'csv' ? 'loading' : ''}`}
                  onClick={() => handleDownloadCSV(downloadModal.submission)}
                  disabled={downloadingFormat !== null}
                >
                  <div className="option-icon csv-icon">
                    <Table size={28} />
                  </div>
                  <div className="option-content">
                    <h3>CSV Spreadsheet</h3>
                    <p>Import into Excel or other spreadsheet applications</p>
                  </div>
                  {downloadingFormat === 'csv' && <div className="spinner"></div>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DofaOfficeDashboard;
