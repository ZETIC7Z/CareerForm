'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Copy,
  Check,
  Link2,
  Link2Off,
  RefreshCw,
  Download,
} from 'lucide-react';

/** "Member since" — a real calendar date, never a raw timestamp. */
function formatMemberSince(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface AccountState {
  name: string;
  email: string;
  username: string;
  hasPassword: boolean;
  googleLinked: boolean;
  totpEnabled: boolean;
  backupCodesLeft: number;
  createdAt?: string;
}

type TotpSetup = { secret: string; otpauth: string; qr: string; manualKey: string };

/**
 * Account & Security — one place for the three things that protect a sign-in:
 * the account's own password, the connected Google account, and an authenticator app.
 *
 * Everything here talks to /api/auth/security, /api/auth/password and /api/auth/totp,
 * so the panel never guesses at state: it renders whatever the server reports.
 */
export default function AccountSecurity({ onChanged }: { onChanged?: () => void }) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Authenticator
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpMsg, setTotpMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/security');
      const data = await res.json();
      if (data?.ok) setAccount(data.account);
    } catch {
      /* the panel simply stays in its loading state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: 'The two new passwords do not match.' });
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPwMsg({ ok: false, text: data.error || 'Could not update the password.' });
        return;
      }
      setPwMsg({ ok: true, text: data.message || 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await load();
      onChanged?.();
    } catch {
      setPwMsg({ ok: false, text: 'Connection error. Please try again.' });
    } finally {
      setPwBusy(false);
    }
  };

  const startTotp = async () => {
    setTotpMsg(null);
    setBackupCodes([]);
    setTotpBusy(true);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTotpMsg({ ok: false, text: data.error || 'Could not start the setup.' });
        return;
      }
      setSetup({ secret: data.secret, otpauth: data.otpauth, qr: data.qr, manualKey: data.manualKey });
    } catch {
      setTotpMsg({ ok: false, text: 'Connection error. Please try again.' });
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpMsg(null);
    setTotpBusy(true);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable', code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTotpMsg({ ok: false, text: data.error || 'That code did not match.' });
        return;
      }
      setBackupCodes(data.backupCodes || []);
      setSetup(null);
      setTotpCode('');
      setTotpMsg({ ok: true, text: data.message });
      await load();
    } catch {
      setTotpMsg({ ok: false, text: 'Connection error. Please try again.' });
    } finally {
      setTotpBusy(false);
    }
  };

  const disableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpMsg(null);
    setTotpBusy(true);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // One box stands in for two accepted proofs: the server checks `password` against
        // the stored hash and `code` against the TOTP secret and passes if EITHER matches,
        // so the same typed value is sent in both fields. Google-only accounts have no
        // password to type, which is exactly why the code path exists.
        body: JSON.stringify({ action: 'disable', password: disablePassword, code: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTotpMsg({ ok: false, text: data.error || 'Could not disable the authenticator.' });
        return;
      }
      setTotpMsg({ ok: true, text: data.message });
      setDisablePassword('');
      setBackupCodes([]);
      await load();
    } catch {
      setTotpMsg({ ok: false, text: 'Connection error. Please try again.' });
    } finally {
      setTotpBusy(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the codes stay visible for manual copying */
    }
  };

  const downloadCodes = () => {
    const blob = new Blob(
      [
        'CareerForm PH — authenticator backup codes\n',
        `Account: ${account?.email || ''}\n`,
        'Each code works once. Keep them somewhere only you can reach.\n\n',
        backupCodes.join('\n'),
      ],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'careerform-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="dash-plan-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--accent,#06b6d4)' }} />
        <span className="dash-muted">Checking your account security…</span>
      </div>
    );
  }

  return (
    <div className="dash-plan-wrap">
      {/* ---------------- Sign-in identity ---------------- */}
      <section className="dash-plan-card">
        <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} /> Sign-in methods
        </h2>
        <p className="dash-muted" style={{ marginBottom: 14 }}>
          Any of these open the same account, whichever you reach for first.
        </p>
        <div className="dash-kv">
          <div>
            <span>Email address used at sign-up</span>
            <strong style={{ wordBreak: 'break-all' }}>{account?.email || '—'}</strong>
          </div>
          <div>
            <span>Username</span>
            <strong>{account?.username || 'Not chosen yet'}</strong>
          </div>
          {account?.createdAt && (
            <div>
              <span>Member since</span>
              <strong>{formatMemberSince(account.createdAt)}</strong>
            </div>
          )}
          <div>
            <span>Password</span>
            <strong>{account?.hasPassword ? 'Set' : 'Not set yet'}</strong>
          </div>
          <div>
            <span>Google account</span>
            <strong>{account?.googleLinked ? 'Connected' : 'Not connected'}</strong>
          </div>
          <div>
            <span>Authenticator app</span>
            <strong>{account?.totpEnabled ? `On · ${account.backupCodesLeft} backup codes left` : 'Off'}</strong>
          </div>
        </div>
        <p className="dash-muted" style={{ marginTop: 14, marginBottom: 0 }}>
          You can sign in with either the email address above or your username — whichever you reach for first. To
          change your display name, use <strong>Manage Profile</strong> in the sidebar.
        </p>
      </section>

      {/* ---------------- Password ---------------- */}
      <section className="dash-plan-card">
        <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={17} /> {account?.hasPassword ? 'Change password' : 'Add a password'}
        </h2>
        <p className="dash-muted" style={{ marginBottom: 14 }}>
          {account?.hasPassword
            ? 'Choose something long and unique to this site.'
            : 'Your account was created with Google. Setting a password lets you sign in by username or email too.'}
        </p>

        {pwMsg && (
          <div className={`auth-alert ${pwMsg.ok ? 'success' : 'error'}`}>
            {pwMsg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{pwMsg.text}</span>
          </div>
        )}

        <form onSubmit={submitPassword} className="dash-field" style={{ gap: 12, marginTop: 12 }}>
          {account?.hasPassword && (
            <label>
              <span>Current password</span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
          )}
          <label>
            <span>New password</span>
            <input
              type={showPw ? 'text' : 'password'}
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters, letters and numbers"
            />
          </label>
          <label>
            <span>Confirm new password</span>
            <input
              type={showPw ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 12px', gap: 6 }} onClick={() => setShowPw(v => !v)}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />} {showPw ? 'Hide' : 'Show'}
            </button>
            <button type="submit" className="dash-primary-btn" disabled={pwBusy}>
              {pwBusy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {account?.hasPassword ? 'Update password' : 'Set password'}
            </button>
          </div>
        </form>
      </section>

      {/* ---------------- Google ---------------- */}
      <section className="dash-plan-card">
        <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {account?.googleLinked ? <Link2Off size={17} /> : <Link2 size={17} />} Google account
        </h2>
        <p className="dash-muted" style={{ marginBottom: 14 }}>
          {account?.googleLinked
            ? 'Connected. Pressing “Continue with Google” with that address opens this same account.'
            : 'Connect Google so one tap signs you in — the same account, not a new one.'}
        </p>
        {account?.googleLinked ? (
          <span className="dash-pill">
            <CheckCircle2 size={13} /> Google connected
          </span>
        ) : (
          <a className="auth-google-btn" href="/api/auth/google?mode=link" style={{ maxWidth: 320 }}>
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6c1.9-5.7 7.2-9.8 13.6-9.8z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.7c-.3 2.1-1.6 5.3-4.7 7.4l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.6z" />
              <path fill="#FBBC05" d="M10.4 28.2A14.6 14.6 0 019.6 24c0-1.5.3-2.9.7-4.2l-7.8-6A23.5 23.5 0 000 24c0 3.8.9 7.4 2.6 10.5l7.8-6.3z" />
              <path fill="#34A853" d="M24 47.5c6.2 0 11.4-2 15.2-5.6l-7.6-5.9c-2.1 1.4-4.8 2.4-7.6 2.4-6.4 0-11.7-4.1-13.6-9.8l-7.8 6.3C6.5 42.1 14.6 47.5 24 47.5z" />
            </svg>
            Connect Google
          </a>
        )}
      </section>

      {/* ---------------- Authenticator ---------------- */}
      <section className="dash-plan-card">
        <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Smartphone size={17} /> Authenticator app
        </h2>
        <p className="dash-muted" style={{ marginBottom: 14 }}>
          Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password or Bitwarden. Once connected,
          signing in also asks for the 6-digit code your app shows — so a stolen password is not enough.
        </p>

        {totpMsg && (
          <div className={`auth-alert ${totpMsg.ok ? 'success' : 'error'}`} style={{ marginBottom: 12 }}>
            {totpMsg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{totpMsg.text}</span>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="dash-totp-codes">
            <strong>Save these backup codes now</strong>
            <p className="dash-muted">Each one signs you in once if you lose the phone. They are shown only this one time.</p>
            <div className="dash-codes-grid">
              {backupCodes.map(c => (
                <code key={c}>{c}</code>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 12px', gap: 6 }} onClick={copyCodes}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy codes'}
              </button>
              <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 12px', gap: 6 }} onClick={downloadCodes}>
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        )}

        {account?.totpEnabled ? (
          <form onSubmit={disableTotp} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            <label className="dash-field">
              <span>Confirm to switch it off (password or a current code)</span>
              <input
                type="text"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                placeholder="Your account password, or the 6-digit code"
                autoComplete="off"
              />
            </label>
            <button type="submit" className="dash-ghost-btn danger" style={{ width: 'auto', padding: '0 14px', gap: 6 }} disabled={totpBusy}>
              {totpBusy ? <Loader2 size={14} className="animate-spin" /> : <Link2Off size={14} />} Remove authenticator
            </button>
          </form>
        ) : setup ? (
          <div className="dash-totp-setup">
            <div className="dash-totp-qr">
              {/* The QR is generated server-side from the otpauth:// URI. */}
              <img src={setup.qr} alt="Scan this QR code with your authenticator app" width={190} height={190} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <p className="dash-kicker">Step 1 · Scan</p>
              <p className="dash-muted" style={{ margin: '4px 0 10px' }}>
                Open the authenticator app, choose “Add account → Scan QR code”, and point the camera here.
              </p>
              <p className="dash-kicker">Can&apos;t scan? Type this key</p>
              <code className="dash-manual-key">{setup.manualKey}</code>
              <form onSubmit={confirmTotp} style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <input
                  className="dash-rename-input"
                  style={{ maxWidth: 170 }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  maxLength={9}
                />
                <button type="submit" className="dash-primary-btn" disabled={totpBusy}>
                  {totpBusy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Verify &amp; connect
                </button>
                <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 12px' }} onClick={() => setSetup(null)}>
                  Cancel
                </button>
              </form>
            </div>
          </div>
        ) : (
          <button type="button" className="dash-primary-btn" onClick={startTotp} disabled={totpBusy}>
            {totpBusy ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />} Set up authenticator
          </button>
        )}
      </section>
    </div>
  );
}
