'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  Copy,
  Edit3,
  ExternalLink,
  Search,
  Bell,
  BellRing,
  Bookmark,
  BookmarkCheck,
  LayoutDashboard,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  LogOut,
  User,
  Zap,
  X,
  Mail,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  MapPin,
  Calendar,
  Layers,
  Star,
  Send,
  Cloud,
  CloudOff,
  Save,
  Lock,
  AlertCircle,
  Menu,
} from 'lucide-react';
import TipJarModal, { TipJarButton } from '@/components/tip-jar-modal';
import BrandMark from '@/components/brand-logo';
import AccountSecurity from '@/components/account-security';

interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  data: any;
  completionRate?: number;
  lastModified: string;
  createdAt: string;
  isFavorite?: boolean;
  kind?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string;
  hasPassword?: boolean;
  googleLinked?: boolean;
  createdAt?: string;
}

/**
 * "Member since" reads as a real date, never a timestamp.
 *
 * The value comes from the account document, so it is the day the account was actually
 * created rather than the day of the current session.
 */
function formatMemberSince(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface BookmarkRow {
  id: string;
  jobId: string;
  createdAt: string;
  job: {
    title?: string;
    agency?: string;
    agencyAcronym?: string;
    region?: string;
    placeOfAssignment?: string;
    deadline?: string;
    salaryGrade?: string;
    vacancies?: number | string;
  };
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  jobId?: string;
  read: boolean;
  createdAt: string;
}

interface AlertRow {
  id: string;
  agency: string;
  agencyAcronym: string;
  createdAt: string;
}

type SectionKey = 'overview' | 'projects' | 'recent' | 'bookmarks' | 'plan' | 'profile' | 'security' | 'notifications';

const NAV_ITEMS: { key: SectionKey; label: string; icon: React.ElementType; hint: string }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Everything at a glance' },
  { key: 'projects', label: 'Projects', icon: FolderOpen, hint: 'Your PDS documents' },
  { key: 'recent', label: 'Recent', icon: Clock, hint: 'Pick up where you stopped' },
  { key: 'bookmarks', label: 'Bookmarks', icon: Bookmark, hint: 'Saved government jobs' },
  { key: 'plan', label: 'Plan', icon: Layers, hint: 'What is available to you' },
  { key: 'profile', label: 'Manage Profile', icon: User, hint: 'Account, alerts & security' },
  { key: 'security', label: 'Account & Security', icon: ShieldCheck, hint: 'Password, Google & authenticator' },
];

const SECTION_TITLES: Record<SectionKey, string> = {
  overview: 'Overview',
  projects: 'Projects',
  recent: 'Recent',
  bookmarks: 'Bookmarks',
  plan: 'Plan',
  profile: 'Manage Profile',
  security: 'Account & Security',
  notifications: 'Notifications',
};

/**
 * Pepper-style dashboard (reference: codepen.io/chriscoyier/full/PgXRRM) rebuilt on
 * CareerForm's own data: dark rail on the left, notification bell with a live unread
 * badge, Home / <section> breadcrumb, count-carrying tabs, and a kanban pipeline whose
 * column headers take the reference's colored top bars.
 *
 * NOTE: the site-wide header already renders in SiteChrome, so this page deliberately
 * does NOT render a second navigation — that duplication used to stack two bars on top
 * of each other here.
 */
