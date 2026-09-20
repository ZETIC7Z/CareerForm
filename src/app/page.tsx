'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Mail,
  Table2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MonitorSmartphone,
  Check,
  Briefcase,
  MapPin,
  Calendar,
  Building2,
  BookOpen,
  ChevronRight,
  Clock,
} from 'lucide-react';
import HomeStartDialog from '@/components/home-start-dialog';
import AmbientAsciiScene from '@/components/ambient-ascii-scene';
import Interactive3DCard from '@/components/interactive-3d-card';
import {GOVERNMENT_JOBS, GUIDES_AND_RESOURCES} from '@/lib/government-jobs';
import GovJobsBoard from '@/components/gov-jobs-board';
import ScrollAnimations from '@/components/scroll-animations';
import UpdatesBox from '@/components/updates-box';
import HeroShowcaseCarousel from '@/components/hero-showcase-carousel';
import TipJarModal, { TipJarButton } from '@/components/tip-jar-modal';
import CoverLetterSelectionModal from '@/components/cover-letter-selection-modal';

const TOOLS=[
  {
    href:'/builder',
    icon:FileText,
    tag:'Live now',
    tagClass:'tag gold',
    title:'Create PDS',
    desc:'Fill the official CS Form 212 (Revised 2026) with a live mirror of the real form beside you. Smart-import your old PDS from CSV, Excel or PDF, then download a print-ready 8 × 14 sheet — all in your browser.',
    cta:'Build my PDS',
  },
  {
    href:'/coverletter',
    icon:Mail,
    tag:'Live now',
    tagClass:'tag gold',
    title:'Create cover letter',
    desc:'Draft a polished application or transmittal letter that pulls your name, address, education and eligibility straight from your PDS. Placeholders fill themselves; you keep full control of every word.',
    cta:'Write my letter',
  },
  {
    href:'/jobs',
    icon:Briefcase,
    tag:'Live now',
    tagClass:'tag gold',
    title:'Government Jobs PH',
    desc:'Explore real-time vacancies across national and local agencies. Filter by salary grade, eligibility, region and deadline — then draft matching application letters in one click.',
    cta:'Find government jobs',
  },
];

const CHANGES=[
  {t:'Work experience, restructured',d:'The Revised 2026 form splits government and private experience more clearly and adds explicit appointment-status columns. Recount your entries — inclusive dates must not overlap.'},
  {t:'Declarations expanded',d:'Questions 34–40 now probe indigenous group membership, disability and solo-parent status alongside the familiar case and election items. Every Yes needs supporting details.'},
  {t:'Stricter authenticity checks',d:'Photo, signature and government-ID blocks are enforced on page 4. The CSC may invalidate sheets with missing or non-conforming identification details.'},
];

const STATS=[
  {b:'100%',s:'In-browser. Nothing uploaded.'},
  {b:'4',s:'Pages mirrored live as you type.'},
  {b:'₱0',s:'Forever free. No watermark.'},
  {b:'177+',s:'Fields mapped from real records.'},
];

