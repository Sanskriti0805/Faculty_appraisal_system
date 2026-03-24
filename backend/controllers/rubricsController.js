const db = require('../config/database');

// GET all rubrics
exports.getAllRubrics = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dofa_rubrics ORDER BY id ASC');
        res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error('Error fetching rubrics:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// POST create a new rubric
exports.createRubric = async (req, res) => {
    try {
        const { section_name, sub_section, max_marks, weightage, academic_year } = req.body;

        if (!section_name) {
            return res.status(400).json({ success: false, message: 'Section name is required' });
        }

        const query = `
            INSERT INTO dofa_rubrics (section_name, sub_section, max_marks, weightage, academic_year)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [section_name, sub_section, max_marks, weightage, academic_year];

        const [result] = await db.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Rubric created successfully',
            data: { id: result.insertId, section_name, sub_section, max_marks, weightage, academic_year }
        });
    } catch (error) {
        console.error('Error creating rubric:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// PUT update an existing rubric
exports.updateRubric = async (req, res) => {
    try {
        const { id } = req.params;
        const { section_name, sub_section, max_marks, weightage, academic_year } = req.body;

        if (!section_name) {
            return res.status(400).json({ success: false, message: 'Section name is required' });
        }

        const query = `
            UPDATE dofa_rubrics 
            SET section_name = ?, sub_section = ?, max_marks = ?, weightage = ?, academic_year = ?
            WHERE id = ?
        `;
        const values = [section_name, sub_section, max_marks, weightage, academic_year, id];

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rubric not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Rubric updated successfully'
        });
    } catch (error) {
        console.error('Error updating rubric:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// DELETE a rubric
exports.deleteRubric = async (req, res) => {
    try {
        const { id } = req.params;

        const query = 'DELETE FROM dofa_rubrics WHERE id = ?';
        const [result] = await db.query(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rubric not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Rubric deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting rubric:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
