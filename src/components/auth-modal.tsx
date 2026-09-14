'use client';

import { useState } from 'react';
import { X, Lock, Mail, User, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export interface UserSession {
  id: string;
  email: string;
  name: string;
}

export default function AuthModal({
  open,
  initialMode = 'signin',
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess?: (user: UserSession) => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
      const body = mode === 'signup' ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      setSuccessMsg(mode === 'signup' ? 'Account created successfully!' : 'Signed in successfully!');
      setTimeout(() => {
        onSuccess?.(data.user);
        onClose();
      }, 700);
    } catch {
      setError('Connection error. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop nd-backdrop"
      style={{ zIndex: 10000 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="nd-modal auth-glass-card" role="dialog" aria-modal="true" style={{ maxWidth: 440 }}>
        <div className="nd-head" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="auth-brand-badge">
                <Sparkles size={12} /> MongoDB Atlas
              </span>
            </div>
            <h2 id="auth-title" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {mode === 'signin' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p id="auth-desc" className="nd-sub" style={{ fontSize: '0.86rem' }}>
              {mode === 'signin'
                ? 'Sign in to access your saved PDS records & sync.'
                : 'Sign up to safely save and sync your Civil Service PDS drafts.'}
            </p>
          </div>
          <button type="button" className="text-button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
          >
            Sign up
          </button>
        </div>

        {error && (
          <div className="auth-alert error">
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-fields">
          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full Name</label>
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
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email Address</label>
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

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={15} className="auth-input-icon" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-gold auth-submit-btn"
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={16} className="animate-spin" /> Processing…
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {mode === 'signin' ? 'Sign in to Account' : 'Create Free Account'} <ArrowRight size={15} />
              </span>
            )}
          </button>
        </form>

        <div className="auth-footer-note">
          <span>Protected with TLS & MongoDB Atlas auth_db replica set encryption.</span>
        </div>
      </div>
    </div>
  );
}
