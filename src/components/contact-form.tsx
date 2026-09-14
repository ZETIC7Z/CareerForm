'use client';
import {useState} from 'react';
import {Send} from 'lucide-react';
import {SITE} from '@/lib/site';

export default function ContactForm(){
  const [f,setF]=useState({name:'',email:'',message:''});
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);

  const submit=(e:React.FormEvent)=>{
    e.preventDefault();
    if(!f.name.trim()||!f.message.trim()){setError('Please add your name and a short message.');return}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)){setError('Enter a valid email so I can reply.');return}
    const subject=encodeURIComponent(`CareerForm PH — message from ${f.name.trim()}`);
    const body=encodeURIComponent(`${f.message.trim()}\n\n— ${f.name.trim()} (${f.email.trim()})`);
    window.location.href=`mailto:${SITE.email}?subject=${subject}&body=${body}`;
    setError('');setSent(true);
  };

  return <form onSubmit={submit} noValidate>
    <div className="form-row">
      <label className="field-label">Your name
        <input value={f.name} onChange={e=>setF(s=>({...s,name:e.target.value}))} placeholder="Juan Dela Cruz" autoComplete="name"/>
      </label>
      <label className="field-label">Your email
        <input type="email" value={f.email} onChange={e=>setF(s=>({...s,email:e.target.value}))} placeholder="you@email.com" autoComplete="email"/>
      </label>
    </div>
    <label className="field-label">Message
      <textarea rows={5} value={f.message} onChange={e=>setF(s=>({...s,message:e.target.value}))} placeholder="What's on your mind?" style={{resize:'vertical'}}/>
    </label>
    {error&&<p className="form-error">{error}</p>}
    {sent&&<p className="form-ok">Your email app should be opening with the message ready to send.</p>}
    <button className="btn btn-primary" type="submit"><Send size={15}/> Open in my email app</button>
  </form>;
}
