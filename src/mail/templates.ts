export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,sans-serif;color:#111;">
    <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;">
      <tr>
        <td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;">${escapeHtml(title)}</h2>
          ${bodyHtml}
          <p style="margin:24px 0 0;font-size:12px;color:#888;">
            Task Manager · You received this email because of activity on your account.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buttonWithFallback(url: string, label: string): string {
  const safeUrl = escapeHtml(url);
  return `
    <p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a></p>
    <p style="font-size:12px;color:#888;">If the button doesn't work, copy this link:<br>${safeUrl}</p>`;
}

export function verifyEmailEmail(
  name: string,
  url: string,
  validHours: number,
): EmailContent {
  return {
    subject: 'Verify your email address',
    text:
      `Hi ${name},\n\nPlease verify your email by clicking this link:\n${url}\n\n` +
      `This link is valid for ${validHours} hours.\n\nIf you did not create this account, you can ignore this email.`,
    html: layout(
      'Verify your email address',
      `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Please verify your email address by clicking the button below.</p>
    ${buttonWithFallback(url, 'Verify email')}
    <p style="font-size:14px;color:#555;">This link is valid for ${validHours} hours. If you didn't create an account, you can ignore this email.</p>`,
    ),
  };
}

export function welcomeEmail(name: string): EmailContent {
  return {
    subject: 'Welcome to Task Manager!',
    text: `Hi ${name},\n\nYour email is verified and your account is ready. Welcome to Task Manager!`,
    html: layout(
      'Welcome to Task Manager!',
      `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your email is verified and your account is ready. Welcome to Task Manager!</p>`,
    ),
  };
}

export function passwordResetEmail(
  name: string,
  url: string,
  validMinutes: number,
): EmailContent {
  return {
    subject: 'Reset your Task Manager password',
    text:
      `Hi ${name},\n\nWe received a request to reset your password. Use this link to choose a new one:\n${url}\n\n` +
      `This link expires in ${validMinutes} minutes.\n\n` +
      `If you did not request this, you can ignore this email. Your password will not change unless you use the link.`,
    html: layout(
      'Reset your password',
      `
    <p>Hi ${escapeHtml(name)},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one.</p>
    ${buttonWithFallback(url, 'Reset password')}
    <p style="font-size:14px;color:#555;">This link expires in ${validMinutes} minutes. If you did not request this, you can ignore this email. Your password will not change unless you use the link.</p>`,
    ),
  };
}

export function passwordChangedEmail(name: string): EmailContent {
  return {
    subject: 'Your password was changed',
    text:
      `Hi ${name},\n\nThe password for your Task Manager account was just changed, and you were signed out on all devices.\n\n` +
      `If you did not make this change, reset your password immediately using "Forgot password" on the login page.`,
    html: layout(
      'Your password was changed',
      `
    <p>Hi ${escapeHtml(name)},</p>
    <p>The password for your Task Manager account was just changed, and you were signed out on all devices.</p>
    <p style="font-size:14px;color:#b91c1c;">If you did not make this change, reset your password immediately using "Forgot password" on the login page.</p>`,
    ),
  };
}
