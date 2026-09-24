'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Image from 'next/image';
import {ChevronLeft,ChevronRight,ZoomIn,ZoomOut,X,Maximize2,Move,Download,FileSpreadsheet} from 'lucide-react';
import CanvasStage from './canvas-stage';

type Props={bytes:Uint8Array|null;page:number;onPage:(page:number)=>void;error?:string;onExpand?:()=>void};
type RenderRequest={bytes:Uint8Array|null;page:number;zoom:number};
type RenderState={canvas:React.RefObject<HTMLCanvasElement|null>;count:number;loading:boolean;error:string};

function sameRequest(a:RenderRequest,b:RenderRequest){return a.bytes===b.bytes&&a.page===b.page&&a.zoom===b.zoom}

function useRender(bytes:Uint8Array|null,page:number,zoom:number):RenderState{
  const canvas=useRef<HTMLCanvasElement>(null);
  const [count,setCount]=useState(4);
  const [rendered,setRendered]=useState<RenderRequest>({bytes:null,page:-1,zoom:0});
  const [failed,setFailed]=useState<{request:RenderRequest;message:string}|null>(null);
  const request=useMemo<RenderRequest>(()=>({bytes,page,zoom}),[bytes,page,zoom]);
  const failedForRequest=failed&&sameRequest(failed.request,request)?failed.message:'';
  const loading=Boolean(bytes)&&!failedForRequest&&!sameRequest(rendered,request);

  useEffect(()=>{
    if(!bytes)return;
    let cancelled=false;
    let loadingTask:{destroy:()=>Promise<void>}|undefined;
    let renderTask:{cancel:()=>void}|undefined;

    const draw=async()=>{
      const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
      const task=pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false});
      loadingTask=task;
      const documentProxy=await task.promise;
      if(cancelled){await task.destroy();return}
      setCount(documentProxy.numPages);
      const pdfPage=await documentProxy.getPage(Math.min(page+1,documentProxy.numPages));
      const dpr=typeof window!=='undefined'?(window.devicePixelRatio||1):1;
      const pixelRatio=Math.min(Math.max(dpr,1.5),2.5);
      const displayViewport=pdfPage.getViewport({scale:1.8*(zoom/100)});
      const renderViewport=pdfPage.getViewport({scale:1.8*pixelRatio*(zoom/100)});
      const target=canvas.current;
      const context=target?.getContext('2d');
      if(!target||!context)throw new Error('Preview canvas is not mounted yet.');
      
      // Render to offscreen canvas first to guarantee zero flashing or blinking while typing
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.ceil(renderViewport.width);
      offscreen.height = Math.ceil(renderViewport.height);
      const offscreenCtx = offscreen.getContext('2d');
      if (!offscreenCtx) throw new Error('Offscreen context unavailable.');

      const job=pdfPage.render({canvasContext:offscreenCtx,viewport:renderViewport});
      renderTask=job;
      await job.promise;
      if(cancelled){await task.destroy();return}

      // Seamless single-frame atomic transfer
      target.width=offscreen.width;
      target.height=offscreen.height;
      target.style.width=`${Math.ceil(displayViewport.width)}px`;
      target.style.height=`${Math.ceil(displayViewport.height)}px`;
      const context2d=target.getContext('2d');
      context2d?.drawImage(offscreen, 0, 0);

      setRendered(request);
      await task.destroy();
    };

    const run=async()=>{
      try{await draw()}
      catch(error){
        if(!cancelled){
          setCount(count=>Math.max(count,4));
          setFailed({request,message:error instanceof Error?error.message:'Official form preview is unavailable right now.'});
        }
      }
    };
    void run();
    return()=>{cancelled=true;renderTask?.cancel();void loadingTask?.destroy()};
  },[bytes,page,zoom,request]);

  return {canvas,count,loading,error:failedForRequest};
}

function PreviewFallback({message}:{message?:string}){
  return <div className="preview-fallback">
    {/* Fallback is a render of the same official A4 origin (620x877 = 210x297mm), so the
        sheet keeps page 1's exact shape even before pdf.js paints the live canvas. */}
    <Image src="/template-preview.png" alt="Official CS Form 212 Revised 2026 preview" width={620} height={877} priority/>
    <p>{message||'Preparing the live official-form mirror…'}</p>
  </div>;
}

