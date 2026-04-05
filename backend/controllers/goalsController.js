const db = require('../config/database');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');

// Get goals by faculty
exports.getGoalsByFaculty = async (req, res) => {
    try {
        const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
        if (!facultyInfoId) {
            return res.json({ success: true, data: [] });
        }

        const [rows] = await db.query(
            'SELECT * FROM faculty_goals WHERE faculty_id = ? ORDER BY created_at DESC',
            [facultyInfoId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.saveGoals = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { faculty_id, goals } = req.body;

        const toText = (value) => (value === null || value === undefined ? '' : String(value));
        const isMeaningfulGoal = (goal = {}) => {
            const teaching = toText(goal.teaching).trim();
            const research = toText(goal.research).trim();
            const contribution = toText(goal.contribution).trim();
            const outreach = toText(goal.outreach).trim();
            const description = toText(goal.description).trim();
            return !!(teaching || research || contribution || outreach || description);
        };

        const facultyInfoId = await resolveFacultyInfoId({
            facultyId: faculty_id || req.user?.id,
            email: req.user?.email
        });

        if (!facultyInfoId) {
            throw new Error('Faculty profile not found. Complete onboarding first.');
        }

        // Delete existing goals for this faculty for a clean save (simple approach)
        await connection.query('DELETE FROM faculty_goals WHERE faculty_id = ?', [facultyInfoId]);

        // Insert new goals
        if (goals && Array.isArray(goals)) {
            const cleanedGoals = goals.filter(isMeaningfulGoal);
            for (const goal of cleanedGoals) {
                await connection.query(
                    `INSERT INTO faculty_goals 
          (faculty_id, semester, teaching, research, contribution, outreach, description) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        facultyInfoId,
                        goal.semester || null,
                        toText(goal.teaching).trim() || null,
                        toText(goal.research).trim() || null,
                        toText(goal.contribution).trim() || null,
                        toText(goal.outreach).trim() || null,
                        toText(goal.description).trim() || null
                    ]
                );
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Goals saved successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Failed to save goals:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};
