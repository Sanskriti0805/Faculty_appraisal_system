'use strict';

/**
 * pdfController.js
 * GET /api/submissions/:id/pdf
 *
 * Gathers ALL submission data (same as getSubmissionById) PLUS dynamic_responses,
 * renders the HTML template, asks Puppeteer to print it as PDF and streams it back.
 */

const db         = require('../config/database');
const puppeteer  = require('puppeteer');
const { generateHtml } = require('../utils/pdfTemplate');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');

// '2025-26' and '2025–26' (en dash) both start at 2025.
const academicYearStart = (academicYear) => String(academicYear || '').split(/[-–—]/)[0];

// Rows saved for one appraisal session. Older databases without session_id fall back to all rows.
const querySessionRows = async (tableName, facultyId, sessionId, extraWhere = '', extraParams = []) => {
  const extra = extraWhere ? ` AND ${extraWhere}` : '';
  try {
    const [rows] = await db.query(
      `SELECT * FROM ${tableName} WHERE faculty_id = ? AND session_id = ?${extra}`,
      [facultyId, sessionId, ...extraParams]
    );
    return rows || [];
  } catch (err) {
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
      const [rows] = await db.query(`SELECT * FROM ${tableName} WHERE faculty_id = ?${extra}`, [facultyId, ...extraParams]);
      return rows || [];
    }
    throw err;
  }
};

/* POST /api/submissions/export/html-to-pdf
 * Accepts JSON { html: '<html>...</html>', filename: 'optional.pdf' }
 * Renders the HTML with Puppeteer and streams back a PDF buffer.
 */
