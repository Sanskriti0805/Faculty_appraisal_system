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

/* -- helpers copied from submissionsController -- */
async function fetchLegacySectionContent(facultyId, academicYear, sectionKey) {
  const [rows] = await db.query(
    `SELECT content_json FROM legacy_section_entries
     WHERE faculty_id = ? AND section_key = ? AND academic_year = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [facultyId, sectionKey, academicYear]
  );
  if (rows.length > 0) return rows[0].content_json || null;

  const [fallback] = await db.query(
    `SELECT content_json FROM legacy_section_entries
     WHERE faculty_id = ? AND section_key = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [facultyId, sectionKey]
  );
  return fallback.length > 0 ? fallback[0].content_json || null : null;
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN CONTROLLER
   GET /api/submissions/:id/pdf
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
exports.generateSubmissionPdf = async (req, res) => {
  const { id } = req.params;

  // -- 1. Auth / fetch submission ------------------------------------------
  try {
    const [subRows] = await db.query(`
      SELECT s.*, u.name AS faculty_name, u.department, u.email, u.designation,
             a.name AS approved_by_name
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN users a ON s.approved_by = a.id
      WHERE s.id = ?
    `, [id]);

    if (subRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sub = subRows[0];

    // Only owner or Dofa/admin can download
    if (req.user?.role === 'faculty' && Number(req.user.id) !== Number(sub.faculty_id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const fid = (await resolveFacultyInfoId({ facultyId: sub.faculty_id, email: sub.email }))
      || Number(sub.faculty_id);
    const yearNum = (sub.academic_year || '').split('-')[0];

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
      db.query('SELECT * FROM courses_taught WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM research_publications WHERE faculty_id = ? AND year_of_publication >= ?', [fid, yearNum]).then(r => r[0] || []),
      db.query('SELECT * FROM research_grants WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM patents WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM awards_honours WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM new_courses WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM submitted_proposals WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM paper_reviews WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM technology_transfer WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM conference_sessions WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM keynotes_talks WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM consultancy WHERE faculty_id = ? AND year >= ?', [fid, yearNum]).then(r => r[0] || []),
      db.query('SELECT * FROM teaching_innovation WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM institutional_contributions WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
      db.query('SELECT * FROM faculty_goals WHERE faculty_id = ?', [fid]).then(r => r[0] || []),
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
      dynamicData   // â† custom sections from Form Builder
    });

    // -- 4. Launch Puppeteer -> PDF -----------------------------------------
    let browser;
    try {
      console.log(`[PDF] Launching browser for submission ${id}...`);
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
      console.log(`[PDF] Setting content for submission ${id}...`);
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });

      console.log(`[PDF] Generating PDF for submission ${id}...`);
      const pdfBuffer = await page.pdf({
        format:           'A4',
        printBackground:  true,
        margin:           { top: '15mm', bottom: '22mm', left: '12mm', right: '12mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size:8px;color:#94a3b8;width:100%;text-align:center;padding:0 20mm;">
            LNMIIT Faculty Appraisal &mdash; Confidential &mdash;
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>`
      });

      await browser.close();
      browser = null;
      console.log(`[PDF] PDF generated successfully for submission ${id}. Size: ${pdfBuffer.length} bytes`);

      // -- 5. Stream the PDF back ----------------------------------------
      const safeName = (sub.faculty_name || 'faculty').replace(/[^a-zA-Z0-9]/g, '_');
      const filename  = `Appraisal_${safeName}_${sub.academic_year || 'report'}.pdf`;

      res.set({
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      pdfBuffer.length
      });
      return res.end(pdfBuffer);

    } finally {
      if (browser) await browser.close().catch(() => {});
    }

  } catch (err) {
    console.error('PDF generation error:', err);
    try {
      const fs = require('fs');
      const logPath = require('path').join(__dirname, '../pdf_error.log');
      const timestamp = new Date().toISOString();
      const logEntry = `\n[${timestamp}] Submission ID: ${id}\nError: ${err.stack}\n`;
      fs.appendFileSync(logPath, logEntry);
      
      // Also dump the HTML if it was generated
      if (typeof html !== 'undefined') {
        fs.writeFileSync(require('path').join(__dirname, '../last_failed_pdf.html'), html);
      }
    } catch (logErr) {
      console.error('Failed to write to PDF log file:', logErr);
    }
    return res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
  }
};

