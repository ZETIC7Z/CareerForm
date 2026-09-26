/**
 * Transactional email for the account flows: the welcome message on sign-up, password
 * reset links, and security alerts (password changed, Google connected, 2FA switched).
 *
 * Delivery order:
 *   1. Resend  — set RESEND_API_KEY (+ MAIL_FROM). The free tier covers 3,000 messages a
 *                month, which is far more than this flow will ever use.
 *   2. Console — no key configured. The message is logged to the server output and (only
 *                outside production) the reset link is handed back to the caller so the
 *                flow stays testable locally.
 *
 * Two rules this module exists to enforce:
 *
 *   - A missing mailbox must never fail the request that triggered it. Every caller either
 *     awaits a result it ignores or fires the promise and walks on, and nothing in here
 *     throws.
 *   - The From address has to be one Resend will accept. Until a sending domain is verified
 *     in Resend, the only sender that delivers is their shared sandbox address
 *     (`onboarding@resend.dev`), and it only reaches the mailbox on the Resend account.
 *     MAIL_FROM overrides it the moment a real domain is live; until then the default keeps
 *     a fresh deployment sending instead of failing every message with a 403.
 *
 * Swap in another provider by replacing `deliver`; nothing else in the app knows which
 * provider is in use.
 */
import { SITE, SITE_ORIGIN } from './site';

export interface SendResult {
  delivered: boolean;
  /** Only ever populated when no provider is configured AND we are not in production. */
  previewLink?: string;
  /** Provider's own words when it refused the message, e.g. `domain is not verified`. */
  error?: string;
}

