const db = require('../config/database');

// Get all appraisal sessions
exports.getAllSessions = async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT s.*, u.name as created_by_name
      FROM appraisal_sessions s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current active session
exports.getCurrentSession = async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT * FROM appraisal_sessions
      WHERE status = 'open'
      AND CURRENT_DATE BETWEEN start_date AND end_date
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active session available'
      });
    }

    res.json({ success: true, data: sessions[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new session
exports.createSession = async (req, res) => {
  try {
    const { academic_year, start_date, end_date, status, created_by } = req.body;

    const [result] = await db.query(
      'INSERT INTO appraisal_sessions (academic_year, start_date, end_date, status, created_by) VALUES (?, ?, ?, ?, ?)',
      [academic_year, start_date, end_date, status, created_by]
    );

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update session
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { academic_year, start_date, end_date, status } = req.body;

    const [result] = await db.query(
      'UPDATE appraisal_sessions SET academic_year = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?',
      [academic_year, start_date, end_date, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, message: 'Session updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle session status
exports.toggleSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [result] = await db.query(
      'UPDATE appraisal_sessions SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      message: `Session ${status === 'open' ? 'opened' : 'closed'} successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