/**
 * Live PDS mirror on a VeriWorkly-style stage: the panel is a fixed-height
 * column; the sheet inside is dragged with the pointer (or arrow keys) and
 * zoomed from the floating livebar — never scrolled, so it stays put while the
 * form editor on the left scrolls.
 */
export function LivePreview({bytes,page,onPage,error,onExpand}:Props){
  const {canvas,count,loading,error:renderError}=useRender(bytes,page,100);
  const visibleError=error||renderError;
  const stageBusy=Boolean(loading||renderError||!bytes);
  // SYNCING until a real render exists — the badge must never claim LIVE from SSR markup alone.
  const badge=stageBusy?'SYNCING':'LIVE';
  return <section className="preview-panel preview-panel-fixed" aria-label="Live PDS preview" aria-busy={loading}>
    <div className="preview-heading">
      <div className="preview-heading-left">
        <strong>Live PDS mirror</strong>
        <span className="live-badge"><i/>{badge}</span>
      </div>
      <div className="preview-pager">
        <button type="button" className="pager-btn" aria-label="Previous preview page" disabled={page===0||loading} onClick={()=>onPage(Math.max(0,page-1))}><ChevronLeft size={14}/></button>
        <span className="preview-page-label">C{page+1} of {count}</span>
        <button type="button" className="pager-btn" aria-label="Next preview page" disabled={page>=count-1||loading} onClick={()=>onPage(Math.min(count-1,page+1))}><ChevronRight size={14}/></button>
        {onExpand && (
          <button type="button" className="pager-btn" aria-label="Open fullscreen preview" title="Fullscreen Preview" onClick={onExpand}>
            <Maximize2 size={14}/>
          </button>
        )}
      </div>
    </div>
    <CanvasStage hintTitle="CS Form 212 · Revised 2026" busy={stageBusy} onExpand={onExpand}>
      <div className={'preview-canvas-wrap'+(stageBusy?' is-loading':'')}>
        {bytes&&<canvas ref={canvas} aria-label={'Live official PDS preview, page '+(page+1)}/>}
        {stageBusy&&<PreviewFallback message={renderError?"Rendering again — the official form is just below this notice.":undefined}/>}
      </div>
    </CanvasStage>
    {visibleError&&<p role="status" className="preview-warning">{visibleError}</p>}
    <div className="preview-footer">CS Form No. 212 · Revised 2026 <span>A4 · 210 × 297 mm · Print at 100%</span></div>
  </section>;
}

