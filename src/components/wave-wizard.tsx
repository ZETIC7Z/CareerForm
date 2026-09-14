'use client';
/**
 * CareerForm PH's four-page wave wizard.
 *
 * Driven by synchronized state with the top workspace header page navigation.
 */
import {useCallback,useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {ChevronLeft,ChevronRight,Flag,AlertCircle} from 'lucide-react';
import FormEditor from './form-editor';
import {GROUPS} from '@/lib/groups';
import {PDS} from '@/lib/model';
import {validateStep} from '@/lib/validation';

const DURATION=.55;

export type WizardProps={
  data:PDS;
  onChange:(data:PDS)=>void;
  finished:boolean;
  onFinish:()=>void;
  onEdit:()=>void;
  onPreviewPage?:(page:number)=>void;
  groupIndex?:number;
  stepIndex?:number;
  onJump?:(group:number,step?:number)=>void;
};

export default function WaveWizard({
  data,
  onChange,
  finished,
  onFinish,
  onEdit,
  onPreviewPage,
  groupIndex: controlledGroup = 0,
  stepIndex: controlledStep = 0,
  onJump,
}:WizardProps){
  const [internalGroup,setInternalGroup]=useState(controlledGroup);
  const [internalStep,setInternalStep]=useState(controlledStep);
  const [animating,setAnimating]=useState(false);
  const panelRef=useRef<HTMLElement>(null);
  const timelineRef=useRef<gsap.core.Timeline|null>(null);

  const groupIndex = onJump ? controlledGroup : internalGroup;
  const stepIndex = onJump ? controlledStep : internalStep;

  const group=GROUPS[groupIndex] || GROUPS[0];
  const step=group.steps[Math.min(stepIndex,group.steps.length-1)] || group.steps[0];
  const isLastGroup=groupIndex===GROUPS.length-1;
  const isLastStep=stepIndex===group.steps.length-1;
  const nextLabel=!isLastGroup&&isLastStep
    ?`Continue to PDS Page ${groupIndex+2}`
    :isLastGroup&&isLastStep?'Finish / Preview'
    :`Next · ${group.steps[stepIndex+1]?.short??''}`;

  useEffect(()=>()=>{timelineRef.current?.kill();timelineRef.current=null},[]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const prevTargetRef = useRef({group: controlledGroup, step: controlledStep});
  useEffect(() => {
    if (prevTargetRef.current.group !== controlledGroup || prevTargetRef.current.step !== controlledStep) {
      const isPageGroupChange = prevTargetRef.current.group !== controlledGroup;
      prevTargetRef.current = {group: controlledGroup, step: controlledStep};
      setErrors({});
      const panel = panelRef.current;
      if (panel) {
        if (isPageGroupChange) {
          // Lazy, smooth page transition effect
          gsap.fromTo(
            panel,
            { opacity: 0, y: 18, filter: 'blur(3px)' },
            { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }
          );
        } else {
          gsap.fromTo(
            panel,
            { opacity: 0.4, y: 8 },
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
          );
        }
      }
    }
  }, [controlledGroup, controlledStep]);

  const move=(direction:1|-1)=>{
    if(animating)return;

    // Navigation guard on Next: Validate current step
    if (direction === 1) {
      const stepErrors = validateStep(step.section, step.id === 'signing', data);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        const firstKey = Object.keys(stepErrors)[0];
        const targetEl = document.querySelector(`[data-field-key="${firstKey}"]`) as HTMLElement;
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = targetEl.querySelector('input:not([type="checkbox"]), select, textarea') as HTMLElement;
          if (input && typeof input.focus === 'function') input.focus();
        }
        return;
      }
    }

    setErrors({});
    let nextGroup=groupIndex;
    let nextStep=stepIndex+direction;
    if(nextStep>=group.steps.length){
      if(isLastGroup){onFinish();return}
      nextGroup+=1;nextStep=0;
    }
    if(nextStep<0){
      if(nextGroup===0)return;
      nextGroup-=1;nextStep=GROUPS[nextGroup].steps.length-1;
    }
    if(nextGroup===groupIndex&&nextStep===stepIndex)return;

    if (onJump) {
      onJump(nextGroup, nextStep);
    } else {
      setInternalGroup(nextGroup);
      setInternalStep(nextStep);
    }
  };

  useEffect(()=>{onPreviewPage?.(step.pdfPage)},[onPreviewPage,step.pdfPage]);

  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement;
      if(target.matches('input,textarea,select,button'))return;
      if(event.key==='ArrowRight')move(1);
      if(event.key==='ArrowLeft')move(-1);
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  });

  return <div className="wizard-col">
    <div className="wizard-sub">
      <span className="crumb">PDS C{groupIndex+1} · Step <b>{stepIndex+1}</b> / {group.steps.length} — <b>{step.label}</b></span>
      <span className="wizard-next-label">Up next: <b>{nextLabel}</b></span>
    </div>

    <section className="editor-card" ref={panelRef}>
      <div className="card-heading">
        <span className="heading-icon"><group.Icon size={21}/></span>
        <div>
          <h2>{step.short==='Signing & Refs'?'References, photo & signature':step.label}</h2>
        </div>
        <span className="required-note">* Essential</span>
      </div>
      <FormEditor
        key={step.id}
        data={data}
        section={step.section}
        onChange={onChange}
        signing={step.id==='signing'}
        errors={errors}
        onClearError={(k)=>setErrors(prev=>{const n={...prev};delete n[k];return n;})}
      />
      <div className="form-bottom">
        <button type="button" className="pds-btn-pill secondary" disabled={groupIndex===0&&stepIndex===0||animating} onClick={()=>move(-1)}><ChevronLeft size={14}/> Back</button>
        <span className="saved">PDS C{groupIndex+1} · Step {stepIndex+1} of {group.steps.length}</span>
        {isLastGroup&&isLastStep
          ?<button type="button" className="pds-btn-pill pds-btn-primary" disabled={animating} onClick={onFinish}><Flag size={14}/> Finish / Preview</button>
          :<button type="button" className="pds-btn-pill pds-btn-primary" disabled={animating} onClick={()=>move(1)}>Save & Next <ChevronRight size={14}/></button>}
      </div>
    </section>
  </div>;
}

export function useWizardJump(){return (group:number,step:number)=>({group,step})}
