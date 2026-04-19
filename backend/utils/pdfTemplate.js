/**
 * pdfTemplate.js
 * Generates the full LNMIIT-branded HTML string for Puppeteer to render as PDF.
 * Called by pdfController.js with all submission data + dynamic sections.
 */

'use strict';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const esc = (v) =>
  String(v ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toLabel = (k) =>
  String(k || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* Render a simple key-value info grid */
const infoGrid = (obj = {}) => {
  const skip = new Set(['id', 'faculty_id', 'submission_id', 'created_at', 'updated_at']);
  const entries = Object.entries(obj).filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return '<p class="no-data">No information recorded.</p>';
  return `<div class="info-grid">${entries.map(([k, v]) => `
    <div class="info-cell">
      <span class="info-label">${esc(toLabel(k))}</span>
      <span class="info-value">${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</span>
    </div>`).join('')}</div>`;
};

/* Render an array as a table */
const dataTable = (rows = [], preferCols = []) => {
  const safeRows = rows.filter(Boolean);
  if (safeRows.length === 0) return '<p class="no-data">No entries recorded.</p>';
  const skip = new Set(['id', 'faculty_id']);
  const rawCols = Object.keys(safeRows[0]).filter(k => !skip.has(k));
  const cols = [...preferCols.filter(k => rawCols.includes(k)), ...rawCols.filter(k => !preferCols.includes(k))];
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${cols.map(c => `<th>${esc(toLabel(c))}</th>`).join('')}</tr></thead>
        <tbody>${safeRows.map(row =>
    `<tr>${cols.map(c => `<td>${(c.toLowerCase().includes('date') || c.toLowerCase().includes('year') || c.toLowerCase().includes('at')) ? esc(fmtDate(row[c])) : esc(String(row[c] ?? '—'))}</td>`).join('')}</tr>`
  ).join('')}</tbody>
      </table>
    </div>`;
};

/* Render a single section block */
const section = (title, content) => `
  <div class="section">
    <div class="section-header"><h2>${esc(title)}</h2></div>
    <div class="section-body">${content}</div>
  </div>`;

/* ── Dynamic sections ─────────────────────────────────────────────────────── */
const dynamicSectionsHtml = (dynamicData = []) => {
  if (dynamicData.length === 0) return '';

  const blocks = dynamicData.map(({ section: sec, fields, respMap }) => {
    const fieldsHtml = fields.map(field => {
      const value = respMap[field.id];
      if (field.field_type === 'table' && Array.isArray(value) && value.length > 0) {
        const cols = field.config?.columns || [];
        return `
          <div class="dyn-field">
            <p class="dyn-field-label">${esc(field.label)}</p>
            <div class="table-wrap">
              <table>
                <thead><tr>${cols.map(c => `<th>${esc(c.header)}</th>`).join('')}</tr></thead>
                <tbody>${value.map(row =>
          `<tr>${cols.map(c => `<td>${esc(row[c.key] ?? '—')}</td>`).join('')}</tr>`
        ).join('')}</tbody>
              </table>
            </div>
          </div>`;
      }
      const display = Array.isArray(value) ? value.join(', ') : String(value ?? '—');
      return `
        <div class="dyn-field">
          <span class="info-label">${esc(field.label)}</span>
          <span class="info-value">${esc(display)}</span>
        </div>`;
    }).join('');

    return `
      <div class="dyn-subsection">
        <h3 class="dyn-section-title">${esc(sec.title)} <span class="form-badge">Form ${esc(sec.form_type)}</span></h3>
        ${fieldsHtml}
      </div>`;
  }).join('');

  return section('Custom Sections (Form Builder)', blocks);
};

/* ── Main template ────────────────────────────────────────────────────────── */
const generateHtml = (data) => {
  const {
    submission = {}, facultyInfo = {},
    courses = [], publications = [], grants = [], patents = [], awards = [],
    newCourses = [], proposals = [], paperReviews = [], techTransfer = [],
    conferenceSessions = [], keynotesTalks = [], consultancy = [],
    teachingInnovation = [], institutionalContributions = [], goals = [],
    courseware, researchPlan, teachingPlan, continuingEducation, otherActivities,
    dynamicData = []   // ← injected by pdfController
  } = data;

  const title = `Faculty Appraisal — ${esc(submission.faculty_name || 'Faculty')} — ${esc(submission.academic_year || '')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11px;
    color: #1e293b;
    background: #fff;
    line-height: 1.55;
  }

  /* ── Cover page ── */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%);
    color: white;
    text-align: center;
    padding: 2rem;
    page-break-after: always;
  }

  .cover-logo {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.85;
    margin-bottom: 3rem;
  }

  .cover h1 {
    font-size: 30px;
    font-weight: 800;
    margin-bottom: 0.75rem;
    line-height: 1.2;
  }

  .cover h2 {
    font-size: 18px;
    font-weight: 400;
    opacity: 0.85;
    margin-bottom: 2.5rem;
  }

  .cover-meta {
    display: flex;
    gap: 2rem;
    font-size: 13px;
    opacity: 0.9;
    flex-wrap: wrap;
    justify-content: center;
  }

  .cover-meta-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .cover-meta-item strong {
    font-size: 15px;
    font-weight: 700;
  }

  .cover-status {
    margin-top: 2.5rem;
    padding: 0.5rem 1.5rem;
    background: rgba(255,255,255,0.2);
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  /* ── Sections ── */
  .section {
    margin: 0;
    page-break-inside: avoid;
  }

  .section-header {
    background: #1e3a8a;
    color: white;
    padding: 8px 16px;
    margin: 0;
  }

  .section-header h2 {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .section-body {
    padding: 12px 16px;
    border-left: 3px solid #1e3a8a;
    border-right: 3px solid #1e3a8a;
    border-bottom: 3px solid #1e3a8a;
    margin-bottom: 16px;
  }

  .no-data {
    color: #94a3b8;
    font-style: italic;
    font-size: 10.5px;
  }

  /* Info grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px 16px;
  }

  .info-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .info-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
  }

  .info-value {
    font-size: 11px;
    color: #1e293b;
    font-weight: 500;
  }

  /* Table */
  .table-wrap {
    overflow: hidden;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    margin-top: 6px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }

  thead { background: #f1f5f9; }

  th {
    padding: 5px 8px;
    text-align: left;
    font-weight: 700;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  td {
    padding: 5px 8px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: top;
  }

  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) { background: #fafafa; }

  /* Dynamic sections */
  .dyn-subsection {
    margin-bottom: 14px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .dyn-section-title {
    font-size: 11px;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .form-badge {
    background: #dbeafe;
    color: #1d4ed8;
    border-radius: 10px;
    padding: 1px 6px;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .dyn-field {
    display: flex;
    flex-direction: column;
    margin-bottom: 6px;
    gap: 2px;
  }

  .dyn-field-label {
    font-size: 10px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 4px;
  }

  /* Footer */
  .page-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    font-size: 9px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    background: white;
  }

  @media print {
    .section { page-break-inside: auto; }
  }
</style>
</head>
<body>

<!-- ── Cover Page ── -->
<div class="cover">
  <div class="cover-logo">The LNM Institute of Information Technology, Jaipur</div>
  <h1>${esc(submission.faculty_name || 'Faculty Appraisal Report')}</h1>
  <h2>Annual Faculty Appraisal Form</h2>
  <div class="cover-meta">
    <div class="cover-meta-item">
      <span>Academic Year</span>
      <strong>${esc(submission.academic_year || '—')}</strong>
    </div>
    <div class="cover-meta-item">
      <span>Department</span>
      <strong>${esc(submission.department || facultyInfo.department || '—')}</strong>
    </div>
    <div class="cover-meta-item">
      <span>Designation</span>
      <strong>${esc(submission.designation || facultyInfo.designation || '—')}</strong>
    </div>
    <div class="cover-meta-item">
      <span>Submitted On</span>
      <strong>${fmtDate(submission.submitted_at)}</strong>
    </div>
  </div>
  <div class="cover-status">${esc(submission.status || 'Draft')}</div>
</div>

<!-- ── Footer (appears on every page after cover) ── -->
<div class="page-footer">
  <span>LNMIIT Faculty Appraisal System &mdash; Confidential</span>
  <span>Generated: ${new Date().toLocaleDateString('en-IN')}</span>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PART A — ACADEMIC CONTRIBUTIONS
     ═══════════════════════════════════════════════════════════ -->

${section('Part A — Faculty Information', infoGrid(facultyInfo))}

${section('Part A — Courses Taught',
  dataTable(courses, ['course_code', 'course_title', 'semester', 'year', 'students', 'feedback_score'])
)}

${section('Part A — New Courses Developed',
  dataTable(newCourses, ['title', 'course_name', 'semester', 'year', 'role'])
)}

${section('Part A — Research Publications',
  dataTable(publications, ['publication_type', 'sub_type', 'title', 'year_of_publication', 'journal_name', 'conference_name'])
)}

${section('Part A — Research Grants',
  dataTable(grants, ['grant_type', 'project_name', 'funding_agency', 'grant_amount', 'duration', 'role'])
)}

${section('Part A — Submitted Proposals',
  dataTable(proposals, ['title', 'funding_agency', 'grant_amount', 'submission_date', 'status'])
)}

${section('Part A — Patents',
  dataTable(patents, ['title', 'patent_number', 'status', 'year', 'country'])
)}

${section('Part A — Technology Transfer',
  dataTable(techTransfer, ['title', 'details', 'year', 'organization', 'role'])
)}

${section('Part A — Paper Reviews',
  dataTable(paperReviews, ['journal_name', 'review_count', 'year', 'details'])
)}

${section('Part A — Conference Sessions',
  dataTable(conferenceSessions, ['conference_name', 'role', 'date', 'location'])
)}

${section('Part A — Keynotes & Invited Talks',
  dataTable(keynotesTalks, ['title', 'event_name', 'date', 'location'])
)}

${section('Part A — Awards & Honours',
  dataTable(awards, ['title', 'awarding_body', 'year', 'level'])
)}

${section('Part A — Consultancy',
  dataTable(consultancy, ['organization', 'project_title', 'role', 'duration', 'amount', 'year'])
)}

${section('Part A — Teaching Innovation',
  dataTable(teachingInnovation, ['title', 'description', 'impact', 'year'])
)}

${section('Part A — Institutional Contributions',
  dataTable(institutionalContributions, ['category', 'activity', 'role', 'year', 'details'])
)}

${courseware ? section('Part A — Courseware', `<pre style="white-space:pre-wrap;font-family:inherit;font-size:10.5px">${esc(typeof courseware === 'string' ? courseware : JSON.stringify(courseware, null, 2))}</pre>`) : ''}

${continuingEducation ? section('Part A — Continuing Education', `<pre style="white-space:pre-wrap;font-family:inherit;font-size:10.5px">${esc(typeof continuingEducation === 'string' ? continuingEducation : JSON.stringify(continuingEducation, null, 2))}</pre>`) : ''}

${otherActivities ? section('Part A — Other Activities', `<pre style="white-space:pre-wrap;font-family:inherit;font-size:10.5px">${esc(typeof otherActivities === 'string' ? otherActivities : JSON.stringify(otherActivities, null, 2))}</pre>`) : ''}

<!-- ═══════════════════════════════════════════════════════════
     PART B — GOAL SETTING & SELF-ASSESSMENT
     ═══════════════════════════════════════════════════════════ -->

${section('Part B — Research Plan',
  researchPlan ? `<pre style="white-space:pre-wrap;font-family:inherit;font-size:10.5px">${esc(typeof researchPlan === 'string' ? researchPlan : JSON.stringify(researchPlan, null, 2))}</pre>` : '<p class="no-data">No research plan recorded.</p>'
)}

${section('Part B — Teaching Plan',
  teachingPlan ? `<pre style="white-space:pre-wrap;font-family:inherit;font-size:10.5px">${esc(typeof teachingPlan === 'string' ? teachingPlan : JSON.stringify(teachingPlan, null, 2))}</pre>` : '<p class="no-data">No teaching plan recorded.</p>'
)}

${section('Part B — Goals & Targets',
  dataTable(goals, ['semester', 'teaching', 'research', 'contribution', 'outreach', 'description'])
)}

<!-- ═══════════════════════════════════════════════════════════
     CUSTOM SECTIONS (DYNAMIC — FORM BUILDER)
     ═══════════════════════════════════════════════════════════ -->
${dynamicSectionsHtml(dynamicData)}

</body>
</html>`;
};

module.exports = { generateHtml };
