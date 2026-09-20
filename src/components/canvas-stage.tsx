'use client';
/**
 * VeriWorkly-style preview canvas stage (adapted from their MIT-licensed
 * DocumentEditorShell): a fixed, non-scrolling stage where the document itself
 * is dragged with the pointer (or arrow keys) and scaled from a floating
 * livebar — zoom out / % / zoom in / fit / reset. The page never scrolls the
 * preview away; there is no scrollbar on the preview at all.
 */
import {KeyboardEvent, PointerEvent, ReactNode, useMemo, useState} from 'react';
import {ZoomIn,ZoomOut,Maximize2,RotateCcw,Move} from 'lucide-react';

const ZOOM_STEP=10;
const MIN_ZOOM=35;
const MAX_ZOOM=200;
const FIT_ZOOM=54;
const PAN_STEP=32;
const PAN_STEP_LARGE=160;

export default function CanvasStage({
  children,
  hintTitle,
  busy,
  controls='zoom',
  onExpand,
}:{
  children:ReactNode;
  /** Document name shown in the "Drag canvas or use arrow keys" pill. */
  hintTitle:string;
  busy?:boolean;
  controls?:'zoom'|'none';
  onExpand?:()=>void;
}){
  const [zoom,setZoom]=useState(FIT_ZOOM);
  const [pan,setPan]=useState({x:0,y:0});
  const [dragStart,setDragStart]=useState<{pointerId:number;x:number;y:number;panX:number;panY:number}|null>(null);

  const transform=useMemo(()=>({transform:`translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom/100})`}),[pan.x,pan.y,zoom]);

  const updateZoom=(next:number)=>setZoom(Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,next)));
  const resetCanvas=()=>{setZoom(FIT_ZOOM);setPan({x:0,y:0})};

  const pointerDown=(event:PointerEvent<HTMLDivElement>)=>{
    if(event.button!==0)return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({pointerId:event.pointerId,x:event.clientX,y:event.clientY,panX:pan.x,panY:pan.y});
  };
  const pointerMove=(event:PointerEvent<HTMLDivElement>)=>{
    if(!dragStart||dragStart.pointerId!==event.pointerId)return;
    setPan({x:dragStart.panX+event.clientX-dragStart.x,y:dragStart.panY+event.clientY-dragStart.y});
  };
  const pointerEnd=(event:PointerEvent<HTMLDivElement>)=>{
    if(dragStart?.pointerId===event.pointerId)setDragStart(null);
  };

  // Keyboard panning: arrows drag the sheet, Shift takes larger steps, Home/0 recentres.
  const keyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
    const step=event.shiftKey?PAN_STEP_LARGE:PAN_STEP;
    const delta={
      ArrowLeft:{x:step,y:0},
      ArrowRight:{x:-step,y:0},
      ArrowUp:{x:0,y:step},
      ArrowDown:{x:0,y:-step},
    }[event.key];
    if(delta){event.preventDefault();setPan(current=>({x:current.x+delta.x,y:current.y+delta.y}));return}
    if(event.key==='Home'||event.key==='0'){event.preventDefault();resetCanvas()}
  };

  return <div className="canvas-stage-wrap">
    <div className="canvas-stage-toolbar">
      {controls==='zoom'&&<div className="livebar" role="toolbar" aria-label="Preview zoom controls">
        <button type="button" className="livebar-btn" aria-label="Zoom out" title="Zoom out" onClick={()=>updateZoom(zoom-ZOOM_STEP)} disabled={zoom<=MIN_ZOOM}><ZoomOut size={15}/></button>
        <span className="livebar-zoom" aria-live="polite" aria-atomic="true">{zoom}%</span>
        <button type="button" className="livebar-btn" aria-label="Zoom in" title="Zoom in" onClick={()=>updateZoom(zoom+ZOOM_STEP)} disabled={zoom>=MAX_ZOOM}><ZoomIn size={15}/></button>
        <button type="button" className="livebar-btn" aria-label="Fullscreen preview" title="Fullscreen Preview (Finish & Review Shortcut)" onClick={onExpand || (()=>updateZoom(FIT_ZOOM))}><Maximize2 size={14}/></button>
        <button type="button" className="livebar-btn" aria-label="Reset view" title="Reset view" onClick={resetCanvas}><RotateCcw size={14}/></button>
      </div>}

      <div className="stage-center-badge" aria-label="Document template">
        <span className="stage-form-id">{hintTitle}</span>
      </div>

      <div className="stage-hint stage-hint-right" aria-hidden="true">
        <Move size={13}/>
        <span>Drag canvas or use arrow keys</span>
      </div>
    </div>

    <div
      tabIndex={0}
      role="group"
      aria-label="Live document canvas. Drag the sheet or use arrow keys to pan; Shift moves further; Home recentres."
      className={'canvas-stage'+(dragStart?' is-dragging':'')+(busy?' is-busy':'')}
      onKeyDown={keyDown}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={pointerEnd}
    >
      <div className="stage-grid" aria-hidden="true"/>
      <div className="stage-inner">
        <div className="stage-paper transform-gpu" style={transform}>{children}</div>
      </div>
    </div>
  </div>;
}
