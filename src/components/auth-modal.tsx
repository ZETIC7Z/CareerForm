'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  AtSign,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  ArrowLeft,
  Cloud,
  Bookmark,
  BellRing,
} from 'lucide-react';
import { syncLocalDrafts } from '@/lib/drafts';
import { ACCOUNT_CREATED_EVENT } from './accounts-counter';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  username?: string;
}

type Mode = 'signin' | 'signup';
type View = 'auth' | 'forgot' | 'forgot-sent';
type Strength = 'weak' | 'fair' | 'strong';

/** Google's sign-in entry point — a plain link so the browser follows the redirect. */
function googleStart(mode: 'signin' | 'link' = 'signin') {
  return `/api/auth/google?mode=${mode}`;
}

/** The Google "G", inline so the button needs no extra request. */
function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6c1.9-5.7 7.2-9.8 13.6-9.8z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.7c-.3 2.1-1.6 5.3-4.7 7.4l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.6z" />
      <path fill="#FBBC05" d="M10.4 28.2A14.6 14.6 0 019.6 24c0-1.5.3-2.9.7-4.2l-7.8-6A23.5 23.5 0 000 24c0 3.8.9 7.4 2.6 10.5l7.8-6.3z" />
      <path fill="#34A853" d="M24 47.5c6.2 0 11.4-2 15.2-5.6l-7.6-5.9c-2.1 1.4-4.8 2.4-7.6 2.4-6.4 0-11.7-4.1-13.6-9.8l-7.8 6.3C6.5 42.1 14.6 47.5 24 47.5z" />
    </svg>
  );
}

/**
 * Score a candidate password the way the security panel shows it.
 *
 * The three lines mirror the requirements a person can actually act on: it must be long
 * enough, it must mix kinds of characters, and it must not simply repeat their own name
 * or address. Weak / Fair / Strong is derived from how many of those hold.
 */
