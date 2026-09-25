'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight, UserCheck, LogOut, BookOpen, LayoutDashboard } from 'lucide-react';
import AuthModal, { UserSession } from './auth-modal';
import CSCGuideModal from './csc-guide-modal';
import ToolsSelectorModal from './tools-selector-modal';
import ThemeToggle from './theme-toggle';
import ThemeAccentPicker from './theme-accent-picker';
import LiveTimeWeather from './live-time-weather';
import BrandMark from './brand-logo';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'PDS Builder', href: '/builder' },
  { name: 'Cover Letters', href: '/coverletter' },
  { name: 'WES Annex', href: '/wes' },
  { name: 'About', href: '/about' },
];

export default function GlassNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [guideOpen, setGuideOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch session on load
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  /**
   * Open the right dialog for whatever the URL asks for.
   *
   * `?action=signin` is what every guarded page redirects with, and `?authError=<code>` is
   * how the Google callback reports a cancellation or a mismatch. Both used to land here
   * and be silently ignored, which left people staring at the home page with no idea what
   * happened. The query is stripped straight afterwards so a refresh does not replay it.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const authError = params.get('authError');
    if (!action && !authError) return;

    setAuthMode(action === 'signup' ? 'signup' : 'signin');
    setAuthNotice(authError || '');
    setAuthOpen(true);

    params.delete('action');
    params.delete('authError');
    const rest = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`
    );
  }, []);

  /**
   * Sign out, then leave the dashboard entirely.
   *
   * The cookie is cleared server-side first; only then does the browser do a full
   * navigation home, so no dashboard markup survives in memory and nothing can render a
   * signed-in shell for a signed-out visitor.
   */
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      setUser(null);
      setIsMobileMenuOpen(false);
      if (typeof window !== 'undefined') window.location.assign('/');
    }
  };

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
    setIsMobileMenuOpen(false);
  };

  const dynamicNavLinks = navLinks;

  return (
    <>
      {/* The bar is pinned to the very top at a constant height and constant width. Only
          the glass tint changes as you scroll, so the logo never slides or resizes and
          never reappears anywhere else on the page — it is simply locked at the top. */}
      <header className="fixed z-50 top-0 left-0 right-0 transition-all duration-500">
        {/* Realtime Clock & Auto-detected Weather (Site Center Top) */}
        <div className="w-full flex justify-center pt-2 pb-1 pointer-events-none">
          <div className="pointer-events-auto">
            <LiveTimeWeather />
          </div>
        </div>

        <nav
          className={`mx-auto max-w-[1440px] transition-all duration-500 ${
            isScrolled || isMobileMenuOpen ? 'glass-nav-scrolled' : 'glass-nav-transparent'
          }`}
        >
          <div className="flex items-center justify-between gap-5 md:gap-6 h-18 md:h-20 px-4 sm:px-6 lg:px-8">
            {/* The CareerForm mark — the artwork carries the wordmark, so the header no
                longer spells the name out in type beside it. The height is deliberately
                constant: the bar may tighten on scroll, but the logo itself stays locked
                at the same size and the same place rather than animating under the
                reader's eyes. BrandMark's default size is a viewport-driven clamp, so the
                mark reads large on a desktop without crowding the links at 1024px. */}
            <Link href="/" className="flex items-center group shrink-0" aria-label="CareerForm PH home">
              <BrandMark priority />
            </Link>

            {/* Desktop Navigation Links — never break a label across two lines, and the
                spacing tightens before the row would ever squeeze the marks together.
                The whole desktop cluster starts at `lg`, not `md`: between 768 and ~960px
                the links, the logo and the account controls together measure wider than the
                bar, and the row used to spill off the right edge with Sign in / Sign up
                half off screen. Tablets now get the full-screen menu the phones already
                use, which fits them better anyway. */}
            <div className="hidden lg:flex items-center gap-3 lg:gap-4 xl:gap-7">
              {dynamicNavLinks.map(link => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="glass-nav-link text-sm relative group font-medium whitespace-nowrap"
                >
                  {link.name}
                  <span className="glass-nav-indicator" />
                </Link>
              ))}

              <button
                type="button"
                className="glass-nav-link text-sm flex items-center gap-1.5 font-medium cursor-pointer whitespace-nowrap"
                onClick={() => setGuideOpen(true)}
              >
                <BookOpen size={14} /> CSC Guide
              </button>
            </div>

            {/* Desktop CTAs, Theme Picker & Auth */}
            <div className="hidden lg:flex items-center gap-2 lg:gap-3 shrink-0">
              {/* The accent picker is a preference, not navigation — below xl it moves into
                  the mobile menu so a wide logo and the account controls always fit. */}
              <span className="hidden xl:inline-flex">
                <ThemeAccentPicker />
              </span>
              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/dashboard"
                    className="btn btn-primary h-8 lg:h-9 px-3.5 text-xs font-semibold rounded-full shadow-md flex items-center gap-1.5"
                  >
                    <LayoutDashboard size={13} />
                    <span>Dashboard</span>
                  </Link>
                  <span className="user-profile-chip" title={user.email}>
                    <UserCheck size={14} />
                    {/* The name rejoins at xl, where there is room for it next to the logo
                        and the full set of links. */}
                    <span className="hidden xl:inline truncate max-w-[120px]">{user.name || user.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="wc-btn wc-btn-secondary h-8 px-2.5 text-xs"
                    title="Sign out"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuth('signin')}
                    className="text-xs lg:text-sm font-medium hover:text-[var(--heading)] transition-colors px-3 py-1.5 cursor-pointer"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth('signup')}
                    className="btn btn-primary h-8 lg:h-9 px-4 text-xs font-semibold rounded-full shadow-md"
                  >
                    Sign up
                  </button>
                </>
              )}

              
            </div>

            {/* Mobile Menu Toggle Button & Theme Picker */}
            <div className="lg:hidden flex items-center gap-2">
              <ThemeAccentPicker />
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 transition-colors duration-300 rounded-lg hover:bg-white/10"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Full-Screen Glass Overlay */}
        <div
          className={`lg:hidden fixed inset-0 z-40 transition-all duration-500 ${
            isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{ top: 0, backgroundColor: 'var(--bg)', backdropFilter: 'blur(24px)' }}
        >
          <div className="flex flex-col h-full px-6 pt-24 pb-8">
            <div className="flex-1 flex flex-col justify-center gap-6">
              {dynamicNavLinks.map((link, i) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-2xl sm:text-3xl font-bold tracking-tight text-[var(--heading)] transition-all duration-500 hover:text-[var(--accent,#efb530)] ${
                    isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: isMobileMenuOpen ? `${i * 60}ms` : '0ms' }}
                >
                  {link.name}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => { setIsMobileMenuOpen(false); setGuideOpen(true); }}
                className={`text-2xl sm:text-3xl font-bold tracking-tight text-left text-[var(--heading)] transition-all duration-500 hover:text-[var(--accent,#efb530)] flex items-center gap-3 ${
                  isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? '300ms' : '0ms' }}
              >
                <BookOpen size={24} /> Official CSC Guide
              </button>
            </div>

            <div className="pt-6 border-t border-[var(--line)] flex flex-col gap-3">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn btn-primary h-11 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard size={16} /> Open Dashboard
                  </Link>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-slate-300">{user.name} ({user.email})</span>
                    <button onClick={handleSignOut} className="text-xs text-red-400">Sign out</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 btn btn-secondary h-12 text-sm font-semibold rounded-xl"
                    onClick={() => openAuth('signin')}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className="flex-1 btn btn-gold h-12 text-sm font-semibold rounded-xl"
                    onClick={() => openAuth('signup')}
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {authOpen && (
        <AuthModal
          open={authOpen}
          initialMode={authMode}
          initialNotice={authNotice}
          onClose={() => {
            setAuthOpen(false);
            setAuthNotice('');
          }}
          onSuccess={u => setUser(u)}
        />
      )}

      {guideOpen && <CSCGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />}
      {toolsOpen && <ToolsSelectorModal open={toolsOpen} onClose={() => setToolsOpen(false)} />}
    </>
  );
}
