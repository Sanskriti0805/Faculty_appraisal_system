const db = require('../config/database');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');
const { getCurrentSessionWindow, appendCreatedAtWindow } = require('../utils/sessionScope');

// Create a new award
const createAward = async (req, res) => {
    try {
        const { faculty_id, honor_type, award_name, description } = req.body;
        const sessionId = await getCurrentSessionWindow(db);
        const facultyInfoId = await resolveFacultyInfoId({
            facultyId: faculty_id || req.user?.id,
            email: req.user?.email
        });

        if (!facultyInfoId) {
            return res.status(400).json({ message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : null;

        const [result] = await db.query(
            'INSERT INTO awards_honours (faculty_id, session_id, honor_type, award_name, description, evidence_file) VALUES (?, ?, ?, ?, ?, ?)',
            [facultyInfoId, sessionId, honor_type, award_name, description, evidence_file]
        );

        res.status(201).json({
            message: 'Award created successfully',
            awardId: result.insertId
        });
    } catch (error) {
        console.error('Error creating award:', error);
        res.status(500).json({ message: 'Error creating award', error: error.message });
    }
};

// Get all awards for a faculty member
const getAwards = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const facultyInfoId = await resolveFacultyInfoId({ facultyId });
        if (!facultyInfoId) {
            return res.json([]);
        }

        const sessionWindow = await getCurrentSessionWindow(db);
        const scoped = appendCreatedAtWindow(
            'SELECT * FROM awards_honours WHERE faculty_id = ?',
            [facultyInfoId],
            sessionWindow
        );

        const [awards] = await db.query(
            `${scoped.sql} ORDER BY created_at DESC`,
            scoped.params
        );

        res.json(awards);
    } catch (error) {
        console.error('Error fetching awards:', error);
        res.status(500).json({ message: 'Error fetching awards', error: error.message });
    }
};

// Delete an award
const deleteAward = async (req, res) => {
    try {
        const { id } = req.params;
        const sessionId = await getCurrentSessionWindow(db);

        await db.query('DELETE FROM awards_honours WHERE id = ? AND session_id = ?', [id, sessionId]);

        res.json({ message: 'Award deleted successfully' });
    } catch (error) {
        console.error('Error deleting award:', error);
        res.status(500).json({ message: 'Error deleting award', error: error.message });
    }
};

module.exports = {
    createAward,
    getAwards,
    deleteAward
};
