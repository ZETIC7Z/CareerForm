import type {Metadata} from 'next';
import {Clapperboard,Camera,Users,Mail,Globe} from 'lucide-react';
import ContactForm from '@/components/contact-form';
import {SITE} from '@/lib/site';

export const metadata:Metadata={
  title:'Contact',
  description:'Reach Sam Pangilinan — feedback, bug reports, collaborations, or government units looking for digital talent.',
};

const LINES=[
  {Icon:Mail,b:'Email',s:SITE.email,href:`mailto:${SITE.email}`},
  {Icon:Globe,b:'Portfolio',s:'www.zeticuz.xyz — projects, skills, collaborations',href:SITE.portfolio},
  {Icon:Users,b:'Facebook',s:'facebook.com/samxerz.pangilinan',href:SITE.socials[2].href},
  {Icon:Clapperboard,b:'YouTube',s:'youtube.com/@ZETICUZ',href:SITE.socials[0].href},
  {Icon:Camera,b:'Instagram',s:'instagram.com/zeticuz_',href:SITE.socials[1].href},
];

export default function Contact(){
  return <>
    <section className="page-hero">
      <div className="container">
        <span className="hero-kicker">Contact</span>
        <h1>Say the word.</h1>
        <p>Bug in the form? A field mapped wrong? An agency that wants this tool for its applicants? My inbox is open — and I read everything.</p>
      </div>
    </section>
    <section className="container contact-grid">
      <div className="contact-card">
        {LINES.map(({Icon,b,s,href})=>(
          <a className="contact-line" key={b} href={href} target={href.startsWith('http')?'_blank':undefined} rel={href.startsWith('http')?'noopener noreferrer':undefined}>
            <Icon size={18}/>
            <span><b>{b}</b><span>{s}</span></span>
          </a>
        ))}
        <p className="muted" style={{marginTop:18}}>Typical reply time: within a day or two. For urgent form-mapping issues, include the field label and what your source document shows.</p>
      </div>
      <div className="form-card">
        <h3>Send me a message</h3>
        <p>Write it here and your email app opens with everything pre-filled — no message ever touches a server.</p>
        <ContactForm/>
      </div>
    </section>
  </>;
}
