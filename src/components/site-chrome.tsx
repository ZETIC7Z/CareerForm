'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {Clapperboard,Camera,Users,Mail} from 'lucide-react';
import BrandMark from './brand-logo';
import GlassNavigation from './glass-navigation';
import PhSparkleCursor from './ph-sparkle-cursor';
import AuroraBackground from './aurora-background';
import {SITE} from '@/lib/site';

const NAV=[
  {href:'/',label:'Home'},
  {href:'/builder',label:'PDS Builder'},
  {href:'/about',label:'About'},
  {href:'/contact',label:'Contact'},
];

const SOCIAL_ICONS=[
  {label:'YouTube',href:SITE.socials[0].href,Icon:Clapperboard},
  {label:'Instagram',href:SITE.socials[1].href,Icon:Camera},
  {label:'Facebook',href:SITE.socials[2].href,Icon:Users},
  {label:'Email',href:SITE.socials[3].href,Icon:Mail},
] as const;

export default function SiteChrome({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const inWorkspace=pathname.startsWith('/builder') || pathname.startsWith('/sign') || pathname.startsWith('/coverletter');

  // A refresh always lands at the very top of the page.
  //
  // Browsers otherwise restore the previous scroll offset after a reload, which drops a
  // visitor into the middle of a page whose own header they never saw. `scrollRestoration
  // = 'manual'` turns that off (and stops the blurred hero from being re-anchored mid-
  // layout), then the explicit scroll pins the viewport to the top.
  useEffect(()=>{
    if(typeof window==='undefined')return;
    const previous=window.history.scrollRestoration;
    window.history.scrollRestoration='manual';
    // The stylesheet asks for smooth scrolling, which would animate this jump and leave
    // the visitor watching the hero slide up on every reload. The inline override makes
    // it land instantly, then gets out of the way.
    const root=document.documentElement;
    const smooth=root.style.scrollBehavior;
    root.style.scrollBehavior='auto';
    window.scrollTo(0,0);
    root.style.scrollBehavior=smooth;
    window.addEventListener('load',()=>window.scrollTo(0,0),{once:true});
    return ()=>{window.history.scrollRestoration=previous;};
  },[]);

  useEffect(()=>{
    document.documentElement.dataset.route=inWorkspace?'workspace':'site';
    try {
      const t = localStorage.getItem('careerform-theme');
      if (t) document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
    } catch {}
    try {
      const a = localStorage.getItem('pds-theme-accent') || 'cyan';
      if (a) document.documentElement.dataset.accent = a;
    } catch {}
  },[inWorkspace]);
  // The animated field is the site's own background: fixed to the viewport, edge to edge,
  // on every route rather than the home page alone. The shells above it stay transparent
  // (see globals.css) so it is never repainted over.
  return <div className="site-shell">
    <AuroraBackground />
    <PhSparkleCursor />
    {!inWorkspace && <GlassNavigation />}
    <div
      className="site-shell-content"
      // Clearance for the fixed site navigation, measured once as --site-nav-h in globals.css.
      // Every route (including /jobs, which adds its own toolbar) starts below it, so no page
      // can ever slide under the Sign in / Sign up controls.
      style={{ paddingTop: !inWorkspace ? 'var(--site-nav-h, 132px)' : 0 }}
    >
      {children}
    </div>
    {!inWorkspace&&<footer className="site-footer" style={{position: 'relative', zIndex: 1, isolation: 'isolate'}}>
      {/* ambient top glow */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        top: '-1px',
        left: '10%',
        right: '10%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.55), rgba(245,158,11,0.4), transparent)',
        pointerEvents: 'none',
      }}/>
      <div className="site-footer-in">
        <div>
          <Link className="site-brand-link footer-brand-link" href="/" aria-label="CareerForm PH home"><BrandMark height={46}/></Link>
          <p>Free, private, in-browser tools for Filipino government job applicants. Your details never leave this device.</p>
          <div className="footer-socials">
            {SOCIAL_ICONS.map(({label,href,Icon})=><a key={label} href={href} aria-label={label} title={label} target={href.startsWith('http')?'_blank':undefined} rel={href.startsWith('http')?'noopener noreferrer':undefined}><Icon size={17}/></a>)}
          </div>
        </div>
        <div>
          <h4>Tools</h4>
          <div className="footer-links">
            <Link href="/builder">PDS Builder</Link>
            <Link href="/coverletter">Cover Letters</Link>
            <Link href="/wes">WES Builder</Link>
            <Link href="/jobs">Government Jobs</Link>
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          <div className="footer-links">
            {NAV.map(n=><Link key={n.href} href={n.href}>{n.label}</Link>)}
            <a href={SITE.portfolio} target="_blank" rel="noopener noreferrer">Developer portfolio</a>
          </div>
        </div>
        <div>
          <h4>Resources</h4>
          <div className="footer-links">
            <a href="https://csc.gov.ph" target="_blank" rel="noopener noreferrer">Civil Service Commission</a>
            <Link href="/about">About the developer</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
      <div className="footer-base" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <Image
            src="/zeticuz-logo.svg"
            alt="ZETICUZ Developer Logo"
            width={84}
            height={28}
            style={{height: '26px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 10px rgba(6,182,212,0.3))'}}
          />
          <span style={{fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--foreground)'}}>
            SITE DEVELOPED BY: <strong style={{color: '#ef4444'}}>ZETICUZ</strong>
          </span>
          <span style={{color: 'var(--muted)', fontSize: '12px'}}>· © 2026 {SITE.name}</span>
        </div>
        <span style={{fontSize: '12px', color: 'var(--muted)'}}>Independent tool — not affiliated with or endorsed by the Civil Service Commission.</span>
      </div>
    </footer>}
  </div>;
}
