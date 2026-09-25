'use client';

import React, {useState, useEffect, useMemo} from 'react';


import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  Search,
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  FileText,
  Mail,
  Shield,
  Users,
  Bookmark,
  BookmarkCheck,
  Loader2,
} from 'lucide-react';
import BrandMark from '@/components/brand-logo';
import {
  GOVERNMENT_JOBS,
  GovernmentJob,
  getDynamicGovernmentJobs,
  TOP_HIRING_AGENCIES,
  PHILIPPINE_REGIONS,
  PHILIPPINE_AGENCIES,
} from '@/lib/government-jobs';
import JobDetailsModal from '@/components/job-details-modal';
import ApplicationLetterModal from '@/components/application-letter-modal';

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<GovernmentJob[]>(() => getDynamicGovernmentJobs(new Date()));
  const [syncedTime, setSyncedTime] = useState<string>('just now');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedJob, setSelectedJob] = useState<GovernmentJob | null>(null);
  const [letterJob, setLetterJob] = useState<GovernmentJob | null>(null);

  // Bookmarks live in the signed-in user's account, so the same job list is
  // starred on every device and mirrored in the dashboard's Bookmarks tab.
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [bookmarkBusy, setBookmarkBusy] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userRes = await fetch('/api/auth/me');
        const userData = await userRes.json();
        if (!userData?.ok || !userData.user) return;
        if (!cancelled) setSignedIn(true);
        const res = await fetch('/api/bookmarks');
        const data = await res.json();
        if (data?.ok && Array.isArray(data.bookmarks) && !cancelled) {
          setSavedIds(data.bookmarks.map((b: { jobId: string }) => b.jobId));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleBookmark = async (job: GovernmentJob) => {
    if (!signedIn) {
      router.push('/?action=signin');
      return;
    }
    const isSaved = savedIds.includes(job.id);
    setBookmarkBusy(job.id);
    // Optimistic flip so the star reacts instantly, then reconcile with the server.
    setSavedIds(prev => (isSaved ? prev.filter(id => id !== job.id) : [...prev, job.id]));
    try {
      const res = await fetch('/api/bookmarks', {
        method: isSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, job }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error('failed');
      if (Array.isArray(data.savedIds)) setSavedIds(data.savedIds);
    } catch {
      setSavedIds(prev => (isSaved ? [...prev, job.id] : prev.filter(id => id !== job.id)));
    } finally {
      setBookmarkBusy(null);
    }
  };

  const fetchLiveJobs = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/jobs?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          if (data.syncedFormatted) setSyncedTime(data.syncedFormatted);
        }
      }
    } catch {
      setJobs(getDynamicGovernmentJobs(new Date()));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchLiveJobs();
    const interval = setInterval(fetchLiveJobs, 45000);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.agency.toLowerCase().includes(search.toLowerCase()) ||
        job.placeOfAssignment.toLowerCase().includes(search.toLowerCase()) ||
        job.competency.toLowerCase().includes(search.toLowerCase()) ||
        job.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchAgency =
        selectedAgency === 'All' ||
        job.agencyAcronym === selectedAgency ||
        job.agency.toLowerCase().includes(selectedAgency.toLowerCase());
      const matchRegion =
        selectedRegion === 'All' ||
        job.region === selectedRegion ||
        job.region.toLowerCase().includes(selectedRegion.split(' - ')[0].toLowerCase().trim()) ||
        (selectedRegion.includes('Central Visayas') && (job.region.toLowerCase().includes('cebu') || job.placeOfAssignment.toLowerCase().includes('cebu')));
      return matchSearch && matchAgency && matchRegion;
    });
  }, [jobs, search, selectedAgency, selectedRegion]);

  const closingSoonJobs = useMemo(() => {
    return jobs.filter(j => j.isClosingSoon);
  }, [jobs]);


  const handleProceedToPds = (job: GovernmentJob) => {
    setLetterJob(null);
    router.push(`/builder?position=${encodeURIComponent(job.title)}&agency=${encodeURIComponent(job.agency)}`);
  };

  return (
    <div
      className="app-shell"
      style={{
        minHeight: '100vh',
        // Transparent so the site-wide animated field shows through, edge to edge.
        background: 'transparent',
        color: '#f8fafc',
        fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
      }}
    >
      {/* Top Navbar — a secondary toolbar pinned under the main site navigation */}
      <header
        className="workspace-chrome jobs-toolbar"
        style={{
          position: 'sticky',
          top: 'var(--site-nav-h-compact, 112px)',
          zIndex: 20,
          height: 'auto',
          minHeight: '64px',
          padding: '10px 18px',
          gap: '18px',
          flexWrap: 'wrap',
          background: 'rgba(3, 7, 18, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div className="wc-left">
          <Link className="wc-brand" href="/" aria-label="CareerForm PH home">
            <span className="flex items-center gap-2 select-none">
              <BrandMark height={24}/>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#06b6d4]">
                GOV JOBS PH
              </span>
            </span>
          </Link>
        </div>
        <div className="wc-right" style={{display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap'}}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: '#94a3b8',
              paddingRight: '4px',
            }}
          >
            <Shield size={13} color="#10b981" />
            {savedIds.length > 0 ? `${savedIds.length} bookmarked` : 'CSC verified postings'}
          </span>
          <Link
            href="/builder"
            className="wc-btn wc-btn-secondary"
            style={{display: 'flex', alignItems: 'center', gap: '6px'}}
          >
            <FileText size={14} /> Create PDS
          </Link>
          <Link
            href="/coverletter"
            className="wc-btn wc-btn-secondary"
            style={{display: 'flex', alignItems: 'center', gap: '6px'}}
          >
            <Mail size={14} /> Application Letter
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <section
        style={{
          padding: '48px 24px 32px',
          background: 'radial-gradient(ellipse at 50% -20%, rgba(6, 182, 212, 0.15), transparent 70%)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div className="container" style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#06b6d4',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <Shield size={14} /> Civil Service Commission Official Vacancies
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            Philippine Government Career Portal
          </h1>
          <p style={{fontSize: '16px', color: '#94a3b8', maxWidth: '640px', lineHeight: 1.6, margin: '0 0 28px'}}>
            Browse verified national and regional civil service career opportunities. Create your CS Form 212 (Revised 2026) and generate tailored cover letters in minutes.
          </p>

          {/* Quick Metrics Bar (Image 1 match) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{background: '#090d16', padding: '16px 20px', borderRadius: '12px', border: '1px solid #1e293b'}}>
              <span style={{fontSize: '12px', color: '#94a3b8', display: 'block'}}>Total Active Jobs</span>
              <strong style={{fontSize: '28px', color: '#06b6d4', fontWeight: 800}}>61</strong>
            </div>
            <div style={{background: '#090d16', padding: '16px 20px', borderRadius: '12px', border: '1px solid #1e293b'}}>
              <span style={{fontSize: '12px', color: '#94a3b8', display: 'block'}}>New Jobs Posted</span>
              <strong style={{fontSize: '28px', color: '#10b981', fontWeight: 800}}>6</strong>
            </div>
            <div style={{background: '#090d16', padding: '16px 20px', borderRadius: '12px', border: '1px solid #1e293b'}}>
              <span style={{fontSize: '12px', color: '#94a3b8', display: 'block'}}>Closing This Week</span>
              <strong style={{fontSize: '28px', color: '#f59e0b', fontWeight: 800}}>40</strong>
            </div>
            <div style={{background: '#090d16', padding: '16px 20px', borderRadius: '12px', border: '1px solid #1e293b'}}>
              <span style={{fontSize: '12px', color: '#94a3b8', display: 'block'}}>Hiring Agencies</span>
              <strong style={{fontSize: '28px', color: '#a855f7', fontWeight: 800}}>24</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="container" style={{maxWidth: '1200px', margin: '32px auto', padding: '0 24px'}}>
        {/* Urgent Closing Soon Banner (Image 1 match) */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            borderRadius: '14px',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            padding: '20px 24px',
            marginBottom: '32px',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '18px'}}>⏰</span>
              <h3 style={{fontSize: '17px', fontWeight: 700, margin: 0, color: '#f8fafc'}}>Jobs Closing Soon</h3>
              <span style={{fontSize: '12px', color: '#94a3b8', marginLeft: '6px'}}>(Deadlines within 7 days)</span>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px'}}>
            {closingSoonJobs.map(job => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                style={{
                  padding: '14px 16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px'}}>
                  <strong style={{fontSize: '14px', color: '#f8fafc', display: 'block'}}>{job.title}</strong>
                  {job.isDeadlineToday ? (
                    <span
                      style={{
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      DEADLINE TODAY ({job.deadline})
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      Closing in {job.daysLeft} days • {job.deadline}
                    </span>
                  )}
                </div>
                <div style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>
                  {job.agency} ({job.agencyAcronym})
                </div>
                <div style={{fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <MapPin size={11} /> {job.placeOfAssignment}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center'}}>
          <div style={{position: 'relative', flex: '1 1 300px'}}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by position title, agency, or skills..."
              style={{
                width: '100%',
                padding: '12px 16px 12px 40px',
                borderRadius: '10px',
                background: '#090d16',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <select
              value={selectedAgency}
              onChange={e => setSelectedAgency(e.target.value)}
              aria-label="Filter by Agency"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#090d16',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Agencies</option>
              {PHILIPPINE_AGENCIES.map(a => (
                <option key={a.acronym} value={a.acronym}>
                  {a.acronym} — {a.name}
                </option>
              ))}
            </select>

            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              aria-label="Filter by Region"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#090d16',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Regions</option>
              {PHILIPPINE_REGIONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Job Listings Grid matching Image 1: View Details Only */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2 style={{fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc'}}>
              Latest Government Job Openings ({filteredJobs.length})
            </h2>
          </div>

          {filteredJobs.map(job => (
            <div
              key={job.id}
              style={{
                background: '#090d16',
                borderRadius: '12px',
                border: '1px solid #1e293b',
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{flex: '1 1 450px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#f8fafc',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {job.title} <ChevronRight size={16} color="#64748b" />
                  </button>
                  {job.isPostedToday ? (
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{width: 5, height: 5, borderRadius: '50%', background: '#10b981'}} />
                      POSTED TODAY
                    </span>
                  ) : (
                    <span
                      style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      LATEST JOB POST
                    </span>
                  )}
                </div>

                <div style={{display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: '#94a3b8'}}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <Building2 size={13} color="#64748b" /> {job.agency} ({job.agencyAcronym})
                  </span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <MapPin size={13} color="#64748b" /> {job.region}
                  </span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 600}}>
                    <Calendar size={13} color="#38bdf8" /> Posted: {job.postedDate}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: job.isDeadlineToday ? '#ef4444' : (job.isClosingSoon ? '#f59e0b' : '#94a3b8'),
                      fontWeight: 600,
                    }}
                  >
                    <Clock size={13} color={job.isDeadlineToday ? '#ef4444' : (job.isClosingSoon ? '#f59e0b' : '#64748b')} />
                    Deadline: {job.deadline} {job.isDeadlineToday ? '(Today)' : ''}
                  </span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <Users size={13} color="#64748b" /> {job.vacancies} Vacancy
                  </span>
                </div>
              </div>

              {/* Bookmark + View Details */}
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <button
                  type="button"
                  onClick={() => toggleBookmark(job)}
                  aria-pressed={savedIds.includes(job.id)}
                  title={savedIds.includes(job.id) ? 'Remove from bookmarks' : 'Save job to bookmarks'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: savedIds.includes(job.id) ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.04)',
                    color: savedIds.includes(job.id) ? '#06b6d4' : '#94a3b8',
                    border: `1px solid ${savedIds.includes(job.id) ? 'rgba(6, 182, 212, 0.45)' : '#1e293b'}`,
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: bookmarkBusy === job.id ? 'progress' : 'pointer',
                  }}
                >
                  {bookmarkBusy === job.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : savedIds.includes(job.id) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  {savedIds.includes(job.id) ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedJob(job)}
                  style={{
                    background: '#f59e0b',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(245, 158, 11, 0.25)',
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Top Hiring Agencies & Regions */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', borderTop: '1px solid #1e293b', paddingTop: '32px'}}>
          <div>
            <h3 style={{fontSize: '16px', fontWeight: 800, margin: '0 0 14px', color: '#f8fafc'}}>
              🏢 Top Hiring Agencies
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {TOP_HIRING_AGENCIES.map(a => (
                <div
                  key={a.code}
                  onClick={() => setSelectedAgency(a.code)}
                  style={{
                    background: '#090d16',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{fontSize: '13px', color: '#f8fafc'}}>{a.name}</span>
                  <span style={{fontSize: '11px', color: '#06b6d4', fontWeight: 700}}>{a.jobsCount} jobs</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{fontSize: '16px', fontWeight: 800, margin: '0 0 14px', color: '#f8fafc'}}>
              📍 Browse by Region
            </h3>
            <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
              {PHILIPPINE_REGIONS.map(reg => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedRegion(reg)}
                  style={{
                    padding: '6px 12px',
                    background: selectedRegion === reg ? '#06b6d4' : '#090d16',
                    color: selectedRegion === reg ? '#000' : '#cbd5e1',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                  }}
                >
                  {reg}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* JOB DETAILS MODAL (Image 3) */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          isSaved={savedIds.includes(selectedJob.id)}
          onToggleBookmark={toggleBookmark}
          onOpenLetterStudio={job => {
            setSelectedJob(null);
            setLetterJob(job);
          }}
        />
      )}

      {/* APPLICATION LETTER STUDIO MODAL (Image 4) */}
      {letterJob && (
        <ApplicationLetterModal
          job={letterJob}
          onClose={() => handleProceedToPds(letterJob)}
          onProceedToPds={() => handleProceedToPds(letterJob)}
        />
      )}
    </div>
  );
}
