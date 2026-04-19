/**
 * Email Service using Nodemailer
 * Sends styled HTML emails for:
 *  - Registration (temp password)
 *  - Forgot-password (reset link)
 */
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const host = process.env.EMAIL_HOST;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!host || !user || !pass || user === 'your_email@gmail.com') {
      console.log('[WARN] Email not configured - emails will be logged to console instead.');
      this.isConfigured = false;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user, pass }
    });

    this.isConfigured = true;
    console.log('[OK] Email service configured');
  }

  // --- LNMIIT Branded Template (from email_fix.md) ----------------------

  /**
   * Build the LNMIIT-branded HTML email (matching the official template)
   */
  buildLNMIITTemplate({ recipientName, bodyHtml }) {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return `<!DOCTYPE html>
<html>
  <head>
    <title>The LNM Institute of Information Technology, Jaipur</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
  </head>
  <body>
    <table style="background:#eee;padding:40px;border:1px solid #ddd;margin:0 auto; font-family: 'Roboto', sans-serif;">
      <tbody>
        <tr>
          <td>
            <table style="background:#fff;width:100%;border:1px solid #ccc;padding:0;margin:0;border-collapse:collapse;max-width:100%;width:550px;border-radius:10px">
              <tbody style="border: solid 1px #034da2;">
                <tr style="background: #EEEEEE;">
                  <td>
                    <center>
                      <a href="https://lnmiit.ac.in">
                        <img src="https://lnmiit.ac.in/wp-content/uploads/2023/07/cropped-LNMIIT-Logo-Transperant-Background-e1699342125845.png" style="width:200px; margin:auto;display:block; padding: 10px;" alt="LNMIIT Logo">
                      </a>
                    </center>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px;text-align:center;margin:0"></td>
                </tr>
                ${bodyHtml}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
  }

  // --- Registration Email (Temp Password) --------------------------------

  /**
   * Send a registration email with temporary password
   * Used when Dofa registers a department (HOD) or faculty member
   */
  async sendTempPasswordEmail({ to, name, tempPassword, role, loginUrl }) {
    const siteUrl = loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${name}</b>,</p>
                    <p>I hope this email finds you well. As part of our routine security measures, we have generated a temporary password for your account with <b>The LNM Institute of Information Technology</b>. This temporary password will allow you to access your account and set a new, personalized password of your choice.</p>
                    
                    <p>Your Temporary Password:</p>
                    <h3 style="color: #034da2; background: #f0f4ff; padding: 12px 20px; border-radius: 6px; letter-spacing: 2px; text-align: center;">${tempPassword}</h3>

                    <p><b>Your Role:</b> ${role}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>To ensure the security of your account, please follow these steps:</p>
                    <ol>
                      <li>Use the provided temporary password to log in to your account at <a href="${siteUrl}/login">${siteUrl}/login</a>.</li>
                      <li>Select your role as <b>${role}</b> on the login page.</li>
                      <li>Once logged in, navigate to your account settings.</li>
                      <li>Choose the option to change your password.</li>
                      <li>Enter a new, secure password and save the changes.</li>
                    </ol>
                    <p>If you did not request this account or have any concerns about the security of your account, please contact our support team immediately at webmaster@lnmiit.ac.in.</p>
                    <p>Thank you for your cooperation in maintaining the security of your account.</p>
                    <br/><br/>
                    <p>Best regards,</p>
                    <p><b>Webmaster LNMIIT</b></p>
                    <p>webmaster@lnmiit.ac.in</p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: name, bodyHtml });

    await this._send({
      to,
      subject: `LNMIIT Faculty Appraisal - Your Temporary Password (${role})`,
      html
    });
  }

  // --- Forgot Password Email (Reset Link) --------------------------------

  /**
   * Send a forgot-password email with reset link
   */
  async sendForgotPassword({ to, name, resetUrl, role }) {
    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${name}</b>,</p>
                    <p>We received a request to reset your password for the <b>LNMIIT Faculty Appraisal System</b>.</p>
                    ${role ? `<p>This request was made for your <b>${role}</b> account.</p>` : ''}
                    <p>Click the button below to set a new password:</p>
                    <div style="text-align:center;margin:20px 0;">
                      <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background-color:#034da2;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                        Reset Password
                      </a>
                    </div>
                    <p style="font-size:13px;color:#718096;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p><a href="${resetUrl}" style="font-size:13px;color:#034da2;word-break:break-all;">${resetUrl}</a></p>
                    <p style="font-size:13px;color:#718096;">This link will expire in 1 hour.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Webmaster LNMIIT</b></p>
                    <p>webmaster@lnmiit.ac.in</p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: name, bodyHtml });

    await this._send({
      to,
      subject: 'LNMIIT Faculty Appraisal - Password Reset',
      html
    });
  }

  // --- Form Release Notification Email ---------------------------------

  /**
   * Send notification that appraisal forms have been released
   */
  async sendFormReleaseNotification({ to, name, academicYear, deadline }) {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${name}</b>,</p>
                    <p>We are pleased to inform you that the <b>Faculty Appraisal Forms</b> for the academic year <b>${academicYear}</b> have been released and are now available for you to fill out.</p>
                    
                    <div style="background: linear-gradient(135deg, #034da2 0%, #0466d6 100%); color: #fff; padding: 20px 24px; border-radius: 10px; margin: 20px 0; text-align: center;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; opacity: 0.9;">SUBMISSION DEADLINE</p>
                      <h2 style="margin: 0; font-size: 22px; letter-spacing: 1px;">${deadline}</h2>
                    </div>

                    <p>Please ensure that you complete and submit both <b>Form A</b> and <b>Form B</b> before the deadline mentioned above.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p><b>Steps to fill out the forms:</b></p>
                    <ol>
                      <li>Log in to the Faculty Appraisal Portal at <a href="${siteUrl}/login">${siteUrl}/login</a></li>
                      <li>Navigate through Part A and Part B sections using the sidebar</li>
                      <li>Fill in all required information accurately</li>
                      <li>Submit your forms before the deadline</li>
                    </ol>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}/login" style="display:inline-block;padding:14px 40px;background-color:#034da2;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                        Go to Appraisal Portal
                      </a>
                    </div>
                    <p style="font-size:13px;color:#718096;">If you have any questions or face any issues, please contact the Dofa office or write to webmaster@lnmiit.ac.in.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Webmaster LNMIIT</b></p>
                    <p>webmaster@lnmiit.ac.in</p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: name, bodyHtml });

    await this._send({
      to,
      subject: `LNMIIT Faculty Appraisal ${academicYear} - Forms Released | Deadline: ${deadline}`,
      html
    });
  }

  // --- Deadline Reminder Email ----------------------------------------

  /**
   * Send a deadline reminder email (2 days before deadline)
   */
  async sendDeadlineReminder({ to, name, academicYear, deadline }) {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${name}</b>,</p>
                    <p>This is a gentle reminder that the deadline for submitting your <b>Faculty Appraisal Forms</b> for the academic year <b>${academicYear}</b> is approaching soon.</p>
                    
                    <div style="background: linear-gradient(135deg, #c53030 0%, #e53e3e 100%); color: #fff; padding: 20px 24px; border-radius: 10px; margin: 20px 0; text-align: center;">
                      <p style="margin: 0 0 8px 0; font-size: 13px; opacity: 0.9;">DEADLINE APPROACHING</p>
                      <h2 style="margin: 0; font-size: 22px; letter-spacing: 1px;">${deadline}</h2>
                      <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">(Only 2 days remaining!)</p>
                    </div>

                    <p>If you have already submitted your forms, please disregard this email. If you have not yet completed your submission, please do so at your earliest convenience.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}/login" style="display:inline-block;padding:14px 40px;background-color:#c53030;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                        Complete Your Submission Now
                      </a>
                    </div>
                    <p style="font-size:13px;color:#718096;">After the deadline, you will not be able to submit or modify your appraisal forms.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Webmaster LNMIIT</b></p>
                    <p>webmaster@lnmiit.ac.in</p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: name, bodyHtml });

    await this._send({
      to,
      subject: `REMINDER: Faculty Appraisal ${academicYear} - Deadline in 2 Days`,
      html
    });
  }

  // --- Deadline Extension Notification Email ---------------------------

  /**
   * Notify faculty that the appraisal submission deadline has been extended
   */
  async sendDeadlineExtensionNotification({ to, name, academicYear, oldDeadline, newDeadline }) {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${name}</b>,</p>
                    <p>We are pleased to inform you that the submission deadline for the <b>Faculty Appraisal Forms</b> for the academic year <b>${academicYear}</b> has been <b style="color: #059669;">extended</b>.</p>

                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px 24px; margin: 20px 0;">
                      <div style="display: flex; justify-content: space-around; align-items: center; text-align: center;">
                        <div>
                          <p style="margin: 0 0 8px 0; font-size: 12px; opacity: 0.8; color: #047857;">OLD DEADLINE</p>
                          <p style="margin: 0; font-size: 16px; text-decoration: line-through; color: #dc2626;">${oldDeadline}</p>
                        </div>
                        <div style="font-size: 24px; color: #059669;">→</div>
                        <div>
                          <p style="margin: 0 0 8px 0; font-size: 12px; opacity: 0.8; color: #047857;">NEW DEADLINE</p>
                          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #059669; letter-spacing: 0.5px;">${newDeadline}</h2>
                        </div>
                      </div>
                    </div>

                    <p>All previously filled information in your forms has been preserved. You can now continue filling and submitting your forms with the new extended deadline.</p>
                    
                    <p>If you have any questions, please contact the Dofa office at webmaster@lnmiit.ac.in.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}/login" style="display:inline-block;padding:14px 40px;background-color:#059669;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                        Access Your Appraisal Forms
                      </a>
                    </div>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Webmaster LNMIIT</b></p>
                    <p>webmaster@lnmiit.ac.in</p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: name, bodyHtml });

    await this._send({
      to,
      subject: `Deadline Extended - ${academicYear} Faculty Appraisal | New Deadline: ${newDeadline}`,
      html
    });
  }

  // --- Legacy: Password Setup Email (reset link for registration) --------
  // Kept for backward compatibility but no longer used by registration flow

  /**
   * Send a password reset/setup email (legacy - kept for compatibility)
   */
  async sendPasswordReset({ to, name, resetUrl, role }) {
    // Redirect to the new forgot-password style email
    return this.sendForgotPassword({ to, name, resetUrl, role });
  }

  // --- Edit Request: Notification to Dofa ------------------------------

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Submission Sent Back: Notification to Faculty -------------------

  /**
   * Notify faculty that submission has been sent back with section-wise comments.
   */
  async sendSubmissionSentBackToFaculty({ to, facultyName, academicYear, comments = [] }) {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const safeName = this.escapeHtml(facultyName || 'Faculty Member');

    const commentItems = comments.length > 0
      ? comments.map((item) => {
          const section = this.escapeHtml(item.section_name || 'General');
          const text = this.escapeHtml(item.comment || '').replace(/\n/g, '<br/>');
          return `
            <li style="margin-bottom:10px;">
              <p style="margin:0 0 4px 0;"><b>Section:</b> ${section}</p>
              <p style="margin:0; color:#334155;">${text || '-'}</p>
            </li>
          `;
        }).join('')
      : '<li style="margin-bottom:10px;">No detailed comments were attached. Please contact Dofa office.</li>';

    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${safeName}</b>,</p>
                    <p>Your appraisal submission for the academic year <b>${this.escapeHtml(academicYear || 'N/A')}</b> has been <b style="color: #c53030;">sent back</b> by the Dofa office for revisions.</p>

                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
                      <p style="margin: 0 0 10px 0; font-weight: 600; color: #991b1b;">Section-wise Review Comments:</p>
                      <ul style="margin: 0; padding-left: 18px; line-height: 1.6; color: #1f2937;">
                        ${commentItems}
                      </ul>
                    </div>

                    <p>Please review the comments section-wise, update the relevant sections, and re-submit your form.</p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}" style="display:inline-block;padding:14px 40px;background-color:#c53030;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                        Open Appraisal Portal
                      </a>
                    </div>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Dofa Office, LNMIIT Jaipur</b></p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: safeName, bodyHtml });

    await this._send({
      to,
      subject: `Submission Sent Back - ${academicYear || 'Academic Year'} Appraisal`,
      html
    });
  }

  /**
   * Notify Dofa office that a faculty has requested edits to specific form sections
   */
  async sendEditRequestNotificationToDofa({ facultyName, facultyEmail, academicYear, sections, requestMessage, requestId }) {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const sectionList = sections.map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('');

    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear Dofa Office,</p>
                    <p>A faculty member has submitted a request to make changes to specific sections of their appraisal form for the academic year <b>${academicYear}</b>.</p>

                    <div style="background: #f0f4ff; border: 1px solid #c3d3f0; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #034da2;">Faculty Details:</p>
                      <p style="margin: 0 0 4px 0;"><b>Name:</b> ${facultyName}</p>
                      <p style="margin: 0;"><b>Email:</b> ${facultyEmail}</p>
                    </div>

                    <p><b>Sections Requested for Editing:</b></p>
                    <ul style="color: #2c3e50; line-height: 1.8; margin: 0 0 12px 0; padding-left: 20px;">
                      ${sectionList}
                    </ul>

                    ${requestMessage ? `<p><b>Faculty's Message:</b></p><p style="background:#fafafa; border-left: 3px solid #034da2; padding: 10px 14px; border-radius: 4px; color: #334155;">${requestMessage}</p>` : ''}

                    <p>Please log in to the Dofa dashboard to review and approve or deny this request.</p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}/Dofa/dashboard" style="display:inline-block;padding:14px 40px;background-color:#034da2;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                        Review Edit Request
                      </a>
                    </div>
                    <p style="font-size:13px;color:#718096;">Request ID: #${requestId}</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Faculty Appraisal System</b></p>
                    <p>LNMIIT, Jaipur</p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: 'Dofa Office', bodyHtml });

    // Get Dofa emails from environment or use fallback
    const DofaEmail = process.env.Dofa_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'Dofa@lnmiit.ac.in';

    await this._send({
      to: DofaEmail,
      subject: `Edit Request - ${facultyName} | ${academicYear} Appraisal`,
      html
    });
  }

  // --- Edit Request: Approved - Notification to Faculty -----------------

  /**
   * Notify faculty that their edit request has been approved
   */
  async sendEditRequestApprovedToFaculty({ to, facultyName, academicYear, approvedSections, DofaNote }) {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const sectionList = approvedSections.map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('');

    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${facultyName}</b>,</p>
                    <p>Your request to edit sections of your appraisal form for the academic year <b>${academicYear}</b> has been <b style="color: #059669;">approved</b> by the Dofa office.</p>

                    <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #059669;">Sections Approved for Editing:</p>
                      <ul style="color: #065f46; line-height: 1.8; margin: 0; padding-left: 20px;">
                        ${sectionList}
                      </ul>
                    </div>

                    ${DofaNote ? `<p><b>Note from Dofa Office:</b></p><p style="background:#fafafa; border-left: 3px solid #059669; padding: 10px 14px; border-radius: 4px; color: #334155;">${DofaNote}</p>` : ''}

                    <p>Please log in to the portal, make your changes in the approved sections, and <b>re-submit your form before the deadline</b>.</p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${siteUrl}" style="display:inline-block;padding:14px 40px;background-color:#059669;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                        Go to My Appraisal Form
                      </a>
                    </div>
                    <p style="font-size:13px;color:#718096;">Please remember: changes must be submitted before the deadline. Only the approved sections will be editable.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Dofa Office, LNMIIT Jaipur</b></p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: facultyName, bodyHtml });

    await this._send({
      to,
      subject: `Edit Request Approved - ${academicYear} Appraisal Form`,
      html
    });
  }

  // --- Edit Request: Denied - Notification to Faculty -------------------

  /**
   * Notify faculty that their edit request has been denied
   */
  async sendEditRequestDeniedToFaculty({ to, facultyName, academicYear, DofaNote }) {
    const bodyHtml = `
                <tr>
                  <td style="padding:10px 30px;margin:0;text-align:left; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <p>Dear <b>${facultyName}</b>,</p>
                    <p>We regret to inform you that your request to edit sections of your appraisal form for the academic year <b>${academicYear}</b> has been <b style="color: #dc2626;">denied</b> by the Dofa office.</p>

                    ${DofaNote ? `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #dc2626;">Reason from Dofa Office:</p>
                      <p style="margin: 0; color: #7f1d1d;">${DofaNote}</p>
                    </div>` : ''}

                    <p>If you have questions or concerns, please contact the Dofa office directly.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Dofa Office, LNMIIT Jaipur</b></p>
                    <p>webmaster@lnmiit.ac.in</p>
                  </td>
                </tr>`;

    const html = this.buildLNMIITTemplate({ recipientName: facultyName, bodyHtml });

    await this._send({
      to,
      subject: `Edit Request Denied - ${academicYear} Appraisal Form`,
      html
    });
  }

  // --- Internal Send Method ----------------------------------------------

  /**
   * Internal send method - falls back to console logging if not configured
   */
  async _send({ to, subject, html }) {
    const from = process.env.EMAIL_FROM || 'LNMIIT Faculty Appraisal <noreply@lnmiit.ac.in>';

    if (!this.isConfigured) {
      console.log('\n========== EMAIL (console mode) ==========');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   From: ${from}`);
      console.log('   (Email body logged - configure EMAIL_* env vars to send real emails)');
      console.log('=============================================\n');
      return;
    }

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html });
      console.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();

