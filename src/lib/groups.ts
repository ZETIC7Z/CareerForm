import {UserRound,GraduationCap,ShieldCheck,HeartHandshake,BookOpen,Sparkles,FileCheck2} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

export type Step={id:string;label:string;short:string;section:number;pdfPage:number};
export type Group={id:string;label:string;pdfPage:number;steps:Step[];Icon:LucideIcon};

/** The nine editor sections are folded into four PDS page-groups that mirror
 *  the printed form: page 1 = identity + family + education, page 2 =
 *  eligibility + work, page 3 = voluntary + L&D + other, page 4 = signatures. */
export const GROUPS:Group[]=[
  {
    id:'g1',label:'PDS Page 1 · Personal Data',pdfPage:0,Icon:UserRound,
    steps:[
      {id:'personal',label:'Personal Information',short:'Personal Information',section:0,pdfPage:0},
      {id:'family',label:'Family Background',short:'Family Background',section:1,pdfPage:0},
      {id:'education',label:'Educational Background',short:'Education',section:2,pdfPage:0},
      {id:'skills',label:'Special Skills & Hobbies',short:'Skills',section:7,pdfPage:2},
    ],
  },
  {
    id:'g2',label:'PDS Page 2 · Eligibility & Experience',pdfPage:1,Icon:GraduationCap,
    steps:[
      {id:'eligibility',label:'Civil Service Eligibility',short:'CS Eligibility',section:3,pdfPage:1},
      {id:'work',label:'Work Experience',short:'Work Experience',section:4,pdfPage:1},
    ],
  },
  {
    id:'g3',label:'PDS Page 3 · Service & Growth',pdfPage:2,Icon:HeartHandshake,
    steps:[
      {id:'voluntary',label:'Voluntary Work or Involvement in Civic',short:'Voluntary Work',section:5,pdfPage:2},
      {id:'training',label:'Learning and Development (L&D)',short:'Learning & Dev',section:6,pdfPage:2},
    ],
  },
  {
    id:'g4',label:'PDS Page 4 · Declarations & Signing',pdfPage:3,Icon:ShieldCheck,
    steps:[
      {id:'declarations',label:'Declarations · Questions 34–40',short:'Declarations',section:8,pdfPage:3},
      {id:'signing',label:'References, Photo & Signature',short:'Signing & Refs',section:8,pdfPage:3},
    ],
  },
];

export const ALL_STEPS:Step[]=GROUPS.flatMap(g=>g.steps);
/** Map editor section index → step id (declarations and signing share section 8). */
export function stepForSection(section:number):string{
  if(section===8)return 'declarations';
  return ALL_STEPS.find(s=>s.section===section)?.id||ALL_STEPS[0].id;
}
export function groupOfStep(stepId:string):Group{
  return GROUPS.find(g=>g.steps.some(s=>s.id===stepId))||GROUPS[0];
}
/** Which step inside a group handles a given editor section (for signing split). */
export function stepIndexForSection(section:number,groupId:string):number{
  const g=GROUPS.find(x=>x.id===groupId)||GROUPS[0];
  if(section===8)return g.steps.findIndex(s=>s.id==='declarations');
  return Math.max(0,g.steps.findIndex(s=>s.section===section));
}

/** Icons for the top tab bar — one per group, matching the printed pages. */
export const GROUP_ICONS={g1:UserRound,g2:GraduationCap,g3:BookOpen,g4:FileCheck2};
export const SPARK_ICON=Sparkles;
