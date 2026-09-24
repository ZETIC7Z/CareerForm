/**
 * Transactional email for account flows (signup confirmation, password reset, new-device
 * alerts) without paying for anything.
 *
 * Delivery order:
 *   1. Resend  — set RESEND_API_KEY (+ MAIL_FROM). Free tier covers 3,000 messages/month,
 *                which is far more than a reset flow will ever use.
 *   2. Console — no key configured. The message is logged to the server output and (only
 *                outside production) the reset link is returned to the caller so the flow
 *                stays testable locally.
 *
 * Swap in any other provider by adding a branch here; nothing else in the app knows which
 * provider is in use.
 */

export interface SendResult {
  delivered: boolean;
  /** Only ever populated when no provider is configured AND we are not in production. */
  previewLink?: string;
  error?: string;
}

const FROM = (process.env.MAIL_FROM || 'CareerForm PH <no-reply@careerform.ph>').trim();

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:28px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:30px 30px 26px;box-shadow:0 12px 34px rgba(15,23,42,.10)">
    <p style="margin:0 0 20px;font-size:19px;font-weight:800;letter-spacing:-.01em;color:#0e7490">CareerForm PH</p>
    <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3">${title}</h1>
    ${bodyHtml}
    <p style="margin:26px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
      You are receiving this because someone used this address on CareerForm PH. If it wasn't you, simply ignore this message.
    </p>
  </div>
</body></html>`;
}

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) {
    console.warn(`[mailer] RESEND_API_KEY not set — this message was NOT emailed to ${to}: ${subject}`);
    return { delivered: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[mailer] provider rejected the message:', res.status, detail.slice(0, 300));
      return { delivered: false, error: 'provider_rejected' };
    }
    return { delivered: true };
  } catch (err) {
    console.error('[mailer] send failed:', err);
    return { delivered: false, error: 'network' };
  }
}

function button(href: string, label: string): string {
  return `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:#0e7490;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;font-size:15px">${label}</a></p>
  <p style="margin:0 0 6px;font-size:12px;color:#64748b">Or paste this link into your browser:</p>
  <p style="margin:0;font-size:12px;word-break:break-all;color:#0f172a">${href}</p>`;
}

export async function sendPasswordResetEmail(to: string, name: string, link: string): Promise<SendResult> {
  const html = shell(
    'Reset your CareerForm password',
    `<p style="margin:0 0 4px;font-size:14.5px;line-height:1.6">Hi ${name || 'there'}, we received a request to set a new password for your account. This link works once and expires in 30 minutes.</p>
     ${button(link, 'Set a new password')}
     <p style="margin:16px 0 0;font-size:13px;color:#475569">If you did not ask for this, your current password still works — you can ignore this email.</p>`
  );
  const result = await send(to, 'Reset your CareerForm PH password', html);
  if (!result.delivered) {
    // No provider configured. The link goes to the server log — which only operators can
    // read — so a locked-out user is still recoverable during the window before email is
    // switched on. It is returned to the browser only outside production.
    console.warn(`[mailer] password reset link for ${to}: ${link}`);
    if (process.env.NODE_ENV !== 'production') return { ...result, previewLink: link };
  }
  return result;
}

export async function sendWelcomeEmail(to: string, name: string, username: string): Promise<SendResult> {
  const html = shell(
    `Welcome, ${name || 'applicant'}!`,
    `<p style="margin:0 0 4px;font-size:14.5px;line-height:1.6">Your CareerForm PH account is ready. You can sign in with either your email address or your username.</p>
     <p style="margin:10px 0 0;font-size:14.5px">Username: <strong style="font-family:monospace">${username}</strong></p>
     <p style="margin:14px 0 0;font-size:13.5px;color:#475569">Your PDS drafts, cover letters, bookmarks and job alerts now follow the account across every device. Everything you store stays private to you.</p>`
  );
  return send(to, 'Your CareerForm PH account is ready', html);
}
