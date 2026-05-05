'use strict';

const fs   = require('fs');
const path = require('path');

let logoBase64 = '';
try {
  const logoPath = path.join(__dirname, '../../public/lnmiit-logo.png');
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath, 'base64')}`;
  }
} catch (e) { console.warn('Logo not loaded:', e.message); }

/* ─── helpers ──────────────────────────────────────────────────────────── */
const esc = (v) =>
  String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtFile = (v) => {
  if (!v) return '—';
  // Strip leading UUID/timestamp prefix from stored filenames
  return String(v).replace(/^\d{10,}-/, '').replace(/^[0-9a-f]{8,}-/i, '');
};

const isDateCol = (k) =>
  /^(date|month|month_of|date_of|joining|start|end|submission_date|implementation_date)/.test(k) ||
  /(^|_)(date|month)$/.test(k);

const isFileCol  = (k) => /(file|attachment|evidence|document|upload|certificate)/.test(k);
const isSkipCol  = (k) => /^(id|faculty_id|submission_id|session_id|created_at|updated_at)$/.test(k);
const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

const fmtCell = (key, val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (isFileCol(key))  return fmtFile(val);
  if (isDateCol(key))  return fmtDate(val);
  return String(val);
};

const toLabel = (k) =>
  String(k || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const renderLegacyValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';

  if (Array.isArray(value)) {
    const items = value.filter(item => item !== null && item !== undefined && item !== '');
    if (items.length === 0) return '—';

    if (items.every(isPlainObject)) {
      const allKeys = [...new Set(items.flatMap(item => Object.keys(item || {})))]
        .filter(fieldKey => !isSkipCol(fieldKey));

      if (allKeys.length === 0) return '—';

      const thead = allKeys.map(fieldKey => `<th>${esc(toLabel(fieldKey))}</th>`).join('');
      const tbody = items.map(item => {
        const cells = allKeys.map(fieldKey => `<td>${renderLegacyValue(fieldKey, item[fieldKey])}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      return `<div class="table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    }

    return `<ul class="legacy-list">${items.map(item => `<li>${renderLegacyValue(key, item)}</li>`).join('')}</ul>`;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .filter(([fieldKey, fieldValue]) => !isSkipCol(fieldKey) && fieldValue !== null && fieldValue !== undefined && fieldValue !== '');

    if (entries.length === 0) return '—';

    return `<div class="info-grid">${entries.map(([fieldKey, fieldValue]) => `
      <div class="info-cell">
        <span class="info-label">${esc(toLabel(fieldKey))}</span>
        <span class="info-value">${renderLegacyValue(fieldKey, fieldValue)}</span>
      </div>
    `).join('')}</div>`;
  }

  return esc(fmtCell(key, value));
};

/* ─── Per-section column whitelists (key must match actual DB column name) ─ */
const COL = {
  courses: [
    { key: 'course_code',    label: 'Code'        },
    { key: 'course_name',    label: 'Course Name' },
    { key: 'section',        label: 'Section'     },
    { key: 'semester',       label: 'Semester'    },
    { key: 'program',        label: 'Program'     },
    { key: 'credits',        label: 'Credits'     },
    { key: 'enrollment',     label: 'Enrollment'  },
    { key: 'feedback_score', label: 'Feedback'    },
    { key: 'percentage',     label: '%ile'        },
    { key: 'remarks',        label: 'Remarks'     },
    { key: 'status',         label: 'Status'      },
  ],
  newCourses: [
    { key: 'course_name',  label: 'Course Name' },
    { key: 'course_code',  label: 'Code'        },
    { key: 'level_type',   label: 'Level Type'  },
    { key: 'level',        label: 'Level'       },
    { key: 'program',      label: 'Program'     },
    { key: 'remarks',      label: 'Remarks'     },
    { key: 'cif_file',     label: 'CIF File'    },
  ],
  publications: [
    { key: 'publication_type',    label: 'Type'           },
    { key: 'sub_type',            label: 'Sub-type'       },
    { key: 'title',               label: 'Title'          },
    { key: 'year_of_publication', label: 'Year'           },
    { key: 'journal_name',        label: 'Journal'        },
    { key: 'conference_name',     label: 'Conference'     },
    { key: 'abbreviation',        label: 'Abbreviation'   },
    { key: 'volume',              label: 'Vol.'           },
    { key: 'number',              label: 'No.'            },
    { key: 'pages_from',          label: 'Pages From'     },
    { key: 'pages_to',            label: 'Pages To'       },
    { key: 'date_from',           label: 'Date From'      },
    { key: 'date_to',             label: 'Date To'        },
    { key: 'type_of_conference',  label: 'Conf. Type'     },
    { key: 'city',                label: 'City'           },
    { key: 'state',               label: 'State'          },
    { key: 'country',             label: 'Country'        },
    { key: 'publication_agency',  label: 'Publisher'      },
    { key: 'title_of_book',       label: 'Book Title'     },
    { key: 'details',             label: 'Details'        },
    { key: 'status',              label: 'Status'         },
  ],
  grants: [
    { key: 'grant_type',       label: 'Type'           },
    { key: 'project_name',     label: 'Project'        },
    { key: 'funding_agency',   label: 'Funding Agency' },
    { key: 'grant_amount',     label: 'Amount (₹)'    },
    { key: 'amount_in_lakhs',  label: 'Lakhs'          },
    { key: 'currency',         label: 'Currency'       },
    { key: 'duration',         label: 'Duration'       },
    { key: 'role',             label: 'Role'           },
    { key: 'researchers',      label: 'Co-researchers' },
  ],
  proposals: [
    { key: 'title',            label: 'Title'          },
    { key: 'funding_agency',   label: 'Funding Agency' },
    { key: 'grant_amount',     label: 'Amount (₹)'    },
    { key: 'amount_in_lakhs',  label: 'Lakhs'          },
    { key: 'currency',         label: 'Currency'       },
    { key: 'duration',         label: 'Duration'       },
    { key: 'submission_date',  label: 'Submitted On'   },
    { key: 'role',             label: 'Role'           },
    { key: 'status',           label: 'Status'         },
  ],
  patents: [
    { key: 'patent_type',      label: 'Type'         },
    { key: 'title',            label: 'Title'        },
    { key: 'agency',           label: 'Agency'       },
    { key: 'month',            label: 'Date'         },
    { key: 'publication_id',   label: 'Publication ID'},
  ],
  paperReviews: [
    { key: 'journal_name',      label: 'Journal / Conference' },
    { key: 'abbreviation',      label: 'Abbreviation'         },
    { key: 'review_type',       label: 'Review Type'          },
    { key: 'tier',              label: 'Tier'                 },
    { key: 'number_of_papers',  label: 'No. of Papers'        },
    { key: 'month_of_review',   label: 'Month of Review'      },
  ],
  techTransfer: [
    { key: 'title',       label: 'Title'        },
    { key: 'description', label: 'Description'  },
    { key: 'agency',      label: 'Agency'       },
    { key: 'date',        label: 'Date'         },
  ],
  conferences: [
    { key: 'conference_name', label: 'Conference'     },
    { key: 'session_title',   label: 'Session Title'  },
    { key: 'role',            label: 'Role'          },
    { key: 'date',            label: 'Date'           },
    { key: 'location',        label: 'Location'       },
    { key: 'evidence_file',   label: 'Evidence'       },
  ],
  keynotes: [
    { key: 'title',         label: 'Title'         },
    { key: 'event_name',    label: 'Event'         },
    { key: 'date',          label: 'Date'          },
    { key: 'location',      label: 'Location'      },
    { key: 'audience_type', label: 'Audience Type' },
  ],
  awards: [
    { key: 'award_name',       label: 'Award'       },
    { key: 'honor_type',       label: 'Type'        },
    { key: 'awarding_agency',  label: 'Awarded By'  },
    { key: 'year',             label: 'Year'        },
    { key: 'description',      label: 'Description' },
    { key: 'evidence_file',    label: 'Evidence'    },
  ],
  consultancy: [
    { key: 'organization',  label: 'Organisation' },
    { key: 'project_title', label: 'Project'      },
    { key: 'amount',        label: 'Amount (in INR lacs)' },
    { key: 'duration',      label: 'Duration'     },
    { key: 'year',          label: 'Year'         },
    { key: 'evidence_file', label: 'Evidence'     },
  ],
  teachingInnovation: [
    { key: 'title',               label: 'Title'               },
    { key: 'description',         label: 'Description'         },
    { key: 'implementation_date', label: 'Implementation Date' },
    { key: 'impact',              label: 'Impact'              },
  ],
  contributions: [
    { key: 'contribution_type', label: 'Type'        },
    { key: 'category',          label: 'Category'    },
    { key: 'activity',          label: 'Activity'    },
    { key: 'title',             label: 'Title'       },
    { key: 'description',       label: 'Description' },
    { key: 'details',           label: 'Details'     },
    { key: 'role',              label: 'Role'        },
    { key: 'year',              label: 'Year'        },
  ],
  goals: [
    { key: 'semester',     label: 'Semester'     },
    { key: 'teaching',     label: 'Teaching'     },
    { key: 'research',     label: 'Research'     },
    { key: 'contribution', label: 'Contribution' },
    { key: 'outreach',     label: 'Outreach'     },
    { key: 'description',  label: 'Description'  },
  ],
};

/* ─── Render helpers ────────────────────────────────────────────────────── */

const curatedTable = (rows = [], colDefs = []) => {
  const safeRows = rows.filter(Boolean);
  if (safeRows.length === 0) return '<p class="no-data">No entries recorded.</p>';

  // Only show columns that have at least one non-empty value
  const activeCols = colDefs.filter(({ key }) =>
    safeRows.some(r => r[key] !== null && r[key] !== undefined && r[key] !== '')
  );
  if (activeCols.length === 0) return '<p class="no-data">No entries recorded.</p>';

  const thead = activeCols.map(({ label }) => `<th>${esc(label)}</th>`).join('');
  const tbody = safeRows.map(row => {
    const cells = activeCols.map(({ key }) =>
      `<td>${esc(fmtCell(key, row[key]))}</td>`
    ).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<div class="table-wrap"><table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table></div>`;
};

