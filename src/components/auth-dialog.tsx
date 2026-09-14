'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {X,Eye,EyeOff,CheckCircle2} from 'lucide-react';

type Mode='signin'|'signup';
type Errors=Record<string,string>;

/** Local-only account stub. The real store (MongoDB) arrives in a later release;
 *  this dialog already validates and structures everything that store will need. */
const ACCOUNT_KEY='careerform-account';
const SESSION_KEY='careerform-session';

function validate(mode:Mode,f:{name:string;username:string;email:string;password:string;confirm:string;agree:boolean}):Errors{
  const e:Errors={};
  if(mode==='signup'&&!f.name.trim())e.name='Enter your full name.';
  if(!f.username.trim())e.username='Pick a username.';
  else if(!/^[a-zA-Z0-9_.]{3,24}$/.test(f.username.trim()))e.username='Use 3–24 letters, numbers, dots or underscores.';
  if(mode==='signup'){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))e.email='Enter a valid email address.';
    if(f.password!==f.confirm)e.confirm='Passwords do not match.';
  }
  if(f.password.length<8)e.password='At least 8 characters.';
  else if(!/[a-zA-Z]/.test(f.password)||!/\d/.test(f.password))e.password='Mix letters and numbers.';
  if(mode==='signup'&&!f.agree)e.agree='Please accept the disclaimer to continue.';
  return e;
}

export default function AuthDialog({initialMode,onClose}:{initialMode:Mode;onClose:()=>void}){
  const [mode,setMode]=useState<Mode>(initialMode);
  const [show,setShow]=useState(false);
  const [f,setF]=useState({name:'',username:'',email:'',password:'',confirm:'',agree:false});
  const [errors,setErrors]=useState<Errors>({});
  const [done,setDone]=useState('');
  const box=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const prev=document.activeElement as HTMLElement|null;
    box.current?.focus();
    const handler=(e:KeyboardEvent)=>{
      if(e.key==='Escape')onClose();
      if(e.key==='Tab'){
        const els=box.current?.querySelectorAll<HTMLElement>('button,input,a[href]');
        if(!els?.length)return;
        const first=els[0],last=els[els.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    };
    document.addEventListener('keydown',handler);
    return()=>{document.removeEventListener('keydown',handler);prev?.focus()};
  },[onClose]);

  const set=(k:keyof typeof f,v:string|boolean)=>setF(s=>({...s,[k]:v}));

  const submit=(ev:React.FormEvent)=>{
    ev.preventDefault();
    const errs=validate(mode,f);
    setErrors(errs);
    if(Object.keys(errs).length)return;
    try{
      if(mode==='signup'){
        localStorage.setItem(ACCOUNT_KEY,JSON.stringify({name:f.name.trim(),username:f.username.trim(),email:f.email.trim(),createdAt:Date.now()}));
        localStorage.setItem(SESSION_KEY,f.username.trim());
        setDone(`Welcome, ${f.name.trim().split(' ')[0]||f.username}! Your device profile is saved. Cloud accounts arrive with our next release — your draft is already stored privately on this device.`);
      }else{
        localStorage.setItem(SESSION_KEY,f.username.trim());
        setDone(`Signed in as ${f.username.trim()} on this device. Cloud sync is coming soon.`);
      }
      setTimeout(onClose,2600);
    }catch{
      setErrors({form:'This browser blocks local storage. The builder still works without an account.'});
    }
  };

  return <div className="auth-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="auth-modal" role="dialog" aria-modal="true" aria-label={mode==='signin'?'Sign in':'Create account'} tabIndex={-1} ref={box}>
      <div className="modal-head">
        <h2>{mode==='signin'?'Welcome back.':'Create your free profile.'}</h2>
        <button className="text-button" aria-label="Close" onClick={onClose}><X size={18}/></button>
      </div>
      <p className="lead">{mode==='signin'?'Sign in to keep your drafts synced across devices once cloud accounts launch.':'One profile for your PDS, letters and the Work Experience Sheet. Always free.'}</p>
      <div className="auth-tabs" role="tablist">
        <button role="tab" aria-selected={mode==='signin'} className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setErrors({});setDone('')}}>Sign in</button>
        <button role="tab" aria-selected={mode==='signup'} className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setErrors({});setDone('')}}>Sign up</button>
      </div>
      <form onSubmit={submit} noValidate>
        {mode==='signup'&&<label className="field-label">Full name
          <input autoComplete="name" value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Juan Dela Cruz"/>
          {errors.name&&<span className="form-error">{errors.name}</span>}
        </label>}
        <label className="field-label">Username
          <input autoComplete="username" value={f.username} onChange={e=>set('username',e.target.value)} placeholder="juandc"/>
          {errors.username&&<span className="form-error">{errors.username}</span>}
        </label>
        {mode==='signup'&&<label className="field-label">Email
          <input type="email" autoComplete="email" value={f.email} onChange={e=>set('email',e.target.value)} placeholder="you@email.com"/>
          {errors.email&&<span className="form-error">{errors.email}</span>}
        </label>}
        <label className="field-label">Password
          <span className="pw-wrap">
            <input type={show?'text':'password'} autoComplete={mode==='signin'?'current-password':'new-password'} value={f.password} onChange={e=>set('password',e.target.value)} placeholder="8+ characters, letters and numbers"/>
            <button type="button" className="pw-eye" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(s=>!s)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
          </span>
          {errors.password&&<span className="form-error">{errors.password}</span>}
        </label>
        {mode==='signup'&&<label className="field-label">Verify password
          <span className="pw-wrap">
            <input type={show?'text':'password'} autoComplete="new-password" value={f.confirm} onChange={e=>set('confirm',e.target.value)} placeholder="Type it again"/>
            <button type="button" className="pw-eye" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(s=>!s)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
          </span>
          {errors.confirm&&<span className="form-error">{errors.confirm}</span>}
        </label>}
        {mode==='signup'&&<label className="agree-row">
          <input type="checkbox" checked={f.agree} onChange={e=>set('agree',e.target.checked)}/>
          <span>I understand that CareerForm PH stores everything <b>only on this device</b> — we never upload, sell or read your personal data. The PDS form belongs to the <a href="https://csc.gov.ph" target="_blank" rel="noopener noreferrer">Civil Service Commission</a>; we neither own nor alter it, we only help you fill it neatly. Salamat sa CSC for keeping the form free for every Filipino.</span>
        </label>}
        {mode==='signup'&&errors.agree&&<p className="form-error">{errors.agree}</p>}
        {errors.form&&<p className="form-error">{errors.form}</p>}
        {done&&<p className="form-ok"><CheckCircle2 size={14} style={{display:'inline',marginRight:6,verticalAlign:-2}}/>{done}</p>}
        <button className="btn btn-primary" style={{width:'100%'}} type="submit">{mode==='signin'?'Sign in':'Create profile'}</button>
      </form>
      <p className="auth-switch">
        {mode==='signin'?<>New here? <button onClick={()=>{setMode('signup');setErrors({});setDone('')}}>Create an account</button></>:<>Already have a profile? <button onClick={()=>{setMode('signin');setErrors({});setDone('')}}>Sign in</button></>}
      </p>
      <p className="muted" style={{textAlign:'center',margin:'10px 0 0'}}>No account needed to build your PDS — <Link href="/builder">start right away</Link>.</p>
    </div>
  </div>;
}
