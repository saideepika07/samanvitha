// Email Service using Nodemailer with Console Fallback for Development
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const isConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Send password reset email
   * @param {Object} options - { to, rawToken, userName }
   */
  async sendPasswordResetEmail({ to, rawToken, userName = 'Community Member' }) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    // If SMTP is not configured in development or test, log to console marked DEV ONLY
    if (!this.transporter) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n================================================================================');
        console.log('[DEV ONLY] PASSWORD RESET EMAIL DISPATCH SIMULATION (SMTP unconfigured)');
        console.log(`Recipient : ${to}`);
        console.log(`Name      : ${userName}`);
        console.log(`Reset Link: ${resetUrl}`);
        console.log('Validity  : 15 minutes (Single use)');
        console.log('================================================================================\n');
        return { success: true, simulated: true, resetUrl };
      }

      console.error('CRITICAL: SMTP is not configured in production environment.');
      return { success: false, error: 'Email service unconfigured in production.' };
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || '"Samanvitha Support" <no-reply@samanvitha.org>',
      to,
      subject: 'Reset Your Samanvitha Password',
      text: `Hello ${userName},\n\nYou requested a password reset for your Samanvitha account.\n\nPlease click the following link to reset your password within 15 minutes:\n${resetUrl}\n\nIf you did not request this, please disregard this email.\n\nSamanvitha Community Network`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9F3E7; padding: 40px 20px; color: #191B1E;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #E7DDD0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(37,40,45,0.04);">
            <h1 style="color: #313B24; font-size: 24px; margin-top: 0; margin-bottom: 16px; font-weight: bold; letter-spacing: 0.05em;">SAMANVITHA</h1>
            <p style="font-size: 14px; color: #5C636D; margin-bottom: 24px;">Resources aligned with real needs.</p>
            
            <p style="font-size: 15px; line-height: 1.5; color: #34383F;">Hello <strong>${userName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #444A52;">
              We received a request to reset the password for your Samanvitha account. Click the button below to choose a new password:
            </p>
            
            <div style="margin: 28px 0; text-align: center;">
              <a href="${resetUrl}" style="background-color: #4A6B53; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 14px;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 12px; color: #7D8590; line-height: 1.5;">
              This link is valid for <strong>15 minutes</strong> and can only be used once. If you did not request a password reset, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #E7DDD0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #A7ADB5; text-align: center; margin-bottom: 0;">
              Need-based community donation network connecting verified orphanages & old-age homes with resources.
            </p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('Nodemailer send error:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new EmailService();