export function FullscreenPreview({
  bytes,
  onClose,
  onDownloadPDF,
  onDownloadXLSX,
}:{
  bytes: Uint8Array | null;
  onClose: () => void;
  onDownloadPDF?: () => void;
  onDownloadXLSX?: () => void;
}){
  const [page,setPage]=useState(0);
  const [zoom,setZoom]=useState(100);
  const [pan,setPan]=useState({x:0,y:0});
  const [isDragging,setIsDragging]=useState(false);
  const drag=useRef({active:false,startX:0,startY:0,originX:0,originY:0});
  const {canvas,count,loading,error}=useRender(bytes,page,zoom);

  const resetPan=useCallback(()=>setPan({x:0,y:0}),[]);
  const selectPage=useCallback((next:number)=>{setPage(next);resetPan()},[resetPan]);
  const zoomBy=(amount:number)=>{setZoom(value=>Math.min(260,Math.max(40,value+amount)));resetPan()};

  const pointerDown=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(event.button!==0)return;
    drag.current={active:true,startX:event.clientX,startY:event.clientY,originX:pan.x,originY:pan.y};
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(!drag.current.active)return;
    setPan({x:drag.current.originX+event.clientX-drag.current.startX,y:drag.current.originY+event.clientY-drag.current.startY});
  };
  const pointerUp=()=>{
    drag.current.active=false;
    setIsDragging(false);
  };

  const handleWheel=(event:React.WheelEvent<HTMLDivElement>)=>{
    if(event.ctrlKey||event.metaKey){
      event.preventDefault();
      const delta=event.deltaY<0?10:-10;
      setZoom(value=>Math.min(260,Math.max(40,value+delta)));
    }
  };

  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const handler=(event:KeyboardEvent)=>{
      if(event.key==='Escape')onClose();
      if(event.key==='ArrowLeft')selectPage(Math.max(0,page-1));
      if(event.key==='ArrowRight')selectPage(Math.min(count-1,page+1));
    };
    document.addEventListener('keydown',handler);
    document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',handler);document.body.style.overflow='';previous?.focus()};
  },[count,onClose,page,selectPage]);

  const canvasTransform='translate3d('+pan.x+'px,'+pan.y+'px,0)';
  const fallbackMessage=loading?'Rendering official form…':'Full preview unavailable.';

  return <div className="pds-modal" role="dialog" aria-modal="true" aria-label="Full PDS preview">
    <div className="pds-modal-bar">
      <div>
        <h3>Full preview · CS Form 212 Revised 2026</h3>
        <span className="pds-modal-note"><Move size={12}/> Drag to pan · Ctrl+Scroll to zoom</span>
      </div>
      <span className="spacer"/>
      <div className="pds-modal-tools">
        {onDownloadPDF&&(
          <button
            type="button"
            className="pds-modal-action-btn primary"
            onClick={onDownloadPDF}
            title="Download completed official PDS PDF"
            style={{
              display:'inline-flex',
              alignItems:'center',
              gap:'6px',
              background:'var(--accent,#00e5ff)',
              color:'#000',
              fontWeight:600,
              fontSize:'12px',
              padding:'6px 14px',
              borderRadius:'7px',
              border:'none',
              cursor:'pointer',
            }}
          >
            <Download size={14}/>
            <span>Download PDF</span>
          </button>
        )}
        {onDownloadXLSX&&(
          <button
            type="button"
            className="pds-modal-action-btn"
            onClick={onDownloadXLSX}
            title="Download Excel spreadsheet (.xlsx)"
            style={{
              display:'inline-flex',
              alignItems:'center',
              gap:'6px',
              background:'rgba(255,255,255,0.08)',
              color:'var(--text,#fff)',
              fontWeight:500,
              fontSize:'12px',
              padding:'6px 12px',
              borderRadius:'7px',
              border:'1px solid rgba(255,255,255,0.15)',
              cursor:'pointer',
            }}
          >
            <FileSpreadsheet size={14}/>
            <span>Excel</span>
          </button>
        )}
        <div style={{width:1,height:22,background:'rgba(255,255,255,0.12)',margin:'0 4px'}}/>
        <button aria-label="Zoom out" disabled={zoom<=40} onClick={()=>zoomBy(-20)}><ZoomOut size={16}/></button>
        <span style={{minWidth:44,textAlign:'center',fontVariantNumeric:'tabular-nums'}}>{zoom}%</span>
        <button aria-label="Zoom in" disabled={zoom>=260} onClick={()=>zoomBy(20)}><ZoomIn size={16}/></button>
        <button aria-label="Reset zoom and pan" title="Reset view" onClick={()=>{setZoom(100);resetPan()}}><Maximize2 size={15}/></button>
        <button aria-label="Close preview" title="Close preview (Esc)" onClick={onClose}><X size={17}/></button>
      </div>
    </div>
    <div
      className={'pds-modal-stage is-zoomed'}
      style={{cursor:isDragging?'grabbing':'grab',touchAction:'none'}}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={handleWheel}
    >
      {/* display:none (not visibility:hidden) until the first frame exists: a canvas with no
          render is still a 300x150 box, and as a flex child it would stretch the stage and
          shove the A4 fallback off to the side. Hidden here, the fallback owns the layout. */}
      {bytes&&<canvas ref={canvas} aria-label={'PDS preview page '+(page+1)} style={{transform:canvasTransform,display:loading||error?'none':'block'}}/>}
      {(loading||error||!bytes)&&<PreviewFallback message={fallbackMessage}/>}
    </div>
    <div className="pds-page-dots" aria-label="PDS pages">
      {[0,1,2,3].map(index=><button key={index} className={'pds-dot'+(page===index?' active':'')} aria-label={'View page '+(index+1)} aria-pressed={page===index} onClick={()=>selectPage(index)}>C{index+1}</button>)}
    </div>
    {error&&<p role="alert" className="error" style={{textAlign:'center'}}>{error}</p>}
  </div>;
}

export default function PDFPreview(props:Props){return <LivePreview {...props}/>}
