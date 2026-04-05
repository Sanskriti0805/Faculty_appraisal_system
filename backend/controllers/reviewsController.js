const db = require('../config/database');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');

// Get all reviews for a faculty
exports.getReviewsByFaculty = async (req, res) => {
  try {
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
    if (!facultyInfoId) {
      return res.json({ success: true, data: [] });
    }

    const [rows] = await db.query(
      'SELECT * FROM paper_reviews WHERE faculty_id = ? ORDER BY created_at DESC',
      [facultyInfoId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create review
exports.createReview = async (req, res) => {
  try {
    const {
      faculty_id,
      review_type,
      journal_name,
      abbreviation,
      number_of_papers,
      first_name,
      middle_name,
      last_name,
      month_of_review
    } = req.body;

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }
    
    const [result] = await db.query(
      `INSERT INTO paper_reviews 
      (faculty_id, review_type, journal_name, abbreviation, number_of_papers, 
       first_name, middle_name, last_name, month_of_review) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyInfoId, review_type, journal_name, abbreviation, number_of_papers,
       first_name, middle_name, last_name, month_of_review]
    );

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM paper_reviews WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
