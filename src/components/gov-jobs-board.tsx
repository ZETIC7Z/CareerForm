'use client';

import React, {useState, useEffect, useMemo} from 'react';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  Flame,
  Building2,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Clock,
  Briefcase,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  GOVERNMENT_JOBS,
  GovernmentJob,
  getDynamicGovernmentJobs,
  TOP_HIRING_AGENCIES,
  PHILIPPINE_REGIONS,
} from '@/lib/government-jobs';
import JobDetailsModal from '@/components/job-details-modal';
import ApplicationLetterModal from '@/components/application-letter-modal';

export default function GovJobsBoard() {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<GovernmentJob | null>(null);
  const [letterJob, setLetterJob] = useState<GovernmentJob | null>(null);
  const [jobs, setJobs] = useState<GovernmentJob[]>(() => getDynamicGovernmentJobs(new Date()));
  const [syncedTime, setSyncedTime] = useState<string>('just now');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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
      // Fallback silently to client dynamic generator
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

  const closingSoonJobs = useMemo(() => {
    return jobs.filter(j => j.isClosingSoon);
  }, [jobs]);

  const latestJobs = useMemo(() => {
    return jobs.slice(0, 10);
  }, [jobs]);

  const newJobsToday = useMemo(() => {
    return jobs.filter(j => j.isPostedToday);
  }, [jobs]);

  const handleOpenLetterStudio = (job: GovernmentJob) => {
    setSelectedJob(null);
    setLetterJob(job);
  };

  const handleProceedToPds = (job: GovernmentJob) => {
    setLetterJob(null);
    router.push(`/builder?position=${encodeURIComponent(job.title)}&agency=${encodeURIComponent(job.agency)}`);
  };


  return (
    <div
      className="gov-jobs-board"
      style={{
        fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
        color: '#f8fafc',
      }}
    >
      {/* Real-time CSC Sync Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '8px',
          padding: '8px 16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8'}}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
            }}
          />
          <span style={{color: '#f8fafc', fontWeight: 600}}>Realtime CSC Portal Sync</span>
          <span>• Auto-synchronized ({syncedTime})</span>
        </div>
        <button
          type="button"
          onClick={fetchLiveJobs}
          disabled={isSyncing}
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '4px 10px',
            cursor: isSyncing ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isSyncing ? 'Syncing...' : 'Sync Live Now ↻'}
        </button>
      </div>

      {/* 1. JOBS CLOSING SOON */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{fontSize: '18px'}}>⏰</span>
            <h3 style={{fontSize: '15px', fontWeight: 800, margin: 0, color: '#f8fafc'}}>
              Jobs Closing Soon
            </h3>
          </div>
          <span
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            Urgent: Deadlines within 7 days
          </span>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {closingSoonJobs.slice(0, 5).map(job => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div>
                <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>
                  {job.title}
                </strong>
                <span className="muted" style={{fontSize: '11px'}}>
                  {job.agency} ({job.agencyAcronym}) • {job.placeOfAssignment}
                </span>
              </div>
              <div style={{textAlign: 'right'}}>
                {job.isDeadlineToday ? (
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#ef4444',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    DEADLINE TODAY ({job.deadline})
                  </span>
                ) : (
                  <span style={{color: '#f59e0b', fontSize: '11px', fontWeight: 700}}>
                    Closing in {job.daysLeft} days • {job.deadline}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop: '12px'}}>
          <Link
            href="/jobs"
            style={{fontSize: '12px', color: '#38bdf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px'}}
          >
            View all closing soon jobs →
          </Link>
        </div>
      </div>


      {/* 2. THREE METRICS BOXES (Image 1 match) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <span style={{fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
            Total Active Jobs
          </span>
          <div style={{fontSize: '32px', fontWeight: 900, color: '#f8fafc', marginTop: '4px'}}>
            61
          </div>
        </div>

        <div
          style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <span style={{fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
              New Jobs Posted
            </span>
            <div style={{fontSize: '32px', fontWeight: 900, color: '#f8fafc', marginTop: '4px'}}>
              6
            </div>
          </div>
          <Link href="/jobs" style={{fontSize: '11px', color: '#38bdf8', fontWeight: 600}}>
            View jobs →
          </Link>
        </div>

        <div
          style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <span style={{fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
            New This Week
          </span>
          <div style={{fontSize: '32px', fontWeight: 900, color: '#f8fafc', marginTop: '4px'}}>
            40
          </div>
        </div>
      </div>

      {/* 3. LATEST GOVERNMENT JOBS (Image 1 match) */}
      <div style={{marginBottom: '36px'}}>
        <h2 style={{fontSize: '20px', fontWeight: 800, margin: '0 0 16px', color: '#f8fafc'}}>
          Latest Government Jobs
        </h2>

        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {latestJobs.map(job => (
            <div
              key={job.id}
              style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div style={{flex: '1 1 400px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    style={{
                      fontSize: '15px',
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
                    {job.title} <ChevronRight size={15} color="#64748b" />
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

              {/* View Details Amber Button (Exact match to Image 1) */}
              <div>
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
                    transition: 'opacity 0.15s ease, transform 0.1s ease',
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop: '18px'}}>
          <Link
            href="/jobs"
            className="btn btn-primary"
            style={{fontSize: '13px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px'}}
          >
            View All Jobs →
          </Link>
        </div>
      </div>

      {/* 4. NEW JOBS TODAY (Image 1 match) */}
      <div style={{marginBottom: '36px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{fontSize: '18px'}}>🆕</span>
            <h2 style={{fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc'}}>
              New Jobs Today
            </h2>
          </div>
          <Link href="/jobs" style={{fontSize: '12px', color: '#38bdf8', fontWeight: 600}}>
            View all →
          </Link>
        </div>

        <div
          style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {newJobsToday.map((job, idx) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              style={{
                padding: '14px 20px',
                borderBottom: idx < newJobsToday.length - 1 ? '1px solid #1e293b' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div>
                <strong style={{fontSize: '13.5px', color: '#f8fafc', display: 'block'}}>
                  {job.title}
                </strong>
                <span className="muted" style={{fontSize: '11.5px'}}>
                  {job.agency} • {job.region} • {job.postedTime}
                </span>
              </div>
              <ChevronRight size={16} color="#64748b" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. TOP HIRING AGENCIES (Image 1 match) */}
      <div style={{marginBottom: '36px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
          <span style={{fontSize: '18px'}}>🏢</span>
          <h2 style={{fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc'}}>
            Top Hiring Agencies
          </h2>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px'}}>
          {TOP_HIRING_AGENCIES.map(agency => (
            <Link
              key={agency.code}
              href={`/jobs?agency=${agency.code}`}
              style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '14px 16px',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'border-color 0.2s',
              }}
            >
              <strong style={{fontSize: '12.5px', color: '#f8fafc', lineHeight: 1.4}}>
                {agency.name}
              </strong>
              <span style={{fontSize: '11px', color: '#06b6d4', fontWeight: 600}}>
                {agency.jobsCount} jobs
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 6. BROWSE BY REGION (Image 1 match) */}
      <div>
        <h2 style={{fontSize: '18px', fontWeight: 800, margin: '0 0 14px', color: '#f8fafc'}}>
          Browse by Region
        </h2>

        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          {PHILIPPINE_REGIONS.map(reg => (
            <Link
              key={reg}
              href={`/jobs?region=${encodeURIComponent(reg)}`}
              style={{
                padding: '6px 14px',
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#cbd5e1',
                textDecoration: 'none',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {reg}
            </Link>
          ))}
        </div>
      </div>

      {/* JOB DETAILS MODAL (Image 3) */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onOpenLetterStudio={handleOpenLetterStudio}
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
