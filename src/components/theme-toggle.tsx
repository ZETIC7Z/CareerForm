'use client';
/**
 * Theme toggle with expanding-circle ripple, adapted from
 * CryptoCat's "Theme Toggle Switch with Ripple Effect" (MIT)
 * https://codepen.io/CryptoCat/pen/WbeBNeG
 * React port: overlay nodes are created inside the handler and removed on
 * transitionend, and the listener is detached in cleanup, so nothing leaks
 * between renders (React 19 strict-mode safe).
 */
import {useCallback,useEffect,useRef,useState} from 'react';
import {Sun, Moon} from 'lucide-react';

const THEME_KEY='careerform-theme';
type Theme='light'|'dark';

function readTheme():Theme{
  if(typeof document==='undefined')return 'dark';
  return document.documentElement.dataset.theme==='light'?'light':'dark';
}

export default function ThemeToggle(){
  const [theme,setTheme]=useState<Theme>('dark');
  const buttonRef=useRef<HTMLButtonElement>(null);
  const mounted=useRef(true);
  const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
  const overlays=useRef<Set<HTMLDivElement>>(new Set());

  useEffect(()=>{
    mounted.current=true;
    const id=setTimeout(()=>{if(mounted.current)setTheme(readTheme())},0);
    const activeOverlays=overlays.current;
    return()=>{
      mounted.current=false;
      clearTimeout(id);
      timers.current.forEach(clearTimeout);
      timers.current=[];
      activeOverlays.forEach(overlay=>overlay.remove());
      activeOverlays.clear();
    };
  },[]);

  const apply=(next:Theme)=>{
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem(THEME_KEY,next)}catch{/* storage unavailable — theme still applies for the session */}
    if(mounted.current)setTheme(next);
  };

  /** Creates the expanding overlay circle anchored to the toggle center. */
  const ripple=useCallback((next:Theme)=>{
    const toggle=buttonRef.current;if(!toggle)return;
    const overlay=document.createElement('div');
    overlay.className='bg-overlay';
    overlay.style.setProperty('--overlay-color',next==='dark'?'#000000':'#f8fafc');
    overlay.style.background=next==='dark'?'#000000':'#f8fafc';
    const rect=toggle.getBoundingClientRect();
    overlay.style.left=`${rect.left+rect.width/2}px`;
    overlay.style.top=`${rect.top+rect.height/2}px`;
    document.body.appendChild(overlay);
    overlays.current.add(overlay);
    const cleanup=()=>{
      overlay.remove();
      overlays.current.delete(overlay);
    };
    overlay.addEventListener('transitionend',cleanup,{once:true});
    // Fallback removal in case transitionend never fires (tab hidden, reduced motion).
    const timerId=setTimeout(()=>{
      cleanup();
      timers.current=timers.current.filter(timer=>timer!==timerId);
    },1400);
    timers.current.push(timerId);
    requestAnimationFrame(()=>overlay.classList.add('expand'));
  },[]);

  const toggle=()=>{
    const next:Theme=theme==='dark'?'light':'dark';
    ripple(next);
    apply(next);
  };

  return <button
    ref={buttonRef}
    type="button"
    className={`theme-pill-toggle ${theme}`}
    onClick={toggle}
    role="switch"
    aria-checked={theme==='dark'}
    aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'}
    title={theme==='dark'?'Switch to Light Mode':'Switch to Dark Mode'}
  >
    <span className="toggle-track-icon sun" aria-hidden="true">
      <Sun size={12} strokeWidth={2.4}/>
    </span>
    <span className="toggle-track-icon moon" aria-hidden="true">
      <Moon size={12} strokeWidth={2.4}/>
    </span>
    <span className="toggle-thumb" aria-hidden="true">
      {theme==='dark'
        ?<Moon size={12} strokeWidth={2.4}/>
        :<Sun size={12} strokeWidth={2.4}/>}
    </span>
  </button>;
}
