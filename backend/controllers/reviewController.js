const db = require('../config/database');

let reviewCommentsSchemaEnsured = false;

const normalizeSectionName = (value) => {
  const name = String(value || '').trim();
  return name || 'General';
};

const normalizeSectionKey = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (!key || key === 'general') return null;
  return key;
};

const ensureReviewCommentsSectionColumn = async () => {
  if (reviewCommentsSchemaEnsured) return;

  try {
    const [nameCols] = await db.query("SHOW COLUMNS FROM review_comments LIKE 'section_name'");
    if (nameCols.length === 0) {
      await db.query("ALTER TABLE review_comments ADD COLUMN section_name VARCHAR(255) NOT NULL DEFAULT 'General' AFTER reviewer_role");
    }

    const [keyCols] = await db.query("SHOW COLUMNS FROM review_comments LIKE 'section_key'");
    if (keyCols.length === 0) {
      await db.query("ALTER TABLE review_comments ADD COLUMN section_key VARCHAR(100) NULL AFTER section_name");
    }

    const [resolvedCols] = await db.query("SHOW COLUMNS FROM review_comments LIKE 'is_resolved'");
    if (resolvedCols.length === 0) {
      await db.query("ALTER TABLE review_comments ADD COLUMN is_resolved TINYINT(1) NOT NULL DEFAULT 0 AFTER comment");
    }

    const [resolvedAtCols] = await db.query("SHOW COLUMNS FROM review_comments LIKE 'resolved_at'");
    if (resolvedAtCols.length === 0) {
      await db.query("ALTER TABLE review_comments ADD COLUMN resolved_at TIMESTAMP NULL AFTER is_resolved");
    }

    const [resolvedVersionCols] = await db.query("SHOW COLUMNS FROM review_comments LIKE 'resolved_in_version'");
    if (resolvedVersionCols.length === 0) {
      await db.query("ALTER TABLE review_comments ADD COLUMN resolved_in_version INT NULL AFTER resolved_at");
    }

    reviewCommentsSchemaEnsured = true;
  } catch (error) {
    // Keep endpoint functional even if migration is managed externally.
    if (error && error.code !== 'ER_DUP_FIELDNAME') throw error;
    reviewCommentsSchemaEnsured = true;
  }
};

// Add review comment
exports.addComment = async (req, res) => {
  try {
    await ensureReviewCommentsSectionColumn();
    const { submission_id, reviewer_id, reviewer_role, comment, section_name, section_key } = req.body;
    const normalizedSection = normalizeSectionName(section_name);
    const normalizedSectionKey = normalizeSectionKey(section_key);

    const [result] = await db.query(
      `INSERT INTO review_comments
        (submission_id, reviewer_id, reviewer_role, section_name, section_key, comment, is_resolved, resolved_at, resolved_in_version)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL)`,
      [submission_id, reviewer_id, reviewer_role, normalizedSection, normalizedSectionKey, comment]
    );

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get comments for a submission
exports.getCommentsBySubmission = async (req, res) => {
  try {
    await ensureReviewCommentsSectionColumn();
    const { submissionId } = req.params;

    const [comments] = await db.query(`
      SELECT rc.*, COALESCE(NULLIF(rc.section_name, ''), 'General') as section_name,
             NULLIF(rc.section_key, '') as section_key, u.name as reviewer_name, u.designation
      FROM review_comments rc
      LEFT JOIN users u ON rc.reviewer_id = u.id
      WHERE rc.submission_id = ?
      ORDER BY rc.created_at DESC
    `, [submissionId]);

    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete comment (admin only)
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM review_comments WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