export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<SectionKey>('overview');
  const [profileName, setProfileName] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [railOpen, setRailOpen] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'pds' | 'cover-letter'>('pds');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await fetch('/api/auth/me').then(r => r.json());
      if (!userData?.ok || !userData.user) {
        router.push('/?action=signin');
        return;
      }
      setUser(userData.user);
      setProfileName(userData.user.name || '');

      const [projData, bookmarkData, notifData] = await Promise.all([
        fetch('/api/projects').then(r => r.json()).catch(() => ({})),
        fetch('/api/bookmarks').then(r => r.json()).catch(() => ({})),
        fetch('/api/notifications').then(r => r.json()).catch(() => ({})),
      ]);

      if (projData?.ok && Array.isArray(projData.projects)) setProjects(projData.projects);
      if (bookmarkData?.ok && Array.isArray(bookmarkData.bookmarks)) setBookmarks(bookmarkData.bookmarks);
      if (notifData?.ok) {
        if (Array.isArray(notifData.notifications)) setNotifications(notifData.notifications);
        if (Array.isArray(notifData.alerts)) setAlerts(notifData.alerts);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadDashboardData(); }, [loadDashboardData]);

  // The browser's back/forward cache restores this page without re-running any of the
  // effects above, so a signed-out visitor could press Back into the dashboard they just
  // left. Re-checking the session on a restored page bounces them home instead.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void loadDashboardData();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [loadDashboardData]);

  // Deep-link support (?tab=bookmarks) without pulling useSearchParams into this
  // client page, which would force a Suspense boundary at build time.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && (Object.keys(SECTION_TITLES) as string[]).includes(tab)) setSection(tab as SectionKey);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          kind: createKind,
        }),
      });
      const data = await res.json();
      if (data.ok && data.project) {
        setProjects(prev => [data.project, ...prev]);
        setCreateModalOpen(false);
        const target = createKind === 'cover-letter'
          ? `/coverletter?project=${data.project.id}`
          : `/builder?project=${data.project.id}`;
        setNewTitle('');
        setNewDesc('');
        router.push(target);
      } else {
        alert(data.error || 'Could not create project');
      }
    } catch {
      alert('Network error while creating project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.project) setProjects(prev => [data.project, ...prev]);
    } catch {
      alert('Failed to duplicate project');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) setProjects(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Failed to delete project');
    }
  };

  const handleSaveRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      if (res.ok) {
        setProjects(prev => prev.map(p => (p.id === id ? { ...p, title: renameValue.trim() } : p)));
        setRenameId(null);
      }
    } catch {
      alert('Failed to rename project');
    }
  };

  const removeBookmark = async (jobId: string) => {
    setBookmarks(prev => prev.filter(b => b.jobId !== jobId));
    try {
      await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
    } catch {
      void loadDashboardData();
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {}
  };

  /**
   * Rename the profile.
   *
   * The response re-issues the session cookie with the new name, so the header chip and
   * the rail stop showing the old one without waiting for the next sign-in.
   */
  const saveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileBusy(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setProfileMsg({ ok: false, text: data.error || 'Could not save the profile name.' });
        return;
      }
      setUser(prev => (prev ? { ...prev, name: data.user?.name ?? prev.name } : prev));
      setProfileName(data.user?.name ?? profileName);
      setProfileMsg({ ok: true, text: data.message || 'Profile name updated.' });
    } catch {
      setProfileMsg({ ok: false, text: 'Connection error. Please try again.' });
    } finally {
      setProfileBusy(false);
    }
  };

  /**
   * Sign out, then leave the dashboard entirely.
   *
   * A full navigation (not a client-side push) is deliberate: it drops every dashboard
   * component and its cached account data, so a signed-out visitor can never end up
   * looking at the previous user's shell from memory or the back button.
   */
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') window.location.assign('/');
      else router.push('/');
    }
  };

  const openCreate = (kind: 'pds' | 'cover-letter') => {
    setCreateKind(kind);
    setNewTitle(kind === 'cover-letter' ? 'Cover Letter — ' : '');
    setCreateModalOpen(true);
  };

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [projects, searchQuery]
  );

  const mostRecent = projects[0] || null;
  const avgCompletion = projects.length
    ? Math.round(projects.reduce((sum, p) => sum + (p.completionRate ?? 0), 0) / projects.length)
    : 0;

  // Pepper's pipeline columns, keyed off how far each document actually is.
  const pipeline = useMemo(() => {
    const columns = [
      { key: 'draft', title: 'Draft', accent: '#38bdf8', test: (p: Project) => (p.completionRate ?? 0) < 35 },
      { key: 'progress', title: 'In Progress', accent: '#a855f7', test: (p: Project) => (p.completionRate ?? 0) >= 35 && (p.completionRate ?? 0) < 75 },
      { key: 'ready', title: 'Ready to Submit', accent: '#f97316', test: (p: Project) => (p.completionRate ?? 0) >= 75 && (p.completionRate ?? 0) < 100 },
      { key: 'done', title: 'Complete', accent: '#facc15', test: (p: Project) => (p.completionRate ?? 0) >= 100 },
    ];
    return columns.map(c => ({ ...c, items: projects.filter(c.test) }));
  }, [projects]);

  const tabs = [
    { key: 'projects' as SectionKey, label: 'Projects', count: projects.length },
    { key: 'bookmarks' as SectionKey, label: 'Bookmarks', count: bookmarks.length },
    { key: 'notifications' as SectionKey, label: 'Notifications', count: unreadCount },
    { key: 'profile' as SectionKey, label: 'Alerts', count: alerts.length },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <RefreshCw size={34} className="animate-spin" style={{ color: '#06b6d4' }} />
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading your dashboard…</p>
      </div>
    );
  }

  const rail = (
    <aside className="dash-rail" style={{ background: 'linear-gradient(180deg, #0b0f1a 0%, #070a12 100%)' }}>
      <div className="dash-rail-head">
        <Link href="/" className="dash-rail-brand" aria-label="CareerForm PH home">
          <BrandMark height={38}/>
        </Link>
        <button
          type="button"
          className="dash-bell"
          onClick={() => { setBellOpen(o => !o); setSection('notifications'); }}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          title={unreadCount ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications'}
        >
          {unreadCount > 0 ? <BellRing size={19} /> : <Bell size={19} />}
          {unreadCount > 0 && <span className="dash-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </div>

      <nav className="dash-rail-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = section === item.key;
          const badge =
            item.key === 'projects' ? projects.length
            : item.key === 'bookmarks' ? bookmarks.length
            : null;
          return (
            <button
              key={item.key}
              type="button"
              className={`dash-rail-item ${active ? 'active' : ''}`}
              onClick={() => { setSection(item.key); setRailOpen(false); }}
              aria-current={active ? 'page' : undefined}
              title={item.hint}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {badge !== null && badge > 0 && <b className="dash-rail-count">{badge}</b>}
            </button>
          );
        })}
      </nav>

      {/* Donate / Support lives in the rail's empty middle stretch now, so the account
          card below stays a single clean row instead of a crowded stack of two. */}
      <div className="dash-rail-support">
        <TipJarButton onClick={() => setTipModalOpen(true)} />
      </div>

      <div className="dash-rail-foot">
        <div className="dash-rail-user">
          <span className="dash-rail-avatar">{(user?.name || user?.email || 'U')[0].toUpperCase()}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong>{user?.name || 'Applicant'}</strong>
            <em>{user?.email}</em>
          </span>
          <button type="button" className="dash-ghost-btn" style={{ width: 34, flexShrink: 0 }} onClick={handleSignOut} title="Sign out" aria-label="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="dash-shell">
      <button
        type="button"
        className="dash-rail-toggle"
        onClick={() => setRailOpen(o => !o)}
        aria-label="Toggle dashboard menu"
      >
        <Menu size={18} />
      </button>

      <div className={railOpen ? 'dash-rail-wrap open' : 'dash-rail-wrap'}>{rail}</div>

      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <p className="dash-crumb">
              Home <span>/</span> {SECTION_TITLES[section]}
            </p>
            <h1 className="dash-title">{SECTION_TITLES[section]}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/jobs" className="dash-ghost-btn" style={{ gap: 6, width: 'auto', padding: '0 12px' }}>
              <Briefcase size={14} /> Job board
            </Link>
            <button type="button" className="dash-ghost-btn" style={{ gap: 6, width: 'auto', padding: '0 12px' }} onClick={() => openCreate('cover-letter')}>
              <Mail size={14} /> Create Cover Letter
            </button>
            <button type="button" className="dash-primary-btn" onClick={() => openCreate('pds')}>
              <Plus size={16} /> New PDS Project
            </button>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="dash-ghost-btn"
                style={{ width: 38 }}
                onClick={() => { setBellOpen(o => !o); setSection('notifications'); }}
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              >
                {unreadCount > 0 ? <BellRing size={16} /> : <Bell size={16} />}
                {unreadCount > 0 && <span className="dash-bell-badge" style={{ top: 2, right: 2 }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
            </div>
          </div>
        </header>

        {/* Pepper's count-carrying tab strip */}
        <div className="dash-tabs" role="tablist">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={section === t.key}
              className={`dash-tab ${section === t.key ? 'active' : ''}`}
              onClick={() => setSection(t.key)}
            >
              {t.label}
              <b>{t.count}</b>
            </button>
          ))}
        </div>

        <div className="dash-body">
          {/* ---------------- OVERVIEW ---------------- */}
          {section === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <section className="dash-stats">
                {[
                  { label: 'PDS Projects', value: projects.length, icon: FileText, accent: '#06b6d4' },
                  { label: 'Average Completion', value: `${avgCompletion}%`, icon: TrendingUp, accent: '#38bdf8' },
                  { label: 'Bookmarked Jobs', value: bookmarks.length, icon: Bookmark, accent: '#a855f7' },
                  { label: 'Unread Notifications', value: unreadCount, icon: Bell, accent: '#f59e0b' },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="dash-stat">
                      <span className="dash-stat-icon" style={{ color: stat.accent, background: `${stat.accent}1f` }}>
                        <Icon size={17} />
                      </span>
                      <div>
                        <strong style={{ color: stat.accent }}>{stat.value}</strong>
                        <em>{stat.label}</em>
                      </div>
                    </div>
                  );
                })}
              </section>

              {mostRecent && (
                <section className="dash-resume">
                  <span className="dash-resume-icon"><Zap size={20} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className="dash-kicker">Quick Resume · Last session</p>
                    <h3>{mostRecent.title}</h3>
                    <p className="dash-muted">{mostRecent.completionRate ?? 0}% complete · edited {formatWhen(mostRecent.lastModified)}</p>
                  </div>
                  <Link href={`/builder?project=${mostRecent.id}`} className="dash-primary-btn">
                    Continue Editing <ArrowRight size={15} />
                  </Link>
                </section>
              )}

              <section>
                <div className="dash-section-head">
                  <div>
                    <h2>Project Pipeline</h2>
                    <p className="dash-muted">Your documents grouped by how close they are to submission.</p>
                  </div>
                </div>
                <div className="dash-kanban">
                  {pipeline.map(col => (
                    <div key={col.key} className="dash-column">
                      <span className="dash-column-bar" style={{ background: col.accent }} />
                      <div className="dash-column-head">
                        <strong>{col.title}</strong>
                        <b>{col.items.length}</b>
                      </div>
                      <div className="dash-column-body">
                        {col.items.length === 0 && <p className="dash-column-empty">Nothing here yet</p>}
                        {col.items.slice(0, 6).map(p => (
                          <Link key={p.id} href={`/builder?project=${p.id}`} className="dash-card">
                            <strong>{p.title}</strong>
                            <span className="dash-card-meta">
                              <i style={{ width: `${p.completionRate ?? 0}%` }} />
                            </span>
                            <em>{p.completionRate ?? 0}% · {formatWhen(p.lastModified)}</em>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {bookmarks.length > 0 && (
                <section>
                  <div className="dash-section-head">
                    <div>
                      <h2>Saved Jobs</h2>
                      <p className="dash-muted">Bookmarked from the Government Jobs board.</p>
                    </div>
                    <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 12px' }} onClick={() => setSection('bookmarks')}>
                      View all <ArrowRight size={13} />
                    </button>
                  </div>
                  <div className="dash-job-grid">
                    {bookmarks.slice(0, 3).map(b => (
                      <BookmarkCard key={b.id} row={b} onRemove={() => removeBookmark(b.jobId)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ---------------- PROJECTS ---------------- */}
          {section === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="dash-search-row">
                <div className="dash-search">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search projects…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <span className="dash-muted">{filteredProjects.length} of {projects.length}</span>
              </div>

              {filteredProjects.length === 0 ? (
                <EmptyState
                  title={searchQuery ? 'No matching projects' : 'No projects yet'}
                  body={searchQuery ? `Nothing matched "${searchQuery}".` : 'Start your official 2026 Civil Service Personal Data Sheet — it saves to your account automatically.'}
                  onCreate={() => openCreate('pds')}
                />
              ) : (
                <div className="dash-project-grid">
                  {filteredProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isRenaming={renameId === project.id}
                      renameValue={renameValue}
                      onRenameValue={setRenameValue}
                      onStartRename={() => { setRenameId(project.id); setRenameValue(project.title); }}
                      onSaveRename={() => handleSaveRename(project.id)}
                      onCancelRename={() => setRenameId(null)}
                      onDuplicate={() => handleDuplicate(project.id)}
                      onDelete={() => handleDelete(project.id, project.title)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- RECENT ---------------- */}
          {section === 'recent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {notifications.length === 0 && projects.length === 0 && (
                <EmptyState title="No activity yet" body="Open a project and your recent work will show up here." onCreate={() => openCreate('pds')} />
              )}
              {projects.slice(0, 8).map(p => (
                <Link key={p.id} href={`/builder?project=${p.id}`} className="dash-recent-row">
                  <span className="dash-recent-icon"><FileText size={16} /></span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <strong>{p.title}</strong>
                    <em>{p.description || 'Personal Data Sheet (CS Form 212, Revised 2026)'}</em>
                  </span>
                  <span className="dash-recent-pct">{p.completionRate ?? 0}%</span>
                  <span className="dash-muted" style={{ whiteSpace: 'nowrap' }}>{formatWhen(p.lastModified)}</span>
                  <ExternalLink size={14} style={{ color: '#64748b' }} />
                </Link>
              ))}
              {notifications.slice(0, 5).map(n => (
                <div key={n.id} className="dash-recent-row" style={{ cursor: 'default' }}>
                  <span className="dash-recent-icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)' }}><Bell size={15} /></span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <strong>{n.title}</strong>
                    <em>{n.body}</em>
                  </span>
                  <span className="dash-muted" style={{ whiteSpace: 'nowrap' }}>{formatWhen(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ---------------- BOOKMARKS ---------------- */}
          {section === 'bookmarks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="dash-section-head">
                <div>
                  <h2>Bookmarked Jobs ({bookmarks.length})</h2>
                  <p className="dash-muted">Every job you starred is kept in your account and follows you to any device.</p>
                </div>
                <Link href="/jobs" className="dash-primary-btn">Browse job board <ArrowRight size={14} /></Link>
              </div>
              {bookmarks.length === 0 ? (
                <EmptyState
                  title="No bookmarks yet"
                  body="Open any posting on the Government Jobs board and tap Save — it lands here."
                  action={<Link href="/jobs" className="dash-primary-btn">Browse jobs <ArrowRight size={14} /></Link>}
                />
              ) : (
                <div className="dash-job-grid">
                  {bookmarks.map(b => (
                    <BookmarkCard key={b.id} row={b} onRemove={() => removeBookmark(b.jobId)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- PLAN ---------------- */}
          {section === 'plan' && (
            <div className="dash-plan-wrap">
              <section className="dash-plan-card">
                <p className="dash-kicker">Current plan</p>
                <h2 style={{ margin: '4px 0 6px' }}>Free Tier</h2>
                <p className="dash-muted" style={{ marginBottom: 14 }}>
                  Every official tool is unlocked. No credit card, no trial timer, no watermark.
                </p>
                <ul className="dash-plan-list">
                  <li><CheckCircle2 size={15} /> Unlimited CS Form 212 (Revised 2026) PDS documents</li>
                  <li><CheckCircle2 size={15} /> Cloud sync of every project to your account</li>
                  <li><CheckCircle2 size={15} /> Application &amp; transmittal letter studio</li>
                  <li><CheckCircle2 size={15} /> Job bookmarks plus device job alerts</li>
                  <li><CheckCircle2 size={15} /> Work Experience Sheet (WES) annex builder</li>
                </ul>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                  <button type="button" className="dash-primary-btn" onClick={() => openCreate('cover-letter')}>
                    <Mail size={15} /> Create Cover Letter
                  </button>
                  <Link href="/builder" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 14px', gap: 6 }}>
                    <FileText size={14} /> Open PDS Builder
                  </Link>
                </div>
              </section>

              <section className="dash-plan-card">
                <p className="dash-kicker">Pro roadmap</p>
                <h2 style={{ margin: '4px 0 6px' }}>Coming next</h2>
                <ul className="dash-plan-list muted">
                  <li><Sparkles size={15} /> AI-assisted accomplishment writing</li>
                  <li><Sparkles size={15} /> Bulk apply across agencies</li>
                  <li><Sparkles size={15} /> Notarisation tracking for notarised PDS</li>
                  <li><Sparkles size={15} /> Agency-specific document checklists</li>
                </ul>
                <p className="dash-muted" style={{ marginTop: 14 }}>
                  Your free tier stays free — Pro only adds automation.
                </p>
              </section>
            </div>
          )}

          {/* ---------------- MANAGE PROFILE ----------------
              Deliberately mirrors Account & Security: the same identity fields, the same
              wording, so the two screens can never tell a different story about who you
              are signed in as. */}
          {section === 'profile' && (
            <div className="dash-plan-wrap">
              <section className="dash-plan-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
                  <span className="dash-rail-avatar" style={{ width: 58, height: 58, fontSize: 24, borderRadius: 18 }}>
                    {(user?.name || user?.email || 'U')[0].toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0 }}>{user?.name || 'Applicant'}</h2>
                    <p className="dash-muted" style={{ margin: '2px 0 0', wordBreak: 'break-all' }}>{user?.email}</p>
                  </div>
                  <span className="dash-pill" style={{ marginLeft: 'auto' }}>
                    <ShieldCheck size={13} /> Signed in securely
                  </span>
                </div>

                <h3 className="dash-subhead">Account details</h3>
                <div className="dash-kv">
                  <div>
                    <span>Email address used at sign-up</span>
                    <strong style={{ wordBreak: 'break-all' }}>{user?.email || '—'}</strong>
                  </div>
                  <div>
                    <span>Username</span>
                    <strong>{user?.username || 'Not chosen yet'}</strong>
                  </div>
                  <div>
                    <span>Member since</span>
                    <strong>{formatMemberSince(user?.createdAt)}</strong>
                  </div>
                  <div><span>Plan</span><strong>Free tier</strong></div>
                  <div><span>Projects stored</span><strong>{projects.length}</strong></div>
                  <div><span>Bookmarks stored</span><strong>{bookmarks.length}</strong></div>
                  <div><span>Account reference</span><strong>{user?.id?.slice(-10)}</strong></div>
                </div>

                {profileMsg && (
                  <div className={`auth-alert ${profileMsg.ok ? 'success' : 'error'}`} style={{ marginTop: 16 }}>
                    {profileMsg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                <form onSubmit={saveProfileName} className="dash-field" style={{ gap: 12, marginTop: 18 }}>
                  <label>
                    <span>Profile name</span>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder="The name shown on your dashboard"
                      autoComplete="name"
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="submit"
                      className="dash-primary-btn"
                      disabled={profileBusy || !profileName.trim() || profileName.trim() === (user?.name || '').trim()}
                    >
                      {profileBusy ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />} Save changes
                    </button>
                    <button
                      type="button"
                      className="dash-ghost-btn"
                      style={{ width: 'auto', padding: '0 14px', gap: 6 }}
                      onClick={() => { setProfileName(user?.name || ''); setProfileMsg(null); }}
                    >
                      Reset
                    </button>
                  </div>
                </form>
                <p className="dash-muted" style={{ marginTop: 12, marginBottom: 0 }}>
                  Your email address and username are how you sign in, so they stay fixed. Everything else here is yours
                  to change.
                </p>
              </section>

              <section className="dash-plan-card">
                <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={17} /> Your sign-in protection
                </h2>
                <p className="dash-muted" style={{ marginBottom: 14 }}>
                  Your password is never stored as text — it is turned into a one-way code that cannot be reversed, and
                  every session runs over an encrypted connection. Nobody at CareerForm can read your password.
                </p>
                <div className="dash-kv">
                  <div>
                    <span>Password</span>
                    <strong>{user?.hasPassword ? 'Set — encrypted, only you know it' : 'Not set yet'}</strong>
                  </div>
                  <div>
                    <span>Google account</span>
                    <strong>{user?.googleLinked ? 'Connected' : 'Not connected yet'}</strong>
                  </div>
                  <div>
                    <span>Two-factor authentication</span>
                    <strong>Optional — add it for a second lock</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                  <button
                    type="button"
                    className="dash-primary-btn"
                    onClick={() => { setSection('security'); window.scrollTo(0, 0); }}
                  >
                    <Lock size={15} /> Manage password &amp; 2FA
                  </button>
                  <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 14px', gap: 6 }} onClick={handleSignOut}>
                    <LogOut size={14} /> Sign out of this device
                  </button>
                  <Link href="/contact" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 14px', gap: 6 }}>
                    <Mail size={14} /> Request data deletion
                  </Link>
                </div>
              </section>

              <section className="dash-plan-card">
                <h2 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BellRing size={17} /> Job alert subscriptions ({alerts.length})
                </h2>
                <p className="dash-muted" style={{ marginBottom: 14 }}>
                  We notify this device the moment one of these agencies publishes a new vacancy.
                </p>
                {alerts.length === 0 ? (
                  <p className="dash-muted">
                    No agencies yet. Open any posting on the <Link href="/jobs" style={{ color: 'var(--accent,#06b6d4)' }}>job board</Link> and tap “Get Job Alerts”.
                  </p>
                ) : (
                  <div className="dash-alert-list">
                    {alerts.map(a => (
                      <span key={a.id} className="dash-pill">
                        <Bell size={12} /> {a.agencyAcronym || a.agency}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ---------------- ACCOUNT & SECURITY ---------------- */}
          {section === 'security' && <AccountSecurity onChanged={() => void loadDashboardData()} />}

          {/* ---------------- NOTIFICATIONS ---------------- */}
          {section === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="dash-section-head">
                <div>
                  <h2>Notifications</h2>
                  <p className="dash-muted">{unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}</p>
                </div>
                {unreadCount > 0 && (
                  <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 12px' }} onClick={markAllRead}>
                    <CheckCircle2 size={14} /> Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <EmptyState title="No notifications yet" body="New agency postings, bookmark confirmations and sync receipts appear here." />
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`dash-notif ${n.read ? '' : 'unread'}`}>
                    <span className="dash-notif-icon">
                      {n.type === 'bookmark' ? <Bookmark size={15} /> : n.type === 'alert' ? <BellRing size={15} /> : n.type === 'sync' ? <Cloud size={15} /> : <Bell size={15} />}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong>{n.title}</strong>
                      <p className="dash-muted" style={{ margin: '2px 0 0' }}>{n.body}</p>
                    </div>
                    {n.href && (
                      <Link href={n.href} className="dash-ghost-btn" style={{ width: 'auto', padding: '0 10px' }}>
                        Open <ArrowRight size={12} />
                      </Link>
                    )}
                    <span className="dash-muted" style={{ whiteSpace: 'nowrap' }}>{formatWhen(n.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {createModalOpen && (
        <div className="dash-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <p className="dash-kicker">New document</p>
                <h3>{createKind === 'cover-letter' ? 'Create Cover Letter' : 'Create New PDS Project'}</h3>
                <p className="dash-muted" style={{ margin: '4px 0 0' }}>
                  Name it once — the same name appears here, in your Recent list and in the builder.
                </p>
              </div>
              <button type="button" className="dash-ghost-btn" style={{ width: 34 }} onClick={() => setCreateModalOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="dash-kind-toggle">
              <button type="button" className={createKind === 'pds' ? 'active' : ''} onClick={() => setCreateKind('pds')}>
                <FileText size={14} /> PDS (CS Form 212)
              </button>
              <button type="button" className={createKind === 'cover-letter' ? 'active' : ''} onClick={() => setCreateKind('cover-letter')}>
                <Mail size={14} /> Cover Letter
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label className="dash-field">
                <span>Project Name *</span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={createKind === 'cover-letter' ? 'e.g. DSWD Social Welfare Officer II cover letter' : 'e.g. DepEd Teacher I Application'}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </label>

              <label className="dash-field">
                <span>Notes (optional)</span>
                <textarea
                  rows={2}
                  placeholder="e.g. For submission on October 2026 at the DepEd Division office"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 14px' }} onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="dash-primary-btn" disabled={isCreating}>
                  {isCreating ? 'Creating…' : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TipJarModal open={tipModalOpen} onClose={() => setTipModalOpen(false)} />

      {/* Brand mark kept off-screen — used as the favicon-sized identity in this shell. */}
      <Image src="/icon.png" alt="" width={1} height={1} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />
    </div>
  );
}

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return 'just now';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function EmptyState({ title, body, onCreate, action }: { title: string; body: string; onCreate?: () => void; action?: React.ReactNode }) {
  return (
    <div className="dash-empty">
      <FolderOpen size={40} />
      <h3>{title}</h3>
      <p className="dash-muted">{body}</p>
      {action || (onCreate && (
        <button type="button" className="dash-primary-btn" onClick={onCreate}>
          <Plus size={15} /> Create Project
        </button>
      ))}
    </div>
  );
}

function BookmarkCard({ row, onRemove }: { row: BookmarkRow; onRemove: () => void }) {
  const job = row.job || {};
  return (
    <article className="dash-job-card">
      <div className="dash-job-head">
        <span className="dash-job-icon"><Briefcase size={15} /></span>
        <span className="dash-pill">{job.agencyAcronym || 'Agency'}</span>
        <button type="button" className="dash-job-save" onClick={onRemove} title="Remove bookmark" aria-label="Remove bookmark">
          <BookmarkCheck size={15} />
        </button>
      </div>
      <h3>{job.title || 'Saved job'}</h3>
      <p className="dash-muted">{job.agency || 'Government agency'}</p>
      <div className="dash-job-meta">
        {(job.region || job.placeOfAssignment) && (
          <span><MapPin size={12} /> {job.region || job.placeOfAssignment}</span>
        )}
        {job.deadline && <span><Calendar size={12} /> {job.deadline}</span>}
        {job.salaryGrade && <span><Star size={12} /> {job.salaryGrade}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
        <Link href={`/jobs?jobId=${row.jobId}`} className="dash-primary-btn" style={{ flex: 1, justifyContent: 'center' }}>
          <Send size={14} /> Apply / Details
        </Link>
        <button type="button" className="dash-ghost-btn" style={{ width: 38 }} onClick={onRemove} title="Remove">
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function ProjectCard({
  project,
  isRenaming,
  renameValue,
  onRenameValue,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  isRenaming: boolean;
  renameValue: string;
  onRenameValue: (v: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isLetter = project.kind === 'cover-letter';
  return (
    <article className="dash-project-card">
      <div className="dash-project-top">
        <span className="dash-project-icon">
          {isLetter ? <Mail size={17} /> : <FileText size={17} />}
        </span>
        <span className={`dash-pill ${isLetter ? 'amber' : ''}`}>{isLetter ? 'Cover letter' : 'PDS 2026'}</span>
      </div>

      {isRenaming ? (
        <div style={{ display: 'flex', gap: 6, margin: '10px 0 8px' }}>
          <input
            className="dash-rename-input"
            type="text"
            value={renameValue}
            autoFocus
            onChange={e => onRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSaveRename(); if (e.key === 'Escape') onCancelRename(); }}
          />
          <button type="button" className="dash-primary-btn" style={{ padding: '0 12px' }} onClick={onSaveRename}>Save</button>
          <button type="button" className="dash-ghost-btn" style={{ width: 'auto', padding: '0 10px' }} onClick={onCancelRename}>Cancel</button>
        </div>
      ) : (
        <h3>
          <span>{project.title}</span>
          <button type="button" className="dash-icon-btn" onClick={onStartRename} title="Rename project">
            <Edit3 size={12} />
          </button>
        </h3>
      )}

      {project.description && <p className="dash-muted dash-clamp">{project.description}</p>}

      <div className="dash-progress">
        <div className="dash-progress-head">
          <span>Completion</span>
          <strong>{project.completionRate ?? 0}%</strong>
        </div>
        <span className="dash-progress-track"><i style={{ width: `${project.completionRate ?? 0}%` }} /></span>
      </div>

      <p className="dash-muted" style={{ margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Clock size={12} /> Edited {formatWhen(project.lastModified)}
      </p>

      <div className="dash-project-actions">
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="dash-ghost-btn" style={{ width: 34 }} title="Duplicate project" onClick={onDuplicate}>
            <Copy size={13} />
          </button>
          <button type="button" className="dash-ghost-btn danger" style={{ width: 34 }} title="Delete project" onClick={onDelete}>
            <Trash2 size={13} />
          </button>
        </div>
        <Link href={isLetter ? `/coverletter?project=${project.id}` : `/builder?project=${project.id}`} className="dash-primary-btn">
          Open <ExternalLink size={13} />
        </Link>
      </div>
    </article>
  );
}
