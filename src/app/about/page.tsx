import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight,Code2,Clapperboard,Camera,Users,Mail} from 'lucide-react';
import {SITE} from '@/lib/site';

export const metadata:Metadata={
  title:'About',
  description:'CareerForm PH is built by Sam Pangilinan (ZETICUZ), a former government employee turned full-stack engineer. Meet the person behind the free PDS builder.',
};

const FACTS=[
  {b:'Who',s:`${SITE.owner} — ${SITE.role}, building as ${SITE.handle}.`},
  {b:'Why CareerForm PH',s:'Years of watching applicants lose weekends to a form that should take minutes.'},
  {b:'Where the form comes from',s:'The official CS Form 212 Revised 2026 workbook published through CSC channels — unmodified.'},
  {b:'What happens to your data',s:'Nothing. It stays in your browser. There is no server to send it to.'},
];

export default function About(){
  return <>
    <section className="page-hero">
      <div className="container">
        <span className="hero-kicker">About</span>
        <h1>The person behind the form.</h1>
        <p>CareerForm PH is a one-developer project with a public-sector heart. Here&apos;s who builds it, why it&apos;s free, and where the form itself comes from.</p>
      </div>
    </section>
    <section className="container about-grid">
      <div className="about-photo">
        <Image src="/about/sam-pangilinan.jpg" alt={`${SITE.owner}, developer of CareerForm PH`} width={720} height={720} priority sizes="(max-width:1100px) 92vw, 460px"/>
        <span className="about-badge">{SITE.owner} · {SITE.handle}</span>
      </div>
      <div className="about-body">
        <h2>Kumusta — I&apos;m Sam.</h2>
        <p>I&apos;m an AI-first full-stack engineer from the Philippines. I build scalable web apps, streaming platforms and immersive digital experiences — and I&apos;m passionate about building digital solutions that seamlessly connect form and function. When I&apos;m not designing interfaces or engineering software, I&apos;m experimenting with cutting-edge AI developer tools, exploring emerging design trends, and contributing to open-source systems.</p>
        <p>Before I wrote code for a living, I worked in government. I processed the folders. I was also the applicant refreshing an email at midnight, re-encoding a PDS for the fourth time because one date format didn&apos;t match. Both sides of that desk taught me the same lesson: <b>small friction decides who gets a fair shot.</b></p>
        <p>CareerForm PH is my answer. It&apos;s free, it&apos;s private, and it treats the CSC&apos;s form with the respect the Commission deserves — we don&apos;t own the PDS and we don&apos;t change a single box on it. We just make filling it feel less like paperwork and more like progress.</p>
        <h2>What you&apos;ll find on my other sites</h2>
        <p>My <a href={SITE.portfolio} target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)',fontWeight:650}}>portfolio</a> holds the full tour — projects, skills, and ways to collaborate. If you&apos;re from a government unit scouting digital talent: I&apos;d genuinely love to help the public sector build better tools. That&apos;s the dream this project funds in goodwill.</p>
        <div className="about-facts">
          {FACTS.map(f=><div className="fact" key={f.b}><b>{f.b}</b><span>{f.s}</span></div>)}
        </div>
        <p style={{marginTop:24,display:'flex',gap:10,flexWrap:'wrap'}}>
          <Link className="btn btn-primary btn-sm" href="/builder">Try the builder <ArrowRight size={14}/></Link>
          <a className="btn btn-ghost btn-sm" href={SITE.portfolio} target="_blank" rel="noopener noreferrer">My portfolio</a>
        </p>
        <p style={{display:'flex',gap:16,marginTop:10,color:'var(--muted)'}}>
          <a href={SITE.socials[0].href} target="_blank" rel="noopener noreferrer" aria-label="GitHub" style={{display:'inline-flex'}}><Code2 size={18}/></a>
          <a href={SITE.socials[1].href} target="_blank" rel="noopener noreferrer" aria-label="YouTube" style={{display:'inline-flex'}}><Clapperboard size={18}/></a>
          <a href={SITE.socials[2].href} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{display:'inline-flex'}}><Camera size={18}/></a>
          <a href={SITE.socials[3].href} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{display:'inline-flex'}}><Users size={18}/></a>
          <a href={SITE.socials[4].href} aria-label="Email" style={{display:'inline-flex'}}><Mail size={18}/></a>
        </p>
      </div>
    </section>
  </>;
}
