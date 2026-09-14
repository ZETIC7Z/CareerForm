'use client';

import React, {useState, useMemo} from 'react';
import {createPortal} from 'react-dom';
import {
  X,
  Copy,
  Download,
  RotateCcw,
  Edit3,
  Check,
  Sparkles,
  FileText,
  Mail,
  PenTool,
  Upload,
  ArrowRight,
  ChevronRight,
  Layers,
  Save,
} from 'lucide-react';
import {GovernmentJob} from '@/lib/government-jobs';
import SignatureModal from '@/components/signature-modal';
import {useRouter} from 'next/navigation';

type Props = {
  job: GovernmentJob;
  onClose: () => void;
  onProceedToPds?: () => void;
};

export default function ApplicationLetterModal({job, onClose, onProceedToPds}: Props) {
  const router = useRouter();

  // Refine Details Form State
  const [fullName, setFullName] = useState('Juan Dela Cruz');
  const [position, setPosition] = useState(job.title || 'Engineer I');
  const [agency, setAgency] = useState(job.agency || 'Department of Environment and Natural Resources (DENR)');
  const [recipientName, setRecipientName] = useState(job.howToApply?.addresseeName || 'ATTY. ISMAEL T. MANALICOD, CESO IV');
  const [recipientTitle, setRecipientTitle] = useState(job.howToApply?.addresseeTitle || 'Regional Executive Director');
  const [officeAgency, setOfficeAgency] = useState(job.howToApply?.addresseeOffice || 'Regional Office No. 02');
  const [officeAddress, setOfficeAddress] = useState(job.howToApply?.addresseeAddress || 'Regional Government Center, Carig Sur, Tuguegarao City');
  const [salaryGrade, setSalaryGrade] = useState(`SG-${job.salaryGrade || 12}`);
  const [itemNumber, setItemNumber] = useState(job.itemNumber || 'OSEC-DENRB-ENG1-033-2015');
  const [employmentStatus, setEmploymentStatus] = useState('Permanent');
  const [degree, setDegree] = useState(job.education?.includes('degree') ? job.education : 'Bachelor of Science in Engineering');
  const [school, setSchool] = useState('University of the Philippines');

  // Selected Skills State (interactive toggle pills)
  const defaultSkills = job.skills && job.skills.length > 0
    ? job.skills
    : ['Basic engineering principles', 'Technical drawing interpretation', 'Project site monitoring', 'Data collection and analysis', 'Report writing', 'Equipment operation'];

  const [selectedSkills, setSelectedSkills] = useState<string[]>([defaultSkills[0] || 'Technical drawing interpretation']);

  // E-Signature
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSigModal, setShowSigModal] = useState(false);

  // Active Version Selection (1, 2, 3)
  const [version, setVersion] = useState<1 | 2 | 3>(1);

  // Editable Letter Content override
  const [isEditing, setIsEditing] = useState(false);
  const [customContent, setCustomContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Toggle skills pill
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  // Generate Letter Text based on Version & Details
  const generatedLetter = useMemo(() => {
    const todayStr = 'September 15, 2026';
    const salutation = recipientName ? `Dear ${recipientName}:` : 'Dear Sir/Madam:';
    const skillsList = selectedSkills.length > 0
      ? `in ${selectedSkills.join(', ')}`
      : 'in technical data analysis, official correspondence, and regulatory compliance';

    if (version === 1) {
      // Brief and straight to the point (Image 4 match)
      return `${todayStr}

${salutation}

I am writing to express my interest in the ${position} position at the ${agency}.

Having completed my studies in ${degree} from ${school}, I am eager to begin my career in public service and contribute to the ${job.agencyAcronym || 'agency'}'s mission. I am particularly drawn to this role as I wish to support the reliable systems that assist both staff and the public who interact with your services.

I am a quick learner and possess a willingness to develop my technical skills further ${skillsList}. I am confident that I can adapt to the responsibilities of ${position} (Item No. ${itemNumber}, ${salaryGrade}) and contribute effectively to your team.

Enclosed herewith is my accomplished Civil Service Commission Personal Data Sheet (CS Form 212, Revised 2026) and supporting credentials for your evaluation.

Respectfully,

${fullName}
Applicant`;
    } else if (version === 2) {
      // Professional & Qualifications Focused
      return `${todayStr}

${salutation}

Please accept this letter and the attached Civil Service Commission Personal Data Sheet (CS Form No. 212, Revised 2026) as my formal application for the position of ${position} under ${officeAgency}, with Item No. ${itemNumber} (${salaryGrade}).

My academic foundation with a degree in ${degree} from ${school}, coupled with training and demonstrated competencies ${skillsList}, directly satisfies the qualification standards for this position. I am well-prepared to execute the required duties with integrity, diligence, and accountability.

I welcome the opportunity to discuss how my competencies align with the objectives of ${agency}. Thank you very much for your time and favorable consideration.

Respectfully yours,

${fullName}
Applicant`;
    } else {
      // Public Service Commitment & Impact Driven
      return `${todayStr}

${salutation}

I am enthusiastically submitting my application for the ${position} vacancy at ${agency} (Item No. ${itemNumber}). 

As a graduate of ${degree} from ${school}, I have dedicated my training to developing practical proficiencies ${skillsList}. Driven by the ideals of Philippine civil service, I am eager to apply these skills toward the transparent, efficient, and compassionate delivery of public programs.

Accompanying this letter is my fully accomplished CS Form 212 Revised 2026, Work Experience Sheet, and certified authentic credentials. I look forward to the privilege of serving in your reputable office.

Respectfully submitted,

${fullName}
Applicant`;
    }
  }, [version, position, agency, recipientName, degree, school, selectedSkills, itemNumber, salaryGrade, fullName, job.agencyAcronym, officeAgency]);

  const activeContent = customContent !== null ? customContent : generatedLetter;

  // Copy letter text to clipboard
  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download TXT
  const handleDownloadTxt = () => {
    const blob = new Blob([activeContent], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Application_Letter_${position.replace(/\s+/g, '_')}_${fullName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download PDF
  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to download PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Application Letter - ${position} - ${fullName}</title>
          <style>
            @page { size: A4; margin: 25mm 25mm 25mm 25mm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 0; padding: 20px; }
            .header-block { margin-bottom: 24pt; white-space: pre-line; }
            .letter-body { white-space: pre-line; text-align: justify; }
            .sig-img { max-height: 50px; margin-top: 10px; display: block; }
          </style>
        </head>
        <body>
          <div class="header-block">
${recipientName}
${recipientTitle}
${officeAgency}
${officeAddress}
          </div>
          <div class="letter-body">${activeContent}</div>
          ${signatureDataUrl ? `<img src="${signatureDataUrl}" class="sig-img" alt="Affixed Signature"/>` : ''}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Proceed directly to PDS Workspace
  const handleProceedToWorkspace = () => {
    onClose();
    if (onProceedToPds) {
      onProceedToPds();
    } else {
      router.push(`/builder?position=${encodeURIComponent(position)}&agency=${encodeURIComponent(agency)}`);
    }
  };

  return createPortal(
    <div className="sig-modal-backdrop" onClick={handleProceedToWorkspace} style={{zIndex: 10000}}>
      <div
        className="sig-modal-container application-letter-modal"
        style={{
          maxWidth: '1240px',
          width: '96%',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          boxShadow: '0 25px 70px rgba(0,0,0,0.9)',
          fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top App Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, #090d16, #0f172a)',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '8px', borderRadius: '8px'}}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{fontSize: '17px', fontWeight: 800, margin: 0, color: '#f8fafc'}}>
                Government Application Letter Studio
              </h3>
              <p style={{fontSize: '12px', color: '#94a3b8', margin: 0}}>
                Pre-tailored for <strong>{position}</strong> at {agency}
              </p>
            </div>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <button
              type="button"
              className="btn btn-primary"
              style={{fontSize: '12px', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px'}}
              onClick={handleProceedToWorkspace}
              title="Close Letter Studio and continue inside the PDS workspace"
            >
              <FileText size={14} /> Open PDS Workspace <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={handleProceedToWorkspace}
              title="Close & Return to PDS Workspace"
              style={{color: '#94a3b8'}}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 2-Column Split Body matching Image 4 */}
        <div style={{display: 'grid', gridTemplateColumns: '1.25fr 1fr', overflow: 'hidden', flex: 1}}>
          {/* LEFT COLUMN: The Rendered Application Letter & Versions */}
          <div
            style={{
              padding: '24px',
              overflowY: 'auto',
              borderRight: '1px solid #1e293b',
              background: '#040711',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Top Toolbar */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{display: 'flex', gap: '8px'}}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px'}}
                  onClick={() => alert('Letters are saved automatically with your session.')}
                >
                  <Save size={13} /> Saved letters
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px'}}
                  onClick={() => {
                    setCustomContent(null);
                    setIsEditing(false);
                  }}
                >
                  <RotateCcw size={13} /> Generate All Again
                </button>
              </div>
            </div>

            {/* Active Letter Card with Red/Salmon Border (Image 4 match) */}
            <div
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                border: '1.5px solid #ef4444',
                padding: '24px 28px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Card Meta & Action Bar */}
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={12} /> Application Letter
                  </span>
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    Version {version} Selected
                  </span>
                </div>

                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomContent(null);
                      setIsEditing(false);
                    }}
                    style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', cursor: 'pointer'}}
                  >
                    <RotateCcw size={13} /> Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: copied ? '#10b981' : '#64748b', cursor: 'pointer', fontWeight: copied ? 700 : 500}}
                  >
                    {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: isEditing ? '#06b6d4' : '#64748b', cursor: 'pointer', fontWeight: 600}}
                  >
                    <Edit3 size={13} /> {isEditing ? 'Done Editing' : 'Edit'}
                  </button>
                </div>
              </div>

              {/* Letter Text Body */}
              {isEditing ? (
                <textarea
                  value={activeContent}
                  onChange={e => setCustomContent(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '340px',
                    padding: '12px',
                    fontFamily: 'serif',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#0f172a',
                    resize: 'vertical',
                  }}
                />
              ) : (
                <div
                  style={{
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontSize: '14.5px',
                    lineHeight: 1.65,
                    color: '#1e293b',
                    whiteSpace: 'pre-line',
                    textAlign: 'justify',
                  }}
                >
                  {activeContent}
                </div>
              )}

              {/* Affixed E-Signature if present */}
              {signatureDataUrl && (
                <div style={{marginTop: '4px'}}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureDataUrl} alt="E-Signature preview" style={{maxHeight: '44px', objectFit: 'contain'}} />
                </div>
              )}

              {/* Download Bar inside card */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '14px',
                  marginTop: '6px',
                }}
              >
                <span style={{fontSize: '11px', color: '#64748b'}}>
                  Your letter is ready to export and submit with CS Form 212.
                </span>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="btn btn-ghost"
                    style={{fontSize: '12px', padding: '6px 12px', color: '#0f172a', border: '1px solid #cbd5e1'}}
                  >
                    <Download size={13} /> TXT
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="btn btn-primary"
                    style={{fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px'}}
                  >
                    <Download size={13} /> PDF
                  </button>
                </div>
              </div>
            </div>

            {/* All Versions Selector (Image 4 match) */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <span style={{fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                All Versions
              </span>

              <div
                onClick={() => setVersion(1)}
                style={{
                  padding: '14px 18px',
                  background: version === 1 ? 'rgba(239, 68, 68, 0.08)' : '#0f172a',
                  borderRadius: '10px',
                  border: version === 1 ? '1.5px solid #ef4444' : '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <Sparkles size={15} color={version === 1 ? '#ef4444' : '#64748b'} />
                  <div>
                    <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>Version 1</strong>
                    <span className="muted" style={{fontSize: '12px'}}>Brief and straight to the point</span>
                  </div>
                </div>
                {version === 1 ? (
                  <span style={{color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600}}>
                    <Check size={14} /> Selected
                  </span>
                ) : (
                  <span style={{fontSize: '12px', color: '#06b6d4'}}>Use This Version</span>
                )}
              </div>

              <div
                onClick={() => setVersion(2)}
                style={{
                  padding: '14px 18px',
                  background: version === 2 ? 'rgba(6, 182, 212, 0.08)' : '#0f172a',
                  borderRadius: '10px',
                  border: version === 2 ? '1.5px solid #06b6d4' : '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <Sparkles size={15} color={version === 2 ? '#06b6d4' : '#64748b'} />
                  <div>
                    <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>Version 2</strong>
                    <span className="muted" style={{fontSize: '12px'}}>Professional & Qualifications Focused</span>
                  </div>
                </div>
                {version === 2 ? (
                  <span style={{color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600}}>
                    <Check size={14} /> Selected
                  </span>
                ) : (
                  <span style={{fontSize: '12px', color: '#06b6d4'}}>Use This Version</span>
                )}
              </div>

              <div
                onClick={() => setVersion(3)}
                style={{
                  padding: '14px 18px',
                  background: version === 3 ? 'rgba(168, 85, 247, 0.08)' : '#0f172a',
                  borderRadius: '10px',
                  border: version === 3 ? '1.5px solid #a855f7' : '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <Sparkles size={15} color={version === 3 ? '#a855f7' : '#64748b'} />
                  <div>
                    <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>Version 3</strong>
                    <span className="muted" style={{fontSize: '12px'}}>Public Service Commitment & Impact Driven</span>
                  </div>
                </div>
                {version === 3 ? (
                  <span style={{color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600}}>
                    <Check size={14} /> Selected
                  </span>
                ) : (
                  <span style={{fontSize: '12px', color: '#06b6d4'}}>Use This Version</span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: "Refine Your Details" Form (Image 4 match) */}
          <div
            style={{
              padding: '24px',
              overflowY: 'auto',
              background: '#090d16',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h3 style={{fontSize: '17px', fontWeight: 800, margin: '0 0 4px', color: '#f8fafc'}}>
                Refine Your Details
              </h3>
              <span className="muted" style={{fontSize: '12px'}}>
                Customize personal and recipient fields to instantly update the letter
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label style={{fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px'}}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Position Applying For */}
            <div>
              <label style={{fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px'}}>
                Position Applying For
              </label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Agency */}
            <div>
              <label style={{fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px'}}>
                Agency
              </label>
              <input
                type="text"
                value={agency}
                onChange={e => setAgency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Letter Header (Addressee) Group */}
            <div style={{background: '#0f172a', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <div>
                <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>Letter Header (Addressee)</strong>
                <span className="muted" style={{fontSize: '11px'}}>Optional. Fill in if you know the recipient&apos;s details.</span>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div>
                  <label style={{fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px'}}>Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="Recipient Name"
                    style={{width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px'}}
                  />
                </div>
                <div>
                  <label style={{fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px'}}>Recipient Position / Title</label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={e => setRecipientTitle(e.target.value)}
                    placeholder="HR Officer"
                    style={{width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px'}}
                  />
                </div>
              </div>

              <div>
                <label style={{fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px'}}>Office / Agency</label>
                <input
                  type="text"
                  value={officeAgency}
                  onChange={e => setOfficeAgency(e.target.value)}
                  placeholder="Human Resource Management Office"
                  style={{width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px'}}
                />
              </div>

              <div>
                <label style={{fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px'}}>Office Address (optional)</label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={e => setOfficeAddress(e.target.value)}
                  placeholder="Office Address (optional)"
                  style={{width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px'}}
                />
              </div>
            </div>

            {/* Additional Details for Your Letter */}
            <div style={{background: '#0f172a', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <div>
                <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>Additional Details for Your Letter</strong>
                <span className="muted" style={{fontSize: '11px'}}>Fill in any details you want included in your application letter.</span>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                <div>
                  <label style={{fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px'}}>Salary Grade</label>
                  <input
                    type="text"
                    value={salaryGrade}
                    onChange={e => setSalaryGrade(e.target.value)}
                    placeholder="e.g. SG-12"
                    style={{width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px'}}
                  />
                </div>
                <div>
                  <label style={{fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px'}}>Item Number</label>
                  <input
                    type="text"
                    value={itemNumber}
                    onChange={e => setItemNumber(e.target.value)}
                    placeholder="e.g. ITEM-001"
                    style={{width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px'}}
                  />
                </div>
                <div>
                  <label style={{fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px'}}>Employment Status</label>
                  <input
                    type="text"
                    value={employmentStatus}
                    onChange={e => setEmploymentStatus(e.target.value)}
                    placeholder="Permanent"
                    style={{width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px'}}
                  />
                </div>
              </div>
            </div>

            {/* E-Signature (Optional) (Image 4 match) */}
            <div style={{background: '#0f172a', padding: '14px 16px', borderRadius: '10px', border: '1px solid #1e293b'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>E-Signature (Optional)</strong>
                  <span className="muted" style={{fontSize: '11px'}}>Draw your signature to include it in your application letter.</span>
                </div>
                <div style={{display: 'flex', gap: '6px'}}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px'}}
                    onClick={() => setShowSigModal(true)}
                  >
                    <PenTool size={12} /> Draw Signature
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px'}}
                    onClick={() => setShowSigModal(true)}
                  >
                    <Upload size={12} /> Upload Image
                  </button>
                </div>
              </div>

              {signatureDataUrl && (
                <div style={{marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <Check size={12} /> Signature Affixed
                  </span>
                  <button
                    type="button"
                    onClick={() => setSignatureDataUrl(null)}
                    style={{fontSize: '10px', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer'}}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Degree & School */}
            <div>
              <label style={{fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px'}}>Degree</label>
              <input
                type="text"
                value={degree}
                onChange={e => setDegree(e.target.value)}
                placeholder="e.g. Bachelor of Science in Engineering"
                style={{width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc', fontSize: '13px'}}
              />
            </div>

            <div>
              <label style={{fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px'}}>School</label>
              <input
                type="text"
                value={school}
                onChange={e => setSchool(e.target.value)}
                placeholder="e.g. University of the Philippines"
                style={{width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc', fontSize: '13px'}}
              />
            </div>

            {/* Relevant Skills (Image 4 match: interactive pills) */}
            <div>
              <div style={{marginBottom: '8px'}}>
                <strong style={{fontSize: '13px', color: '#f8fafc', display: 'block'}}>Relevant Skills</strong>
                <span className="muted" style={{fontSize: '11px'}}>Not sure what to write? Select what applies to you.</span>
              </div>

              <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                {defaultSkills.map(s => {
                  const isSelected = selectedSkills.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isSelected ? '#0f172a' : '#1e293b',
                        color: isSelected ? '#38bdf8' : '#cbd5e1',
                        border: isSelected ? '1.5px solid #06b6d4' : '1px solid #334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {s}
                      {isSelected && <span style={{fontSize: '11px', marginLeft: '2px'}}>×</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Proceed Action Button */}
            <div style={{marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e293b'}}>
              <button
                type="button"
                className="btn btn-primary"
                style={{width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                onClick={handleProceedToWorkspace}
              >
                Proceed to PDS Workspace <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal if opened */}
      {showSigModal && (
        <SignatureModal
          open={showSigModal}
          initialName={fullName}
          onClose={() => setShowSigModal(false)}
          onSave={sig => {
            setSignatureDataUrl(sig);
            setShowSigModal(false);
          }}
        />
      )}
    </div>,
    document.body
  );
}
