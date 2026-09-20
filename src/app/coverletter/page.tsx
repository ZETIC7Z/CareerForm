'use client';

import React, {useState, useEffect, useMemo, useRef, useCallback, Suspense} from 'react';
import Link from 'next/link';
import {useSearchParams, useRouter} from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  FileCheck2,
  Download,
  Printer,
  Copy,
  RotateCcw,
  Check,
  Maximize2,
  PenLine,
  FileText,
  Sparkles,
  PenTool,
  Upload,
  Calendar,
  X,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';
import CanvasStage from '@/components/canvas-stage';
import ThemeAccentPicker from '@/components/theme-accent-picker';
import ThemeToggle from '@/components/theme-toggle';
import SignatureModal from '@/components/signature-modal';
import {Letter, letterFor, pdsName, pdsAddress} from '@/lib/letter';
import {letterPDF} from '@/lib/pdf';
import {PDS, emptyPDS, validatedDraft, download} from '@/lib/model';

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return isoDate;
}

const PRESET_TEMPLATES = {
  application: {
    v1: `I am writing to express my genuine interest in the position of {{POSITION}} at {{ORGANIZATION}}. My qualifications, summarized in the enclosed Civil Service Commission Personal Data Sheet (CS Form 212, Revised 2026), reflect careful preparation for exactly this kind of responsibility.

I have completed {{EDUCATION}} and my background has taught me to deliver under pressure, coordinate with diverse teams, and serve the public with integrity. I am confident in my capacity to adapt to the responsibilities of this position and contribute actively to your agency's objectives.

Thank you for considering my application. I welcome the opportunity to discuss how my competencies align with {{ORGANIZATION}} and look forward to your favorable response.`,
    v2: `Please accept this letter and the attached Civil Service Commission Personal Data Sheet (CS Form No. 212, Revised 2026) as my formal application for the position of {{POSITION}} under {{ORGANIZATION}}.

My academic background with a degree in {{EDUCATION}}, coupled with practical experience and civil service eligibility ({{ELIGIBILITY}}), directly satisfies the qualification standards for this role. I have developed solid competencies in official correspondence, regulatory compliance, and public service execution.

I am prepared to execute the required duties with diligence, accountability, and integrity. Thank you very much for your time, consideration, and evaluation of my application credentials.`,
    v3: `Driven by a strong dedication to public service and good governance, I respectfully submit my application for the position of {{POSITION}} at {{ORGANIZATION}}.

Having earned my degree in {{EDUCATION}}, I have strived to build a career founded on professionalism, continuous learning, and client-centric public service. The mission of {{ORGANIZATION}} strongly resonates with my personal values, and I am eager to contribute to the delivery of reliable, transparent government programs.

Enclosed are my duly accomplished Personal Data Sheet and supporting certificates. I would welcome the privilege of an interview to demonstrate my readiness to serve. Thank you for your consideration.`,
  },
  transmittal: {
    v1: `In compliance with the official recruitment requirements of {{ORGANIZATION}}, I respectfully submit my duly accomplished Civil Service Commission Personal Data Sheet (CS Form No. 212, Revised 2026) together with all supporting credentials for evaluation.

I certify that the information provided in the attached document is true, correct, and complete to the best of my knowledge, and I authorize {{ORGANIZATION}} and the Civil Service Commission to verify any part thereof.

Thank you very much for your time and favorable consideration.`,
    v2: `I have the honor to submit herewith my accomplished Personal Data Sheet (CS Form 212, Revised 2026), alongside certified true copies of my Transcript of Records, Certificate of Civil Service Eligibility, and Work Experience Sheet in support of my application for {{POSITION}} under {{ORGANIZATION}}.

All records have been thoroughly reviewed for accuracy in compliance with CSC Memorandum Circular guidelines. Please let me know if additional documentation is required.

Respectfully submitted for your evaluation and appropriate action.`,
  },
};

function CoverLetterWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get('type') === 'transmittal' ? 'transmittal' : 'application') as 'application' | 'transmittal';

  const [kind, setKind] = useState<'application' | 'transmittal'>(initialType);
  const [version, setVersion] = useState<1 | 2 | 3>(1);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [fullOpen, setFullOpen] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form Fields State
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [recipientTitle, setRecipientTitle] = useState('Regional Executive Director');
  const [recipientName, setRecipientName] = useState('ATTY. ISMAEL T. MANALICOD, CESO IV');
  const [organization, setOrganization] = useState('Department of Environment and Natural Resources');
  const [organizationAddress, setOrganizationAddress] = useState('Regional Government Center, Carig Sur\nTuguegarao City, Cagayan');
  const [position, setPosition] = useState('Engineer I');
  const [itemNumber, setItemNumber] = useState('OSEC-DENRB-ENG1-033-2015');
  const [salaryGrade, setSalaryGrade] = useState('SG-12');
  const [education, setEducation] = useState('Bachelor of Science in Civil Engineering');
  const [school, setSchool] = useState('University of the Philippines');
  const [eligibility, setEligibility] = useState('Career Service Professional / RA 1080');

  // Body and Subject
  const [subject, setSubject] = useState(
    initialType === 'application'
      ? 'Application for the Position of Engineer I (SG-12)'
      : 'Transmittal of Accomplished Personal Data Sheet (CS Form 212, Revised 2026)'
  );
  const [body, setBody] = useState(PRESET_TEMPLATES.application.v1);

  // Sender Details
  const [senderName, setSenderName] = useState('Juan Dela Cruz');
  const [senderAddress, setSenderAddress] = useState('Brgy. San Jose, Quezon City, Metro Manila');
  const [senderContact, setSenderContact] = useState('0917-123-4567 · juan.delacruz@email.com');
  const [signature, setSignature] = useState<string | null>(null);

  // Load from local PDS draft if available
  useEffect(() => {
    try {
      const raw = localStorage.getItem('zeticuz-draft');
      if (raw) {
        const pds: PDS = validatedDraft(JSON.parse(raw));
        const name = pdsName(pds);
        if (name) setSenderName(name);
        const addr = pdsAddress(pds);
        if (addr) setSenderAddress(addr.replace(/\n/g, ', '));
        const contact = [pds.values.mobile, pds.values.email].filter(Boolean).join(' · ');
        if (contact) setSenderContact(contact);
        const lastEdu = pds.records.education?.find(r => r.degree)?.degree;
        if (lastEdu) setEducation(lastEdu);
        const lastSchool = pds.records.education?.find(r => r.school)?.school;
        if (lastSchool) setSchool(lastSchool);
        const firstElig = pds.records.eligibility?.[0]?.name;
        if (firstElig) setEligibility(firstElig);
        const lastWork = pds.records.work?.find(r => r.position)?.position;
        if (lastWork) setPosition(lastWork);
        if (pds.signature) setSignature(pds.signature);
      }
    } catch {}
  }, []);

  // Update body and subject when switching document kind or version
  const switchKind = (nextKind: 'application' | 'transmittal') => {
    setKind(nextKind);
    if (nextKind === 'application') {
      setSubject(`Application for the Position of ${position || 'Engineer I'} (${salaryGrade || 'SG-12'})`);
      setBody(PRESET_TEMPLATES.application[version === 3 ? 'v3' : version === 2 ? 'v2' : 'v1']);
    } else {
      setSubject('Transmittal of Accomplished Personal Data Sheet (CS Form 212, Revised 2026)');
      setBody(PRESET_TEMPLATES.transmittal[version === 2 ? 'v2' : 'v1']);
    }
  };

  const switchVersion = (nextVer: 1 | 2 | 3) => {
    setVersion(nextVer);
    if (kind === 'application') {
      setBody(PRESET_TEMPLATES.application[nextVer === 3 ? 'v3' : nextVer === 2 ? 'v2' : 'v1']);
    } else {
      setBody(PRESET_TEMPLATES.transmittal[nextVer === 2 ? 'v2' : 'v1']);
    }
  };

  // Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Compiled text for preview and copy
  const compiledBody = useMemo(() => {
    let text = body;
    text = text.replace(/\{\{POSITION\}\}/g, position || 'Civil Service Position');
    text = text.replace(/\{\{ORGANIZATION\}\}/g, organization || 'the Agency');
    text = text.replace(/\{\{EDUCATION\}\}/g, education || 'College Degree');
    text = text.replace(/\{\{ELIGIBILITY\}\}/g, eligibility || 'Civil Service Eligibility');
    text = text.replace(/\{\{NAME\}\}/g, senderName || 'Applicant');
    text = text.replace(/\{\{TODAY\}\}/g, formatDisplayDate(date));
    return text;
  }, [body, position, organization, education, eligibility, senderName, date]);

  const salutation = useMemo(() => {
    if (recipientName?.trim()) {
      return `Dear ${recipientName}:`;
    }
    return 'Dear Sir/Madam:';
  }, [recipientName]);

  const fullLetterPlain = useMemo(() => {
    const headerLines = [
      formatDisplayDate(date),
      recipientName,
      recipientTitle,
      organization,
      organizationAddress,
    ].filter(Boolean).join('\n');

    return `${headerLines}

Subject: ${subject}

${salutation}

${compiledBody}

Respectfully yours,

${senderName}
${senderAddress}
${senderContact}`;
  }, [date, recipientName, recipientTitle, organization, organizationAddress, subject, salutation, compiledBody, senderName, senderAddress, senderContact]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullLetterPlain);
      setCopied(true);
      showToast('Letter copied to clipboard.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Failed to copy to clipboard.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    setBusy(true);
    try {
      const letterData: Letter = {
        kind,
        date: date || getTodayIsoDate(),
        recipientTitle,
        recipientName,
        organization,
        organizationAddress,
        position,
        subject,
        body: compiledBody,
        senderName,
        senderAddress,
        senderContact,
        signature: signature || undefined,
      };

      const dummyPDS: PDS = emptyPDS();
      dummyPDS.values.surname = senderName;
      dummyPDS.values.mobile = senderContact;
      if (signature) dummyPDS.signature = signature;

      const pdfBytes = await letterPDF(letterData, dummyPDS);
      download(
        pdfBytes,
        `${kind === 'application' ? 'Application' : 'Transmittal'}-Letter-${senderName.replace(/\s+/g, '_')}.pdf`,
        'application/pdf'
      );
      showToast('Official letter PDF downloaded.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'PDF export failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset letter fields to default template?')) {
      setDate(getTodayIsoDate());
      switchKind(kind);
      showToast('Reset to default template.');
    }
  };

  return (
    <div className="app-shell workspace-app">
      {/* Workspace Chrome Header */}
      <header className="workspace-chrome">
        <div className="wc-left">
          <Link className="wc-back" href="/" aria-label="Back to home" title="Back to home">
            <ArrowLeft size={17} />
          </Link>
          <Link className="wc-brand" href="/" aria-label="CareerForm PH home">
            <span className="font-bold tracking-tight text-[var(--heading)] text-sm sm:text-base flex items-center gap-1.5 select-none">
              CareerForm
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
                2026
              </span>
            </span>
          </Link>

          {/* Letter Type Switcher */}
          <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10 text-xs">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                kind === 'application'
                  ? 'bg-[var(--accent,#efb530)] text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              onClick={() => switchKind('application')}
            >
              <Mail size={13} />
              <span>Application Letter</span>
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                kind === 'transmittal'
                  ? 'bg-[var(--accent,#efb530)] text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              onClick={() => switchKind('transmittal')}
            >
              <FileCheck2 size={13} />
              <span>Transmittal Letter</span>
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-400 hidden lg:inline-flex items-center gap-1 ml-2">
            <Calendar size={12} className="text-amber-400" />
            <span>{formatDisplayDate(date)}</span>
          </span>
        </div>

        <div className="wc-right">
          <button
            type="button"
            className="wc-btn wc-btn-secondary"
            title="Copy letter text to clipboard"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="wc-btn-label">{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            className="wc-btn wc-btn-secondary"
            title="Print letter"
            onClick={handlePrint}
          >
            <Printer size={14} />
            <span className="wc-btn-label">Print</span>
          </button>

          <button
            type="button"
            className="wc-btn wc-btn-secondary"
            title="Reset letter content to preset template"
            onClick={handleReset}
          >
            <RotateCcw size={14} />
            <span className="wc-btn-label">Reset</span>
          </button>

          <button
            type="button"
            className="wc-btn wc-btn-primary"
            title="Download official letter PDF"
            onClick={handleExportPDF}
            disabled={busy}
          >
            <Download size={14} />
            <span className="wc-btn-label">{busy ? 'Exporting…' : 'Download PDF'}</span>
          </button>

          <ThemeAccentPicker />
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="builder-mobile-tab-switch" role="tablist" aria-label="Mobile View Mode">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'form'}
          className={`mobile-tab-btn ${mobileTab === 'form' ? 'active' : ''}`}
          onClick={() => setMobileTab('form')}
        >
          <PenLine size={14} />
          <span>Edit Letter</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'preview'}
          className={`mobile-tab-btn ${mobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          <FileText size={14} />
          <span>Live Letter Mirror</span>
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className={`wc-body mobile-view-${mobileTab}`}>
        {/* Left Column: Form Editor */}
        <div className="wc-form-column">
          <main className="wc-content max-w-[760px] mx-auto w-full pb-16">
            {/* Tone / Version Switcher */}
            <div className="mb-6 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" /> Letter Tone & Preset
                </span>
                <span className="text-[11px] text-slate-400">Civil Service Formats</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    version === 1
                      ? 'border-amber-400/80 bg-amber-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                  onClick={() => switchVersion(1)}
                >
                  <p className="font-semibold mb-0.5">1. Direct & Concise</p>
                  <p className="text-[10.5px] opacity-75">CSC Standard · Clear & straightforward</p>
                </button>
                <button
                  type="button"
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    version === 2
                      ? 'border-amber-400/80 bg-amber-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                  onClick={() => switchVersion(2)}
                >
                  <p className="font-semibold mb-0.5">2. Professional</p>
                  <p className="text-[10.5px] opacity-75">Qualifications & eligibility focused</p>
                </button>
                {kind === 'application' && (
                  <button
                    type="button"
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      version === 3
                        ? 'border-amber-400/80 bg-amber-400/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                    onClick={() => switchVersion(3)}
                  >
                    <p className="font-semibold mb-0.5">3. Public Service</p>
                    <p className="text-[10.5px] opacity-75">Mission & governance alignment</p>
                  </button>
                )}
              </div>
            </div>

            {/* Date Section */}
            <section className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Calendar size={13} className="text-amber-400" /> Letter Date
                </label>
                <button
                  type="button"
                  onClick={() => setDate(getTodayIsoDate())}
                  className="text-[11px] font-semibold text-amber-400 hover:underline cursor-pointer"
                >
                  Set to Today ({formatDisplayDate(getTodayIsoDate())})
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    className="wc-input w-full"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                  <span>Formatted: <strong>{formatDisplayDate(date)}</strong></span>
                </div>
              </div>
            </section>

            {/* Recipient Information */}
            <section className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Recipient / Addressee Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Addressee Full Name</label>
                  <input
                    type="text"
                    className="wc-input w-full"
                    placeholder="e.g. ATTY. ISMAEL T. MANALICOD, CESO IV"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Official Title / Designation</label>
                  <input
                    type="text"
                    className="wc-input w-full"
                    placeholder="e.g. Regional Executive Director"
                    value={recipientTitle}
                    onChange={e => setRecipientTitle(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Agency / Office Name</label>
                  <input
                    type="text"
                    className="wc-input w-full"
                    placeholder="e.g. Department of Environment and Natural Resources"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Office / Regional Address</label>
                  <textarea
                    rows={2}
                    className="wc-input w-full"
                    placeholder="e.g. Regional Government Center, Carig Sur, Tuguegarao City"
                    value={organizationAddress}
                    onChange={e => setOrganizationAddress(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Position Details (Application Letter Only) */}
            {kind === 'application' && (
              <section className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Position & Qualification Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Position Title</label>
                    <input
                      type="text"
                      className="wc-input w-full"
                      placeholder="e.g. Engineer I"
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Item Number</label>
                    <input
                      type="text"
                      className="wc-input w-full"
                      placeholder="e.g. OSEC-DENRB-ENG1-033-2015"
                      value={itemNumber}
                      onChange={e => setItemNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Salary Grade</label>
                    <input
                      type="text"
                      className="wc-input w-full"
                      placeholder="e.g. SG-12"
                      value={salaryGrade}
                      onChange={e => setSalaryGrade(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Highest Degree Completed</label>
                    <input
                      type="text"
                      className="wc-input w-full"
                      placeholder="e.g. Bachelor of Science in Civil Engineering"
                      value={education}
                      onChange={e => setEducation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Civil Service Eligibility</label>
                    <input
                      type="text"
                      className="wc-input w-full"
                      placeholder="e.g. CS Professional / RA 1080"
                      value={eligibility}
                      onChange={e => setEligibility(e.target.value)}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Letter Subject & Body Content */}
            <section className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Subject & Letter Content
                </h3>
                <span className="text-[10.5px] text-slate-400">Live preview syncs automatically</span>
              </div>

              <div className="mb-3">
                <label className="text-xs text-slate-400 mb-1 block">Subject Line</label>
                <input
                  type="text"
                  className="wc-input w-full font-semibold"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Letter Body (Paragraphs)</label>
                <textarea
                  rows={9}
                  className="wc-input w-full font-sans text-sm leading-relaxed"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Available tags: {'{{POSITION}}'} · {'{{ORGANIZATION}}'} · {'{{EDUCATION}}'} · {'{{ELIGIBILITY}}'} · {'{{NAME}}'} · {'{{TODAY}}'}
                </p>
              </div>
            </section>

            {/* Applicant Information & E-Signature */}
            <section className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Applicant Information & E-Signature
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Your Full Name</label>
                  <input
                    type="text"
                    className="wc-input w-full"
                    placeholder="e.g. Juan Dela Cruz"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Contact Details (Mobile · Email)</label>
                  <input
                    type="text"
                    className="wc-input w-full"
                    placeholder="e.g. 0917-123-4567 · applicant@email.com"
                    value={senderContact}
                    onChange={e => setSenderContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-slate-400 mb-1 block">Your Address</label>
                <input
                  type="text"
                  className="wc-input w-full"
                  placeholder="e.g. Brgy. San Jose, Quezon City, Metro Manila"
                  value={senderAddress}
                  onChange={e => setSenderAddress(e.target.value)}
                />
              </div>

              {/* Signature Block */}
              <div className="p-3 rounded-lg border border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {signature ? (
                    <div className="w-24 h-12 bg-white rounded border border-white/20 p-1 flex items-center justify-center overflow-hidden">
                      <img
                        src={signature}
                        alt="Applicant signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-12 rounded border border-dashed border-white/20 flex items-center justify-center text-[10px] text-slate-400">
                      No signature
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">E-Signature on Letter</p>
                    <p className="text-[11px] text-slate-400">
                      {signature ? 'Embedded above your printed name' : 'Sign digitally or sign after printing'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="wc-btn wc-btn-secondary text-xs"
                    onClick={() => setSigModalOpen(true)}
                  >
                    <PenTool size={13} />
                    <span>{signature ? 'Change Signature' : 'Add Signature'}</span>
                  </button>
                  {signature && (
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:text-red-300 p-1.5"
                      onClick={() => setSignature(null)}
                      title="Remove signature"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>

        {/* Right Column: Live Letter Canvas Stage */}
        <aside className="wc-preview">
          <section className="preview-panel preview-panel-fixed" aria-label="Live letter preview">
            <div className="preview-heading">
              <div className="preview-heading-left">
                <strong>Live Letter Mirror</strong>
                <span className="live-badge"><i />LIVE</span>
              </div>
              <div className="preview-pager">
                <span className="preview-page-label">
                  {kind === 'application' ? 'Job Application' : 'PDS Transmittal'} · A4
                </span>
                <button
                  type="button"
                  className="pager-btn"
                  aria-label="Open fullscreen preview"
                  title="Fullscreen Preview (Finish & Review Shortcut)"
                  onClick={() => setFullOpen(true)}
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            <CanvasStage
              hintTitle={kind === 'application' ? 'Application Letter · Official CSC Format' : 'Transmittal Letter · CS Form 212'}
              onExpand={() => setFullOpen(true)}
            >
              <div className="letter-paper-canvas">
                {/* Date */}
                <div className="letter-date-line">
                  {formatDisplayDate(date)}
                </div>

                {/* Recipient Addressee Block */}
                <div className="letter-recipient-block">
                  <div className="font-bold uppercase tracking-wide text-slate-900 text-[13px]">{recipientName}</div>
                  <div className="text-slate-700 text-[12px]">{recipientTitle}</div>
                  <div className="font-semibold text-slate-800 text-[12px]">{organization}</div>
                  {organizationAddress.split('\n').map((line, i) => (
                    <div key={i} className="text-slate-600 text-[11.5px]">{line}</div>
                  ))}
                </div>

                {/* Subject Line */}
                <div className="letter-subject-line">
                  <strong>Subject: {subject}</strong>
                </div>

                {/* Salutation */}
                <div className="letter-salutation">
                  {salutation}
                </div>

                {/* Body Paragraphs */}
                <div className="letter-body-content">
                  {compiledBody.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="letter-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Complimentary Close & Signature */}
                <div className="letter-closing-block">
                  <div className="text-[12px] text-slate-700 mb-6">Respectfully yours,</div>

                  <div className="letter-signature-area">
                    {signature && (
                      <div className="letter-signature-img-wrap">
                        <img src={signature} alt="Signature" className="letter-signature-img" />
                      </div>
                    )}
                    <div className="letter-signature-line" />
                    <div className="letter-sender-name font-bold uppercase tracking-wider text-[13px] text-slate-900">
                      {senderName}
                    </div>
                    <div className="letter-sender-details text-[11px] text-slate-600">
                      {senderAddress}
                    </div>
                    {senderContact && (
                      <div className="letter-sender-contact text-[11px] text-slate-500">
                        {senderContact}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CanvasStage>

            <div className="preview-footer">
              Civil Service Commission Standard Correspondence <span>A4 · Print at 100%</span>
            </div>
          </section>
        </aside>
      </div>

      {/* Fullscreen Preview Modal */}
      {fullOpen && (
        <div className="modal-backdrop" style={{zIndex: 9999}}>
          <div className="modal max-w-[850px] w-full max-h-[92vh] flex flex-col p-6">
            <div className="modal-head flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-amber-400" /> Full Preview: {kind === 'application' ? 'Application Letter' : 'Transmittal Letter'}
                </h2>
                <p className="text-xs text-slate-400">Civil Service Commission Standard Formal Letterhead</p>
              </div>
              <button
                type="button"
                className="text-button text-slate-400 hover:text-white"
                onClick={() => setFullOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 flex justify-center bg-black/40 rounded-xl my-3">
              <div className="letter-paper-canvas shadow-2xl">
                <div className="letter-date-line">{formatDisplayDate(date)}</div>
                <div className="letter-recipient-block">
                  <div className="font-bold uppercase tracking-wide text-slate-900 text-[13px]">{recipientName}</div>
                  <div className="text-slate-700 text-[12px]">{recipientTitle}</div>
                  <div className="font-semibold text-slate-800 text-[12px]">{organization}</div>
                  {organizationAddress.split('\n').map((line, i) => (
                    <div key={i} className="text-slate-600 text-[11.5px]">{line}</div>
                  ))}
                </div>
                <div className="letter-subject-line"><strong>Subject: {subject}</strong></div>
                <div className="letter-salutation">{salutation}</div>
                <div className="letter-body-content">
                  {compiledBody.split('\n\n').map((p, i) => (
                    <p key={i} className="letter-paragraph">{p}</p>
                  ))}
                </div>
                <div className="letter-closing-block">
                  <div className="text-[12px] text-slate-700 mb-6">Respectfully yours,</div>
                  <div className="letter-signature-area">
                    {signature && (
                      <div className="letter-signature-img-wrap">
                        <img src={signature} alt="Signature" className="letter-signature-img" />
                      </div>
                    )}
                    <div className="letter-signature-line" />
                    <div className="letter-sender-name font-bold uppercase tracking-wider text-[13px] text-slate-900">{senderName}</div>
                    <div className="letter-sender-details text-[11px] text-slate-600">{senderAddress}</div>
                    {senderContact && <div className="letter-sender-contact text-[11px] text-slate-500">{senderContact}</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                className="wc-btn wc-btn-secondary"
                onClick={() => setFullOpen(false)}
              >
                Close Preview
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="wc-btn wc-btn-secondary"
                  onClick={handlePrint}
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  className="wc-btn wc-btn-primary"
                  onClick={handleExportPDF}
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {sigModalOpen && (
        <SignatureModal
          open={sigModalOpen}
          onClose={() => setSigModalOpen(false)}
          onSave={dataUrl => {
            setSignature(dataUrl);
            setSigModalOpen(false);
            showToast('Signature added to letter.');
          }}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-slate-400">Loading Letter Studio…</div>}>
      <CoverLetterWorkspace />
    </Suspense>
  );
}