function scorePassword(password: string, name: string, email: string): {
  strength: Strength;
  met: { label: string; ok: boolean }[];
} {
  const local = (name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const emailBits = (email || '')
    .toLowerCase()
    .split(/[@._-]/)
    .filter(b => b.length >= 3);
  const lowered = password.toLowerCase();
  const personal = [...local, ...emailBits].some(bit => bit.length >= 3 && lowered.includes(bit));

  const lengthOk = password.length >= 8;
  const mixOk = /[^a-zA-Z]/.test(password);
  const personalOk = password.length > 0 && !personal;

  const met = [
    { label: '8+ characters', ok: lengthOk },
    { label: 'Number or symbol', ok: mixOk },
    { label: 'Not your name or email', ok: personalOk },
  ];

  const score = (personalOk ? 1 : 0) + (lengthOk ? 1 : 0) + (mixOk ? 1 : 0) + (password.length >= 12 ? 1 : 0);
  const strength: Strength = score >= 4 ? 'strong' : score >= 2 ? 'fair' : 'weak';
  return { strength, met };
}

const STRENGTH_COPY: Record<Strength, { label: string; color: string; width: string }> = {
  weak: { label: 'Weak', color: '#ef4444', width: '34%' },
  fair: { label: 'Fair', color: '#f59e0b', width: '66%' },
  strong: { label: 'Strong', color: '#10b981', width: '100%' },
};

/** Plain-language explanations for the codes the Google callback can bounce back with. */
const AUTH_ERROR_COPY: Record<string, string> = {
  google_unconfigured:
    'Google sign-in is not switched on for this deployment yet. Please sign in with your email and password.',
  google_cancelled: 'Google sign-in was cancelled — nothing was changed on your account.',
  google_failed: 'Google could not complete the sign-in. Nothing was charged or saved; please try again.',
  google_state: 'That sign-in link expired. For your safety, please start the Google sign-in again.',
  google_expired: 'The Google sign-in took too long to finish. Please try again.',
  google_no_email: 'That Google account did not share a verified email address, so we cannot open an account with it.',
  google_in_use: 'That Google account is already connected to a different CareerForm account.',
  signin_required: 'Please sign in first, then connect Google from Account & Security.',
};

export default function AuthModal({
  open,
  initialMode = 'signin',
  initialNotice = '',
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialMode?: Mode;
  /** A reason to show on the way in — e.g. a Google error handed back in the URL. */
  initialNotice?: string;
  onClose: () => void;
  onSuccess?: (user: UserSession) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<View>('auth');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [notice, setNotice] = useState('');
  const [forgotValue, setForgotValue] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [devLink, setDevLink] = useState('');

  const { strength, met } = useMemo(() => scorePassword(password, name, email), [password, name, email]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setView('auth');
    setError('');
    setSuccessMsg('');
    setNeeds2fa(false);
    setCode('');
    setNotice(AUTH_ERROR_COPY[initialNotice] || '');
  }, [open, initialMode, initialNotice]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // The page behind the dialog must not scroll while it is open — otherwise two scroll
  // contexts fight over the wheel and the dialog appears to have a stray scrollbar.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const reset = (next: Mode) => {
    setMode(next);
    setView('auth');
    setError('');
    setSuccessMsg('');
    setNotice('');
    setNeeds2fa(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'signup') {
      if (!agree) {
        setError('Please accept the data privacy notice to continue.');
        return;
      }
      if (password !== confirm) {
        setError('The two passwords do not match.');
        return;
      }
      // The two rules the server also enforces are hard requirements. "Must not contain
      // your name or email" is guidance — it lowers the strength score and is shown in
      // red, but it never traps someone out of creating their own account.
      if (password.length < 8 || !/[^a-zA-Z]/.test(password)) {
        setError('Your password needs at least 8 characters with a number or symbol in it.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
      const body =
        mode === 'signup'
          ? { name, username, email, password, confirmPassword: confirm }
          : { identifier: identifier || email, password, code };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.requires2fa) setNeeds2fa(true);
        setError(data.error || 'Authentication failed. Please try again.');
        return;
      }

      const synced = await syncLocalDrafts();
      const syncedNote =
        synced && synced.created > 0
          ? ` ${synced.created} recent draft${synced.created > 1 ? 's' : ''} synced to your account.`
          : '';

      setSuccessMsg(
        (mode === 'signup' ? 'Account created successfully!' : 'Signed in successfully!') + syncedNote
      );
      // The header's registered-accounts badge counts every account in the database, so the
      // one that was just made here is worth telling it about: without this the new number
      // would wait out a poll interval before the person who registered ever saw it move.
      if (mode === 'signup' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(ACCOUNT_CREATED_EVENT));
      }
      setTimeout(() => {
        onSuccess?.(data.user);
        onClose();
        if (typeof window !== 'undefined') window.location.href = '/dashboard';
      }, 800);
    } catch {
      setError('Connection error. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not send the reset link.');
        return;
      }
      setNotice(data.message || '');
      setDevLink(data.devResetLink || '');
      setView('forgot-sent');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setForgotBusy(false);
    }
  };

  const heading =
    view !== 'auth'
      ? 'Reset your password'
      : mode === 'signin'
        ? needs2fa
          ? 'Two-factor check'
          : 'Welcome back'
        : 'Create your account';

  const subheading =
    view !== 'auth'
      ? 'We email you a one-time link — no password needed to start over.'
      : mode === 'signin'
        ? needs2fa
          ? 'Enter the 6-digit code from your authenticator app.'
          : 'Sign in with your username or email to open your dashboard, projects and bookmarks.'
        : 'One account for every draft, letter, bookmark and job alert.';

  const alerts = (
    <>
      {notice && (
        <div className="auth-alert info">
          <AlertCircle size={16} />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="auth-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="auth-alert success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
    </>
  );

  return (
    <div
      className="modal-backdrop nd-backdrop"
      style={{ zIndex: 10000 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* One fixed card size for every view: the box never resizes between Sign in and
          Sign up, and its body scrolls invisibly if a very short screen cannot hold it. */}
      <div className="nd-modal auth-glass-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-card-head">
          <div>
            {/* The badge rides on the heading's line: it reassures without costing a row
                of height in a card whose size is fixed. */}
            <div className="auth-title-row">
              <h2 id="auth-title">{heading}</h2>
              <span className="auth-brand-badge">
                <ShieldCheck size={12} /> Private &amp; encrypted
              </span>
            </div>
            <p className="auth-sub">{subheading}</p>
          </div>
          <button type="button" className="auth-close" aria-label="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="auth-card-body">
          {view === 'forgot-sent' ? (
            <div className="auth-view">
              <div className="auth-alert success">
                <CheckCircle2 size={16} />
                <span>{notice || 'Check your inbox for the reset link.'}</span>
              </div>
              {devLink && (
                <p className="auth-dev-link">
                  No mail provider is configured on this server, so here is the link directly:{' '}
                  <a href={devLink}>{devLink}</a>
                </p>
              )}
              <button type="button" className="btn btn-ghost auth-wide" onClick={() => reset('signin')}>
                <ArrowLeft size={15} /> Back to sign in
              </button>
            </div>
          ) : view === 'forgot' ? (
            <form onSubmit={submitForgot} className="auth-view">
              {alerts}
              <div className="auth-field">
                <label htmlFor="auth-forgot">Email address or username</label>
                <div className="auth-input-wrap">
                  <AtSign size={15} className="auth-input-icon" />
                  <input
                    id="auth-forgot"
                    type="text"
                    required
                    autoFocus
                    placeholder="you@email.com or your username"
                    value={forgotValue}
                    onChange={e => setForgotValue(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" disabled={forgotBusy} className="btn btn-gold auth-submit-btn auth-wide">
                {forgotBusy ? (
                  <span className="auth-btn-inner">
                    <Loader2 size={16} className="animate-spin" /> Sending…
                  </span>
                ) : (
                  <span className="auth-btn-inner">
                    Email me a reset link <ArrowRight size={15} />
                  </span>
                )}
              </button>
              <p className="auth-hint">
                Already set up an authenticator? You can sign in with your password plus the 6-digit code your app shows.
              </p>
              <button type="button" className="btn btn-ghost auth-wide" onClick={() => reset('signin')}>
                <ArrowLeft size={15} /> Back to sign in
              </button>
            </form>
          ) : (
            <div className="auth-view">
              <div className="auth-tab-bar">
                <button
                  type="button"
                  className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
                  onClick={() => reset('signin')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => reset('signup')}
                >
                  Sign up
                </button>
              </div>

              {alerts}

              {/* Google is the shortest path in, so it leads the form in both modes. */}
              <a className="auth-google-btn" href={googleStart('signin')}>
                <GoogleMark />
                <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
              </a>
              {mode === 'signin' && (
                <p className="auth-legal">
                  Google opens the same account as your email — you keep your username and password.
                </p>
              )}

              <div className="auth-divider">
                <span>or use your email</span>
              </div>

              <form onSubmit={handleSubmit} className="auth-form-fields">
                {mode === 'signup' && (
                  <>
                    <div className="auth-grid-2">
                      <div className="auth-field">
                        <label htmlFor="auth-name">Full name</label>
                        <div className="auth-input-wrap">
                          <User size={15} className="auth-input-icon" />
                          <input
                            id="auth-name"
                            type="text"
                            required
                            placeholder="Juan Dela Cruz"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoComplete="name"
                          />
                        </div>
                      </div>
                      <div className="auth-field">
                        <label htmlFor="auth-username">Username</label>
                        <div className="auth-input-wrap">
                          <AtSign size={15} className="auth-input-icon" />
                          <input
                            id="auth-username"
                            type="text"
                            required
                            placeholder="juandc"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            pattern="[A-Za-z0-9._]{3,24}"
                            title="3–24 characters: letters, numbers, dots or underscores"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="auth-field">
                      <label htmlFor="auth-email">Email address</label>
                      <div className="auth-input-wrap">
                        <Mail size={15} className="auth-input-icon" />
                        <input
                          id="auth-email"
                          type="email"
                          required
                          placeholder="juan.delacruz@gov.ph"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  </>
                )}

                {mode === 'signin' && (
                  <div className="auth-field">
                    <label htmlFor="auth-identifier">Username or email</label>
                    <div className="auth-input-wrap">
                      <AtSign size={15} className="auth-input-icon" />
                      <input
                        id="auth-identifier"
                        type="text"
                        required
                        autoFocus
                        placeholder={needs2fa ? 'your account' : 'juandc or you@email.com'}
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        autoComplete="username"
                      />
                    </div>
                  </div>
                )}

                {/* Sign up puts both passwords on one row; sign in keeps the roomier single
                    field with the reset link beside its label. */}
                {mode === 'signup' ? (
                  <div className="auth-grid-2">
                    <div className="auth-field">
                      <label htmlFor="auth-password">Password</label>
                      <div className="auth-input-wrap">
                        <Lock size={15} className="auth-input-icon" />
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          autoComplete="new-password"
                          style={{ paddingRight: 42 }}
                        />
                        <button
                          type="button"
                          className="auth-pw-toggle"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          aria-pressed={showPassword}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="auth-field">
                      <label htmlFor="auth-confirm" className={confirm && confirm !== password ? 'is-bad' : undefined}>
                        Confirm
                      </label>
                      <div className="auth-input-wrap">
                        <Lock size={15} className="auth-input-icon" />
                        <input
                          id="auth-confirm"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Repeat it"
                          value={confirm}
                          onChange={e => setConfirm(e.target.value)}
                          autoComplete="new-password"
                          style={{ paddingRight: 42 }}
                        />
                        <button
                          type="button"
                          className="auth-pw-toggle"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="auth-field">
                    <div className="auth-label-row">
                      <label htmlFor="auth-password">Password</label>
                      <button type="button" className="auth-link-inline" onClick={() => setView('forgot')}>
                        Forgot password?
                      </button>
                    </div>
                    <div className="auth-input-wrap">
                      <Lock size={15} className="auth-input-icon" />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        style={{ paddingRight: 42 }}
                      />
                      <button
                        type="button"
                        className="auth-pw-toggle"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="auth-strength" data-strength={strength}>
                    <div className="auth-strength-head">
                      <span className="auth-strength-track">
                        <i
                          style={{
                            width: password ? STRENGTH_COPY[strength].width : '0%',
                            background: STRENGTH_COPY[strength].color,
                          }}
                        />
                      </span>
                      <b style={{ color: password ? STRENGTH_COPY[strength].color : '#94a3b8' }}>
                        {password ? STRENGTH_COPY[strength].label : '8+ characters'}
                      </b>
                    </div>
                    <ul className="auth-req">
                      {met.map(req => (
                        <li key={req.label} className={password ? (req.ok ? 'ok' : 'bad') : ''}>
                          {password && req.ok ? <CheckCircle2 size={11} /> : <X size={11} />}
                          {req.label}
                        </li>
                      ))}
                    </ul>
                    {confirm && confirm !== password && <span className="auth-hint is-bad">Passwords do not match yet.</span>}
                  </div>
                )}

                {mode === 'signin' && needs2fa && (
                  <div className="auth-field">
                    <label htmlFor="auth-code">Authenticator code</label>
                    <div className="auth-input-wrap">
                      <KeyRound size={15} className="auth-input-icon" />
                      <input
                        id="auth-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        placeholder="123 456"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        maxLength={9}
                      />
                    </div>
                    <span className="auth-hint">Also accepts one of your saved backup codes.</span>
                  </div>
                )}

                {mode === 'signup' && (
                  <label className={`auth-agree ${agree ? 'checked' : ''}`}>
                    <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
                    <span className="auth-agree-copy">
                      <strong>I agree to the Data Privacy terms.</strong>
                      <em>Never sold or shared.</em>
                    </span>
                  </label>
                )}

                <button type="submit" disabled={loading} className="btn btn-gold auth-submit-btn auth-wide">
                  {loading ? (
                    <span className="auth-btn-inner">
                      <Loader2 size={16} className="animate-spin" /> Processing…
                    </span>
                  ) : (
                    <span className="auth-btn-inner">
                      {mode === 'signin' ? (needs2fa ? 'Verify & sign in' : 'Sign in to account') : 'Create free account'}{' '}
                      <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </form>

              {mode === 'signin' && (
                <ul className="auth-perks">
                  <li>
                    <Cloud size={14} /> Drafts and letters sync to every device
                  </li>
                  <li>
                    <Bookmark size={14} /> Bookmarked jobs and standing agency alerts
                  </li>
                  <li>
                    <BellRing size={14} /> One notification the moment a posting you watch goes live
                  </li>
                </ul>
              )}

              <div className="auth-footer-note">
                <span>
                  <ShieldCheck size={13} />{' '}
                  {mode === 'signup'
                    ? 'Encrypted in transit and at rest — add 2FA anytime in Account & Security.'
                    : 'Encrypted in transit and at rest — never sold or shared.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
