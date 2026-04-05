/**
 * Scheduler Service — runs periodic cron jobs for:
 *  1. Auto-releasing forms at scheduled times (every minute check)
 *  2. Sending deadline reminder emails (2 days before — daily check at 8:00 AM)
 *  3. Auto-closing sessions past deadline
 */
const cron = require('node-cron');
const db = require('../config/database');
const emailService = require('./emailService');

class SchedulerService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.initialized) return;
    this.initialized = true;

    console.log('⏰ Scheduler service started');

    // Job 1: Check every minute for scheduled releases
    cron.schedule('* * * * *', () => {
      this.checkScheduledReleases().catch(err =>
        console.error('Scheduler error (releases):', err.message)
      );
    });

    // Job 2: Check every minute for deadline reminders (configurable time)
    cron.schedule('* * * * *', () => {
      this.checkDeadlineReminders().catch(err =>
        console.error('Scheduler error (reminders):', err.message)
      );
    });

    // Job 3: Check every hour for expired sessions
    cron.schedule('0 * * * *', () => {
      this.checkExpiredSessions().catch(err =>
        console.error('Scheduler error (expired):', err.message)
      );
    });
  }

  /**
   * Job 1: Auto-release forms that have a scheduled_release time in the past
   */
  async checkScheduledReleases() {
    const now = new Date();

    const [sessions] = await db.query(`
      SELECT * FROM appraisal_sessions
      WHERE status = 'open'
        AND is_released = 0
        AND scheduled_release IS NOT NULL
        AND scheduled_release <= ?
    `, [now]);

    for (const session of sessions) {
      console.log(`⏰ Auto-releasing forms for session: ${session.academic_year}`);

      // Mark as released
      await db.query(
        `UPDATE appraisal_sessions SET is_released = 1, release_date = ?, scheduled_release = NULL WHERE id = ?`,
        [now, session.id]
      );

      // Send release emails
      try {
        const [faculty] = await db.query("SELECT id, name, email FROM users WHERE role = 'faculty'");
        const deadlineStr = session.deadline
          ? new Date(session.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
          : 'TBD';

        console.log(`📧 Sending scheduled release notification to ${faculty.length} faculty...`);

        for (const member of faculty) {
          try {
            await emailService.sendFormReleaseNotification({
              to: member.email,
              name: member.name,
              academicYear: session.academic_year,
              deadline: deadlineStr
            });
          } catch (err) {
            console.error(`  ❌ Email to ${member.email} failed: ${err.message}`);
          }
        }

        await db.query('UPDATE appraisal_sessions SET release_email_sent = 1 WHERE id = ?', [session.id]);
        console.log('📧 Scheduled release emails sent.');
      } catch (err) {
        console.error('Error sending scheduled release emails:', err.message);
      }
    }
  }

  /**
   * Job 2: Send reminder emails before the deadline based on configured reminder_days and reminder_time
   */
  async checkDeadlineReminders() {
    const now = new Date();

    const [sessions] = await db.query(`
      SELECT * FROM appraisal_sessions
      WHERE status = 'open'
        AND is_released = 1
        AND reminder_sent = 0
        AND deadline IS NOT NULL
    `);

    for (const session of sessions) {
      const reminderDays = session.reminder_days !== null ? session.reminder_days : 2;
      const reminderTime = session.reminder_time || '08:00:00';
      const [hours, minutes, seconds] = reminderTime.split(':').map(Number);
      
      const reminderDate = new Date(session.deadline);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);
      reminderDate.setHours(hours, minutes, seconds || 0, 0);

      if (now >= reminderDate) {
      console.log(`⏰ Sending deadline reminder for session: ${session.academic_year}`);

      const [faculty] = await db.query("SELECT id, name, email FROM users WHERE role = 'faculty'");
      const deadlineStr = new Date(session.deadline).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      for (const member of faculty) {
        try {
          await emailService.sendDeadlineReminder({
            to: member.email,
            name: member.name,
            academicYear: session.academic_year,
            deadline: deadlineStr
          });
        } catch (err) {
          console.error(`  ❌ Reminder to ${member.email} failed: ${err.message}`);
        }
      }

      // Mark reminder as sent
      await db.query('UPDATE appraisal_sessions SET reminder_sent = 1 WHERE id = ?', [session.id]);
      console.log('📧 Deadline reminder emails sent.');
      }
    }
  }

  /**
   * Job 3: Auto-close sessions that are past their deadline
   */
  async checkExpiredSessions() {
    const today = new Date().toISOString().split('T')[0];

    const [result] = await db.query(`
      UPDATE appraisal_sessions
      SET is_released = 0
      WHERE status = 'open'
        AND is_released = 1
        AND deadline IS NOT NULL
        AND deadline < ?
    `, [today]);

    if (result.affectedRows > 0) {
      console.log(`⏰ Auto-closed ${result.affectedRows} expired session(s).`);
    }
  }
}

module.exports = new SchedulerService();
