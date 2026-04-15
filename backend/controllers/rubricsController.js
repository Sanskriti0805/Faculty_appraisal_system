const db = require('../config/database');
const { autoAllocateMarks } = require('../services/rubricMapper');

const normalizeScoringType = (value) => {
    const raw = String(value || 'manual').toLowerCase();
    if (raw === 'count-based') return 'count_based';
    if (raw === 'countbased') return 'count_based';
    if (raw === 'text-exists') return 'text_exists';
    if (raw === 'textexists') return 'text_exists';
    return raw;
};

const parseRuleConfig = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (_) {
        return null;
    }
};

const toRuleConfigDbValue = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') {
        try {
            JSON.parse(value);
            return value;
        } catch (_) {
            return null;
        }
    }
    return JSON.stringify(value);
};

// Recalculate scores for all submitted/approved forms
exports.recalculateScores = async (req, res) => {
    try {
        const query = `
            SELECT s.id, s.faculty_id, s.academic_year, u.name as faculty_name 
            FROM submissions s 
            JOIN users u ON s.faculty_id = u.id 
            WHERE s.status != 'draft'
        `;
        const [submissions] = await db.query(query);

        const affectedFaculties = [];

        for (const sub of submissions) {
            const success = await autoAllocateMarks(sub.id, sub.faculty_id, sub.academic_year);
            if (success) {
                if (!affectedFaculties.includes(sub.faculty_name)) {
                    affectedFaculties.push(sub.faculty_name);
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Scores recalculated successfully.',
            affectedFaculties
        });
    } catch (error) {
        console.error('Error recalculating scores:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// GET all rubrics
exports.getAllRubrics = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Dofa_rubrics ORDER BY id ASC');
        const data = rows.map((row) => ({
            ...row,
            rule_config: parseRuleConfig(row.rule_config)
        }));
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error('Error fetching rubrics:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// POST create a new rubric
exports.createRubric = async (req, res) => {
    try {
        const {
            section_name,
            sub_section,
            max_marks,
            weightage,
            academic_year,
            scoring_type,
            per_unit_marks,
            dynamic_section_id,
            data_source,
            rule_config
        } = req.body;

        if (!section_name) {
            return res.status(400).json({ success: false, message: 'Section name is required' });
        }

        const normalizedScoringType = normalizeScoringType(scoring_type);
        if (!['manual', 'legacy', 'rule', 'auto', 'count_based', 'text_exists'].includes(normalizedScoringType)) {
            return res.status(400).json({ success: false, message: 'Invalid scoring_type. Use manual, legacy, auto, rule, count_based, or text_exists.' });
        }

        const ruleConfigValue = toRuleConfigDbValue(rule_config);
        if (normalizedScoringType === 'rule' && !ruleConfigValue) {
            return res.status(400).json({ success: false, message: 'rule_config is required when scoring_type is rule.' });
        }

        const query = `
            INSERT INTO Dofa_rubrics 
              (section_name, sub_section, max_marks, weightage, academic_year, scoring_type, per_unit_marks, dynamic_section_id, data_source, rule_config)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            section_name, sub_section, max_marks, weightage, academic_year,
            normalizedScoringType,
            per_unit_marks || null,
            dynamic_section_id || null,
            data_source || null,
            ruleConfigValue
        ];

        const [result] = await db.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Rubric created successfully',
            data: {
                id: result.insertId,
                section_name,
                sub_section,
                max_marks,
                weightage,
                academic_year,
                scoring_type: normalizedScoringType,
                per_unit_marks: per_unit_marks || null,
                dynamic_section_id: dynamic_section_id || null,
                data_source: data_source || null,
                rule_config: parseRuleConfig(ruleConfigValue)
            }
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
        const {
            section_name,
            sub_section,
            max_marks,
            weightage,
            academic_year,
            scoring_type,
            per_unit_marks,
            dynamic_section_id,
            data_source,
            rule_config
        } = req.body;

        if (!section_name) {
            return res.status(400).json({ success: false, message: 'Section name is required' });
        }

        const normalizedScoringType = normalizeScoringType(scoring_type);
        if (!['manual', 'legacy', 'rule', 'auto', 'count_based', 'text_exists'].includes(normalizedScoringType)) {
            return res.status(400).json({ success: false, message: 'Invalid scoring_type. Use manual, legacy, auto, rule, count_based, or text_exists.' });
        }

        const ruleConfigValue = toRuleConfigDbValue(rule_config);
        if (normalizedScoringType === 'rule' && !ruleConfigValue) {
            return res.status(400).json({ success: false, message: 'rule_config is required when scoring_type is rule.' });
        }

        const query = `
            UPDATE Dofa_rubrics 
            SET section_name = ?, sub_section = ?, max_marks = ?, weightage = ?, academic_year = ?,
                scoring_type = ?, per_unit_marks = ?, dynamic_section_id = ?, data_source = ?, rule_config = ?
            WHERE id = ?
        `;
        const values = [
            section_name, sub_section, max_marks, weightage, academic_year,
            normalizedScoringType,
            per_unit_marks || null,
            dynamic_section_id || null,
            data_source || null,
            ruleConfigValue,
            id
        ];

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rubric not found' });
        }

        res.status(200).json({ success: true, message: 'Rubric updated successfully' });
    } catch (error) {
        console.error('Error updating rubric:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// DELETE a rubric
exports.deleteRubric = async (req, res) => {
    try {
        const { id } = req.params;

        const query = 'DELETE FROM Dofa_rubrics WHERE id = ?';
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

