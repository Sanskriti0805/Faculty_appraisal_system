const db = require('../config/database');

// Add review comment
exports.addComment = async (req, res) => {
  try {
    const { submission_id, reviewer_id, reviewer_role, comment } = req.body;

    const [result] = await db.query(
      'INSERT INTO review_comments (submission_id, reviewer_id, reviewer_role, comment) VALUES (?, ?, ?, ?)',
      [submission_id, reviewer_id, reviewer_role, comment]
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
    const { submissionId } = req.params;

    const [comments] = await db.query(`
      SELECT rc.*, u.name as reviewer_name, u.designation
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
