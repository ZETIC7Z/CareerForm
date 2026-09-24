import crypto from 'node:crypto';

/**
 * Time-based one-time passwords (RFC 6238) for the "Authenticator app" option in
 * Account & Security.
 *
 * Written against node:crypto on purpose — it is the same HOTP/TOTP every
 * authenticator app implements (Google Authenticator, Microsoft Authenticator,
 * Authy, 1Password, Bitwarden), so the codes interoperate without pulling in a
 * third-party dependency whose maintenance we do not control.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A fresh 160-bit shared secret, encoded the way authenticator apps expect it. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);
  const digest = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

function counterAt(seconds: number): number {
  return Math.floor(seconds / STEP_SECONDS);
}

/**
 * Check a 6-digit code, accepting the previous and next step so a code typed as the
 * clock ticks over (or with a mildly skewed phone clock) still verifies.
 */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const clean = (token || '').replace(/\D/g, '');
  if (clean.length !== DIGITS) return false;
  const now = counterAt(Date.now() / 1000);
  for (let i = -window; i <= window; i += 1) {
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, now + i)), Buffer.from(clean))) return true;
  }
  return false;
}

/**
 * The code that is valid right now for a secret.
 *
 * Used by the verification scripts to drive a real sign-in end to end (and by anyone
 * debugging a clock-skew report). Server-side only — this module is never imported by a
 * client component.
 */
export function currentTotpCode(secret: string): string {
  return hotp(secret, counterAt(Date.now() / 1000));
}

/** The URI both Google Authenticator and Microsoft Authenticator read from the QR code. */
export function totpUri(secret: string, accountEmail: string, issuer = 'CareerForm PH'): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Seconds left in the current step — used by the UI to ease the waiting feel. */
export function totpSecondsRemaining(): number {
  return STEP_SECONDS - (Math.floor(Date.now() / 1000) % STEP_SECONDS);
}

/** Single-use recovery codes shown once at setup. Only their hashes are stored. */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  const normalised = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalised).digest('hex');
}
