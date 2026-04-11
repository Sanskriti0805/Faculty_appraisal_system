const db = require('../config/database');
const emailService = require('../services/emailService');

// Section labels for display/email
const SECTION_LABELS = {
  faculty_info: 'Faculty Information',
  courses_taught: 'Courses Taught',
  new_courses: 'New Courses Developed',
  courseware: 'Courseware',
  teaching_innovation: 'Teaching Innovation',
  research_publications: 'Research Publications',
  research_grants: 'Research Grants',
  patents: 'Patents',
  technology_transfer: 'Technology Transfer',
  paper_review: 'Paper Review',
  conference_sessions: 'Conference Sessions',
  keynotes_talks: 'Keynotes & Invited Talks',
  conferences_outside: 'Conferences Outside',
  awards_honours: 'Awards & Honours',
  consultancy: 'Consultancy',
  continuing_education: 'Continuing Education',
  institutional_contributions: 'Institutional Contributions',
  other_activities: 'Other Activities',
  research_plan: 'Research Plan',
  teaching_plan: 'Teaching Plan',
  part_b: 'Part B (Goal Setting)',
};

const resolveSectionLabels = async (sections = []) => {
  const list = Array.isArray(sections) ? sections : [];
  const dynamicIds = list
    .map((s) => String(s || '').match(/^dynamic_section_(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .filter(Number.isFinite);

  const dynamicMap = new Map();
  if (dynamicIds.length > 0) {
    const uniqueIds = Array.from(new Set(dynamicIds));
    const placeholders = uniqueIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT id, title FROM dynamic_sections WHERE id IN (${placeholders})`,
      uniqueIds
    );
    rows.forEach((row) => {
      dynamicMap.set(`dynamic_section_${row.id}`, row.title || `Dynamic Section ${row.id}`);
    });
  }

  return list.map((s) => SECTION_LABELS[s] || dynamicMap.get(s) || s);
};

/**
 * POST /api/edit-requests
 * Faculty submits an edit request for specific sections
 */
exports.createEditRequest = async (req, res) => {
  try {
    const { submission_id, requested_sections, request_message } = req.body;
    const facultyId = req.user.id;

    if (!submission_id || !requested_sections || !Array.isArray(requested_sections) || requested_sections.length === 0) {
      return res.status(400).json({ success: false, message: 'submission_id and at least one requested_section are required.' });
    }

    // Verify the submission belongs to this faculty
    const [submissions] = await db.query(
      'SELECT s.*, u.name as faculty_name, u.email as faculty_email FROM submissions s JOIN users u ON s.faculty_id = u.id WHERE s.id = ? AND s.faculty_id = ?',
      [submission_id, facultyId]
    );

    if (submissions.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found or not yours.' });
    }

    const submission = submissions[0];

    // Check deadline has not passed
    const [sessions] = await db.query(
      'SELECT * FROM appraisal_sessions WHERE academic_year = ? AND status = ? ORDER BY id DESC LIMIT 1',
      [submission.academic_year, 'open']
    );

    if (sessions.length > 0) {
      const deadline = sessions[0].deadline ? new Date(sessions[0].deadline) : null;
      if (deadline) {
        deadline.setHours(23, 59, 59, 999);
        if (new Date() > deadline) {
          return res.status(403).json({
            success: false,
            message: 'The submission deadline has passed. You can no longer request changes.'
          });
        }
      }
    }

    // Check if there's already a pending request for this submission
    const [existing] = await db.query(
      "SELECT id FROM edit_requests WHERE submission_id = ? AND status = 'pending'",
      [submission_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending edit request for this submission. Please wait for DOFA to review it.'
      });
    }

    // Insert the request
    const [result] = await db.query(
      'INSERT INTO edit_requests (submission_id, faculty_id, requested_sections, request_message) VALUES (?, ?, ?, ?)',
      [submission_id, facultyId, JSON.stringify(requested_sections), request_message || null]
    );

    // Send email to DOFA
    try {
      const sectionLabels = await resolveSectionLabels(requested_sections);
      await emailService.sendEditRequestNotificationToDOFA({
        facultyName: submission.faculty_name,
        facultyEmail: submission.faculty_email,
        academicYear: submission.academic_year,
        sections: sectionLabels,
        requestMessage: request_message,
        requestId: result.insertId,
      });
    } catch (emailErr) {
      console.error('Failed to send edit request email to DOFA:', emailErr.message);
      // Don't fail—just log
    }

    res.status(201).json({
      success: true,
      message: 'Edit request submitted successfully. DOFA has been notified via email.',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('createEditRequest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/edit-requests
 * DOFA: get all edit requests (optionally filtered by status)
 * Faculty: get their own edit requests
 */
exports.getEditRequests = async (req, res) => {
  try {
    const user = req.user;
    const { status, submission_id } = req.query;

    let query = `
      SELECT er.*, 
             u.name as faculty_name, u.email as faculty_email, u.department,
             sub.academic_year, sub.status as submission_status,
             rv.name as reviewed_by_name
      FROM edit_requests er
      JOIN users u ON er.faculty_id = u.id
      JOIN submissions sub ON er.submission_id = sub.id
      LEFT JOIN users rv ON er.reviewed_by = rv.id
      WHERE 1=1
    `;
    const params = [];

    // Faculty can only see their own
    if (user.role === 'faculty') {
      query += ' AND er.faculty_id = ?';
      params.push(user.id);
    }

    if (status) {
      query += ' AND er.status = ?';
      params.push(status);
    }

    if (submission_id) {
      query += ' AND er.submission_id = ?';
      params.push(submission_id);
    }

    query += ' ORDER BY er.created_at DESC';

    const [rows] = await db.query(query, params);

    // Parse JSON fields
    const data = rows.map(r => ({
      ...r,
      requested_sections: typeof r.requested_sections === 'string' ? JSON.parse(r.requested_sections) : r.requested_sections,
      approved_sections: r.approved_sections
        ? (typeof r.approved_sections === 'string' ? JSON.parse(r.approved_sections) : r.approved_sections)
        : null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getEditRequests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/edit-requests/my-submission/:submissionId
 * Faculty: get edit requests for a specific submission (with approved sections)
 */
exports.getRequestsForSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const facultyId = req.user.id;

    const [rows] = await db.query(
      `SELECT er.*, rv.name as reviewed_by_name
       FROM edit_requests er
       LEFT JOIN users rv ON er.reviewed_by = rv.id
       WHERE er.submission_id = ? AND er.faculty_id = ?
       ORDER BY er.created_at DESC`,
      [submissionId, facultyId]
    );

    const data = rows.map(r => ({
      ...r,
      requested_sections: typeof r.requested_sections === 'string' ? JSON.parse(r.requested_sections) : r.requested_sections,
      approved_sections: r.approved_sections
        ? (typeof r.approved_sections === 'string' ? JSON.parse(r.approved_sections) : r.approved_sections)
        : null,
    }));

    // Compute currently unlocked sections (from latest approved request)
    const approvedReq = data.find(r => r.status === 'approved');
    const unlockedSections = approvedReq ? approvedReq.approved_sections || [] : [];

    res.json({ success: true, data, unlockedSections });
  } catch (error) {
    console.error('getRequestsForSubmission error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/edit-requests/:id/review
 * DOFA: approve or deny an edit request, specify which sections are approved
 */
exports.reviewEditRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_sections, dofa_note } = req.body;
    const reviewedBy = req.user.id;

    // Only DOFA/dofa_office can review
    if (!['dofa', 'dofa_office'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only DOFA office staff can review edit requests.' });
    }

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "approved" or "denied".' });
    }

    if (status === 'approved' && (!approved_sections || !Array.isArray(approved_sections) || approved_sections.length === 0)) {
      return res.status(400).json({ success: false, message: 'You must select at least one section to approve.' });
    }

    // Get the request
    const [requests] = await db.query(
      `SELECT er.*, u.name as faculty_name, u.email as faculty_email, sub.academic_year
       FROM edit_requests er
       JOIN users u ON er.faculty_id = u.id
       JOIN submissions sub ON er.submission_id = sub.id
       WHERE er.id = ?`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Edit request not found.' });
    }

    const editRequest = requests[0];

    // Update the request
    await db.query(
      `UPDATE edit_requests SET status = ?, approved_sections = ?, dofa_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, status === 'approved' ? JSON.stringify(approved_sections) : null, dofa_note || null, reviewedBy, id]
    );

    // If approved, update submission status back to 'sent_back' / unlocked for editing
    if (status === 'approved') {
      await db.query(
        "UPDATE submissions SET status = 'sent_back' WHERE id = ?",
        [editRequest.submission_id]
      );

      // Send approval email to faculty
      try {
        const sectionLabels = await resolveSectionLabels(approved_sections);
        await emailService.sendEditRequestApprovedToFaculty({
          to: editRequest.faculty_email,
          facultyName: editRequest.faculty_name,
          academicYear: editRequest.academic_year,
          approvedSections: sectionLabels,
          dofaNote: dofa_note,
        });
      } catch (emailErr) {
        console.error('Failed to send approval email to faculty:', emailErr.message);
      }
    } else {
      // Denied — notify faculty
      try {
        await emailService.sendEditRequestDeniedToFaculty({
          to: editRequest.faculty_email,
          facultyName: editRequest.faculty_name,
          academicYear: editRequest.academic_year,
          dofaNote: dofa_note,
        });
      } catch (emailErr) {
        console.error('Failed to send denial email to faculty:', emailErr.message);
      }
    }

    res.json({
      success: true,
      message: status === 'approved'
        ? 'Edit request approved. Faculty has been notified and selected sections are now unlocked.'
        : 'Edit request denied. Faculty has been notified.'
    });
  } catch (error) {
    console.error('reviewEditRequest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/edit-requests/pending-count
 * DOFA: get count of pending edit requests (for dashboard badge)
 */
exports.getPendingCount = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) as count FROM edit_requests WHERE status = 'pending'"
    );
    res.json({ success: true, count: rows[0].count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
