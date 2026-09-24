'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import BrandMark from '@/components/brand-logo';

/**
 * The page an emailed reset link opens: "add new password / confirm password".
 *
 * The token is read from the query string on the client (so the page does not need a
 * Suspense boundary at build time), and is consumed exactly once by /api/auth/reset.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  const requirements = useMemo(
    () => [
      { label: 'At least 8 characters', ok: password.length >= 8 },
      { label: 'Contains a letter and a number (or symbol)', ok: /[a-zA-Z]/.test(password) && /[^a-zA-Z]/.test(password) },
      { label: 'Both boxes match', ok: password.length > 0 && password === confirm },
    ],
    [password, confirm]
  );
  const ready = requirements.every(r => r.ok);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This link is incomplete. Request a new reset email.');
      return;
    }
    if (!ready) {
      setError('Please satisfy every requirement first.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not reset the password.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/?action=signin'), 2200);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="reset-shell">
      <div className="reset-card">
        <Link href="/" className="reset-brand" aria-label="CareerForm PH home">
          <BrandMark height={38} priority />
        </Link>

        {done ? (
          <>
            <div className="auth-alert success" style={{ marginTop: 18 }}>
              <CheckCircle2 size={16} />
              <span>Password updated. Taking you to sign in…</span>
            </div>
            <Link className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} href="/?action=signin">
              Sign in now <ArrowRight size={15} />
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 750, margin: '18px 0 6px' }}>Set a new password</h1>
            <p className="muted" style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.6 }}>
              Choose a new password for your CareerForm PH account. The link you followed works once and expires 30
              minutes after it was sent.
            </p>

            {!token && (
              <div className="auth-alert error">
                <AlertCircle size={16} />
                <span>No reset token found in this link. Request a fresh reset email from the sign-in window.</span>
              </div>
            )}
            {error && (
              <div className="auth-alert error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="auth-form-fields">
              <div className="auth-field">
                <label htmlFor="new-password">New password</label>
                <div className="auth-input-wrap">
                  <Lock size={15} className="auth-input-icon" />
                  <input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    style={{ paddingRight: 42 }}
                  />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <div className="auth-input-wrap">
                  <Lock size={15} className="auth-input-icon" />
                  <input
                    id="confirm-password"
                    type={show ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Type it again"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <ul className="auth-req">
                {requirements.map(r => (
                  <li key={r.label} className={r.ok ? 'ok' : 'bad'}>
                    {r.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {r.label}
                  </li>
                ))}
              </ul>

              <button type="submit" disabled={busy} className="btn btn-gold auth-submit-btn" style={{ width: '100%' }}>
                {busy ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={16} className="animate-spin" /> Updating…
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    Save new password <ArrowRight size={15} />
                  </span>
                )}
              </button>
            </form>

            <p className="auth-footer-note">
              <span>
                <ShieldCheck size={13} /> Prefer no password? Sign in with Google or with an authenticator code instead.
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
