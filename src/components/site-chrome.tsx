'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {Code2,Clapperboard,Camera,Users,Mail} from 'lucide-react';
import ThemeToggle from './theme-toggle';
import AuthDialog from './auth-dialog';
import GlassNavigation from './glass-navigation';
import NeuralCursorGrid from './neural-cursor-grid';
import {SITE} from '@/lib/site';

const NAV=[
  {href:'/',label:'Home'},
  {href:'/builder',label:'PDS Builder'},
  {href:'/about',label:'About'},
  {href:'/contact',label:'Contact'},
];

const SOCIAL_ICONS=[
  {label:'GitHub',href:SITE.socials[0].href,Icon:Code2},
  {label:'YouTube',href:SITE.socials[1].href,Icon:Clapperboard},
  {label:'Instagram',href:SITE.socials[2].href,Icon:Camera},
  {label:'Facebook',href:SITE.socials[3].href,Icon:Users},
  {label:'Email',href:SITE.socials[4].href,Icon:Mail},
] as const;

function BrandLogo({footer=false}:{footer?:boolean}){
  return (
    <span className="text-xl font-bold tracking-tight text-[var(--heading)] flex items-center gap-2 select-none">
      CareerForm
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
        2026
      </span>
    </span>
  );
}

export default function SiteChrome({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const inWorkspace=pathname.startsWith('/builder') || pathname.startsWith('/sign');
  const [authOpen,setAuthOpen]=useState(false);
  const [mode,setMode]=useState<'signin'|'signup'>('signin');

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
  const openAuth=(next:'signin'|'signup')=>{setMode(next);setAuthOpen(true)};

  return <div className="site-shell">
    {pathname === '/' && <NeuralCursorGrid />}
    {!inWorkspace && <GlassNavigation />}
    <div style={{ paddingTop: !inWorkspace ? 80 : 0 }}>
      {children}
    </div>
    {!inWorkspace&&<footer className="site-footer">
      <div className="site-footer-in">
        <div>
          <Link className="site-brand-link footer-brand-link" href="/" aria-label="CareerForm PH home"><BrandLogo footer/></Link>
          <p>Free, private, in-browser tools for Filipino government job applicants. Your details never leave this device.</p>
          <div className="footer-socials">
            {SOCIAL_ICONS.map(({label,href,Icon})=><a key={label} href={href} aria-label={label} title={label} target={href.startsWith('http')?'_blank':undefined} rel={href.startsWith('http')?'noopener noreferrer':undefined}><Icon size={17}/></a>)}
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
            <a href={SITE.repo} target="_blank" rel="noopener noreferrer">Source code</a>
            <Link href="/about">About the developer</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
      <div className="footer-base" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <Image
            src="/zeticuz-logo.png"
            alt="ZETICUZ Developer Logo"
            width={48}
            height={28}
            style={{height: '24px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(239,68,68,0.3))'}}
          />
          <span style={{fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--foreground)'}}>
            SITE DEVELOPER BY: <strong style={{color: '#ef4444'}}>ZETICUZ</strong>
          </span>
          <span style={{color: 'var(--muted)', fontSize: '12px'}}>· © 2026 {SITE.name}</span>
        </div>
        <span style={{fontSize: '12px', color: 'var(--muted)'}}>Independent tool — not affiliated with or endorsed by the Civil Service Commission.</span>
      </div>
    </footer>}
    {authOpen&&<AuthDialog initialMode={mode} onClose={()=>setAuthOpen(false)}/>} 
  </div>;
}
