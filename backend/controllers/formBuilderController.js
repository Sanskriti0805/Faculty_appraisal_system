const db = require('../config/database');

/**
 * GET /form-builder/schema
 * Returns all sections (both forms) with their fields, nested by parent.
 */
exports.getFormSchema = async (req, res) => {
    try {
        const { form_type } = req.query;
        let sectionQuery = 'SELECT * FROM dynamic_sections ORDER BY sequence, id ASC';
        let sectionParams = [];

        if (form_type) {
            sectionQuery = 'SELECT * FROM dynamic_sections WHERE form_type = ? ORDER BY sequence, id ASC';
            sectionParams = [form_type];
        }

        const [sections] = await db.query(sectionQuery, sectionParams);
        const [fields] = await db.query('SELECT * FROM dynamic_fields ORDER BY sequence, id ASC');

        // Build a map for quick lookup
        const sectionMap = {};
        sections.forEach(s => {
            sectionMap[s.id] = { ...s, fields: fields.filter(f => f.section_id === s.id), children: [] };
        });

        // Nest children under parents
        const rootSections = [];
        sections.forEach(s => {
            if (s.parent_id && sectionMap[s.parent_id]) {
                sectionMap[s.parent_id].children.push(sectionMap[s.id]);
            } else {
                rootSections.push(sectionMap[s.id]);
            }
        });

        res.status(200).json({ success: true, data: rootSections });
    } catch (error) {
        console.error('Error fetching form schema:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * GET /form-builder/schema/flat
 * Returns all sections flat (for dropdowns in wizard).
 */
exports.getFormSchemaFlat = async (req, res) => {
    try {
        const { form_type } = req.query;
        let query = 'SELECT id, title, form_type, parent_id FROM dynamic_sections WHERE is_active = 1 ORDER BY form_type, sequence, id';
        let params = [];
        if (form_type) {
            query = 'SELECT id, title, form_type, parent_id FROM dynamic_sections WHERE is_active = 1 AND form_type = ? ORDER BY sequence, id';
            params = [form_type];
        }
        const [sections] = await db.query(query, params);
        res.status(200).json({ success: true, data: sections });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /form-builder/sections
 * Creates a new section. Supports parent_id for subsections.
 */
exports.createSection = async (req, res) => {
    try {
        const { title, form_type, sequence, parent_id, description } = req.body;
        const [result] = await db.query(
            'INSERT INTO dynamic_sections (title, form_type, sequence, parent_id, description) VALUES (?, ?, ?, ?, ?)',
            [title, form_type || 'A', sequence || 0, parent_id || null, description || null]
        );
        res.status(201).json({
            success: true,
            data: { id: result.insertId, title, form_type: form_type || 'A', sequence: sequence || 0, parent_id: parent_id || null, fields: [], children: [] }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /form-builder/sections/:id
 */
exports.updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, form_type, sequence, is_active, description } = req.body;
        await db.query(
            'UPDATE dynamic_sections SET title = ?, form_type = ?, sequence = ?, is_active = ?, description = ? WHERE id = ?',
            [title, form_type, sequence, is_active, description || null, id]
        );
        res.status(200).json({ success: true, message: 'Section updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /form-builder/sections/:id
 */
exports.deleteSection = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM dynamic_sections WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Section deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /form-builder/fields
 */
exports.createField = async (req, res) => {
    try {
        const { section_id, field_type, label, config, sequence, is_required } = req.body;
        const [result] = await db.query(
            'INSERT INTO dynamic_fields (section_id, field_type, label, config, sequence, is_required) VALUES (?, ?, ?, ?, ?, ?)',
            [section_id, field_type, label, JSON.stringify(config || {}), sequence || 0, is_required || 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, section_id, field_type, label, config: config || {}, sequence: sequence || 0 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /form-builder/fields/:id
 */
exports.deleteField = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM dynamic_fields WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Field deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /form-builder/fields/order
 */
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

/**
 * POST /form-builder/responses
 */
exports.saveResponses = async (req, res) => {
    try {
        const { faculty_id, submission_id, responses } = req.body;
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

/**
 * GET /form-builder/responses
 */
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