export default function Home(){
  const [tipOpen, setTipOpen] = useState(false);
  const [letterModalOpen, setLetterModalOpen] = useState(false);

  return <>
    <ScrollAnimations />
    <section className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="hero-bg" aria-hidden/>

      {/* Ambient Giant Watermark Text (CodePen PwWMZPv) */}
      <div className="hero-bg-text" aria-hidden="true">
        CAREERFORM
      </div>

      {/* Hero Top-Right Tip Jar (Image 1 & Image 2) */}
      <div
        style={{
          position: 'absolute',
          top: '32px',
          right: '36px',
          zIndex: 25,
        }}
      >
        <TipJarButton onClick={() => setTipOpen(true)} />
      </div>

      <AmbientAsciiScene />
      <div className="container hero-grid" style={{ position: 'relative', zIndex: 2 }}>
        <div>
          <span className="hero-kicker">CS Form 212 · Revised 2026</span>
          <h1>Your next chapter starts with <em>one honest page.</em></h1>
          <p className="hero-sub">CareerForm PH turns the Civil Service Personal Data Sheet into something you can actually finish — a live official-form mirror, smart import from your old PDS, and letters that write themselves around your details.</p>
          <div className="hero-cta">
            <HomeStartDialog />
            <Link className="btn btn-ghost" href="/jobs">Browse Gov Jobs</Link>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={15}/> Private by design — no accounts, no uploads</span>
            <span><Sparkles size={15}/> Official 2026 template, byte-accurate</span>
            <span><MonitorSmartphone size={15}/> Works offline once loaded</span>
          </div>
        </div>
        <div className="hero-visual" style={{ display: 'flex', justifyContent: 'center' }}>
          <HeroShowcaseCarousel />
        </div>
      </div>
    </section>

    {/* Tip Jar Neon Modal */}
    <TipJarModal open={tipOpen} onClose={() => setTipOpen(false)} />

    {/* TOOLS GRID & LIVE PATCH NOTES */}
    <section className="section section-alt" id="toolkit-and-updates">
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'start',
            marginBottom: '40px',
          }}
        >
          <div>
            <span className="hero-kicker">Complete Civil Service Toolkit</span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '12px 0 16px', lineHeight: 1.2 }}>
              Everything you need to apply with confidence.
            </h2>
            <p className="muted" style={{ fontSize: '15px', lineHeight: 1.6, maxWidth: '520px', margin: 0 }}>
              Prepare official PDS documents, craft tailored application letters, and find real government job openings — with real-time updates and fixes for the official CS Form 212 (Revised 2026).
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <UpdatesBox style={{ width: '100%', maxWidth: '520px' }} />
          </div>
        </div>
        <div className="cards-3">
          {TOOLS.map(t=>(
            <Interactive3DCard className="h-full" maxTilt={8} perspective={1000} key={t.title}>
              <article className={`tool-card h-full`}>
                <span className="tool-icon"><t.icon size={24}/></span>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
                <div className="tool-meta"><span className={t.tagClass}>{t.tag}</span><span className="tag">Free</span></div>
                {t.title === 'Create cover letter' ? (
                  <button
                    type="button"
                    className="btn btn-primary cursor-pointer flex items-center justify-center gap-1.5"
                    onClick={() => setLetterModalOpen(true)}
                  >
                    {t.cta} <ArrowRight size={15}/>
                  </button>
                ) : (
                  <Link className="btn btn-primary" href={t.href}>{t.cta} <ArrowRight size={15}/></Link>
                )}
              </article>
            </Interactive3DCard>
          ))}
        </div>
      </div>
    </section>

    {/* GOVERNMENT JOBS LIVE BOARD (Exact match to Image 1: Jobs Closing Soon, Metrics, Latest Jobs with View Details, New Jobs Today, Top Hiring Agencies, Browse by Region) */}
    <section className="section" style={{background: '#040914'}}>
      <div className="container">
        <GovJobsBoard />
      </div>
    </section>

    {/* GUIDES & RESOURCES SECTION (Image 4 match) */}
    <section className="section section-alt">
      <div className="container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '36px'}}>
          <div>
            <span className="hero-kicker" style={{color: '#06b6d4'}}>Guides &amp; Resources</span>
            <h2 style={{fontSize: '32px', fontWeight: 800, margin: '8px 0'}}>Essential Tips &amp; Tutorials</h2>
            <p className="muted" style={{maxWidth: '600px', margin: 0}}>
              Essential tips, tutorials, and guidelines for Philippine civil service applicants.
            </p>
          </div>
          <Link href="/builder" className="btn btn-ghost" style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4'}}>
            View All Articles <ChevronRight size={16}/>
          </Link>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px'}}>
          {GUIDES_AND_RESOURCES.map(g => (
            <Link
              key={g.id}
              href={g.url}
              style={{
                background: '#090d16',
                borderRadius: '14px',
                border: '1px solid #1e293b',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                textDecoration: 'none',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    borderRadius: '4px',
                    background: g.tag === 'RESOURCES' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                    color: g.tag === 'RESOURCES' ? '#a855f7' : '#06b6d4',
                    marginBottom: '12px',
                  }}
                >
                  {g.tag}
                </span>
                <h3 style={{fontSize: '17px', fontWeight: 700, color: '#f8fafc', margin: '0 0 8px', lineHeight: 1.4}}>
                  {g.title}
                </h3>
                <p style={{fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.6}}>
                  {g.excerpt}
                </p>
              </div>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '12px', fontSize: '12px', color: '#64748b'}}>
                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={12} /> {g.readTime}</span>
                <span style={{color: '#06b6d4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'}}>
                  Read Guide <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* CSC FORM 212 WHAT CHANGED */}
    <section className="section">
      <div className="container">
        <div className="changes-band">
          <h2>CS Form 212 (PDS Revised 2026): what changed — and what you need to do.</h2>
          <p>The Civil Service Commission (CSC) adopted CS Form No. 212, Revised 2026, updating the Personal Data Sheet for all government applications. The revision reaches further than a fresh header: the Work Experience section was rebuilt, the declarations grew teeth, and authenticity checks are enforced. Here is what specifically changed and the actions you should take before submitting.</p>
          <div className="changes-list">
            {CHANGES.map(c=><div key={c.t}><strong>{c.t}</strong><span>{c.d}</span></div>)}
          </div>
          <p className="note">CareerForm PH mirrors the official Revised 2026 workbook (obtained through CSC&apos;s own publication channels — see template provenance in the repository). Always download the source form from csc.gov.ph when an agency requires the original file.</p>
        </div>
      </div>
    </section>

    <section className="section section-alt">
      <div className="container">
        <div className="section-head">
          <span className="hero-kicker">By the numbers</span>
          <h2>Small tool. Serious craft.</h2>
        </div>
        <div className="stats-row">
          {STATS.map(s=><div className="stat" key={s.s}><b>{s.b}</b><span>{s.s}</span></div>)}
        </div>
        <div className="section-head" style={{marginTop:46,marginBottom:0}}>
          <p style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}><Check size={16} style={{color:'var(--ok)'}}/> Print at 100% on 8 × 14 in paper</p>
        </div>
      </div>
    </section>

    {letterModalOpen && (
      <CoverLetterSelectionModal
        open={letterModalOpen}
        onClose={() => setLetterModalOpen(false)}
      />
    )}
  </>;
}
