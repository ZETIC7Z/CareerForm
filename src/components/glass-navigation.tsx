'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight, UserCheck, LogOut, BookOpen } from 'lucide-react';
import AuthModal, { UserSession } from './auth-modal';
import CSCGuideModal from './csc-guide-modal';
import ThemeToggle from './theme-toggle';
import ThemeAccentPicker from './theme-accent-picker';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'PDS Builder', href: '/builder' },
  { name: 'Cover Letters', href: '/builder?tool=letter' },
  { name: 'WES Annex', href: '/wes' },
  { name: 'About', href: '/about' },
];

export default function GlassNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [guideOpen, setGuideOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch session on load
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
  };

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed z-50 transition-all duration-500 ${
          isScrolled ? 'top-3 left-3 right-3 md:top-4 md:left-6 md:right-6' : 'top-0 left-0 right-0'
        }`}
      >
        <nav
          className={`mx-auto transition-all duration-500 ${
            isScrolled || isMobileMenuOpen
              ? 'glass-nav-scrolled max-w-[1240px]'
              : 'glass-nav-transparent max-w-[1440px]'
          }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-500 px-4 sm:px-6 lg:px-8 ${
              isScrolled ? 'h-14' : 'h-18 md:h-20'
            }`}
          >
            {/* Clean Minimalist Typography Brand (Logo removed for now per request) */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-lg font-bold tracking-tight text-[var(--heading)] flex items-center gap-2 select-none">
                CareerForm
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
                  2026
                </span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-7 lg:gap-9">
              {navLinks.map(link => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="glass-nav-link text-sm relative group font-medium"
                >
                  {link.name}
                  <span className="glass-nav-indicator" />
                </Link>
              ))}

              <button
                type="button"
                className="glass-nav-link text-sm flex items-center gap-1.5 font-medium cursor-pointer"
                onClick={() => setGuideOpen(true)}
              >
                <BookOpen size={14} /> CSC Guide
              </button>
            </div>

            {/* Desktop CTAs, Theme Picker & Auth */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeAccentPicker />
              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-2.5">
                  <span className="user-profile-chip" title={user.email}>
                    <UserCheck size={14} />
                    <span className="truncate max-w-[120px]">{user.name || user.email}</span>
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

              <Link
                href="/builder"
                className="btn btn-ghost h-8 lg:h-9 px-3.5 text-xs font-semibold rounded-full hidden xl:inline-flex items-center gap-1"
              >
                Launch Builder <ArrowRight size={13} />
              </Link>
            </div>

            {/* Mobile Menu Toggle Button & Theme Picker */}
            <div className="md:hidden flex items-center gap-2">
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
          className={`md:hidden fixed inset-0 z-40 transition-all duration-500 ${
            isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{ top: 0, backgroundColor: 'rgba(9, 11, 15, 0.95)', backdropFilter: 'blur(24px)' }}
        >
          <div className="flex flex-col h-full px-6 pt-24 pb-8">
            <div className="flex-1 flex flex-col justify-center gap-6">
              {navLinks.map((link, i) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-2xl sm:text-3xl font-bold tracking-tight transition-all duration-500 hover:text-[var(--accent,#efb530)] ${
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
                className={`text-2xl sm:text-3xl font-bold tracking-tight text-left transition-all duration-500 hover:text-[var(--accent,#efb530)] flex items-center gap-3 ${
                  isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? '300ms' : '0ms' }}
              >
                <BookOpen size={24} /> Official CSC Guide
              </button>
            </div>

            <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
              {user ? (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">{user.name} ({user.email})</span>
                  <button onClick={handleSignOut} className="text-xs text-red-400">Sign out</button>
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
          onClose={() => setAuthOpen(false)}
          onSuccess={u => setUser(u)}
        />
      )}

      {guideOpen && <CSCGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />}
    </>
  );
}
