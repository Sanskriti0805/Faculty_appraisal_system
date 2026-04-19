const db = require('../config/database');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');
const { getCurrentSessionWindow, appendCreatedAtWindow } = require('../utils/sessionScope');

let cachedConsultancyFileColumn = undefined;

const getConsultancyFileColumn = async () => {
    if (cachedConsultancyFileColumn !== undefined) {
        return cachedConsultancyFileColumn;
    }

    const [columns] = await db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'consultancy'
           AND COLUMN_NAME IN ('evidence_file', 'certificate_file')`
    );

    const columnNames = columns.map(col => col.COLUMN_NAME);
    if (columnNames.includes('evidence_file')) {
        cachedConsultancyFileColumn = 'evidence_file';
    } else if (columnNames.includes('certificate_file')) {
        cachedConsultancyFileColumn = 'certificate_file';
    } else {
        cachedConsultancyFileColumn = null;
    }

    return cachedConsultancyFileColumn;
};

exports.createConsultancy = async (req, res) => {
    try {
        const { faculty_id, organization, project_title, role, amount, duration, year, existing_evidence_file } = req.body;
        const facultyInfoId = await resolveFacultyInfoId({
            facultyId: faculty_id || req.user?.id,
            email: req.user?.email
        });

        if (!facultyInfoId) {
            return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);
        const normalizedAmount = amount === '' || amount === null || amount === undefined ? null : amount;
        const normalizedYear = year === '' || year === null || year === undefined ? null : year;
        const fileColumn = await getConsultancyFileColumn();

        let result;
        if (fileColumn) {
            const [insertResult] = await db.query(
                `INSERT INTO consultancy 
                (faculty_id, organization, project_title, role, amount, duration, year, ${fileColumn}) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [facultyInfoId, organization, project_title, role, normalizedAmount, duration, normalizedYear, evidence_file]
            );
            result = insertResult;
        } else {
            const [insertResult] = await db.query(
                `INSERT INTO consultancy 
                (faculty_id, organization, project_title, role, amount, duration, year) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [facultyInfoId, organization, project_title, role, normalizedAmount, duration, normalizedYear]
            );
            result = insertResult;
        }

        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getConsultancyByFaculty = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const facultyInfoId = await resolveFacultyInfoId({ facultyId });
        if (!facultyInfoId) {
            return res.json({ success: true, data: [] });
        }
        const sessionWindow = req.user?.role === 'faculty' ? await getCurrentSessionWindow(db) : null;
        const scoped = appendCreatedAtWindow(
            'SELECT * FROM consultancy WHERE faculty_id = ?',
            [facultyInfoId],
            sessionWindow
        );
        const fileColumn = await getConsultancyFileColumn();
        const [rows] = await db.query(
            `${scoped.sql} ORDER BY year DESC, created_at DESC`,
            scoped.params
        );

        const normalizedRows = rows.map((row) => ({
            ...row,
            evidence_file: fileColumn ? (row[fileColumn] || null) : null
        }));

        res.json({ success: true, data: normalizedRows });
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
