'use client';
import {useState} from 'react';
import {PDS,Row,scalarFields,tables,Table,questions,required} from '@/lib/model';
import {Plus,Trash2,Copy,PenTool,Camera,AlertCircle} from 'lucide-react';
import SignaturePlacement from './signature-placement';
import PassportPhotoModal from './passport-photo-modal';
import {
  formatSalary,
  formatSSS,
  formatPagIBIG,
  formatPhilHealth,
  formatTIN,
  formatMobile,
  formatTelephone,
  parseHeightSuggestion,
} from '@/lib/formatters';

type Props={
  data:PDS;
  section:number;
  onChange:(data:PDS)=>void;
  onSection?:(n:number)=>void;
  signing?:boolean;
  errors?:Record<string, string>;
  onClearError?:(key:string)=>void;
};

const CHOICE_KEYS=new Set(['sex','civilStatus','citizenship','citizenshipBasis']);

export default function FormEditor({data,section,onChange,signing,errors,onClearError}:Props){
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const set=(key:string,value:string)=>{
    let formatted = value;
    if (key === 'sss') formatted = formatSSS(value);
    else if (key === 'pagibig') formatted = formatPagIBIG(value);
    else if (key === 'philhealth') formatted = formatPhilHealth(value);
    else if (key === 'tin') formatted = formatTIN(value);
    else if (key === 'mobile') formatted = formatMobile(value);
    else if (key === 'telephone') formatted = formatTelephone(value);
    if (onClearError) onClearError(key);
    onChange({...data,values:{...data.values,[key]:formatted}});
  };

  const setRows=(key:string,rows:Row[])=>onChange({...data,records:{...data.records,[key]:rows}});
  const groups=[...new Set(scalarFields.filter(f=>f.section===section&&(section!==8||signing&&f.group==='Identification & signing')).map(f=>f.group))];

  const renderTable=(key:string,t:Table)=><div className="form-block" key={key}>
    <div className="form-subtitle">
      <h3>{t.label}</h3>
      <button type="button" className="text-button" onClick={()=>setRows(key,[...data.records[key],{}])}><Plus size={13}/> Add record</button>
    </div>
    {data.records[key].length===0&&<div className="empty-state">No records yet. Add a record if this section applies to you.</div>}
    {data.records[key].map((row,i)=><div className="row-card" key={i}>
      <div className="row-header">
        <strong>{key==='education'?row.level||'Education':`Record ${i+1}`}</strong>
        <button type="button" aria-label={`Remove ${t.label} record ${i+1}`} className="text-button" onClick={()=>setRows(key,data.records[key].filter((_,n)=>n!==i))}><Trash2 size={13}/></button>
      </div>
      <div className="fields">
        {t.columns.map(c=>{
          const isSalary = c.key === 'salary';
          return <label key={c.key} className={['position','company','school','degree','title','sponsor','organization','value','address'].includes(c.key)?'field-wide':''}>
            {c.label}
            {c.options?<select value={row[c.key]||''} onChange={e=>setRows(key,data.records[key].map((r,n)=>n===i?{...r,[c.key]:e.target.value}:r))}>
              <option value="">Select an option</option>{c.options.map(o=><option key={o}>{o}</option>)}
            </select>:<input 
              aria-label={`${t.label} ${i+1} ${c.label}`} 
              type={c.type==='date'?'date':'text'} 
              value={row[c.key]||''} 
              placeholder={isSalary?'₱21,877.00':c.key==='to'?'Present or YYYY-MM-DD':c.label} 
              onChange={e=>{
                const val = e.target.value;
                setRows(key,data.records[key].map((r,n)=>n===i?{...r,[c.key]:val}:r));
              }}
              onBlur={e=>{
                if(isSalary&&e.target.value){
                  const formatted = formatSalary(e.target.value);
                  setRows(key,data.records[key].map((r,n)=>n===i?{...r,[c.key]:formatted}:r));
                }
              }}
            />} 
          </label>;
        })}
      </div>
    </div>)}
    {data.records[key].length>t.capacity&&<p className="notice">Additional records will appear on continuation pages.</p>}
  </div>;

  const renderChoiceField=(f:typeof scalarFields[number])=>{
    const hasError = Boolean(errors?.[f.key]);
    return (
      <fieldset className={`choice-field ${hasError ? 'field-error-highlight' : ''}`} key={f.key} data-field-key={f.key}>
        <legend style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span>{f.label}{required.includes(f.key)?' *':''}</span>
          {hasError && (
            <span className="field-error-badge" title={errors?.[f.key]}>
              <AlertCircle size={12}/> Required
            </span>
          )}
        </legend>
        <div className="choice-grid">
          {f.options?.map(option=><label className="choice" key={option}>
            <input type="checkbox" checked={data.values[f.key]===option} onChange={e=>set(f.key,e.target.checked?option:'')} />
            <span>{option}</span>
          </label>)}
        </div>
      </fieldset>
    );
  };

  const renderScalarField=(f:typeof scalarFields[number])=>{
    if(f.options&&CHOICE_KEYS.has(f.key))return renderChoiceField(f);

    // Special handling for Middle Name: Checkbox for "No middle name"
    if(f.key==='middleName'){
      const isNoMiddleName = data.values.middleName === 'N/A';
      const isSingleLetter = Boolean(data.values.middleName && !isNoMiddleName && /^[a-zA-Z]\.?$/.test(data.values.middleName.trim()));
      const hasError = Boolean(errors?.middleName);
      return <div key={f.key} className="field-group-wrap" style={{marginBottom:'10px'}} data-field-key="middleName">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
          <span style={{fontSize:'13px',fontWeight:600}}>{f.label}{required.includes(f.key)?' *':''}</span>
          <label style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px',color:'#94a3b8',cursor:'pointer',userSelect:'none'}}>
            <input
              type="checkbox"
              checked={isNoMiddleName}
              onChange={e=>set('middleName',e.target.checked?'N/A':'')}
              style={{cursor:'pointer'}}
            />
            <span>No middle name</span>
          </label>
        </div>
        <input
          type="text"
          disabled={isNoMiddleName}
          value={data.values.middleName||''}
          placeholder={isNoMiddleName?'N/A':f.label}
          onChange={e=>set('middleName',e.target.value)}
          className={hasError ? 'field-error-highlight' : ''}
          style={{
            background:isNoMiddleName?'rgba(30,41,59,0.5)':undefined,
            borderColor:hasError?'#ef4444':isSingleLetter?'#f59e0b':undefined,
          }}
        />
        {hasError && (
          <p className="field-error-badge" title={errors?.middleName} style={{marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
            <AlertCircle size={12}/> {errors?.middleName}
          </p>
        )}
        {!hasError && isSingleLetter && (
          <p style={{color:'#f59e0b',fontSize:'11px',marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
            <AlertCircle size={12}/> CSC requires full middle name (e.g. Santos). If you do not have a middle name, check &quot;No middle name&quot;.
          </p>
        )}
      </div>;
    }

    // Special handling for Height suggestion
    if(f.key==='height'){
      const heightVal = data.values.height || '';
      const suggestion = parseHeightSuggestion(heightVal);
      const hasError = Boolean(errors?.height);
      return <div key={f.key} className="field-group-wrap" style={{marginBottom:'10px'}} data-field-key="height">
        <label>
          <span style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>{f.label}{required.includes(f.key)?' *':''}</span>
            {hasError && <span className="field-error-badge" title={errors?.height}><AlertCircle size={12}/> Required</span>}
          </span>
          <input className={hasError ? 'field-error-highlight' : ''} type="text" value={heightVal} placeholder="e.g. 1.75" onChange={e=>set('height',e.target.value)}/>
        </label>
        {suggestion&&(
          <div style={{marginTop:'4px',display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:'#f59e0b'}}>
            <span>CSC requires meters:</span>
            <button
              type="button"
              onClick={()=>set('height',suggestion.replace(' m',''))}
              style={{padding:'2px 6px',fontSize:'11px',borderRadius:'4px',background:'#1e293b',color:'#38bdf8',border:'1px solid #334155',cursor:'pointer'}}
            >
              Use {suggestion}
            </button>
          </div>
        )}
      </div>;
    }

    const hasError = Boolean(errors?.[f.key]);
    return <label key={f.key} data-field-key={f.key} className={['birthPlace','email','spouseEmployer','spouseAddress'].includes(f.key)?'field-wide':''}>
      <span style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>{f.label}{required.includes(f.key)?' *':''}</span>
        {hasError && (
          <span className="field-error-badge" title={errors?.[f.key]}>
            <AlertCircle size={12}/> Required
          </span>
        )}
      </span>
      {f.options?<select className={hasError ? 'field-error-highlight' : ''} value={data.values[f.key]||''} onChange={e=>set(f.key,e.target.value)}><option value="">Select an option</option>{f.options.map(o=><option key={o}>{o}</option>)}</select>:<input className={hasError ? 'field-error-highlight' : ''} type={f.type==='date'?'date':f.type==='email'?'email':'text'} value={data.values[f.key]||''} placeholder={f.label} onChange={e=>set(f.key,e.target.value)}/>} 
    </label>;
  };

  const renderQuestion=(q:typeof questions[number])=>{
    const hasError = Boolean(errors?.[q.key]);
    const hasDetailsError = Boolean(errors?.[q.key + 'Details']);
    return <div className="row-card" key={q.key} data-field-key={q.key}>
      <fieldset className={`choice-field question-field ${hasError ? 'field-error-highlight' : ''}`}>
        <legend style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>{q.key.slice(1)}. {q.label}</span>
          {hasError && <span className="field-error-badge"><AlertCircle size={12}/> Answer required</span>}
        </legend>
        <div className="choice-grid compact">
          {['Yes','No'].map(answer=><label className="choice" key={answer}>
            <input type="checkbox" checked={data.values[q.key]===answer} onChange={e=>set(q.key,e.target.checked?answer:'')} />
            <span>{answer}</span>
          </label>)}
        </div>
      </fieldset>
      {data.values[q.key]==='Yes'&&<label style={{marginTop:15}} data-field-key={q.key + 'Details'}>
        <span style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Details / ID number</span>
          {hasDetailsError && <span className="field-error-badge"><AlertCircle size={12}/> Details required</span>}
        </span>
        <textarea className={hasDetailsError ? 'field-error-highlight' : ''} value={data.values[q.key+'Details']||''} onChange={e=>set(q.key+'Details',e.target.value)}/>
      </label>}
    </div>;
  };

  return <div className="form-content">
    {section===0&&<><h3>Let’s start with the basics</h3><p className="muted">Use your official documents. Enter N/A only where a field does not apply.</p></>}
    {groups.map(group=><div className="form-block" key={group}>
      <div className="form-subtitle"><h3>{group}</h3>{group==='Permanent address'&&<button type="button" className="text-button" onClick={()=>{const v={...data.values};for(const suffix of ['House','Street','Village','Barangay','City','Province','Zip'])v['permanent'+suffix]=v['residential'+suffix]||'';onChange({...data,values:v})}}><Copy size={12}/> Same as residential</button>}</div>
      <div className="fields">{scalarFields.filter(f=>f.section===section&&f.group===group).map(renderScalarField)}</div>
    </div>)}

    {Object.entries(tables).filter(([,t])=>t.section===section&&(section!==8||signing)).map(([key,t])=>renderTable(key,t))}

    {section===8&&!signing&&<div className="form-block">
      <h3>Declarations · Questions 34–40</h3>
      <p className="muted">Answer each question yourself and provide details for every Yes response.</p>
      {questions.map(renderQuestion)}
    </div>}

    {section===8&&signing&&<div className="form-block">
      <h3>Official Photo & Signature</h3>
      <p className="muted">CSC CS Form 212 (Revised 2026) requires a recent passport photo (4.5 cm × 3.5 cm) and your official affixed e-signature with the date of accomplishment.</p>
      
      <div className="form-sig-photo-grid">
        <div className="sig-block-col" data-field-key="signature">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <label className="sig-sub-label">Affixed Signature (Pages 1–4)</label>
            {errors?.signature && <span className="field-error-badge"><AlertCircle size={12}/> {errors.signature}</span>}
          </div>
          <SignaturePlacement
            signatureUrl={data.signature}
            signDate={data.signatureDate}
            applicantName={[data.values.firstName,data.values.middleName,data.values.surname].filter(Boolean).join(' ')}
            onChange={(sig,dt)=>{
              if(onClearError) onClearError('signature');
              onChange({
                ...data,
                signature:sig,
                signatureDate:dt
              });
            }}
          />
        </div>

        <div className="sig-block-col" data-field-key="photo">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <label className="sig-sub-label">Passport Photo (Page 4)</label>
            {errors?.photo && <span className="field-error-badge"><AlertCircle size={12}/> {errors.photo}</span>}
          </div>
          <div 
            className={`sig-photo-dropzone ${errors?.photo ? 'field-error-highlight' : ''}`}
            onClick={()=>setPhotoModalOpen(true)}
            style={{cursor:'pointer'}}
          >
            {data.photo ? (
              <div className="photo-preview-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="upload-preview photo-preview" alt="Passport photo" src={data.photo}/>
                <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                  <button type="button" className="btn btn-ghost" style={{fontSize:'12px',padding:'4px 8px'}} onClick={(e)=>{e.stopPropagation();setPhotoModalOpen(true)}}>Change Photo</button>
                  <button type="button" className="text-button remove-photo-btn" onClick={(e)=>{e.stopPropagation();onChange({...data,photo:undefined})}}>Remove photo</button>
                </div>
              </div>
            ) : (
              <div className="photo-empty-placeholder" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',padding:'24px 12px'}}>
                <div style={{background:'rgba(6,182,212,0.15)',color:'#06b6d4',padding:'10px',borderRadius:'10px'}}>
                  <Camera size={22} />
                </div>
                <strong>Upload Passport Photo</strong>
                <span className="muted" style={{fontSize:'12px'}}>4.5 cm × 3.5 cm • max 2 MB</span>
                <button type="button" className="btn btn-primary" style={{marginTop:'6px',fontSize:'12px',padding:'6px 12px'}} onClick={(e)=>{e.stopPropagation();setPhotoModalOpen(true)}}>
                  Open Photo Studio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {photoModalOpen && (
        <PassportPhotoModal
          open={photoModalOpen}
          onClose={()=>setPhotoModalOpen(false)}
          onSave={photo=>{
            onChange({...data,photo});
            setPhotoModalOpen(false);
          }}
        />
      )}
    </div>}
  </div>;
}