const infoGrid = (obj = {}) => {
  const entries = Object.entries(obj).filter(
    ([k, v]) => !isSkipCol(k) && v !== null && v !== undefined && v !== ''
  );
  if (entries.length === 0) return '<p class="no-data">No information recorded.</p>';

  return `<div class="info-grid">${entries.map(([k, v]) => {
    return `<div class="info-cell">
      <span class="info-label">${esc(toLabel(k))}</span>
      <div class="info-value">${renderLegacyValue(k, v)}</div>
    </div>`;
  }).join('')}</div>`;
};

const section = (title, content) => `
<div class="section">
  <div class="section-header"><h2>${esc(title)}</h2></div>
  <div class="section-body">${content}</div>
</div>`;

const dynamicSectionsHtml = (dynamicData = []) => {
  if (!dynamicData.length) return '';
  const blocks = dynamicData.map(({ section: sec, fields, respMap }) => {
    const fieldsHtml = fields.map(field => {
      const value = respMap[field.id];
      if (field.field_type === 'table' && Array.isArray(value) && value.length > 0) {
        const cols = field.config?.columns || [];
        return `<div class="dyn-field">
          <p class="dyn-field-label">${esc(field.label)}</p>
          <div class="table-wrap"><table>
            <thead><tr>${cols.map(c => `<th>${esc(c.header)}</th>`).join('')}</tr></thead>
            <tbody>${value.map(row =>
              `<tr>${cols.map(c => `<td>${renderLegacyValue(c.key, row[c.key])}</td>`).join('')}</tr>`
            ).join('')}</tbody>
          </table></div></div>`;
      }
      return `<div class="dyn-field">
        <span class="info-label">${esc(field.label)}</span>
        <div class="info-value">${renderLegacyValue(field.label, value)}</div>
      </div>`;
    }).join('');
    return `<div class="dyn-subsection">
      <h3 class="dyn-section-title">${esc(sec.title)} <span class="form-badge">Form ${esc(sec.form_type)}</span></h3>
      ${fieldsHtml}
    </div>`;
  }).join('');
  return section('Custom Sections (Form Builder)', blocks);
};

