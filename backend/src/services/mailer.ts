/**
 * Nodemailer Service
 *
 * Configures Gmail SMTP transport with App Password
 * for sending emails on behalf of users.
 */

import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

if (!gmailUser || !gmailAppPassword) {
  console.warn(
    '⚠️  Missing GMAIL_USER or GMAIL_APP_PASSWORD — email sending will be disabled'
  );
}

// Create reusable SMTP transporter using Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL (port 587 STARTTLS may be blocked on some networks)
  auth: {
    user: gmailUser,
    pass: gmailAppPassword,
  },
});

/**
 * Send an email via Gmail SMTP
 *
 * @param to      - Recipient email address
 * @param subject - Email subject line
 * @param text    - Email body (plain text)
 * @param from    - Sender email (defaults to GMAIL_USER)
 * @returns       - Nodemailer send result
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  from?: string
) {
  const mailOptions = {
    from: from || `"VoiceMail Assist" <${gmailUser}>`,
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}
