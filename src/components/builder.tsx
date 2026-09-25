'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {FileSpreadsheet,Upload,Download,Mail,Maximize2,Check,Save,Trash2,ArrowLeft,ChevronDown,Settings2,FilePlus2,Printer,BookOpen,FileText,PenLine,Cloud,CloudCheck,WifiOff,LayoutDashboard,AlertCircle,Plus,X} from 'lucide-react';
import {useRef} from 'react';
import ThemeToggle from './theme-toggle';
import ThemeAccentPicker from './theme-accent-picker';
import WaveWizard from './wave-wizard';
import PdsPageNavigation from './pds-page-navigation';
import PdsBeadScrollbar from './pds-bead-scrollbar';
import ImportDialog from './import-dialog';
import LetterDialog from './letter-dialog';
import CoverLetterSelectionModal from './cover-letter-selection-modal';
import NewDocumentModal from './new-document-modal';
import CSCGuideModal from './csc-guide-modal';
import {LivePreview,FullscreenPreview} from './pdf-preview';
import BrandMark from './brand-logo';
import {generatePDF} from '@/lib/pdf';
import {generateXLSX} from '@/lib/xlsx';
import {PDS,emptyPDS,validatedDraft,progress,download,issues,getReviewIssues,ReviewIssue} from '@/lib/model';
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
  const [letterModalOpen,setLetterModalOpen]=useState(false);
  const [createOpen,setCreateOpen]=useState(false);
  const [guideOpen,setGuideOpen]=useState(false);
  const [exportMenuOpen,setExportMenuOpen]=useState(false);
  const [actionsMenuOpen,setActionsMenuOpen]=useState(false);
  const [reviewMenuOpen,setReviewMenuOpen]=useState(false);
  const actionsRef=useRef<HTMLDivElement>(null);
  const reviewRef=useRef<HTMLDivElement>(null);
  const formScrollRef=useRef<HTMLElement>(null);

  // Dismiss the header menus on outside click or Escape.
  useEffect(()=>{
    if(!exportMenuOpen&&!actionsMenuOpen&&!reviewMenuOpen)return;
    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target as Node;
      if(actionsRef.current&&!actionsRef.current.contains(target)){setExportMenuOpen(false);setActionsMenuOpen(false)}
      if(reviewRef.current&&!reviewRef.current.contains(target)){setReviewMenuOpen(false)}
    };
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setExportMenuOpen(false);setActionsMenuOpen(false);setReviewMenuOpen(false)}};
    document.addEventListener('pointerdown',onPointerDown);
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('pointerdown',onPointerDown);document.removeEventListener('keydown',onKey)};
  },[exportMenuOpen,actionsMenuOpen,reviewMenuOpen]);
  const [bytes,setBytes]=useState<Uint8Array|null>(null),[pdfError,setPdfError]=useState(''),[previewPage,setPreviewPage]=useState(0);
  const [fullOpen,setFullOpen]=useState(false),[finished,setFinished]=useState(false);
  const [data,setData]=useState<PDS>(emptyPDS),[ready,setReady]=useState(false),[saved,setSaved]=useState('Saved on this device'),[toast,setToast]=useState('');
  const [projectId,setProjectId]=useState<string|null>(null);
  const [projectTitle,setProjectTitle]=useState<string>('');
  const [syncStatus,setSyncStatus]=useState<'synced'|'saving'|'offline'|'local'>('local');
  const [groupIndex,setGroupIndex]=useState(0);
  const [stepIndex,setStepIndex]=useState(0);

  // Signed-in continuity: the builder and the dashboard share one set of projects.
  // Opening /builder without a project id now offers the account's recent documents
  // (or asks for a Project Name first, so the new one lands on the dashboard too).
  const [pickerOpen,setPickerOpen]=useState(false);
  const [accountProjects,setAccountProjects]=useState<{id:string;title:string;completionRate:number;lastModified:string}[]>([]);
  const [newNameOpen,setNewNameOpen]=useState(false);
  const [newName,setNewName]=useState('');
  const [creatingProject,setCreatingProject]=useState(false);

  const handleJump=(targetGroup:number,targetStep=0)=>{
    if(finished)setFinished(false);
    setGroupIndex(targetGroup);
    setStepIndex(targetStep);
    const pdfPage=GROUPS[targetGroup]?.steps[targetStep]?.pdfPage??targetGroup;
    setPreviewPage(pdfPage);
  };

  // Initial load: restore from localStorage (offline-first) and sync from MongoDB Atlas
  useEffect(()=>{
    let cancelled = false;
    const urlParams = new URLSearchParams(window.location.search);
    const pId = urlParams.get('project');

    const init = async () => {
      if (pId) {
        setProjectId(pId);
        // 1. Instant offline load from local cache
        const cached = localStorage.getItem(`pds_project_${pId}`);
        if (cached) {
          try {
            setData(validatedDraft(JSON.parse(cached)));
            setSyncStatus('local');
          } catch {}
        }

        // 2. Cloud load from MongoDB Atlas
        try {
          const res = await fetch(`/api/projects/${pId}`);
          if (res.ok && !cancelled) {
            const json = await res.json();
            if (json?.ok && json?.project) {
              setProjectTitle(json.project.title || 'Untitled PDS');
              if (json.project.data && Object.keys(json.project.data).length > 0) {
                const draft = validatedDraft(json.project.data);
                setData(draft);
                localStorage.setItem(`pds_project_${pId}`, JSON.stringify(draft));
              }
              setSyncStatus('synced');
              setSaved('Cloud Synced');
            }
          }
        } catch {
          setSyncStatus('offline');
          setSaved('Saved Offline');
        }
      } else {
        // Standalone draft mode
        try {
          const raw = localStorage.getItem('zeticuz-draft');
          if (raw) {
            setData(validatedDraft(JSON.parse(raw)));
          } else if (!sessionStorage.getItem('careerform-create-seen')) {
            setCreateOpen(true);
            sessionStorage.setItem('careerform-create-seen', '1');
          }
        } catch {
          setToast('The previous draft could not be restored. You can import a saved backup.');
        }
      }

      if (!cancelled) setReady(true);
    };

    void init();
    return () => { cancelled = true; };
  }, []);

  // Authenticated entry point: surface the dashboard's projects in the builder.
  useEffect(()=>{
    if(!ready||projectId)return;
    let cancelled=false;
    (async()=>{
      try{
        const me=await fetch('/api/auth/me').then(r=>r.json());
        if(!me?.ok||!me.user||cancelled)return;
        const json=await fetch('/api/projects').then(r=>r.json());
        if(cancelled)return;
        const list=(json?.projects||[]).map((p:{id:string;title:string;completionRate?:number;lastModified:string})=>({
          id:p.id,
          title:p.title,
          completionRate:p.completionRate??0,
          lastModified:p.lastModified,
        }));
        setAccountProjects(list);
        // Suppress the anonymous "new document" dialog: an account holder gets the
        // recent-projects picker instead, so the two modals never stack.
        setCreateOpen(false);
        setPickerOpen(true);
      }catch{}
    })();
    return()=>{cancelled=true};
  },[ready,projectId]);

  const createNamedProject=async()=>{
    if(!newName.trim())return;
    setCreatingProject(true);
    try{
      const res=await fetch('/api/projects',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title:newName.trim(),data,kind:'pds'}),
      });
      const json=await res.json();
      if(json?.ok&&json.project){
        // Hard navigation so the workspace loads in project mode with a stable URL.
        window.location.href=`/builder?project=${json.project.id}`;
        return;
      }
    }catch{}
    setCreatingProject(false);
  };

  // Offline-first local backup + debounced MongoDB Atlas auto-sync
  useEffect(()=>{
    if(!ready) return;

    // Save to local device storage instantly (survives network drops and power shutoffs)
    try {
      if (projectId) {
        localStorage.setItem(`pds_project_${projectId}`, JSON.stringify(data));
      }
      localStorage.setItem('zeticuz-draft', JSON.stringify(data));
      if (!projectId) {
        setSaved('Saved on this device');
        setSyncStatus('local');
      }
    } catch {
      setSaved('Storage unavailable — download a backup');
    }

    if (!projectId) return;

    setSyncStatus('saving');
    setSaved('Syncing to Cloud…');

    const syncTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data,
            title: projectTitle || undefined,
          }),
        });

        if (res.ok) {
          const resJson = await res.json();
          if (resJson?.ok) {
            setSyncStatus('synced');
            setSaved('Cloud Synced');
          } else {
            setSyncStatus('offline');
            setSaved('Saved Offline');
          }
        } else {
          setSyncStatus('offline');
          setSaved('Saved Offline');
        }
      } catch {
        setSyncStatus('offline');
        setSaved('Saved Offline');
      }
    }, 1500);

    return () => clearTimeout(syncTimer);
  }, [data, ready, projectId, projectTitle]);

  // Auto-sync when reconnecting to network
  useEffect(()=>{
    if (!projectId || !ready) return;
    const handleOnline = async () => {
      try {
        setSyncStatus('saving');
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, title: projectTitle || undefined }),
        });
        setSyncStatus('synced');
        setSaved('Cloud Synced');
      } catch {}
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [projectId, ready, data, projectTitle]);

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
  const reviewIssues=useMemo(()=>getReviewIssues(data),[data]);
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
        <Link className="wc-back" href={projectId ? "/dashboard" : "/"} aria-label={projectId ? "Back to dashboard" : "Back to home"} title={projectId ? "Back to dashboard" : "Back to home"}><ArrowLeft size={17}/></Link>
        <Link className="wc-brand" href="/" aria-label="CareerForm PH home">
          <BrandMark height={26}/>
        </Link>
        {projectTitle && (
          <span className="wc-project-chip hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-white/5 border border-white/10 text-white max-w-[180px] truncate" title={projectTitle}>
            {projectTitle}
          </span>
        )}
        <div className="wc-progress-pill" aria-label={`${progress(data)}% filled`} title={`${progress(data)}% of PDS completed`}>
          <span className="track"><i style={{width:`${progress(data)}%`}}/></span>
          <span className="progress-pct">{progress(data)}%</span>
        </div>

        {projectId && (
          <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium" style={{
            background: syncStatus === 'synced' ? 'rgba(16, 185, 129, 0.12)' : syncStatus === 'saving' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: syncStatus === 'synced' ? '#10b981' : syncStatus === 'saving' ? '#38bdf8' : '#fbbf24',
            border: `1px solid ${syncStatus === 'synced' ? 'rgba(16, 185, 129, 0.25)' : syncStatus === 'saving' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          }}>
            {syncStatus === 'synced' && <><CloudCheck size={12} /> <span>Synced</span></>}
            {syncStatus === 'saving' && <><Cloud size={12} className="animate-pulse" /> <span>Syncing…</span></>}
            {syncStatus === 'offline' && <><WifiOff size={12} /> <span>Offline (Saved)</span></>}
          </div>
        )}
      </div>

      <div className="wc-right">
        {projectId && (
          <Link href="/dashboard" className="wc-btn wc-btn-secondary" title="View all projects in Dashboard">
            <LayoutDashboard size={14}/>
            <span className="wc-btn-label">Dashboard</span>
          </Link>
        )}
        {reviewIssues.length > 0 && (
          <div
            ref={reviewRef}
            className="review-pill-container relative"
            onMouseEnter={() => setReviewMenuOpen(true)}
            onMouseLeave={() => setReviewMenuOpen(false)}
          >
            <button
              type="button"
              className="wc-review-pill cursor-pointer flex items-center gap-1.5 transition-all duration-200 hover:brightness-110 active:scale-95"
              onClick={() => setReviewMenuOpen(v => !v)}
              aria-haspopup="true"
              aria-expanded={reviewMenuOpen}
              title="Point mouse or click to inspect missing items and their exact areas"
            >
              <AlertCircle size={12} className="text-amber-400 shrink-0" />
              <span>{reviewIssues.length} to review</span>
              <ChevronDown size={11} className={`transition-transform duration-200 shrink-0 ${reviewMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {reviewMenuOpen && (
              <div
                className="review-inspector-popover"
                role="region"
                aria-label="Items needing attention"
              >
                <div className="review-popover-header">
                  <div className="flex items-center gap-2">
                    <span className="review-popover-count">{reviewIssues.length}</span>
                    <span className="font-bold text-xs text-white">Items to Complete</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Click item to jump</span>
                </div>

                <div className="review-popover-list">
                  {reviewIssues.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      className="review-popover-item group"
                      onClick={() => {
                        setReviewMenuOpen(false);
                        handleJump(issue.groupIndex, issue.stepIndex);
                      }}
                    >
                      <div className="review-item-main">
                        <span className="review-item-title">{issue.label}</span>
                        <div className="review-item-location">
                          <span className="review-item-section">{issue.section}</span>
                          <span className="review-item-badge">{issue.page}</span>
                        </div>
                      </div>
                      <span className="review-item-action">
                        Jump →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
            <button role="menuitem" onClick={()=>{setActionsMenuOpen(false);setLetterModalOpen(true)}}><Mail size={14}/>Compose letters Studio</button>
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

    {createOpen&&<NewDocumentModal open onClose={()=>setCreateOpen(false)} onCreatePDS={()=>setCreateOpen(false)} onCreateLetter={()=>{setCreateOpen(false);setLetterModalOpen(true)}} onImport={()=>setImportOpen(true)}/>}

    {/* Continue from the dashboard, or name a brand-new project so it appears there. */}
    {pickerOpen&&<div className="modal-backdrop nd-backdrop" onClick={e=>{if(e.target===e.currentTarget)setPickerOpen(false)}}>
      <div className="nd-modal" role="dialog" aria-modal="true" aria-labelledby="builder-projects-title">
        <div className="nd-head">
          <div>
            <p className="nd-kicker">Your account</p>
            <h2 id="builder-projects-title">Continue a project</h2>
            <p className="nd-sub">{accountProjects.length>0?'Pick up any document from your dashboard, or start a new one.':'Nothing saved yet — name your first project and it will appear on your dashboard.'}</p>
          </div>
          <button type="button" className="text-button" aria-label="Close" onClick={()=>setPickerOpen(false)}><X size={18}/></button>
        </div>

        {accountProjects.length>0&&<div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto',marginBottom:16}}>
          {accountProjects.slice(0,12).map(p=><button
            key={p.id}
            type="button"
            onClick={()=>{window.location.href=`/builder?project=${p.id}`}}
            style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:12,border:'1px solid var(--line-strong)',background:'var(--panel-2)',color:'var(--heading)',cursor:'pointer',textAlign:'left'}}
          >
            <FileText size={16} style={{color:'var(--accent,#06b6d4)',flexShrink:0}}/>
            <span style={{flex:1,minWidth:0}}>
              <strong style={{display:'block',fontSize:13.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</strong>
              <span style={{display:'block',fontSize:11.5,color:'var(--muted)'}}>{p.completionRate}% complete</span>
            </span>
            <span style={{fontSize:12,fontWeight:700,color:'var(--accent,#06b6d4)'}}>Open</span>
          </button>)}
        </div>}

        <button type="button" className="btn btn-primary" style={{width:'100%'}} onClick={()=>{setPickerOpen(false);setNewName('');setNewNameOpen(true)}}>
          <Plus size={16}/> Start a new project
        </button>
      </div>
    </div>}

    {newNameOpen&&<div className="modal-backdrop nd-backdrop" onClick={e=>{if(e.target===e.currentTarget)setNewNameOpen(false)}}>
      <div className="nd-modal" role="dialog" aria-modal="true" aria-labelledby="builder-name-title" style={{maxWidth:440}}>
        <div className="nd-head">
          <div>
            <p className="nd-kicker">New project</p>
            <h2 id="builder-name-title">Name your project</h2>
            <p className="nd-sub">This name is what you will see on your dashboard, so make it recognisable.</p>
          </div>
          <button type="button" className="text-button" aria-label="Close" onClick={()=>setNewNameOpen(false)}><X size={18}/></button>
        </div>
        <label className="field-label" style={{display:'block',marginBottom:14}}>Project Name
          <input
            autoFocus
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')void createNamedProject()}}
            placeholder="e.g. DSWD Social Welfare Officer II PDS"
            style={{width:'100%',marginTop:6,padding:'10px 12px',borderRadius:10,border:'1px solid var(--line-strong)',background:'var(--input)',color:'var(--heading)',fontSize:13.5,outline:'none'}}
          />
        </label>
        <button type="button" className="btn btn-primary" style={{width:'100%'}} disabled={creatingProject||!newName.trim()} onClick={()=>void createNamedProject()}>
          {creatingProject?'Creating…':'Create project & open'}
        </button>
      </div>
    </div>}
    {guideOpen&&<CSCGuideModal open onClose={()=>setGuideOpen(false)}/>}
    {importOpen&&<ImportDialog onClose={()=>setImportOpen(false)} onApply={applyImport}/>}
    {letterOpen&&<LetterDialog data={data} onClose={()=>setLetterOpen(false)}/>}
    {letterModalOpen&&<CoverLetterSelectionModal open={letterModalOpen} onClose={()=>setLetterModalOpen(false)}/>}
    {fullOpen&&<FullscreenPreview bytes={bytes} onClose={()=>setFullOpen(false)} onDownloadPDF={exportPDF} onDownloadXLSX={exportXLSX}/>}
    {pdfError&&<div className="toast" role="alert">{pdfError}</div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}

