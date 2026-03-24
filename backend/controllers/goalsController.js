const db = require('../config/database');

// Get goals by faculty
exports.getGoalsByFaculty = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM faculty_goals WHERE faculty_id = ? ORDER BY created_at DESC',
            [req.params.facultyId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create or update goals
exports.saveGoals = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { faculty_id, goals } = req.body;

        // Delete existing goals for this faculty for a clean save (simple approach)
        await connection.query('DELETE FROM faculty_goals WHERE faculty_id = ?', [faculty_id]);

        // Insert new goals
        if (goals && Array.isArray(goals)) {
            for (const goal of goals) {
                await connection.query(
                    `INSERT INTO faculty_goals 
          (faculty_id, semester, teaching, research, contribution, outreach, description) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [faculty_id, goal.semester, goal.teaching, goal.research, goal.contribution, goal.outreach, goal.description]
                );
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Goals saved successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};
