import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Mail, Download, Users, FileText, Clock, CheckSquare, Eye, CheckCircle, XCircle, Calendar, FileCode, Table, X, ChevronDown, ChevronUp, LayoutList, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import './DofaOfficeDashboard.css';
import { showConfirm } from '../utils/appDialogs';
import { buildReviewPath } from '../utils/reviewRoute';

const API = `http://${window.location.hostname}:5001/api`;

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
  const [editRequests, setEditRequests] = useState([]);
  const [editRequestsOpen, setEditRequestsOpen] = useState(true);
  const [editRequestsTab, setEditRequestsTab] = useState('pending');
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [approvedSections, setApprovedSections] = useState([]);
  const [DofaNote, setDofaNote] = useState('');
  const [reviewLoading, setReviewLoading] = useState(null);
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('');
  const [activeSessionYear, setActiveSessionYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadModal, setDownloadModal] = useState({ open: false, submission: null });
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(null); // 'forms' | 'summary'
  const [activeFormType, setActiveFormType] = useState('A');
  const [selectedYearLockState, setSelectedYearLockState] = useState(null);
  const [sessionLockLoading, setSessionLockLoading] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    fetchActiveSessionYear();
  }, []);

  useEffect(() => {
    if (!yearFilter) return;
    fetchStats();
    fetchSubmissions();
    fetchEditRequests();
  }, [filter, yearFilter]);

  useEffect(() => {
    if (!yearFilter) {
      setSelectedYearLockState(null);
      return;
    }
    fetchSessionLockState(yearFilter);
  }, [yearFilter]);

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
      const params = yearFilter ? `?academic_year=${yearFilter}` : '';
      const response = await fetch(`${API}/submissions/stats${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
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
      if (yearFilter) params.set('academic_year', yearFilter);

      const url = `${API}/submissions${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditRequests = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const url = new URL(`${API}/edit-requests`);
      if (yearFilter) url.searchParams.append('academic_year', yearFilter);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEditRequests(data.data);
      }
    } catch (err) {
      console.error('Error fetching edit requests:', err);
      setEditRequests([]);
    }
  };

  const fetchActiveSessionYear = async () => {
    try {
      const res = await fetch(`${API}/sessions/active`);
      const data = await res.json();
      const activeYear = data?.data?.academic_year || '';
      setActiveSessionYear(activeYear);
      setYearFilter(activeYear);
      if (!activeYear) setLoading(false);
    } catch (error) {
      console.error('Error fetching active session year:', error);
      setActiveSessionYear('');
      setYearFilter('');
      setLoading(false);
    }
  };

  const fetchSessionLockState = async (academicYear) => {
    if (!academicYear || academicYear === 'all') return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/submissions/session-lock?academic_year=${encodeURIComponent(academicYear)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSelectedYearLockState(data.data);
      else setSelectedYearLockState({ academic_year: academicYear, locked: false });
    } catch {
      setSelectedYearLockState({ academic_year: academicYear, locked: false });
    }
  };

  const handleFinalSessionLock = async () => {
    if (!yearFilter) {
      window.appToast('No active academic session found to lock.');
      return;
    }

    const targetYear = yearFilter;
    if (!(await showConfirm(`Final-lock session ${targetYear}? This will auto-approve non-approved submissions, lock all actions (except view/download), and freeze this session until DoFA unlocks.`))) {
      return;
    }

    setSessionLockLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/submissions/session-lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ academic_year: targetYear, locked: true })
      });
      const data = await res.json();
      if (data.success) {
        window.appToast(data.message || `Session ${targetYear} locked successfully.`);
        await Promise.all([fetchSubmissions(), fetchStats(), fetchEditRequests(), fetchSessionLockState(targetYear)]);
      } else {
        window.appToast(data.message || 'Failed to lock session.');
      }
    } catch (error) {
      window.appToast(`Lock failed: ${error.message}`);
    } finally {
      setSessionLockLoading(false);
    }
  };

  const startReview = (req) => {
    setReviewingRequest(req);
    setApprovedSections(req.requested_sections || []);
    setDofaNote('');
  };

  const toggleSection = (key) => {
    setApprovedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleReviewSubmit = async (status) => {
    if (status === 'approved' && approvedSections.length === 0) {
      window.appToast('Please select at least one section to approve.');
      return;
    }

    if (!reviewingRequest?.id) return;

    setReviewLoading(status);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/edit-requests/${reviewingRequest.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status,
          approved_sections: status === 'approved' ? approvedSections : [],
          Dofa_note: DofaNote || null
        })
      });
      const data = await res.json();
      if (data.success) {
        window.appToast(data.message || 'Request reviewed successfully.');
        setReviewingRequest(null);
        setApprovedSections([]);
        setDofaNote('');
        fetchEditRequests();
        fetchSubmissions();
        fetchStats();
      } else {
        window.appToast('Error: ' + (data.message || 'Failed to review request.'));
      }
    } catch (err) {
      window.appToast('Request failed: ' + err.message);
    } finally {
      setReviewLoading(null);
    }
  };

  const handleToggleLock = async (id, currentlyLocked) => {
    const action = currentlyLocked ? 'unlock' : 'lock';
    if (!(await showConfirm(`Are you sure you want to ${action} this submission?`))) return;

    try {
      await fetch(`${API}/submissions/${id}/lock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
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
        window.appToast(`Reminder sent to ${email}`);
      } else {
        window.appToast(data.message || 'Failed to send reminder');
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
        window.appToast(`Status updated to "${status}"`);
        fetchSubmissions();
        fetchStats();
      } else {
        window.appToast(data.message || 'Failed to update status');
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

      try {
        const blob = await apiClient.post('/submissions/export/html-to-pdf', { html, filename: `${sub.faculty_name || 'appraisal'}_${sub.academic_year || ''}.pdf` }, { responseType: 'blob' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sub.faculty_name || 'appraisal'}_${sub.academic_year || ''}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setDownloadModal({ open: false, submission: null });
      } catch (err) {
        console.error('PDF export failed:', err);
        window.appToast('Failed to generate PDF');
      }
    } finally {
      setDownloadingFormat(null);
    }
  };

  // -- Bulk Export: Summary PDF (dashboard table view for all faculties) ----
  const handleExportSummaryPDF = async () => {
    setExportLoading('summary');
    setExportDropdownOpen(false);
    try {
      const yearLabel = yearFilter || 'Active Academic Year';
      const subs = submissions;

      const formatExplicitStatus = (submission) => {
        const formType = String(submission?.form_type || 'A').toUpperCase() === 'B' ? 'Form B' : 'Form A';
        const status = String(submission?.status || '').toLowerCase();
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
            <td><span class="badge ${s.status}">${formatExplicitStatus(s)}</span></td>
            <td>${s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
          </tr>`;
        });
      });

      const html = `<!DOCTYPE html>
<html><head><title>DoFA Appraisal Summary - ${yearLabel}</title>
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
<p class="footer">Dean of Faculty Affairs (DoFA) Office &mdash; Confidential Record</p>
</body></html>`;

      try {
        const blob = await apiClient.post('/submissions/export/html-to-pdf', { html, filename: `DoFA_Summary_${yearLabel}.pdf` }, { responseType: 'blob' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DoFA_Summary_${yearLabel}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Summary PDF export failed:', err);
        window.appToast('Failed to generate summary PDF');
      }
    } finally {
      setExportLoading(null);
    }
  };

  // -- Bulk Export: All Faculty Forms PDF (one PDF with all faculty detailed forms) --
  const handleExportFormsPDF = async () => {
    setExportLoading('forms');
    setExportDropdownOpen(false);
    try {
      const yearLabel = yearFilter || 'Active Academic Year';
      const subs = submissions;

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
              <div><label>Status</label><span class="badge ${s.status}">${(String(s.form_type || 'A').toUpperCase() === 'B' ? 'Form B' : 'Form A')} - ${{
                draft: 'Draft',
                submitted: 'Submitted to DoFA',
                submitted_hod: 'Submitted to HoD',
                hod_approved: 'HoD Approved - Pending DoFA',
                under_review: 'Under DoFA Review',
                under_review_hod: 'Under HoD Review',
                approved: 'Approved',
                sent_back: 'Sent Back'
              }[s.status] || s.status}</span></div>
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

      try {
        const blob = await apiClient.post('/submissions/export/html-to-pdf', { html, filename: `DoFA_All_Forms_${yearLabel}.pdf` }, { responseType: 'blob' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DoFA_All_Forms_${yearLabel}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Forms PDF export failed:', err);
        window.appToast('Failed to generate combined forms PDF');
      }
    } finally {
      setExportLoading(null);
    }
  };

  const getStatusBadge = (submission) => {
    const status = String(submission?.status || '').toLowerCase();
    const formLabel = String(submission?.form_type || 'A').toUpperCase() === 'B' ? 'Form B' : 'Form A';
    const cls = {
      draft: 'status-draft',
      submitted: 'status-submitted',
      submitted_hod: 'status-submitted',
      hod_approved: 'status-submitted',
      under_review: 'status-review',
      under_review_hod: 'status-review',
      approved: 'status-approved',
      sent_back: 'status-sent-back'
    };
    const text = {
      draft: 'Draft',
      submitted: 'Submitted to DoFA',
      submitted_hod: 'Submitted to HoD',
      hod_approved: 'HoD Approved - Pending DoFA',
      under_review: 'Under DoFA Review',
      under_review_hod: 'Under HoD Review',
      approved: 'Approved',
      sent_back: 'Sent Back'
    };
    return <span className={`status-badge ${cls[status] || ''}`}>{`${formLabel} - ${text[status] || status}`}</span>;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const submissionPriority = (submission) => {
    const status = String(submission?.status || '').toLowerCase();
    if (status === 'approved') return 5;
    if (['under_review', 'under_review_hod'].includes(status)) return 4;
    if (['submitted', 'submitted_hod', 'hod_approved'].includes(status)) return 3;
    if (status === 'sent_back') return 2;
    if (status === 'draft') return 0;
    return 1;
  };

  const submissionTime = (submission) => {
    const value = submission?.submitted_at || submission?.updated_at || submission?.created_at;
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };

  const pickBetterSubmission = (candidate, current) => {
    if (!current) return candidate;
    const priorityDiff = submissionPriority(candidate) - submissionPriority(current);
    if (priorityDiff !== 0) return priorityDiff > 0 ? candidate : current;
    return submissionTime(candidate) >= submissionTime(current) ? candidate : current;
  };

  const pendingEditRequests = editRequests.filter((r) => r.status === 'pending');
  const reviewedEditRequests = editRequests.filter((r) => r.status !== 'pending');
  const visibleEditRequests = editRequestsTab === 'pending' ? pendingEditRequests : reviewedEditRequests;
  const sessionLockedYears = new Set(
    submissions
      .filter((s) => Number(s.session_locked || 0) === 1)
      .map((s) => String(s.academic_year || '').trim())
      .filter(Boolean)
  );

  const getWorkflowStage = (submission) => {
    const formType = String(submission?.form_type || 'A').toUpperCase();
    const status = String(submission?.status || '').toLowerCase();

    if (formType === 'A') {
      if (status === 'approved') return 'DoFA Approved';
      if (status === 'sent_back') return 'Sent Back to Faculty';
      if (status === 'under_review') return 'Under DoFA Review';
      if (status === 'submitted') return 'Queued for DoFA Review';
      return 'Faculty Draft / Pending Submission';
    }

    if (status === 'approved') return 'DoFA Approved';
    if (status === 'sent_back') return 'Sent Back to Faculty';
    if (status === 'under_review') return 'Under DoFA Review';
    if (status === 'hod_approved') return 'HoD Approved - Queued for DoFA';
    if (status === 'under_review_hod') return 'Under HoD Review';
    if (status === 'submitted_hod') return 'Submitted to HoD';
    return 'Faculty Draft / Pending Submission';
  };

  const matchesFilter = (status, activeFilter) => {
    if (activeFilter === 'all') return true;
    const normalized = String(status || '').toLowerCase();
    if (activeFilter === 'submitted') return ['submitted', 'submitted_hod', 'hod_approved'].includes(normalized);
    if (activeFilter === 'under_review') return ['under_review', 'under_review_hod'].includes(normalized);
    return normalized === activeFilter;
  };

  const combinedEntriesMap = new Map();
  submissions.forEach((submission) => {
    const key = `${submission.faculty_id || submission.email || submission.faculty_name}_${submission.academic_year || 'Unknown'}`;
    const formType = String(submission.form_type || 'A').toUpperCase() === 'B' ? 'B' : 'A';

    if (!combinedEntriesMap.has(key)) {
      combinedEntriesMap.set(key, {
        key,
        academic_year: submission.academic_year,
        faculty_name: submission.faculty_name,
        faculty_id: submission.faculty_id,
        employee_id: submission.employee_id,
        email: submission.email,
        department: submission.department,
        forms: { A: null, B: null }
      });
    }

    combinedEntriesMap.get(key).forms[formType] = pickBetterSubmission(submission, combinedEntriesMap.get(key).forms[formType]);
  });

  const combinedEntries = Array.from(combinedEntriesMap.values());

  const selectedRows = combinedEntries
    .map((entry) => {
      const selectedFormType = activeFormType;
      const selectedSubmission = entry.forms[selectedFormType] || {
        id: null,
        faculty_id: entry.faculty_id,
        employee_id: entry.employee_id,
        faculty_name: entry.faculty_name,
        email: entry.email,
        department: entry.department,
        academic_year: entry.academic_year,
        form_type: selectedFormType,
        status: 'draft',
        submitted_at: null,
        locked: 0,
        session_locked: Number(entry.forms.A?.session_locked || entry.forms.B?.session_locked || 0)
      };
      return {
        ...entry,
        selectedFormType,
        selectedSubmission
      };
    })
    .filter((entry) => entry.selectedSubmission && matchesFilter(entry.selectedSubmission.status, filter));

  const grouped = selectedRows.reduce((acc, entry) => {
    const yr = entry.academic_year || 'Unknown';
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(entry);
    return acc;
  }, {});

  const yearsToShow = yearFilter ? [yearFilter] : [];

  return (
    <div className="Dofa-office-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">DoFA Office Dashboard</h1>
          <p className="dashboard-subtitle">Academic year-wise faculty appraisal management</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="year-filter-select" style={{ minWidth: 220, fontWeight: 700 }}>
            Active Session: {activeSessionYear || 'N/A'}
          </span>

          <Link
            to="/Dofa-office/logs"
            className="export-btn"
            style={{ textDecoration: 'none' }}
            title="Open previous session logs"
          >
            <LayoutList size={16} />Logs
          </Link>

          <button
            className={`export-btn ${selectedYearLockState?.locked ? 'btn-locked' : 'btn-lock'} ${sessionLockLoading ? 'export-btn-loading' : ''}`}
            disabled={!yearFilter || !!sessionLockLoading || !!selectedYearLockState?.locked}
            onClick={handleFinalSessionLock}
            title={!yearFilter ? 'No active session year found' : selectedYearLockState?.locked ? 'Session already locked. Unlock is allowed from DoFA dashboard only.' : 'Final-lock this academic session'}
          >
            {sessionLockLoading ? (
              <><span className="export-spinner" />Locking...</>
            ) : selectedYearLockState?.locked ? (
              <><Lock size={16} />Session Locked ({yearFilter})</>
            ) : (
              <><Lock size={16} />Final Lock Session</>
            )}
          </button>
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
        <div className="stat-card" style={{ borderColor: '#fcd34d' }}>
          <div className="stat-icon" style={{ background: '#fef9c3', color: '#92400e' }}>
            <Bell size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Edit Requests</p>
            <h3 className="stat-value" style={{ color: '#92400e' }}>{pendingEditRequests.length}</h3>
          </div>
        </div>
      </div>

      {/* Edit Requests Panel */}
      <div className="submissions-card" style={{ marginBottom: '1.5rem', borderColor: '#fcd34d' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: editRequestsOpen ? 16 : 0 }}
          onClick={() => setEditRequestsOpen((o) => !o)}
        >
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', marginBottom: 0 }}>
            <Bell size={16} />
            Edit Requests
            <span style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              borderRadius: 4,
              padding: '1px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.3px'
            }}>
              {pendingEditRequests.length} PENDING
            </span>
          </h2>
          {editRequestsOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </div>

        {editRequestsOpen && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                className="filter-btn"
                style={{ padding: '6px 12px', minWidth: 90, background: editRequestsTab === 'pending' ? '#0f172a' : '#f8fafc', color: editRequestsTab === 'pending' ? '#fff' : '#475569' }}
                onClick={() => setEditRequestsTab('pending')}
              >
                Pending ({pendingEditRequests.length})
              </button>
              <button
                className="filter-btn"
                style={{ padding: '6px 12px', minWidth: 90, background: editRequestsTab === 'reviewed' ? '#0f172a' : '#f8fafc', color: editRequestsTab === 'reviewed' ? '#fff' : '#475569' }}
                onClick={() => setEditRequestsTab('reviewed')}
              >
                Reviewed ({reviewedEditRequests.length})
              </button>
            </div>

            {visibleEditRequests.length === 0 ? (
            <div className="empty-state" style={{ margin: 0 }}>
              <p>{editRequestsTab === 'pending' ? 'No pending edit requests right now.' : 'No reviewed requests yet.'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Faculty</th>
                    <th>Academic Year</th>
                    <th>Sections Requested</th>
                    <th>Message</th>
                    <th>Requested On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEditRequests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div className="faculty-info">
                          <span className="faculty-name">{req.faculty_name}</span>
                          <span className="faculty-email">{req.faculty_email}</span>
                        </div>
                      </td>
                      <td>{req.academic_year}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {req.requested_sections?.map((s) => (
                            <span key={s} style={{
                              background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
                              padding: '2px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.2px'
                            }}>{req.section_labels?.[s] || s}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220, fontSize: '0.8125rem', color: '#64748b' }}>{req.request_message || '-'}</td>
                      <td>{formatDate(req.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          {req.status === 'pending' && !sessionLockedYears.has(String(req.academic_year || '').trim()) ? (
                            <button
                              className="action-btn btn-approve"
                              title="Review & Approve/Deny"
                              onClick={() => startReview(req)}
                              style={{ gap: 5, paddingLeft: 10, paddingRight: 10 }}
                            >
                              <Eye size={13} /> Review
                            </button>
                          ) : (
                            <span className={`status-badge ${req.status === 'approved' ? 'status-approved' : 'status-sent-back'}`}>
                              {String(req.status).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>
        )}
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
                            aria-label="Select form type for table"
                          >
                            <option value="A">Form A</option>
                            <option value="B">Form B</option>
                          </select>
                        </div>
                      </th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Submitted On</th>
                      <th>Locked</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[yr].map(entry => {
                      const submission = entry.selectedSubmission;
                      const hasRealSubmission = Number(submission?.id || 0) > 0;
                      const isFormB = entry.selectedFormType === 'B';
                      const isPendingHod = isFormB && ['submitted_hod', 'under_review_hod'].includes(submission.status);
                      const isDraft = String(submission?.status || '').toLowerCase() === 'draft';
                      const canDofaReview = !isPendingHod;
                      const canOpenSubmission = hasRealSubmission && canDofaReview && !isDraft;
                      const isSessionLocked = Number(submission.session_locked || 0) === 1;
                      const canMutate = canDofaReview && !isSessionLocked;

                      return (
                      <tr key={entry.key}>
                        <td>
                          <div className="faculty-info">
                            <span className="faculty-name">{entry.faculty_name}</span>
                            <span className="faculty-email">{entry.email}</span>
                          </div>
                        </td>
                        <td>{entry.department || '-'}</td>
                        <td>
                          <span className="form-type-badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
                            {activeFormType === 'B' ? 'Form B' : 'Form A'}
                          </span>
                        </td>
                        <td>{getWorkflowStage(submission)}</td>
                        <td>{getStatusBadge(submission)}</td>
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
                              onClick={() => navigate(buildReviewPath('/Dofa-office', submission))}
                              title={canOpenSubmission ? 'View Full Form' : (isDraft ? 'Available after faculty submission' : 'Available after HoD approval')}
                              disabled={!canOpenSubmission}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="action-btn btn-download"
                              onClick={() => setDownloadModal({ open: true, submission })}
                              title={canOpenSubmission ? 'Download Form' : (isDraft ? 'Available after faculty submission' : 'Available after HoD approval')}
                              disabled={!canOpenSubmission}
                            >
                              <Download size={16} />
                            </button>

                            {hasRealSubmission && submission.status !== 'approved' && canMutate && (
                              <button
                                className="action-btn btn-approve"
                                onClick={() => handleUpdateStatus(submission.id, 'approved', submission.faculty_name)}
                                title="Approve Submission"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}

                            {hasRealSubmission && submission.status !== 'sent_back' && submission.status !== 'draft' && canMutate && (
                              <button
                                className="action-btn btn-send-back"
                                onClick={() => handleUpdateStatus(submission.id, 'sent_back', submission.faculty_name)}
                                title="Send Back for Changes"
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                            {hasRealSubmission && !isSessionLocked && (
                              <button
                                className={`action-btn ${submission.locked ? 'btn-unlock' : 'btn-lock'}`}
                                onClick={() => handleToggleLock(submission.id, submission.locked)}
                                title={submission.locked ? 'Unlock' : 'Lock'}
                              >
                                {submission.locked ? <Unlock size={16} /> : <Lock size={16} />}
                              </button>
                            )}

                            <button
                              className="action-btn btn-reminder"
                              onClick={() => handleSendReminder(submission.id, submission.email, submission.faculty_name)}
                              title="Send Reminder Email"
                              disabled={isSessionLocked || !hasRealSubmission}
                            >
                              <Mail size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
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

      {/* Review Modal */}
      {reviewingRequest && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: '28px 32px', maxWidth: 560, width: '100%',
            border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }}>
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Review Edit Request</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.8125rem' }}>
                <strong style={{ color: '#334155' }}>{reviewingRequest.faculty_name}</strong>
                <span style={{ margin: '0 6px', color: '#cbd5e1' }}> | </span>
                {reviewingRequest.academic_year}
              </p>
            </div>

            <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Select sections to approve
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 6, marginBottom: 18 }}>
              {reviewingRequest.requested_sections?.map((s) => (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  border: `1px solid ${approvedSections.includes(s) ? '#93c5fd' : '#e2e8f0'}`,
                  borderRadius: 6, cursor: 'pointer',
                  background: approvedSections.includes(s) ? '#eff6ff' : '#fafafa'
                }}>
                  <input type="checkbox" checked={approvedSections.includes(s)} onChange={() => toggleSection(s)} style={{ accentColor: '#1d4ed8' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>{reviewingRequest.section_labels?.[s] || s}</span>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Note to Faculty <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={DofaNote}
                onChange={(e) => setDofaNote(e.target.value)}
                placeholder="Optional feedback"
                rows={3}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', color: '#334155' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => setReviewingRequest(null)}
                disabled={!!reviewLoading}
                style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: reviewLoading ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', opacity: reviewLoading ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewSubmit('denied')}
                disabled={!!reviewLoading}
                style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff5f5', color: '#b91c1c', cursor: reviewLoading ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: reviewLoading && reviewLoading !== 'denied' ? 0.5 : 1 }}
              >
                {reviewLoading === 'denied' ? 'Denying...' : 'Deny'}
              </button>
              <button
                onClick={() => handleReviewSubmit('approved')}
                disabled={!!reviewLoading}
                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', cursor: reviewLoading ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: reviewLoading && reviewLoading !== 'approved' ? 0.5 : 1 }}
              >
                {reviewLoading === 'approved' ? 'Approving...' : 'Approve Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DofaOfficeDashboard;
