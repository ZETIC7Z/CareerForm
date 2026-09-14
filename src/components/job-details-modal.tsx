'use client';

import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import {
  X,
  Building2,
  MapPin,
  Calendar,
  Users,
  Award,
  BookOpen,
  Briefcase,
  FileCheck,
  Send,
  AlertTriangle,
  FileText,
  Mail,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Bell,
  HelpCircle,
} from 'lucide-react';
import {GovernmentJob} from '@/lib/government-jobs';
import ApplicationLetterModal from '@/components/application-letter-modal';
import Link from 'next/link';
import {useRouter} from 'next/navigation';

type Props = {
  job: GovernmentJob | null;
  onClose: () => void;
  onOpenLetterStudio?: (job: GovernmentJob) => void;
};

export default function JobDetailsModal({job, onClose, onOpenLetterStudio}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [alertSubscribed, setAlertSubscribed] = useState(false);
  const [showLetterStudio, setShowLetterStudio] = useState(false);

  if (!job) return null;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin + `/jobs?jobId=${job.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${job.title} - ${job.agency}`,
        text: `Apply for ${job.title} at ${job.agency}. Deadline: ${job.deadline}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleStartPDS = () => {
    onClose();
    router.push(`/builder?position=${encodeURIComponent(job.title)}&agency=${encodeURIComponent(job.agency)}`);
  };

  return createPortal(
    <div className="sig-modal-backdrop" onClick={onClose} style={{zIndex: 9999}}>
      <div
        className="sig-modal-container job-details-modal"
        style={{
          maxWidth: '780px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header matching Image 3 */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #1e293b',
            background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.8), #090d16)',
            position: 'relative',
          }}
        >
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{position: 'absolute', top: '20px', right: '20px', color: '#94a3b8'}}
          >
            <X size={20} />
          </button>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingRight: '40px'}}>
            <div>
              <h2 style={{fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#f8fafc'}}>
                {job.title}
              </h2>
              <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontSize: '14px', fontWeight: 600}}>
                <Building2 size={16} />
                <span>{job.agency} ({job.agencyAcronym})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAlertSubscribed(!alertSubscribed)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                background: alertSubscribed ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                border: alertSubscribed ? '1px solid #10b981' : '1px solid #334155',
                color: alertSubscribed ? '#10b981' : '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <Bell size={13} /> {alertSubscribed ? 'Alerts Active' : `Get ${job.agencyAcronym} Job Alerts`}
            </button>
          </div>

          <div style={{display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '16px', fontSize: '12px', color: '#94a3b8'}}>
            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <MapPin size={14} color="#06b6d4" /> {job.region}
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <Calendar size={14} color="#f59e0b" /> Deadline: <strong style={{color: '#f8fafc'}}>{job.deadline}</strong>
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <span style={{width: '8px', height: '8px', borderRadius: '50%', background: '#10b981'}} /> Status: <strong style={{color: '#10b981'}}>Active</strong>
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <Users size={14} /> {job.vacancies} Vacancy
            </span>
          </div>
        </div>

        {/* Modal Body: Scrollable Job Content Boxes */}
        <div style={{padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1}}>
          {/* BOX 1: QUALIFICATIONS (Image 3 match) */}
          <div style={{background: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b', padding: '18px 20px'}}>
            <h4 style={{fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Award size={16} color="#06b6d4" /> Qualifications
            </h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5}}>
              <div><strong style={{color: '#94a3b8'}}>Education:</strong> {job.education}</div>
              <div><strong style={{color: '#94a3b8'}}>Training:</strong> {job.training}</div>
              <div><strong style={{color: '#94a3b8'}}>Experience:</strong> {job.experience}</div>
              <div><strong style={{color: '#94a3b8'}}>Eligibility:</strong> {job.eligibility}</div>
              {job.competency && (
                <div><strong style={{color: '#94a3b8'}}>Core Competencies:</strong> {job.competency}</div>
              )}
            </div>
          </div>

          {/* BOX 2: DOCUMENTS NEEDED (Image 3 match) */}
          <div style={{background: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b', padding: '18px 20px'}}>
            <h4 style={{fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <FileCheck size={16} color="#10b981" /> Documents Needed
            </h4>
            <ul style={{margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {job.documentsNeeded.map((doc, idx) => (
                <li key={idx}>{doc}</li>
              ))}
            </ul>
          </div>

          {/* BOX 3: HOW TO APPLY (Image 3 match) */}
          <div style={{background: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b', padding: '18px 20px'}}>
            <h4 style={{fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Send size={16} color="#a855f7" /> How to Apply
            </h4>
            <div style={{fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <p style={{margin: 0}}>
                All interested and qualified applicants are advised to upload their applications and supporting documents through the agency portal or address directly:
              </p>
              <div style={{background: '#090d16', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155'}}>
                <div style={{color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>
                  QUALIFIED APPLICANTS are advised to address their application to:
                </div>
                <strong style={{display: 'block', fontSize: '14px', color: '#f8fafc'}}>
                  {job.howToApply.addresseeName}
                </strong>
                <span style={{display: 'block', color: '#06b6d4', fontSize: '12px'}}>
                  {job.howToApply.addresseeTitle} • {job.howToApply.addresseeOffice}
                </span>
                <span style={{display: 'block', color: '#94a3b8', fontSize: '12px', marginTop: '2px'}}>
                  {job.howToApply.addresseeAddress}
                </span>
                <div style={{display: 'flex', gap: '14px', marginTop: '6px', fontSize: '12px', color: '#64748b'}}>
                  {job.howToApply.contactPhone && <span>Hotline: {job.howToApply.contactPhone}</span>}
                  {job.howToApply.contactEmail && <span>Email: {job.howToApply.contactEmail}</span>}
                </div>
              </div>

              {job.howToApply.portalUrl && (
                <div>
                  <a
                    href={job.howToApply.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{color: '#06b6d4', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline'}}
                  >
                    Open Official Online Job Portal <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* BOX 4: APPLICATION NOTES (Image 3 match) */}
          <div style={{background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px'}}>
            <AlertTriangle size={18} color="#ef4444" style={{flexShrink: 0}} />
            <div>
              <strong style={{fontSize: '12px', color: '#ef4444', display: 'block'}}>Application Notes</strong>
              <span style={{fontSize: '12px', color: '#cbd5e1'}}>
                {job.applicationNotes}
              </span>
            </div>
          </div>

          {/* Social share & copy link */}
          <div style={{display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', padding: '6px 0'}}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px'}}
              onClick={handleShare}
            >
              <Share2 size={13} /> Share Job
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px'}}
              onClick={handleCopyLink}
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              {copied ? 'Link Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* BOTTOM CTA: NEED AN APPLICATION LETTER FOR THIS JOB? (Image 3 match) */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(15, 23, 42, 0.95))',
              border: '1.5px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 30px rgba(6, 182, 212, 0.12)',
            }}
          >
            <h4 style={{fontSize: '16px', fontWeight: 800, margin: '0 0 6px', color: '#f8fafc'}}>
              Need an application letter for this job?
            </h4>
            <p style={{fontSize: '13px', color: '#cbd5e1', margin: '0 0 16px', lineHeight: 1.5}}>
              Generate a ready-to-edit application letter tailored for <strong>{job.title}</strong>. Choose from different versions, refine skills, and download when ready.
            </p>

            <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
              <button
                type="button"
                className="btn btn-primary"
                style={{fontSize: '13px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px'}}
                onClick={() => {
                  if (onOpenLetterStudio) {
                    onOpenLetterStudio(job);
                  } else {
                    setShowLetterStudio(true);
                  }
                }}
              >
                <Mail size={15} /> Create Application Letter
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{fontSize: '13px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #334155'}}
                onClick={handleStartPDS}
              >
                <FileText size={15} color="#06b6d4" /> Build PDS (CS Form 212)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Application Letter Studio Modal if triggered */}
      {showLetterStudio && (
        <ApplicationLetterModal
          job={job}
          onClose={() => {
            setShowLetterStudio(false);
            // Seamlessly route to PDS workspace when letter builder closes
            router.push(`/builder?position=${encodeURIComponent(job.title)}&agency=${encodeURIComponent(job.agency)}`);
          }}
        />
      )}
    </div>,
    document.body
  );
}