/* ─── Main HTML ─────────────────────────────────────────────────────────── */
const generateHtml = (data) => {
  const {
    submission = {}, facultyInfo = {},
    courses = [], publications = [], grants = [], patents = [], awards = [],
    newCourses = [], proposals = [], paperReviews = [], techTransfer = [],
    conferenceSessions = [], keynotesTalks = [], consultancy = [],
    teachingInnovation = [], institutionalContributions = [], goals = [],
    courseware, researchPlan, teachingPlan, continuingEducation, otherActivities,
    dynamicData = []
  } = data;

  const title = `Faculty Appraisal — ${submission.faculty_name || 'Faculty'} — ${submission.academic_year || ''}`;

  /* Parse a legacy JSON string and render as human-readable HTML */
  const legacyJsonBlock = (raw) => {
    if (!raw) return '<p class="no-data">No data recorded.</p>';
    let parsed;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (_) { return `<pre class="pre-block">${esc(String(raw))}</pre>`; }

    // Array of objects → table
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      const allKeys = [...new Set(parsed.flatMap(r => Object.keys(r || {})))]
        .filter(k => !isSkipCol(k));
      const thead = allKeys.map(k => `<th>${esc(toLabel(k))}</th>`).join('');
      const tbody = parsed.map(row => {
        const cells = allKeys.map(k => `<td>${renderLegacyValue(k, row[k])}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<div class="table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    }

    // Plain object → key-value grid
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed)
        .filter(([k, v]) => !isSkipCol(k) && v !== null && v !== undefined && v !== '');
      if (entries.length === 0) return '<p class="no-data">No data recorded.</p>';
      return `<div class="info-grid">${entries.map(([k, v]) => {
        return `<div class="info-cell">
          <span class="info-label">${esc(toLabel(k))}</span>
          <span class="info-value">${renderLegacyValue(k, v)}</span>
        </div>`;
      }).join('')}</div>`;
    }

    // Fallback: plain text
    return `<pre class="pre-block">${esc(String(parsed))}</pre>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<style>
  /* Puppeteer handles the footer; no position:fixed needed here */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #1e293b;
    background: #fff;
    line-height: 1.55;
  }

  /* ── Cover ── */
  .cover {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px;
    page-break-after: always;
    border: 8px solid #1e3a8a;
  }
  .cover img       { max-height: 110px; margin-bottom: 24px; }
  .cover-inst      { font-size: 13px; font-weight: 700; text-transform: uppercase;
                     letter-spacing: .08em; color: #475569; margin-bottom: 28px; }
  .cover h1        { font-size: 34px; font-weight: 800; color: #1e3a8a;
                     margin-bottom: 10px; line-height: 1.2; }
  .cover h2        { font-size: 18px; font-weight: 400; color: #64748b; margin-bottom: 36px; }
  .cover-meta      { display: flex; flex-wrap: wrap; gap: 28px; justify-content: center;
                     background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
                     padding: 28px 36px; width: 80%; }
  .cover-meta-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .cover-meta-item span   { font-size: 11px; color: #64748b; }
  .cover-meta-item strong { font-size: 16px; font-weight: 700; color: #0f172a; }
  .cover-status    { margin-top: 28px; padding: 8px 24px; background: #1e3a8a; color: #fff;
                     border-radius: 20px; font-size: 12px; font-weight: 700;
                     letter-spacing: .07em; text-transform: uppercase; }

  /* ── Sections ── */
  .section          { margin-bottom: 16px; }
  .section-header   { background: #1e3a8a; color: #fff; padding: 8px 16px; }
  .section-header h2{ font-size: 12px; font-weight: 700; text-transform: uppercase;
                      letter-spacing: .07em; }
  .section-body     { padding: 12px 16px; border: 3px solid #1e3a8a; border-top: none; }
  .no-data          { color: #94a3b8; font-style: italic; font-size: 10px; }

  /* ── Info grid (4 columns on landscape) ── */
  .info-grid  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 20px; }
  .info-cell  { display: flex; flex-direction: column; gap: 3px; }
  .info-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase;
                letter-spacing: .05em; color: #64748b; }
  .info-value { font-size: 11px; font-weight: 500; color: #1e293b; word-break: break-word; }

  /* ── Tables ── */
  .table-wrap { border: 1px solid #d1d9e6; border-radius: 4px; margin-top: 4px; width: 100%; }
  table       { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead       { background: #1e3a8a; }
  th          { padding: 8px 12px; text-align: left; font-weight: 700; font-size: 10px;
                text-transform: uppercase; letter-spacing: .04em; color: #fff;
                border-right: 1px solid rgba(255,255,255,.12); white-space: nowrap; }
  th:last-child { border-right: none; }
  td          { padding: 8px 12px; border-bottom: 1px solid #eef0f4; color: #334155;
                vertical-align: top; word-break: break-word; overflow-wrap: break-word; }
  tr:last-child td  { border-bottom: none; }
  tr:nth-child(even){ background: #f8fafc; }

  /* ── Pre blocks ── */
  .pre-block { white-space: pre-wrap; font-family: inherit; font-size: 10.5px;
               background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;
               padding: 10px 14px; line-height: 1.7; }

  /* ── Dynamic ── */
  .dyn-subsection   { margin-bottom: 14px; padding: 12px; background: #f8fafc;
                      border-radius: 6px; border: 1px solid #e2e8f0; }
  .dyn-section-title{ font-size: 12px; font-weight: 700; color: #1e3a8a;
                      margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .form-badge       { background: #dbeafe; color: #1d4ed8; border-radius: 10px;
                      padding: 2px 8px; font-size: 9px; font-weight: 700; }
  .dyn-field        { display: flex; flex-direction: column; margin-bottom: 8px; gap: 2px; }
  .dyn-field-label  { font-size: 10px; font-weight: 600; color: #334155; margin-bottom: 4px; }
  .legacy-list      { margin: 0; padding-left: 16px; }
  .legacy-list li   { margin-bottom: 4px; }

  @media print {
    .section    { page-break-inside: auto; }
    table       { page-break-inside: auto; }
    thead       { display: table-header-group; }
    tr          { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- Cover Page -->
<div class="cover">
  ${logoBase64 ? `<img src="${logoBase64}" alt="LNMIIT Logo" />` : ''}
  <div class="cover-inst">The LNM Institute of Information Technology, Jaipur</div>
  <h1>${esc(submission.faculty_name || 'Faculty Appraisal Report')}</h1>
  <h2>Annual Faculty Appraisal Form</h2>
  <div class="cover-meta">
    <div class="cover-meta-item"><span>Academic Year</span><strong>${esc(submission.academic_year || '—')}</strong></div>
    <div class="cover-meta-item"><span>Department</span><strong>${esc(submission.department || facultyInfo.department || '—')}</strong></div>
    <div class="cover-meta-item"><span>Designation</span><strong>${esc(submission.designation || facultyInfo.designation || '—')}</strong></div>
    <div class="cover-meta-item"><span>Submitted On</span><strong>${fmtDate(submission.submitted_at)}</strong></div>
  </div>
  <div class="cover-status">${esc(submission.status || 'Draft')}</div>
</div>

<!-- Faculty Information -->
${section('Faculty Information', infoGrid(facultyInfo))}

<!-- Part A -->
${section('Part A — Courses Taught',              curatedTable(courses,                  COL.courses))}
${section('Part A — New Courses Developed',       curatedTable(newCourses,               COL.newCourses))}
${section('Part A — Research Publications',       curatedTable(publications,             COL.publications))}
${section('Part A — Research Grants',             curatedTable(grants,                   COL.grants))}
${section('Part A — Submitted Proposals',         curatedTable(proposals,                COL.proposals))}
${section('Part A — Patents',                     curatedTable(patents,                  COL.patents))}
${section('Part A — Paper Reviews',               curatedTable(paperReviews,             COL.paperReviews))}
${section('Part A — Technology Transfer',         curatedTable(techTransfer,             COL.techTransfer))}
${section('Part A — Conference Sessions',         curatedTable(conferenceSessions,       COL.conferences))}
${section('Part A — Keynotes & Invited Talks',    curatedTable(keynotesTalks,            COL.keynotes))}
${section('Part A — Awards & Honours',            curatedTable(awards,                   COL.awards))}
${section('Part A — Consultancy',                 curatedTable(consultancy,              COL.consultancy))}
${section('Part A — Teaching Innovation',         curatedTable(teachingInnovation,       COL.teachingInnovation))}
${section('Part A — Institutional Contributions', curatedTable(institutionalContributions, COL.contributions))}

${courseware          ? section('Part A — Courseware',           legacyJsonBlock(courseware))          : ''}
${continuingEducation ? section('Part A — Continuing Education', legacyJsonBlock(continuingEducation)) : ''}
${otherActivities     ? section('Part A — Other Activities',     legacyJsonBlock(otherActivities))     : ''}

<!-- Part B -->
${section('Part B — Research Plan',
  researchPlan  ? legacyJsonBlock(researchPlan)  : '<p class="no-data">No research plan recorded.</p>')}
${section('Part B — Teaching Plan',
  teachingPlan  ? legacyJsonBlock(teachingPlan)  : '<p class="no-data">No teaching plan recorded.</p>')}
${section('Part B — Goals & Targets', curatedTable(goals, COL.goals))}

<!-- Dynamic / Form Builder sections -->
${dynamicSectionsHtml(dynamicData)}

</body>
</html>`;
};

module.exports = { generateHtml };
