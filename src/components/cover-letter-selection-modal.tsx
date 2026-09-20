'use client';

import {useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {Mail, FileCheck2, ArrowRight, X, Sparkles} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CoverLetterSelectionModal({open, onClose}: Props) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (type: 'application' | 'transmittal') => {
    onClose();
    router.push(`/coverletter?type=${type}`);
  };

  return (
    <div
      className="modal-backdrop nd-backdrop"
      style={{zIndex: 9999}}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="nd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-choice-title"
        ref={boxRef}
      >
        <div className="nd-head">
          <div>
            <p className="nd-kicker flex items-center gap-1.5 text-amber-400">
              <Sparkles size={12} /> Official CSC Correspondence
            </p>
            <h2 id="letter-choice-title">Select Letter Type</h2>
            <p className="nd-sub">
              Choose the document you wish to draft. You can switch types anytime inside the letter studio.
            </p>
          </div>
          <button
            type="button"
            className="text-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="nd-cards grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            className="nd-card group text-left transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg"
            onClick={() => handleSelect('application')}
          >
            <span className="nd-card-top">
              <span className="nd-card-icon text-amber-400">
                <Mail size={20} />
              </span>
              <span className="nd-card-badge bg-amber-400/10 text-amber-300 border border-amber-400/20">
                Plantilla & Vacancies
              </span>
            </span>
            <span className="nd-card-label">Job Application Letter</span>
            <span className="nd-card-desc">
              Formal letter applying for a specific government position. Automatically includes agency address, item number, salary grade, qualifications, and core competencies.
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              Launch Studio <ArrowRight size={13} />
            </span>
          </button>

          <button
            type="button"
            className="nd-card group text-left transition-all duration-300 hover:border-sky-400/50 hover:shadow-lg"
            onClick={() => handleSelect('transmittal')}
          >
            <span className="nd-card-top">
              <span className="nd-card-icon text-sky-400">
                <FileCheck2 size={20} />
              </span>
              <span className="nd-card-badge bg-sky-400/10 text-sky-300 border border-sky-400/20">
                CS Form 212
              </span>
            </span>
            <span className="nd-card-label">Transmittal Letter</span>
            <span className="nd-card-desc">
              Official transmittal document for submitting your accomplished Civil Service Commission Personal Data Sheet (CS Form 212, Revised 2026) and supporting eligibility records.
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
              Launch Studio <ArrowRight size={13} />
            </span>
          </button>
        </div>

        <div className="pt-3 border-t border-[var(--line)] text-center">
          <p className="text-xs text-slate-400">
            Letters dynamically pull your name, address, contact, and credentials from your local PDS draft.
          </p>
        </div>
      </div>
    </div>
  );
}
