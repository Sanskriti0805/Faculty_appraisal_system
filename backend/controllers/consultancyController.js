const db = require('../config/database');

exports.createConsultancy = async (req, res) => {
    try {
        const { faculty_id, organization, project_title, role, amount, duration, year } = req.body;
        const evidence_file = req.file ? req.file.filename : null;

        const [result] = await db.query(
            `INSERT INTO consultancy 
            (faculty_id, organization, project_title, role, amount, duration, year, evidence_file) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [faculty_id, organization, project_title, role, amount, duration, year, evidence_file]
        );

        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getConsultancyByFaculty = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM consultancy WHERE faculty_id = ? ORDER BY year DESC, created_at DESC',
            [facultyId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteConsultancy = async (req, res) => {
    try {
        await db.query('DELETE FROM consultancy WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
