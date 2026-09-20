'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {FileSpreadsheet,Upload,Download,Mail,Maximize2,Check,Save,Trash2,ArrowLeft,ChevronDown,Settings2,FilePlus2,Printer,BookOpen,FileText,PenLine} from 'lucide-react';
import {useRef} from 'react';
import ThemeToggle from './theme-toggle';
import ThemeAccentPicker from './theme-accent-picker';
import WaveWizard from './wave-wizard';
import PdsPageNavigation from './pds-page-navigation';
import PdsBeadScrollbar from './pds-bead-scrollbar';
import ImportDialog from './import-dialog';
import LetterDialog from './letter-dialog';
import NewDocumentModal from './new-document-modal';
import CSCGuideModal from './csc-guide-modal';
import {LivePreview,FullscreenPreview} from './pdf-preview';
import {generatePDF} from '@/lib/pdf';
import {generateXLSX} from '@/lib/xlsx';
import {PDS,emptyPDS,validatedDraft,progress,download,issues} from '@/lib/model';
import {GROUPS} from '@/lib/groups';

async function fetchOfficialTemplate(){
  // Queries JSON API so browser download managers (such as IDM) never intercept the template fetch.
  try {
    const response = await fetch('/api/template');
    if (response.ok) {
      const data = await response.json();
      if (data?.template) {
        const bin = atob(data.template);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        if (bytes.length > 100 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          return bytes;
        }
      }
    }
  } catch {}

  throw new Error('The official PDS preview is unavailable. Please refresh and try again.');
}

