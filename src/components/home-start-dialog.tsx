'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {FileText, Upload, Mail, ArrowRight, X, Sparkles} from 'lucide-react';
import CoverLetterSelectionModal from './cover-letter-selection-modal';

export default function HomeStartDialog() {
  const [open, setOpen] = useState(false);
  const [letterModalOpen, setLetterModalOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen(true)}
      >
        Start my PDS <ArrowRight size={16} />
      </button>

      {open && (
        <div
          className="modal-backdrop nd-backdrop"
          style={{zIndex: 9999}}
          onClick={e => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="nd-modal" role="dialog" aria-modal="true" aria-labelledby="start-title">
            <div className="nd-head">
              <div>
                <p className="nd-kicker">Get Started</p>
                <h2 id="start-title">Personal Data Sheet (CS Form 212)</h2>
                <p className="nd-sub">Choose how you would like to begin your Civil Service 2026 PDS.</p>
              </div>
              <button
                type="button"
                className="text-button"
                aria-label="Close dialog"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="nd-cards">
              <button
                type="button"
                className="nd-card group"
                onClick={() => {
                  setOpen(false);
                  router.push('/builder');
                }}
              >
                <span className="nd-card-top">
                  <span className="nd-card-icon"><FileText size={20} /></span>
                  <span className="nd-card-badge">Blank</span>
                </span>
                <span className="nd-card-label">Create New PDS</span>
                <span className="nd-card-desc">
                  Start fresh with official CS Form 212 Revised 2026. Real-time form mirror updates as you type.
                </span>
              </button>

              <button
                type="button"
                className="nd-card group"
                onClick={() => {
                  setOpen(false);
                  setLetterModalOpen(true);
                }}
              >
                <span className="nd-card-top">
                  <span className="nd-card-icon"><Mail size={20} /></span>
                  <span className="nd-card-badge">Letters</span>
                </span>
                <span className="nd-card-label">Compose Cover Letter</span>
                <span className="nd-card-desc">
                  Draft an application or transmittal letter automatically linked to your PDS details.
                </span>
              </button>
            </div>

            <div className="nd-import">
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
                <p className="nd-kicker" style={{margin: 0}}>Smart Import</p>
                <span style={{fontSize: 11, color: 'var(--accent, #efb530)', display: 'inline-flex', alignItems: 'center', gap: 4}}>
                  <Sparkles size={12} /> Auto-extract details
                </span>
              </div>
              <button
                type="button"
                className="nd-import-btn"
                onClick={() => {
                  setOpen(false);
                  router.push('/builder?action=import');
                }}
              >
                <Upload size={18} />
                <div style={{display: 'flex', flexDirection: 'column', textAlign: 'left'}}>
                  <span style={{fontWeight: 600}}>Import Old PDS File</span>
                  <em>Supports PDF, Excel (.xlsx), Word (.docx), CSV & JSON</em>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {letterModalOpen && (
        <CoverLetterSelectionModal
          open={letterModalOpen}
          onClose={() => setLetterModalOpen(false)}
        />
      )}
    </>
  );
}
