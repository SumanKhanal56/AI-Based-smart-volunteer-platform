// This helper sends account security emails.
import nodemailer from 'nodemailer';

let transporter;

// Create the email connection from environment variables.
function getTransporter() {
  if (transporter) return transporter;

  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  if (!host || !Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP is not configured.');
  }
  if ((user && !pass) || (!user && pass)) {
    throw new Error('SMTP authentication is incomplete.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user ? { auth: { user, pass } } : {})
  });

  return transporter;
}

// Send the six-digit password reset code to the user.
export async function sendPasswordResetOtpEmail({ to, otp }) {
  const from = String(process.env.MAIL_FROM || '').trim();
  if (!from) throw new Error('MAIL_FROM is not configured.');

  await getTransporter().sendMail({
    from,
    to,
    subject: 'Your Volunteer Nepal password reset code',
    text: `Your Volunteer Nepal password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
        <div style="background:#071426;color:#fff;padding:24px;border-radius:16px 16px 0 0">
          <h1 style="margin:0;font-size:24px">Volunteer <span style="color:#34d399">Nepal</span></h1>
        </div>
        <div style="border:1px solid #dbe5e2;border-top:0;padding:28px;border-radius:0 0 16px 16px">
          <p>Use this code to reset your Volunteer Nepal password:</p>
          <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#047857;margin:24px 0">${otp}</p>
          <p>This code expires in 10 minutes and can only be used once.</p>
          <p style="color:#64748b;font-size:13px">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `
  });
}

// Send the six-digit two-factor code for login or setup.
export async function sendTwoFactorOtpEmail({ to, otp, purpose = 'login' }) {
  const from = String(process.env.MAIL_FROM || '').trim();
  if (!from) throw new Error('MAIL_FROM is not configured.');

  const action = purpose === 'enable'
    ? 'enable two-factor authentication'
    : 'finish signing in';

  await getTransporter().sendMail({
    from,
    to,
    subject: 'Volunteer Nepal Two-Factor Authentication Code',
    text: `Your Volunteer Nepal verification code is ${otp}. Use it to ${action}. This code expires in 5 minutes. If you did not make this request, please ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
        <div style="background:#071426;color:#fff;padding:24px;border-radius:16px 16px 0 0">
          <h1 style="margin:0;font-size:24px">Volunteer <span style="color:#34d399">Nepal</span></h1>
        </div>
        <div style="border:1px solid #dbe5e2;border-top:0;padding:28px;border-radius:0 0 16px 16px">
          <p>Use this verification code to ${action}:</p>
          <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#047857;margin:24px 0">${otp}</p>
          <p>This code expires in 5 minutes and can only be used once.</p>
          <p style="color:#64748b;font-size:13px">If you did not make this request, please secure your account and ignore this email.</p>
        </div>
      </div>
    `
  });
}
