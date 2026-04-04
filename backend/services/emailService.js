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

  // ─── LNMIIT Branded Template (from email_fix.md) ──────────────────────

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

  // ─── Registration Email (Temp Password) ────────────────────────────────

  /**
   * Send a registration email with temporary password
   * Used when DOFA registers a department (HOD) or faculty member
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
      subject: `LNMIIT Faculty Appraisal — Your Temporary Password (${role})`,
      html
    });
  }

  // ─── Forgot Password Email (Reset Link) ────────────────────────────────

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
      subject: 'LNMIIT Faculty Appraisal — Password Reset',
      html
    });
  }

  // ─── Legacy: Password Setup Email (reset link for registration) ────────
  // Kept for backward compatibility but no longer used by registration flow

  /**
   * Send a password reset/setup email (legacy — kept for compatibility)
   */
  async sendPasswordReset({ to, name, resetUrl, role }) {
    // Redirect to the new forgot-password style email
    return this.sendForgotPassword({ to, name, resetUrl, role });
  }

  // ─── Internal Send Method ──────────────────────────────────────────────

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
