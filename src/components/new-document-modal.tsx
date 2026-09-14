'use client';
/**
 * "New document" create modal, modeled on VeriWorkly's NewDocumentModal
 * (MIT): a CREATE header, document-type cards, and an import strip. Choosing a
 * type enters the workspace with that tool ready.
 */
import {Plus,X,FileText,Mail,Upload} from 'lucide-react';
import {useEffect,useRef} from 'react';

export default function NewDocumentModal({
  open,
  onClose,
  onCreatePDS,
  onCreateLetter,
  onImport,
}:{
  open:boolean;
  onClose:()=>void;
  onCreatePDS:()=>void;
  onCreateLetter:()=>void;
  onImport:()=>void;
}){
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!open)return;
    const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};
    document.addEventListener('keydown',handler);
    return()=>document.removeEventListener('keydown',handler);
  },[open,onClose]);

  if(!open)return null;

  const card=(label:string,desc:string,Icon:typeof FileText,action:()=>void)=>{
    return <button
      type="button"
      className="nd-card group"
      onClick={()=>{onClose();action()}}
    >
      <span className="nd-card-top">
        <span className="nd-card-icon"><Icon size={19}/></span>
        <Plus className="nd-card-plus" size={18}/>
      </span>
      <span className="nd-card-label">{label}</span>
      <span className="nd-card-desc">{desc}</span>
    </button>;
  };

  return <div className="modal-backdrop nd-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="nd-modal" role="dialog" aria-modal="true" aria-labelledby="nd-title" aria-describedby="nd-desc" ref={ref}>
      <div className="nd-head">
        <div>
          <p className="nd-kicker">Create</p>
          <h2 id="nd-title">New document</h2>
          <p id="nd-desc" className="nd-sub">Choose document type. Your draft stays on this device.</p>
        </div>
        <button type="button" className="text-button" aria-label="Close new document" onClick={onClose}><X size={18}/></button>
      </div>

      <div className="nd-cards">
        {card('Create PDS','Start the official CS Form 212 (Revised 2026) with a live mirror beside you.',FileText,onCreatePDS)}
        {card('Cover letter','Draft an application or transmittal letter around your PDS details.',Mail,onCreateLetter)}
      </div>

      <div className="nd-import">
        <p className="nd-kicker">Import from file</p>
        <button type="button" className="nd-import-btn" onClick={()=>{onClose();onImport()}}>
          <Upload size={16}/>
          <span>Import an existing PDS</span>
          <em>CSV · XLSX · PDF · JSON backup</em>
        </button>
      </div>
    </div>
  </div>;
}
