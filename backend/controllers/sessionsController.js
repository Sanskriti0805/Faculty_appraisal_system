const db = require('../config/database');

// Get all appraisal sessions
exports.getAllSessions = async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT s.*, u.name as created_by_name
      FROM appraisal_sessions s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current active session (released and within deadline)
exports.getCurrentSession = async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT * FROM appraisal_sessions
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active session available'
      });
    }

    res.json({ success: true, data: sessions[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get active session with full release status info (for faculty dashboard)
exports.getActiveSession = async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT * FROM appraisal_sessions
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: null,
        released: false,
        message: 'No active appraisal session'
      });
    }

    const session = sessions[0];
    const now = new Date();
    const deadline = session.deadline ? new Date(session.deadline) : null;
    // Set deadline to end of day
    if (deadline) deadline.setHours(23, 59, 59, 999);

    const isReleased = session.is_released === 1;
    const isPastDeadline = deadline && now > deadline;

    // If past deadline and still marked released, auto-close
    if (isPastDeadline && isReleased) {
      await db.query(
        'UPDATE appraisal_sessions SET is_released = 0 WHERE id = ?',
        [session.id]
      );
      session.is_released = 0;
    }

    res.json({
      success: true,
      data: session,
      released: isReleased && !isPastDeadline,
      pastDeadline: isPastDeadline,
      message: isPastDeadline
        ? 'The submission deadline has passed. Please try again next time.'
        : !isReleased
          ? 'Appraisal forms have not been released yet. Please check back later.'
          : 'Forms are available for submission.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new session
exports.createSession = async (req, res) => {
  try {
    const { academic_year, start_date, end_date, deadline, status, created_by, reminder_days, reminder_time } = req.body;

    // Check for existing open session
    const [existing] = await db.query(
      'SELECT id FROM appraisal_sessions WHERE status = \'open\''
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active session. Please close it before creating a new one.'
      });
    }

    // Auto-set end_date = deadline if end_date not provided
    const finalEndDate = end_date || deadline;

    const [result] = await db.query(
      'INSERT INTO appraisal_sessions (academic_year, start_date, end_date, deadline, status, created_by, reminder_days, reminder_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [academic_year, start_date, finalEndDate, deadline || finalEndDate, status || 'open', created_by, reminder_days || 2, reminder_time || '08:00:00']
    );

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update session
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { academic_year, start_date, end_date, deadline, status, reminder_days, reminder_time } = req.body;

    // Auto-set end_date = deadline if end_date not provided
    const finalEndDate = end_date || deadline;

    const [result] = await db.query(
      'UPDATE appraisal_sessions SET academic_year = ?, start_date = ?, end_date = ?, deadline = ?, status = ?, reminder_days = ?, reminder_time = ? WHERE id = ?',
      [academic_year, start_date, finalEndDate, deadline || finalEndDate, status, reminder_days || 2, reminder_time || '08:00:00', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, message: 'Session updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle session status
exports.toggleSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // If closing, also un-release the forms
    const extraFields = status === 'closed' ? ', is_released = 0, scheduled_release = NULL' : '';

    const [result] = await db.query(
      `UPDATE appraisal_sessions SET status = ?${extraFields} WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      message: `Session ${status === 'open' ? 'opened' : 'closed'} successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Form Release Endpoints ──────────────────────────────────────────────

const emailService = require('../services/emailService');

/**
 * Release forms immediately
 * POST /api/sessions/release
 */
exports.releaseFormsNow = async (req, res) => {
  try {
    const { session_id } = req.body;

    // Validate the session exists and is open
    const [sessions] = await db.query('SELECT * FROM appraisal_sessions WHERE id = ?', [session_id]);
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessions[0];
    if (session.is_released) {
      return res.status(400).json({ success: false, message: 'Forms are already released for this session.' });
    }

    const now = new Date();

    // Update session: mark as released
    await db.query(
      `UPDATE appraisal_sessions 
       SET is_released = 1, release_date = ?, scheduled_release = NULL, status = 'open' 
       WHERE id = ?`,
      [now, session_id]
    );

    // Send release notification emails to all faculty
    try {
      await sendReleaseEmails(session);
      await db.query('UPDATE appraisal_sessions SET release_email_sent = 1 WHERE id = ?', [session_id]);
    } catch (emailErr) {
      console.error('Error sending release emails:', emailErr.message);
      // Don't fail the release just because emails failed
    }

    res.json({
      success: true,
      message: 'Forms released successfully! Notification emails are being sent to all faculty.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Schedule form release for a future date/time
 * POST /api/sessions/schedule
 */
exports.scheduleRelease = async (req, res) => {
  try {
    const { session_id, scheduled_date } = req.body;

    if (!scheduled_date) {
      return res.status(400).json({ success: false, message: 'Scheduled date is required.' });
    }

    const schedDate = new Date(scheduled_date);
    if (schedDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'Scheduled date must be in the future.' });
    }

    const [sessions] = await db.query('SELECT * FROM appraisal_sessions WHERE id = ?', [session_id]);
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (sessions[0].is_released) {
      return res.status(400).json({ success: false, message: 'Forms are already released.' });
    }

    await db.query(
      'UPDATE appraisal_sessions SET scheduled_release = ?, status = \'open\' WHERE id = ?',
      [schedDate, session_id]
    );

    res.json({
      success: true,
      message: `Form release scheduled for ${schedDate.toLocaleString()}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel a scheduled release
 * POST /api/sessions/cancel-schedule
 */
exports.cancelSchedule = async (req, res) => {
  try {
    const { session_id } = req.body;

    await db.query(
      'UPDATE appraisal_sessions SET scheduled_release = NULL WHERE id = ?',
      [session_id]
    );

    res.json({
      success: true,
      message: 'Scheduled release has been cancelled.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Un-release forms (close access)
 * POST /api/sessions/unrelease
 */
exports.unreleaseForms = async (req, res) => {
  try {
    const { session_id } = req.body;

    await db.query(
      'UPDATE appraisal_sessions SET is_released = 0 WHERE id = ?',
      [session_id]
    );

    res.json({
      success: true,
      message: 'Forms access has been closed.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: Send Release Notification Emails ─────────────────────────────

async function sendReleaseEmails(session) {
  // Get all faculty users
  const [faculty] = await db.query(
    "SELECT id, name, email FROM users WHERE role = 'faculty'"
  );

  if (faculty.length === 0) {
    console.log('No faculty members found to notify.');
    return;
  }

  const deadlineStr = session.deadline
    ? new Date(session.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'TBD';

  console.log(`📧 Sending release notification to ${faculty.length} faculty members...`);

  for (const member of faculty) {
    try {
      await emailService.sendFormReleaseNotification({
        to: member.email,
        name: member.name,
        academicYear: session.academic_year,
        deadline: deadlineStr
      });
    } catch (err) {
      console.error(`  ❌ Failed to email ${member.email}: ${err.message}`);
    }
  }

  console.log('📧 Release notification emails sent.');
}

// Exported for use by scheduler
exports.sendReleaseEmails = sendReleaseEmails;

/**
 * Extend deadline for current session
 * PUT /api/sessions/:id/extend-deadline
 */
exports.extendDeadline = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDeadline } = req.body;

    if (!newDeadline) {
      return res.status(400).json({ success: false, message: 'New deadline is required.' });
    }

    const newDate = new Date(newDeadline);
    
    // Get the session
    const [sessions] = await db.query('SELECT * FROM appraisal_sessions WHERE id = ?', [id]);
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessions[0];
    const currentDeadline = session.deadline ? new Date(session.deadline) : null;

    // Validate new deadline is after current deadline
    if (currentDeadline && newDate <= currentDeadline) {
      return res.status(400).json({
        success: false,
        message: 'New deadline must be after the current deadline.'
      });
    }

    // Set original_deadline on first extension
    const originalDeadline = session.original_deadline || session.deadline;
    
    // Format dates for email
    const oldDeadlineStr = currentDeadline
      ? currentDeadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'N/A';
    
    const newDeadlineStr = newDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // Convert dates to MySQL DATE format (YYYY-MM-DD)
    const newDateStr = newDate.toISOString().split('T')[0];
    const originalDeadlineStr = originalDeadline instanceof Date 
      ? originalDeadline.toISOString().split('T')[0]
      : originalDeadline;

    // Update session - be resilient if migration not applied (missing columns)
    try {
      await db.query(
        `UPDATE appraisal_sessions 
         SET deadline = ?, 
             original_deadline = ?, 
             deadline_extension_count = deadline_extension_count + 1, 
             last_extended_at = NOW(),
             is_released = 1,
             reminder_sent = 0
         WHERE id = ?`,
        [newDateStr, originalDeadlineStr, id]
      );
    } catch (err) {
      // If columns are missing (Unknown column ... in 'field list'), try to add them and retry
      if (err && /Unknown column 'original_deadline' in 'field list'/.test(err.message)) {
        try {
          await db.query(`ALTER TABLE appraisal_sessions ADD COLUMN IF NOT EXISTS original_deadline DATE DEFAULT NULL`);
          await db.query(`ALTER TABLE appraisal_sessions ADD COLUMN IF NOT EXISTS deadline_extension_count INT DEFAULT 0`);
          await db.query(`ALTER TABLE appraisal_sessions ADD COLUMN IF NOT EXISTS last_extended_at TIMESTAMP NULL DEFAULT NULL`);

          // Retry update
          await db.query(
            `UPDATE appraisal_sessions 
             SET deadline = ?, 
                 original_deadline = ?, 
                 deadline_extension_count = deadline_extension_count + 1, 
                 last_extended_at = NOW(),
                 is_released = 1,
                 reminder_sent = 0
             WHERE id = ?`,
            [newDateStr, originalDeadlineStr, id]
          );
        } catch (innerErr) {
          console.error('Failed to add missing columns and retry update:', innerErr.message);
          return res.status(500).json({ success: false, message: innerErr.message });
        }
      } else {
        throw err;
      }
    }

    // Send notification emails to all faculty
    try {
      const [faculty] = await db.query(
        "SELECT id, name, email FROM users WHERE role = 'faculty'"
      );

      if (faculty.length > 0) {
        console.log(`📧 Sending deadline extension notification to ${faculty.length} faculty members...`);

        for (const member of faculty) {
          try {
            await emailService.sendDeadlineExtensionNotification({
              to: member.email,
              name: member.name,
              academicYear: session.academic_year,
              oldDeadline: oldDeadlineStr,
              newDeadline: newDeadlineStr
            });
          } catch (err) {
            console.error(`  ❌ Failed to email ${member.email}: ${err.message}`);
          }
        }

        console.log('📧 Deadline extension notification emails sent.');
      }
    } catch (emailErr) {
      console.error('Error sending extension emails:', emailErr.message);
      // Don't fail the extension just because emails failed
    }

    res.json({
      success: true,
      message: `Deadline extended to ${newDeadlineStr}. Notification emails are being sent to all faculty.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