exports.generateHtmlPdf = async (req, res) => {
  const { html: rawHtml, filename: rawFilename } = req.body || {};
  if (!rawHtml || typeof rawHtml !== 'string') {
    return res.status(400).json({ success: false, message: 'Missing html in request body' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.setContent(rawHtml, { waitUntil: 'load', timeout: 30000 });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' } });
    await browser.close();
    browser = null;

    // Sanitize filename
    const filenameBase = rawFilename && String(rawFilename).trim() ? String(rawFilename).trim() : 'export.pdf';
    const asciiSafe = filenameBase.replace(/[\r\n"<>\\\/\x00-\x1F\x7F]/g, '_').replace(/[^\x20-\x7E]/g, '_');
    const utf8Encoded = encodeURIComponent(filenameBase);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8Encoded}`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('HTML->PDF generation error:', err);
    if (browser) await browser.close().catch(() => {});
    return res.status(500).json({ success: false, message: 'Failed to generate PDF: ' + err.message });
  }
};

/* -- helpers copied from submissionsController -- */
async function fetchLegacySectionContent(facultyId, sessionId, sectionKey) {
  const [rows] = await db.query(
    `SELECT content_json FROM legacy_section_entries
     WHERE faculty_id = ? AND section_key = ? AND session_id = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [facultyId, sectionKey, sessionId]
  );
  return rows.length > 0 ? rows[0].content_json || null : null;
}

/* -- query dynamic responses for this faculty -- */
async function fetchDynamicData(facultyId) {
  try {
    // 1. Get all active sections + their fields
    const [sections] = await db.query(`
      SELECT ds.id, ds.title, ds.form_type, ds.parent_id,
             df.id AS field_id, df.label, df.field_type, df.config, df.sequence
      FROM dynamic_sections ds
      LEFT JOIN dynamic_fields df ON df.section_id = ds.id
      WHERE ds.is_active = 1
      ORDER BY ds.sequence, ds.id, df.sequence
    `);

    // 2. Get this faculty's responses (not submission-scoped - linked by faculty_id)
    const [responses] = await db.query(
      `SELECT field_id, value FROM dynamic_responses WHERE faculty_id = ?`,
      [facultyId]
    );

    const respMap = {};
    responses.forEach(r => {
      try {
        respMap[r.field_id] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      } catch {
        respMap[r.field_id] = r.value;
      }
    });

    // Group rows into section -> fields structure
    const sectMap = {};
    sections.forEach(row => {
      if (!row.field_id) return; // section with no fields yet
      if (!sectMap[row.id]) {
        sectMap[row.id] = {
          section: { id: row.id, title: row.title, form_type: row.form_type, parent_id: row.parent_id },
          fields:  []
        };
      }
      sectMap[row.id].fields.push({
        id:         row.field_id,
        label:      row.label,
        field_type: row.field_type,
        config:     typeof row.config === 'string' ? JSON.parse(row.config || 'null') : (row.config || null)
      });
    });

    // Only include sections where at least one field has a response
    const result = [];
    Object.values(sectMap).forEach(({ section, fields }) => {
      const fieldsWithData = fields.filter(f => respMap[f.id] !== undefined && respMap[f.id] !== null);
      if (fieldsWithData.length > 0) {
        result.push({ section, fields: fieldsWithData, respMap });
      }
    });

    return result;
  } catch (err) {
    console.error('fetchDynamicData error:', err.message);
    return [];
  }
}

/* Error with an HTTP status, thrown while collecting a submission for the PDF. */
class PdfRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* Collects every section for one submission and renders the full-form HTML. */
const buildSubmissionHtml = async (id, user) => {
    const [subRows] = await db.query(`
      SELECT s.*, u.name AS faculty_name, u.department, u.email, u.designation,
             a.name AS approved_by_name
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN users a ON s.approved_by = a.id
      WHERE s.id = ?
    `, [id]);

    if (subRows.length === 0) {
      throw new PdfRequestError(404, 'Submission not found');
    }

    const sub = subRows[0];

    // Only owner or Dofa/admin can download
    if (user?.role === 'faculty' && Number(user.id) !== Number(sub.faculty_id)) {
      throw new PdfRequestError(403, 'Access denied.');
    }

    const fid = (await resolveFacultyInfoId({ facultyId: sub.faculty_id, email: sub.email }))
      || Number(sub.faculty_id);
    const yearNum = academicYearStart(sub.academic_year);
    const sid = sub.academic_year;

    // -- 2. Parallel data fetch --------------------------------------------
    const [
      facultyInfo, courses, publications, grants, patents, awards,
      newCourses, proposals, paperReviews, techTransfer,
      conferenceSessions, keynotesTalks, consultancy,
      teachingInnovation, institutionalContributions, goals,
      courseware, continuingEducation, otherActivities, researchPlan, teachingPlan,
      dynamicData
    ] = await Promise.all([
      db.query('SELECT * FROM faculty_information WHERE id = ?', [fid]).then(r => r[0][0] || {}),
      querySessionRows('courses_taught', fid, sid),
      // Session scope decides which publications belong here; the forms no longer collect a year.
      querySessionRows('research_publications', fid, sid),
      querySessionRows('research_grants', fid, sid),
      querySessionRows('patents', fid, sid),
      querySessionRows('awards_honours', fid, sid),
      querySessionRows('new_courses', fid, sid),
      querySessionRows('submitted_proposals', fid, sid),
      querySessionRows('paper_reviews', fid, sid),
      querySessionRows('technology_transfer', fid, sid),
      querySessionRows('conference_sessions', fid, sid),
      querySessionRows('keynotes_talks', fid, sid),
      querySessionRows('consultancy', fid, sid, 'year >= ?', [yearNum]),
      querySessionRows('teaching_innovation', fid, sid),
      querySessionRows('institutional_contributions', fid, sid),
      db.query('SELECT * FROM faculty_goals WHERE faculty_id = ? AND session_id = ?', [fid, sub.academic_year]).then(r => r[0] || []),
      fetchLegacySectionContent(sub.faculty_id, sub.academic_year, 'courseware'),
      fetchLegacySectionContent(sub.faculty_id, sub.academic_year, 'continuing_education'),
      fetchLegacySectionContent(sub.faculty_id, sub.academic_year, 'other_activities'),
      fetchLegacySectionContent(sub.faculty_id, sub.academic_year, 'research_plan'),
      fetchLegacySectionContent(sub.faculty_id, sub.academic_year, 'teaching_plan'),
      fetchDynamicData(sub.faculty_id)
    ]);

    // -- 3. Build HTML -----------------------------------------------------
    const html = generateHtml({
      submission: sub,
      facultyInfo, courses, publications, grants, patents, awards,
      newCourses, proposals, paperReviews, techTransfer,
      conferenceSessions, keynotesTalks, consultancy,
      teachingInnovation, institutionalContributions, goals,
      courseware, continuingEducation, otherActivities, researchPlan, teachingPlan,
      dynamicData   // custom sections from Form Builder
    });

    return { html, sub };
};

/* Prints HTML to an A4 landscape PDF with the standard confidential footer. */
const renderPdfBuffer = async (html, label) => {
  let browser;
  try {
    console.log(`[PDF] Launching browser for ${label}...`);
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Inject HTML directly (faster than navigating to a URL)
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format:           'A4',
      landscape:        true,
      printBackground:  true,
      margin:           { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate:  '<div></div>',
      footerTemplate: `
        <div style="font-family:Arial,sans-serif;font-size:8px;color:#94a3b8;width:100%;display:flex;justify-content:space-between;padding:0 12mm;box-sizing:border-box;">
          <span>LNMIIT Faculty Appraisal System &mdash; Confidential</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`
    });

    console.log(`[PDF] PDF generated for ${label}. Size: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

/* Sends a PDF buffer as a download. Keeps the header ASCII-safe (RFC 5987 for the real name). */
const sendPdf = (res, pdfBuffer, fileName) => {
  const asciiSafe = fileName.replace(/[\r\n"<>\\/\x00-\x1F\x7F]/g, '_').replace(/[^\x20-\x7E]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.end(pdfBuffer);
};

const logPdfFailure = (label, err, html) => {
  console.error('PDF generation error:', err);
  try {
    const fs = require('fs');
    const path = require('path');
    fs.appendFileSync(path.join(__dirname, '../pdf_error.log'), `
[${new Date().toISOString()}] ${label}
Error: ${err.stack}
`);
    if (html) fs.writeFileSync(path.join(__dirname, '../last_failed_pdf.html'), html);
  } catch (logErr) {
    console.error('Failed to write to PDF log file:', logErr);
  }
};

/* Main controller: GET /api/submissions/:id/pdf */
exports.generateSubmissionPdf = async (req, res) => {
  const { id } = req.params;
  let html;
  try {
    const built = await buildSubmissionHtml(id, req.user);
    html = built.html;
    const pdfBuffer = await renderPdfBuffer(html, `submission ${id}`);
    return sendPdf(res, pdfBuffer, `Appraisal_${built.sub.faculty_name || 'faculty'}_${built.sub.academic_year || 'report'}.pdf`);
  } catch (err) {
    if (err instanceof PdfRequestError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    logPdfFailure(`Submission ID: ${id}`, err, html);
    return res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
  }
};

/* POST /api/submissions/export/forms-pdf  { submission_ids: [..], filename? }
 * Several full forms in one PDF: same layout as the single-form download, each form starting on a new page. */
exports.generateBulkFormsPdf = async (req, res) => {
  const MAX_FORMS = 300;
  const ids = [...new Set((Array.isArray(req.body?.submission_ids) ? req.body.submission_ids : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0))];

  if (ids.length === 0) {
    return res.status(400).json({ success: false, message: 'submission_ids is required.' });
  }
  if (ids.length > MAX_FORMS) {
    return res.status(400).json({ success: false, message: `At most ${MAX_FORMS} forms can be exported at once.` });
  }

  let combined;
  try {
    const documents = [];
    for (const id of ids) {
      try {
        documents.push((await buildSubmissionHtml(id, req.user)).html);
      } catch (err) {
        if (!(err instanceof PdfRequestError)) throw err;
        console.warn(`[PDF] Skipping submission ${id}: ${err.message}`);
      }
    }
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching submissions found.' });
    }

    const bodyOf = (document) => (document.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [null, ''])[1];
    const bodies = documents.map((document, index) => (
      index === 0 ? bodyOf(document) : `<div style="page-break-before:always">${bodyOf(document)}</div>`
    ));
    combined = documents[0].replace(/<body[^>]*>[\s\S]*<\/body>/i, () => `<body>${bodies.join('\n')}</body>`);

    const pdfBuffer = await renderPdfBuffer(combined, `${documents.length} submissions`);
    const requestedName = typeof req.body?.filename === 'string' ? req.body.filename.trim() : '';
    return sendPdf(res, pdfBuffer, requestedName || 'Faculty_Forms.pdf');
  } catch (err) {
    logPdfFailure(`Bulk export of ${ids.length} submissions`, err, combined);
    return res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
  }
};