interface Message {
  subject: string;
  html: string;
  text: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const FROM = (process.env.MAIL_FROM || 'CareerForm PH <onboarding@resend.dev>').trim();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:28px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:30px 30px 26px;box-shadow:0 12px 34px rgba(15,23,42,.10)">
    <p style="margin:0 0 20px;font-size:19px;font-weight:800;letter-spacing:-.01em;color:#0e7490">CareerForm PH</p>
    <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3">${title}</h1>
    ${bodyHtml}
    <p style="margin:26px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.7;color:#64748b">
      Sent by CareerForm PH — the CSC Personal Data Sheet, rebuilt for 2026.<br>
      <a href="${SITE_ORIGIN}" style="color:#0e7490;text-decoration:none">${SITE_ORIGIN.replace(/^https?:\/\//, '')}</a>
      &nbsp;·&nbsp;
      <a href="${SITE.socials[3].href}" style="color:#0e7490;text-decoration:none">Talk to a human</a><br>
      You are receiving this because someone used this address on CareerForm PH. If it wasn't you, just ignore this message.
    </p>
  </div>
</body></html>`;
}

/**
 * Resend explains refusals in the response body ("The domain is not verified", "You can
 * only send testing emails to your own address"). Quote it — the status code on its own
 * sends whoever is reading the logs hunting through the dashboard.
 */
function describe(status: number, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: { message?: string } };
    const said = parsed.message || parsed.error?.message;
    if (said) return said;
  } catch {
    /* not JSON — fall through to the raw text */
  }
  return raw.slice(0, 200).trim() || `http_${status}`;
}

async function deliver(to: string, message: Message): Promise<SendResult> {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) {
    console.warn(`[mailer] RESEND_API_KEY not set — "${message.subject}" was NOT emailed to ${to}`);
    return { delivered: false, error: 'no_provider' };
  }

  const body = JSON.stringify({
    from: FROM,
    to: [to],
    subject: message.subject,
    html: message.html,
    // A plain-text alternative is what keeps a message out of spam folders on clients that
    // distrust HTML-only mail, and it is what a screen reader can actually read.
    text: message.text,
    // Replies land in the developer's inbox instead of a no-reply void.
    reply_to: SITE.email,
  });

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) return { delivered: true };

      const reason = describe(res.status, await res.text().catch(() => ''));
      console.error(`[mailer] Resend refused "${message.subject}" for ${to}: HTTP ${res.status} — ${reason}`);

      // A rate limit or a provider hiccup is worth one more try. An unverified domain or a
      // rejected address will answer the same way in 400ms, so it is not.
      if (attempt === 1 && (res.status === 429 || res.status >= 500)) {
        await wait(600);
        continue;
      }
      return { delivered: false, error: reason };
    } catch (err) {
      if (attempt === 1) {
        await wait(600);
        continue;
      }
      console.error('[mailer] send failed:', err);
      return { delivered: false, error: 'network' };
    }
  }
  return { delivered: false, error: 'unknown' };
}

function button(href: string, label: string): string {
  return `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:#0e7490;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;font-size:15px">${label}</a></p>
  <p style="margin:0 0 6px;font-size:12px;color:#64748b">Or paste this link into your browser:</p>
  <p style="margin:0;font-size:12px;word-break:break-all;color:#0f172a">${href}</p>`;
}

export async function sendPasswordResetEmail(to: string, name: string, link: string): Promise<SendResult> {
  const who = name || 'there';
  const message: Message = {
    subject: 'Reset your CareerForm PH password',
    html: shell(
      'Reset your CareerForm password',
      `<p style="margin:0 0 4px;font-size:14.5px;line-height:1.6">Hi ${who}, we received a request to set a new password for your account. This link works once and expires in 30 minutes.</p>
     ${button(link, 'Set a new password')}
     <p style="margin:16px 0 0;font-size:13px;color:#475569">If you did not ask for this, your current password still works — you can ignore this email.</p>`
    ),
    text: `Hi ${who},

We received a request to set a new password for your CareerForm PH account.

Set a new password (works once, expires in 30 minutes):
${link}

If you did not ask for this, your current password still works — you can ignore this email.

— CareerForm PH, ${SITE_ORIGIN}`,
  };

  const result = await deliver(to, message);
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
  const who = name || 'applicant';
  const message: Message = {
    subject: 'Your CareerForm PH account is ready',
    html: shell(
      `Welcome, ${who}!`,
      `<p style="margin:0 0 4px;font-size:14.5px;line-height:1.6">Your CareerForm PH account is ready. You can sign in with either your email address or your username.</p>
     <p style="margin:10px 0 0;font-size:14.5px">Username: <strong style="font-family:monospace">${username}</strong></p>
     <p style="margin:14px 0 0;font-size:13.5px;color:#475569">Your PDS drafts, cover letters, bookmarks and job alerts now follow the account across every device. Everything you store stays private to you.</p>
     ${button(`${SITE_ORIGIN}/builder`, 'Open the PDS builder')}`
    ),
    text: `Welcome, ${who}!

Your CareerForm PH account is ready. You can sign in with either your email address or your username.

Username: ${username}

Your PDS drafts, cover letters, bookmarks and job alerts now follow the account across every device. Everything you store stays private to you.

Open the PDS builder: ${SITE_ORIGIN}/builder

— CareerForm PH`,
  };
  return deliver(to, message);
}

/**
 * The bell notification, in email form: a password that changed, a Google account that got
 * connected, 2FA switched on or off. Whoever did the thing knows already; this message
 * exists for the other case.
 */
export async function sendSecurityAlertEmail(
  to: string,
  name: string,
  title: string,
  body: string
): Promise<SendResult> {
  const who = name || 'there';
  const message: Message = {
    subject: `CareerForm PH: ${title}`,
    html: shell(
      title,
      `<p style="margin:0 0 4px;font-size:14.5px;line-height:1.6">Hi ${who}, ${body}</p>
     <p style="margin:16px 0 0;font-size:13.5px;color:#475569">If this was not you, change your password immediately and reply to this email.</p>
     ${button(`${SITE_ORIGIN}/reset-password`, 'Secure my account')}`
    ),
    text: `Hi ${who},

${title}: ${body}

If this was not you, change your password immediately and reply to this email.
Secure your account: ${SITE_ORIGIN}/reset-password

— CareerForm PH`,
  };
  return deliver(to, message);
}
