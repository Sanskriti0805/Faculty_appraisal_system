const db = require('../config/database');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');

// --- Teaching Innovation ---

exports.createTeachingInnovation = async (req, res) => {
    try {
        const { faculty_id, description, impact } = req.body;
        const facultyInfoId = await resolveFacultyInfoId({
            facultyId: faculty_id || req.user?.id,
            email: req.user?.email
        });

        if (!facultyInfoId) {
            return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : null;

        const [result] = await db.query(
            `INSERT INTO teaching_innovation (faculty_id, description, impact, evidence_file) 
             VALUES (?, ?, ?, ?)`,
            [facultyInfoId, description, impact, evidence_file]
        );

        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTeachingInnovations = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const facultyInfoId = await resolveFacultyInfoId({ facultyId });
        if (!facultyInfoId) {
            return res.json({ success: true, data: [] });
        }
        const [rows] = await db.query(
            'SELECT * FROM teaching_innovation WHERE faculty_id = ? ORDER BY created_at DESC',
            [facultyInfoId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Institutional Contributions ---

exports.createInstitutionalContribution = async (req, res) => {
    try {
        const { faculty_id, contribution_type, title, description, year, existing_evidence_file } = req.body;
        const facultyInfoId = await resolveFacultyInfoId({
            facultyId: faculty_id || req.user?.id,
            email: req.user?.email
        });

        if (!facultyInfoId) {
            return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);

        let result;
        try {
            const [insertResult] = await db.query(
                `INSERT INTO institutional_contributions (faculty_id, contribution_type, title, description, year, evidence_file) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [facultyInfoId, contribution_type, title || null, description || null, year || new Date().getFullYear(), evidence_file]
            );
            result = insertResult;
        } catch (insertError) {
            // Backward compatibility for deployments where institutional_contributions
            // was created from older schema without evidence_file.
            if (insertError && (insertError.code === 'ER_BAD_FIELD_ERROR' || insertError.errno === 1054)) {
                console.warn('[institutional_contributions] evidence_file column missing; saving without evidence_file for backward compatibility.');
                const [insertResult] = await db.query(
                    `INSERT INTO institutional_contributions (faculty_id, contribution_type, title, description, year)
                     VALUES (?, ?, ?, ?, ?)`,
                    [facultyInfoId, contribution_type, title || null, description || null, year || new Date().getFullYear()]
                );
                result = insertResult;
            } else {
                throw insertError;
            }
        }

        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInstitutionalContributions = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const facultyInfoId = await resolveFacultyInfoId({ facultyId });
        if (!facultyInfoId) {
            return res.json({ success: true, data: [] });
        }
        const [rows] = await db.query(
            'SELECT * FROM institutional_contributions WHERE faculty_id = ? ORDER BY created_at DESC',
            [facultyInfoId]
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
