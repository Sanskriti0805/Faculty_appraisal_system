const db = require('../config/database');

// --- Teaching Innovation ---

exports.createTeachingInnovation = async (req, res) => {
    try {
        const { faculty_id, description, impact } = req.body;
        const evidence_file = req.file ? req.file.filename : null;

        const [result] = await db.query(
            `INSERT INTO teaching_innovation (faculty_id, description, impact, evidence_file) 
             VALUES (?, ?, ?, ?)`,
            [faculty_id, description, impact, evidence_file]
        );

        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTeachingInnovations = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM teaching_innovation WHERE faculty_id = ? ORDER BY created_at DESC',
            [facultyId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Institutional Contributions ---

exports.createInstitutionalContribution = async (req, res) => {
    try {
        const { faculty_id, contribution_type, description, year } = req.body;
        const evidence_file = req.file ? req.file.filename : null;

        const [result] = await db.query(
            `INSERT INTO institutional_contributions (faculty_id, contribution_type, description, year, evidence_file) 
             VALUES (?, ?, ?, ?, ?)`,
            [faculty_id, contribution_type, description, year || new Date().getFullYear(), evidence_file]
        );

        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInstitutionalContributions = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM institutional_contributions WHERE faculty_id = ? ORDER BY created_at DESC',
            [facultyId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete generic innovation/contribution (needs specific tables but for now keep it simple)
exports.deleteTeachingInnovation = async (req, res) => {
    try {
        await db.query('DELETE FROM teaching_innovation WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteInstitutionalContribution = async (req, res) => {
    try {
        await db.query('DELETE FROM institutional_contributions WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
