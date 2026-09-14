'use client';
import {useEffect,useRef,useState} from 'react';
import {X,FileText,Send} from 'lucide-react';
import {Letter,letterFor,letterPlainText,loadLetter,saveLetter,pdsName} from '@/lib/letter';
import {PDS,download} from '@/lib/model';
import {letterPDF} from '@/lib/pdf';

export default function LetterDialog({data,onClose}:{data:PDS;onClose:()=>void}){
 const [letter,setLetter]=useState<Letter>(()=>loadLetter()??letterFor('application',data));
 const [tab,setTab]=useState<Letter['kind']>(loadLetter()?.kind??'application');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{const prev=document.activeElement as HTMLElement;box.current?.focus();
  const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const els=box.current?.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]');if(!els?.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
  document.addEventListener('keydown',handler);return()=>{document.removeEventListener('keydown',handler);prev?.focus()}},[onClose]);
 const patch=(p:Partial<Letter>)=>{setLetter(l=>{const next={...l,...p};saveLetter(next);return next})};
 const applyTemplate=(kind:Letter['kind'])=>{const base=letterFor(kind,data);patch({...base,kind,date:letter.date,recipientTitle:letter.recipientTitle,recipientName:letter.recipientName,organization:letter.organization,organizationAddress:letter.organizationAddress,senderName:letter.senderName,senderAddress:letter.senderAddress,senderContact:letter.senderContact})};
 const exportPDF=async()=>{
  setBusy(true);setError('');
  try{const bytes=await letterPDF(letter,data);download(bytes,`${letter.kind==='application'?'Application':'Transmittal'}-letter.pdf`,'application/pdf');saveLetter(letter)}
  catch(e){setError(e instanceof Error?e.message:'Letter export failed.')}
  finally{setBusy(false)}};
 return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="letter-title" tabIndex={-1} ref={box}>
  <div className="modal-head"><h2 id="letter-title">Your letters, ready to send.</h2><button className="text-button" aria-label="Close letters" onClick={onClose}><X size={18}/></button></div>
  <p className="muted">Draft an application or transmittal letter. Your PDS details fill the placeholders automatically — everything stays on this device.</p>
  <div className="letter-tabs">
   {(['application','transmittal'] as const).map(kind=><button key={kind} className={'letter-tab '+(tab===kind?'active':'')} aria-pressed={tab===kind} onClick={()=>{setTab(kind);if(letter.kind!==kind)applyTemplate(kind)}}>{kind==='application'?'Application letter':'Transmittal letter'}</button>)}
  </div>
  <div className="letter-grid">
   <div className="letter-fields">
    <div className="fields">
     <label>Date<input type="date" value={letter.date} onChange={e=>patch({date:e.target.value})}/></label>
     <label>Recipient title<input value={letter.recipientTitle} placeholder="e.g. Regional Director" onChange={e=>patch({recipientTitle:e.target.value})}/></label>
     <label>Recipient name<input value={letter.recipientName} placeholder="e.g. MARIA D. SANTOS" onChange={e=>patch({recipientName:e.target.value})}/></label>
     <label>Organization<input value={letter.organization} placeholder="e.g. Department of Education" onChange={e=>patch({organization:e.target.value})}/></label>
    </div>
    <label>Organization address<textarea rows={2} value={letter.organizationAddress} placeholder={' street, barangay\\ncity, province'} onChange={e=>patch({organizationAddress:e.target.value})}/></label>
    {letter.kind==='application'&&<label>Position applied for<input value={letter.position} placeholder="Position title" onChange={e=>patch({position:e.target.value})}/></label>}
    <label>Subject<input value={letter.subject} onChange={e=>patch({subject:e.target.value})}/></label>
    <label>Letter body
     <textarea rows={9} value={letter.body} onChange={e=>patch({body:e.target.value})}/>
    </label>
    <p className="muted">Placeholders: {'{{POSITION}}'} {'{{ORGANIZATION}}'} {'{{NAME}}'} {'{{ADDRESS}}'} {'{{MOBILE}}'} {'{{EMAIL}}'} {'{{EDUCATION}}'} {'{{ELIGIBILITY}}'} {'{{TODAY}}'}</p>
    <div className="fields">
     <label>Your name<input value={letter.senderName} placeholder={pdsName(data)||'From your PDS'} onChange={e=>patch({senderName:e.target.value})}/></label>
     <label>Your contact line<input value={letter.senderContact} placeholder="Mobile · email" onChange={e=>patch({senderContact:e.target.value})}/></label>
    </div>
    <label>Your address<textarea rows={2} value={letter.senderAddress} placeholder="Pre-filled from your PDS" onChange={e=>patch({senderAddress:e.target.value})}/></label>
   </div>
   <aside className="letter-preview-side">
    <div className="letter-paper" aria-label="Letter preview">{letterPlainText(letter,data)}</div>
    <div className="letter-side-actions">
     <button className="primary" disabled={busy} onClick={()=>void exportPDF()}><FileText size={14}/> {busy?'Preparing…':'Download letter PDF'}</button>
     <button className="secondary" onClick={()=>patch(letterFor(letter.kind,data))}><Send size={13}/> Reset to template</button>
    </div>
    <p className="muted">Letterhead is drawn from your PDS name and address. Review before submitting.</p>
   </aside>
  </div>
  {error&&<p className="error" role="alert">{error}</p>}
 </div></div>;
}
