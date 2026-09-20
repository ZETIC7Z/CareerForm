'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {FileText, Mail, Award, ArrowRight, X, Sparkles} from 'lucide-react';
import CoverLetterSelectionModal from './cover-letter-selection-modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ToolsSelectorModal({open, onClose}: Props) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [letterModalOpen, setLetterModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <>
      <div
        className="modal-backdrop nd-backdrop"
        style={{zIndex: 9998}}
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="nd-modal max-w-[820px] w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tools-selector-title"
          ref={boxRef}
        >
          <div className="nd-head">
            <div>
              <p className="nd-kicker flex items-center gap-1.5 text-amber-400">
                <Sparkles size={12} /> Civil Service Commission 2026 Suite
              </p>
              <h2 id="tools-selector-title">Launch CareerForm Builders</h2>
              <p className="nd-sub">
                Select the builder tool you want to work on. All tools operate in your browser with automatic local and cloud sync.
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

          <div className="nd-cards grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tool 1: PDS Builder */}
            <button
              type="button"
              className="nd-card group text-left transition-all duration-300 hover:border-amber-400/60 hover:shadow-xl relative overflow-hidden"
              onClick={() => navigateTo('/builder')}
            >
              <span className="nd-card-top">
                <span className="nd-card-icon text-amber-400">
                  <FileText size={22} />
                </span>
                <span className="nd-card-badge bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Form 212
                </span>
              </span>
              <span className="nd-card-label text-base">PDS Builder</span>
              <span className="nd-card-desc">
                Fill the official 4-page Civil Service Personal Data Sheet (Revised 2026) with live PDF mirror, smart import, and error checks.
              </span>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-amber-400">
                <span>Launch PDS</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Tool 2: Application Letter Studio */}
            <button
              type="button"
              className="nd-card group text-left transition-all duration-300 hover:border-sky-400/60 hover:shadow-xl relative overflow-hidden"
              onClick={() => {
                setLetterModalOpen(true);
              }}
            >
              <span className="nd-card-top">
                <span className="nd-card-icon text-sky-400">
                  <Mail size={22} />
                </span>
                <span className="nd-card-badge bg-sky-400/10 text-sky-300 border border-sky-400/20">
                  Letter Studio
                </span>
              </span>
              <span className="nd-card-label text-base">Application Letter Builder</span>
              <span className="nd-card-desc">
                Draft tailored Job Application Letters and PDS Transmittal Letters with official Philippine government formatting, live preview, and e-signatures.
              </span>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-sky-400">
                <span>Choose Letter</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Tool 3: WES Annex */}
            <button
              type="button"
              className="nd-card group text-left transition-all duration-300 hover:border-emerald-400/60 hover:shadow-xl relative overflow-hidden"
              onClick={() => navigateTo('/wes')}
            >
              <span className="nd-card-top">
                <span className="nd-card-icon text-emerald-400">
                  <Award size={22} />
                </span>
                <span className="nd-card-badge bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                  Annex
                </span>
              </span>
              <span className="nd-card-label text-base">WES Builder</span>
              <span className="nd-card-desc">
                Standardized Work Experience Sheet detailing your actual duties, major achievements, and government appointment justifications.
              </span>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span>Launch WES</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          <div className="pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <span>All forms 100% compliant with CSC MC No. 16, s. 2017 & 2026 revisions.</span>
            <span className="text-[11px] text-amber-400 font-medium">Free & In-Browser</span>
          </div>
        </div>
      </div>

      {letterModalOpen && (
        <CoverLetterSelectionModal
          open={letterModalOpen}
          onClose={() => {
            setLetterModalOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
