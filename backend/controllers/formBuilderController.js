const db = require('../config/database');
const { getCurrentSessionWindow } = require('../utils/sessionScope');

let sectionSchemaCapabilities = null;

const getSectionSchemaCapabilities = async () => {
    if (sectionSchemaCapabilities) return sectionSchemaCapabilities;

    const [rows] = await db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dynamic_sections'`
    );

    const names = new Set(rows.map(r => r.COLUMN_NAME));
    sectionSchemaCapabilities = {
        hasParentId: names.has('parent_id'),
        hasDescription: names.has('description')
    };
    return sectionSchemaCapabilities;
};

const buildSectionSelect = ({ includeActiveOnly = false, formType = null } = {}, capabilities) => {
    const selectCols = ['id', 'title', 'form_type', 'sequence', 'is_active'];
    if (capabilities.hasParentId) {
        selectCols.push('parent_id');
    } else {
        selectCols.push('NULL AS parent_id');
    }
    if (capabilities.hasDescription) {
        selectCols.push('description');
    } else {
        selectCols.push('NULL AS description');
    }

    let query = `SELECT ${selectCols.join(', ')} FROM dynamic_sections`;
    const where = [];
    const params = [];

    if (includeActiveOnly) {
        where.push('is_active = 1');
    }
    if (formType) {
        where.push('form_type = ?');
        params.push(formType);
    }

    if (where.length > 0) {
        query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ' ORDER BY sequence, id ASC';
    return { query, params };
};

/**
 * GET /form-builder/schema
 * Returns all sections (both forms) with their fields, nested by parent.
 */
exports.getFormSchema = async (req, res) => {
    try {
        const { form_type } = req.query;
        const capabilities = await getSectionSchemaCapabilities();
        const { query: sectionQuery, params: sectionParams } = buildSectionSelect({ formType: form_type || null }, capabilities);

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
        const capabilities = await getSectionSchemaCapabilities();
        const selectCols = ['id', 'title', 'form_type'];
        if (capabilities.hasParentId) {
            selectCols.push('parent_id');
        } else {
            selectCols.push('NULL AS parent_id');
        }

        let query = `SELECT ${selectCols.join(', ')} FROM dynamic_sections WHERE is_active = 1`;
        const params = [];
        if (form_type) {
            query += ' AND form_type = ?';
            params.push(form_type);
        }
        query += form_type ? ' ORDER BY sequence, id' : ' ORDER BY form_type, sequence, id';

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
        const capabilities = await getSectionSchemaCapabilities();
        const { title, form_type, sequence, parent_id, description } = req.body;
        const columns = ['title', 'form_type', 'sequence'];
        const values = [title, form_type || 'A', sequence || 0];
        if (capabilities.hasParentId) {
            columns.push('parent_id');
            values.push(parent_id || null);
        }
        if (capabilities.hasDescription) {
            columns.push('description');
            values.push(description || null);
        }

        const placeholders = columns.map(() => '?').join(', ');
        const [result] = await db.query(
            `INSERT INTO dynamic_sections (${columns.join(', ')}) VALUES (${placeholders})`,
            values
        );
        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                title,
                form_type: form_type || 'A',
                sequence: sequence || 0,
                parent_id: capabilities.hasParentId ? (parent_id || null) : null,
                description: capabilities.hasDescription ? (description || null) : null,
                fields: [],
                children: []
            }
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
        const capabilities = await getSectionSchemaCapabilities();
        const { id } = req.params;
        const { title, form_type, sequence, is_active, description, parent_id } = req.body;

        const updates = ['title = ?', 'form_type = ?', 'sequence = ?', 'is_active = ?'];
        const params = [title, form_type, sequence, is_active];

        if (capabilities.hasDescription) {
            updates.push('description = ?');
            params.push(description || null);
        }
        if (capabilities.hasParentId) {
            updates.push('parent_id = ?');
            params.push(parent_id || null);
        }

        params.push(id);
        await db.query(
            `UPDATE dynamic_sections SET ${updates.join(', ')} WHERE id = ?`,
            params
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
        const sessionId = await getCurrentSessionWindow(db);
        for (const resp of responses) {
            await db.query(
                `INSERT INTO dynamic_responses (faculty_id, session_id, field_id, submission_id, value) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
                [faculty_id, sessionId, resp.field_id, submission_id || null, JSON.stringify(resp.value)]
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
        const sessionId = await getCurrentSessionWindow(db);
        let query = 'SELECT * FROM dynamic_responses WHERE faculty_id = ? AND session_id = ?';
        let params = [faculty_id, sessionId];
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
