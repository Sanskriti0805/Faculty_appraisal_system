const db = require('../config/database');

exports.getFormSchema = async (req, res) => {
    try {
        const [sections] = await db.query('SELECT * FROM dynamic_sections ORDER BY sequence, id ASC');
        const [fields] = await db.query('SELECT * FROM dynamic_fields ORDER BY sequence, id ASC');

        const schema = sections.map(s => ({
            ...s,
            fields: fields.filter(f => f.section_id === s.id)
        }));

        res.status(200).json({ success: true, data: schema });
    } catch (error) {
        console.error('Error fetching form schema:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

exports.createSection = async (req, res) => {
    try {
        const { title, form_type, sequence } = req.body;
        const [result] = await db.query(
            'INSERT INTO dynamic_sections (title, form_type, sequence) VALUES (?, ?, ?)',
            [title, form_type || 'A', sequence || 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, title, form_type, sequence } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, form_type, sequence, is_active } = req.body;
        await db.query(
            'UPDATE dynamic_sections SET title = ?, form_type = ?, sequence = ?, is_active = ? WHERE id = ?',
            [title, form_type, sequence, is_active, id]
        );
        res.status(200).json({ success: true, message: 'Section updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteSection = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM dynamic_sections WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Section deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createField = async (req, res) => {
    try {
        const { section_id, field_type, label, config, sequence, is_required } = req.body;
        const [result] = await db.query(
            'INSERT INTO dynamic_fields (section_id, field_type, label, config, sequence, is_required) VALUES (?, ?, ?, ?, ?, ?)',
            [section_id, field_type, label, JSON.stringify(config), sequence || 0, is_required || 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFieldOrder = async (req, res) => {
    try {
        const { section_id, field_ids } = req.body;
        const promises = field_ids.map((id, index) => 
            db.query('UPDATE dynamic_fields SET sequence = ? WHERE id = ? AND section_id = ?', [index, id, section_id])
        );
        await Promise.all(promises);
        res.status(200).json({ success: true, message: 'Order updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.saveResponses = async (req, res) => {
    try {
        const { faculty_id, submission_id, responses } = req.body; // responses: [{field_id, value}]
        
        for (const resp of responses) {
            await db.query(
                `INSERT INTO dynamic_responses (faculty_id, field_id, submission_id, value) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
                [faculty_id, resp.field_id, submission_id || null, JSON.stringify(resp.value)]
            );
        }
        res.status(200).json({ success: true, message: 'Responses saved' });
    } catch (error) {
        console.error('Error saving responses:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getResponses = async (req, res) => {
    try {
        const { faculty_id, submission_id } = req.query;
        let query = 'SELECT * FROM dynamic_responses WHERE faculty_id = ?';
        let params = [faculty_id];
        
        if (submission_id) {
            query += ' AND submission_id = ?';
            params.push(submission_id);
        }

        const [rows] = await db.query(query, params);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
