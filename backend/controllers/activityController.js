const db = require('../config/database');

// --- Paper Reviews ---
exports.createPaperReview = async (req, res) => {
    try {
        const { faculty_id, journal_name, review_type, tier, number_of_papers, month_of_review } = req.body;
        const evidence_file = req.file ? req.file.filename : null;
        const [result] = await db.query(
            `INSERT INTO paper_reviews (faculty_id, journal_name, review_type, tier, number_of_papers, month_of_review, evidence_file) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [faculty_id, journal_name, review_type, tier, number_of_papers, month_of_review, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Technology Transfer ---
exports.createTechTransfer = async (req, res) => {
    try {
        const { faculty_id, title, agency, date } = req.body;
        const evidence_file = req.file ? req.file.filename : null;
        const [result] = await db.query(
            `INSERT INTO technology_transfer (faculty_id, title, agency, date, evidence_file) 
             VALUES (?, ?, ?, ?, ?)`,
            [faculty_id, title, agency, date, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Conference Sessions ---
exports.createConferenceSession = async (req, res) => {
    try {
        const { faculty_id, conference_name, session_title, role, location } = req.body;
        const evidence_file = req.file ? req.file.filename : null;
        const [result] = await db.query(
            `INSERT INTO conference_sessions (faculty_id, conference_name, session_title, role, location, evidence_file) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [faculty_id, conference_name, session_title, role, location, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Keynotes & Talks ---
exports.createKeynoteTalk = async (req, res) => {
    try {
        const { faculty_id, event_name, title, event_type, audience_type } = req.body;
        const evidence_file = req.file ? req.file.filename : null;
        const [result] = await db.query(
            `INSERT INTO keynotes_talks (faculty_id, event_name, title, event_type, audience_type, evidence_file) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [faculty_id, event_name, title, event_type, audience_type, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