export default function Builder(){
  const [mobileTab,setMobileTab]=useState<'form'|'preview'>('form');
  const [importOpen,setImportOpen]=useState(false),[letterOpen,setLetterOpen]=useState(false);
  const [createOpen,setCreateOpen]=useState(false);
  const [guideOpen,setGuideOpen]=useState(false);
  const [exportMenuOpen,setExportMenuOpen]=useState(false);
  const [actionsMenuOpen,setActionsMenuOpen]=useState(false);
  const actionsRef=useRef<HTMLDivElement>(null);
  const formScrollRef=useRef<HTMLElement>(null);

  // Dismiss the header menus on outside click or Escape.
  useEffect(()=>{
    if(!exportMenuOpen&&!actionsMenuOpen)return;
    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target as Node;
      if(actionsRef.current&&!actionsRef.current.contains(target)){setExportMenuOpen(false);setActionsMenuOpen(false)}
    };
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setExportMenuOpen(false);setActionsMenuOpen(false)}};
    document.addEventListener('pointerdown',onPointerDown);
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('pointerdown',onPointerDown);document.removeEventListener('keydown',onKey)};
  },[exportMenuOpen,actionsMenuOpen]);
  const [bytes,setBytes]=useState<Uint8Array|null>(null),[pdfError,setPdfError]=useState(''),[previewPage,setPreviewPage]=useState(0);
  const [fullOpen,setFullOpen]=useState(false),[finished,setFinished]=useState(false);
  const [data,setData]=useState<PDS>(emptyPDS),[ready,setReady]=useState(false),[saved,setSaved]=useState('Saved on this device'),[toast,setToast]=useState('');
  const [groupIndex,setGroupIndex]=useState(0);
  const [stepIndex,setStepIndex]=useState(0);

  const handleJump=(targetGroup:number,targetStep=0)=>{
    if(finished)setFinished(false);
    setGroupIndex(targetGroup);
    setStepIndex(targetStep);
    const pdfPage=GROUPS[targetGroup]?.steps[targetStep]?.pdfPage??targetGroup;
    setPreviewPage(pdfPage);
  };

  // "New document" modal on a truly fresh start — the VeriWorkly entry ritual.
  // Returning users (a draft exists) go straight to their workspace.
  useEffect(()=>{
    const id=setTimeout(()=>{
      try{
        const raw=localStorage.getItem('zeticuz-draft');
        if(raw){
          setData(validatedDraft(JSON.parse(raw)));
        }else if(!sessionStorage.getItem('careerform-create-seen')){
          setCreateOpen(true);
          sessionStorage.setItem('careerform-create-seen','1');
        }
      }catch{setToast('The previous draft could not be restored. You can import a saved backup.')}
      setReady(true);
    },0);
    return()=>clearTimeout(id);
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const id=setTimeout(()=>{
      try{localStorage.setItem('zeticuz-draft',JSON.stringify(data));setSaved('Saved on this device')}
      catch{setSaved('Storage unavailable — download a backup')}
    },400);
    return()=>clearTimeout(id);
  },[data,ready]);

  useEffect(()=>{
    if(!toast)return;
    const id=setTimeout(()=>setToast(''),5000);
    return()=>clearTimeout(id);
  },[toast]);

  // Load the real official form first. This is a fetch for the live canvas only;
  // it never creates an anchor and therefore cannot trigger a browser download.
  useEffect(()=>{
    if(!ready)return;
    let cancelled=false;
    void fetchOfficialTemplate().then(template=>{
      if(!cancelled){setBytes(template);setPdfError('')}
    }).catch(error=>{
      if(!cancelled)setPdfError(error instanceof Error?error.message:'Official PDS preview unavailable.');
    });
    return()=>{cancelled=true};
  },[ready]);

  // Apply the current local draft over the official template in the background.
  // The explicit Download buttons are the only places that call download().
  useEffect(()=>{
    if(!ready)return;
    let cancelled=false;
    const id=setTimeout(()=>{
      void generatePDF(data).then(next=>{
        if(!cancelled){setBytes(next);setPdfError('')}
      }).catch(error=>{
        if(!cancelled)setPdfError(error instanceof Error?error.message:'PDF preview generation failed.');
      });
    },90);
    return()=>{cancelled=true;clearTimeout(id)};
  },[data,ready]);

  const change=(next:PDS)=>{setSaved('Saving…');setData(next)};
  const applyImport=(incoming:PDS)=>{
    const records={...data.records};
    for(const [key,rows] of Object.entries(incoming.records))if(rows.some(row=>Object.keys(row).some(field=>field!=='level'&&row[field])))records[key]=rows;
    change({...data,...(incoming.photo?{photo:incoming.photo}:{}),...(incoming.signature?{signature:incoming.signature}:{}),values:{...data.values,...incoming.values},records});
    setImportOpen(false);
    setToast('Imported details applied. Review every section before downloading.');
  };
  useEffect(()=>{
    const id=setTimeout(()=>{
      if(window.location.search.includes('tool=letter'))setLetterOpen(true);
      if(window.location.search.includes('action=import'))setImportOpen(true);
      if(window.location.search.includes('action=create'))setCreateOpen(true);
    },0);
    return()=>clearTimeout(id);
  },[]);

  const backup=()=>download(JSON.stringify(data,null,2),'careerform-pds-draft.json','application/json');
  const reset=()=>{
    if(confirm('Clear this browser’s PDS draft? Download a backup first if you need to keep it.')){
      setData(emptyPDS());setFinished(false);setToast('Draft cleared.');
    }
  };
  const blocking=useMemo(()=>issues(data),[data]);
  const exportPDF=async()=>{
    try{
      const latest=await generatePDF(data);
      download(latest,'CareerForm-PDS-2026.pdf','application/pdf');
      setToast('Your official PDS PDF is ready.');
    }catch(error){setPdfError(error instanceof Error?error.message:'PDF export failed.')}
  };
  const exportXLSX=async()=>{
    try{
      const latest=await generateXLSX(data);
      download(latest,'CareerForm-PDS-2026.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      setToast('Your official PDS spreadsheet (.xlsx) is ready.');
    }catch(error){setPdfError(error instanceof Error?error.message:'Excel export failed.')}
  };

  const handlePrint=async ()=>{
    try{
      const pdfBytes=bytes||await generatePDF(data);
      const blob=new Blob([pdfBytes as unknown as BlobPart],{type:'application/pdf'});
      const url=URL.createObjectURL(blob);
      const iframe=document.createElement('iframe');
      iframe.style.position='fixed';
      iframe.style.right='0';
      iframe.style.bottom='0';
      iframe.style.width='0';
      iframe.style.height='0';
      iframe.style.border='0';
      iframe.src=url;
      document.body.appendChild(iframe);
      iframe.onload=()=>{
        try{
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }catch{
          window.print();
        }
        setTimeout(()=>{
          iframe.remove();
          URL.revokeObjectURL(url);
        },60000);
      };
    }catch{
      window.print();
    }
  };

  const toolProps={
    data,
    onChange:change,
    finished,
    onFinish:()=>{setFinished(true);setFullOpen(true)},
    onEdit:()=>setFinished(false),
    onPreviewPage:setPreviewPage,
    groupIndex,
    stepIndex,
    onJump:handleJump,
  };

  return <div className="app-shell workspace-app">
    <header className="workspace-chrome">
      <div className="wc-left">
        <Link className="wc-back" href="/" aria-label="Back to home" title="Back to home"><ArrowLeft size={17}/></Link>
        <Link className="wc-brand" href="/" aria-label="CareerForm PH home">
          <span className="font-bold tracking-tight text-[var(--heading)] text-sm sm:text-base flex items-center gap-1.5 select-none">
            CareerForm
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
              2026
            </span>
          </span>
        </Link>
        <div className="wc-progress-pill" aria-label={`${progress(data)}% filled`} title={`${progress(data)}% of PDS completed`}>
          <span className="track"><i style={{width:`${progress(data)}%`}}/></span>
          <span className="progress-pct">{progress(data)}%</span>
        </div>
      </div>

      <div className="wc-right">
        {blocking.length>0&&<span className="wc-review-pill" title="Fields still needing attention">{blocking.length} to review</span>}
        <button className="wc-btn wc-btn-secondary" title="Official CSC 2026 Guide to Filling Out PDS" onClick={()=>setGuideOpen(true)}><BookOpen size={14}/><span className="wc-btn-label">Guide</span></button>
        <button className="wc-btn wc-btn-secondary" title="Print document" onClick={handlePrint}><Printer size={14}/><span className="wc-btn-label">Print</span></button>
        <button className="wc-btn wc-btn-secondary" onClick={backup}><Save size={14}/><span className="wc-btn-label">Save</span></button>
        <div style={{position:'relative'}}>
          <button className="wc-btn wc-btn-secondary" title="Export your official PDS form" onClick={()=>setExportMenuOpen(v=>!v)} aria-haspopup="menu" aria-expanded={exportMenuOpen}>
            <Download size={14}/><span className="wc-btn-label">Export</span><ChevronDown size={12} aria-hidden="true"/>
          </button>
          {exportMenuOpen&&<div className="wc-menu" role="menu" aria-label="Export options">
            <button role="menuitem" onClick={()=>{setExportMenuOpen(false);void exportXLSX()}}><FileSpreadsheet size={14}/>Download Excel (.xlsx)</button>
            <button role="menuitem" onClick={()=>{setExportMenuOpen(false);void exportPDF()}}><Download size={14}/>Download PDF (.pdf)</button>
            <button role="menuitem" onClick={()=>{setExportMenuOpen(false);backup()}}><Save size={14}/>Save backup (JSON)</button>
            <button role="menuitem" onClick={()=>{setExportMenuOpen(false);setFullOpen(true)}}><Maximize2 size={14}/>Open full preview</button>
          </div>}
        </div>
        <div ref={actionsRef} style={{position:'relative'}}>
          <button className="wc-btn wc-btn-secondary" onClick={()=>setActionsMenuOpen(v=>!v)} aria-haspopup="menu" aria-expanded={actionsMenuOpen}><Settings2 size={14}/><span className="wc-btn-label">Actions</span><ChevronDown size={12} aria-hidden="true"/></button>
          {actionsMenuOpen&&<div className="wc-menu" role="menu" aria-label="Workspace actions">
            <button role="menuitem" onClick={()=>{setActionsMenuOpen(false);setCreateOpen(true)}}><FilePlus2 size={14}/>New document</button>
            <button role="menuitem" onClick={()=>{setActionsMenuOpen(false);setImportOpen(true)}}><Upload size={14}/>Import PDS…</button>
            <button role="menuitem" onClick={()=>{setActionsMenuOpen(false);setLetterOpen(true)}}><Mail size={14}/>Compose letters</button>
            <button role="menuitem" onClick={()=>{setActionsMenuOpen(false);backup()}}><Save size={14}/>Save backup (JSON)</button>
            <button role="menuitem" className="danger" onClick={()=>{setActionsMenuOpen(false);reset()}}><Trash2 size={14}/>Clear draft</button>
          </div>}
        </div>
        <ThemeAccentPicker/>
        <ThemeToggle/>
      </div>
    </header>

    {/* Dedicated Top Sub-Bar for Page Navigation */}
    <nav className="builder-top-subnav" aria-label="PDS page sections">
      <PdsPageNavigation
        groupIndex={groupIndex}
        stepIndex={stepIndex}
        onJump={handleJump}
        finished={finished}
      />
    </nav>

    {/* Mobile Tab Toggle for Form Editor vs Official PDS Mirror (Shown only on screens < 1024px) */}
    <div className="builder-mobile-tab-switch" role="tablist" aria-label="Mobile View Mode">
      <button
        type="button"
        role="tab"
        aria-selected={mobileTab === 'form'}
        className={`mobile-tab-btn ${mobileTab === 'form' ? 'active' : ''}`}
        onClick={() => setMobileTab('form')}
      >
        <PenLine size={14} />
        <span>Edit Form</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mobileTab === 'preview'}
        className={`mobile-tab-btn ${mobileTab === 'preview' ? 'active' : ''}`}
        onClick={() => setMobileTab('preview')}
      >
        <FileText size={14} />
        <span>Official PDS Mirror</span>
      </button>
    </div>

    <div className={`wc-body mobile-view-${mobileTab}`}>
      <div className="wc-form-column">
        <main className="wc-content" ref={formScrollRef}>
          <h1 className="sr-only">Personal Data Sheet live workspace — CS Form 212 Revised 2026</h1>
          <WaveWizard {...toolProps}/>
        </main>
        <PdsBeadScrollbar targetRef={formScrollRef} />
      </div>
      <aside className="wc-preview">
        <LivePreview bytes={bytes} page={previewPage} onPage={setPreviewPage} error={pdfError} onExpand={()=>setFullOpen(true)}/>
      </aside>
    </div>

    {createOpen&&<NewDocumentModal open onClose={()=>setCreateOpen(false)} onCreatePDS={()=>setCreateOpen(false)} onCreateLetter={()=>{setCreateOpen(false);setLetterOpen(true)}} onImport={()=>setImportOpen(true)}/>}
    {guideOpen&&<CSCGuideModal open onClose={()=>setGuideOpen(false)}/>}
    {importOpen&&<ImportDialog onClose={()=>setImportOpen(false)} onApply={applyImport}/>}
    {letterOpen&&<LetterDialog data={data} onClose={()=>setLetterOpen(false)}/>}
    {fullOpen&&<FullscreenPreview bytes={bytes} onClose={()=>setFullOpen(false)} onDownloadPDF={exportPDF} onDownloadXLSX={exportXLSX}/>}
    {pdfError&&<div className="toast" role="alert">{pdfError}</div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}

