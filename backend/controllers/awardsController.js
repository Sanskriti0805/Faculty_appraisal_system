const db = require('../config/database');

// Create a new award
const createAward = async (req, res) => {
    try {
        const { faculty_id, honor_type, award_name, description } = req.body;
        const certificate_file = req.file ? req.file.filename : null;

        const [result] = await db.query(
            'INSERT INTO awards_honours (faculty_id, honor_type, award_name, description, certificate_file) VALUES (?, ?, ?, ?, ?)',
            [faculty_id, honor_type, award_name, description, certificate_file]
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

        const [awards] = await db.query(
            'SELECT * FROM awards_honours WHERE faculty_id = ? ORDER BY created_at DESC',
            [facultyId]
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

        await db.query('DELETE FROM awards_honours WHERE id = ?', [id]);

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
