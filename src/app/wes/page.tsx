import type {Metadata} from 'next';
import Link from 'next/link';
import {Table2,ArrowRight,Hourglass} from 'lucide-react';

export const metadata:Metadata={
  title:'Work Experience Sheet',
  description:'The CareerForm PH Work Experience Sheet builder is coming soon — consolidated, dated, formatted to government standards.',
};

export default function WES(){
  return <section className="section" style={{minHeight:'60vh',display:'grid',placeItems:'center'}}>
    <div className="container" style={{textAlign:'center',maxWidth:640}}>
      <span className="tool-icon" style={{margin:'0 auto 18px'}}><Table2 size={26}/></span>
      <span className="hero-kicker" style={{justifyContent:'center'}}>Coming soon</span>
      <h1 style={{fontSize:'clamp(30px,4vw,44px)',margin:'14px 0 16px',letterSpacing:'-.03em'}}>The Work Experience Sheet, minus the spreadsheet pain.</h1>
      <p style={{color:'var(--muted)',lineHeight:1.85,fontSize:15.5,margin:'0 0 26px'}}>
        We&apos;re building a generator that turns your PDS work history into a clean, consolidated Work Experience Sheet — the annex hiring panels actually read. It reuses the draft you already keep here, so there&apos;ll be nothing to retype.
      </p>
      <p style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
        <Link className="btn btn-gold" href="/builder">Build your PDS meanwhile <ArrowRight size={15}/></Link>
        <a className="btn btn-ghost" href="mailto:samxerz.zeticuz@gmail.com?subject=CareerForm%20PH%20WES%20waitlist&body=Please%20notify%20me%20when%20the%20Work%20Experience%20Sheet%20builder%20ships."><Hourglass size={15}/> Join the waitlist</a>
      </p>
    </div>
  </section>;
}
