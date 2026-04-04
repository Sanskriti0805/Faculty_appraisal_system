/**
 * Email Service using Nodemailer
 * Sends styled HTML emails for password reset and registration
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
      console.log('⚠️  Email not configured — emails will be logged to console instead.');
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
    console.log('✅ Email service configured');
  }

  /**
   * Build the HTML email template (styled like LNMIIT Lab Management System)
   */
  buildTemplate({ recipientName, bodyHtml, footerText }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);padding:24px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                LNMIIT Faculty Appraisal System
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#2d3748;">Dear <strong>${recipientName}</strong>,</p>
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background-color:#f8f9fa;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#718096;">
                ${footerText || 'If you have any questions, please contact our support team.'}
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#a0aec0;">
                Thank you for using the LNMIIT Faculty Appraisal System.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#cbd5e0;">
                Best regards,<br>The LNMIIT Administration
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset({ to, name, resetUrl, role }) {
    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
        Welcome to the <strong>LNMIIT Faculty Appraisal System</strong>!
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
        An account has been created for you with the role of <strong>${role}</strong>. To get started, please set up your password using the button below:
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background-color:#2c5282;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
          Set Up Password
        </a>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#718096;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 20px;">
        <a href="${resetUrl}" style="font-size:13px;color:#2c5282;word-break:break-all;">${resetUrl}</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#718096;">This link will expire in 48 hours.</p>
      <div style="margin:20px 0;padding:16px;background-color:#f7fafc;border-radius:6px;border-left:4px solid #2c5282;">
        <p style="margin:0 0 4px;font-size:14px;color:#4a5568;"><strong>Your account details:</strong></p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#4a5568;font-size:14px;">
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Role:</strong> ${role}</li>
        </ul>
      </div>
    `;

    const html = this.buildTemplate({
      recipientName: name,
      bodyHtml,
      footerText: 'If you did not request this account, please ignore this email.'
    });

    await this._send({
      to,
      subject: 'LNMIIT Faculty Appraisal — Set Up Your Password',
      html
    });
  }

  /**
   * Send a forgot-password email
   */
  async sendForgotPassword({ to, name, resetUrl }) {
    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
        We received a request to reset your password for the <strong>LNMIIT Faculty Appraisal System</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
        Click the button below to set a new password:
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background-color:#c53030;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
          Reset Password
        </a>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#718096;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 20px;">
        <a href="${resetUrl}" style="font-size:13px;color:#2c5282;word-break:break-all;">${resetUrl}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#718096;">This link will expire in 1 hour.</p>
    `;

    const html = this.buildTemplate({
      recipientName: name,
      bodyHtml,
      footerText: 'If you did not request a password reset, please ignore this email. Your password will remain unchanged.'
    });

    await this._send({
      to,
      subject: 'LNMIIT Faculty Appraisal — Password Reset',
      html
    });
  }

  /**
   * Internal send method — falls back to console logging if not configured
   */
  async _send({ to, subject, html }) {
    const from = process.env.EMAIL_FROM || 'LNMIIT Faculty Appraisal <noreply@lnmiit.ac.in>';

    if (!this.isConfigured) {
      console.log('\n📧 ========== EMAIL (console mode) ==========');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   From: ${from}`);
      console.log('   (Email body logged — configure EMAIL_* env vars to send real emails)');
      console.log('=============================================\n');
      return;
    }

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html });
      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();
