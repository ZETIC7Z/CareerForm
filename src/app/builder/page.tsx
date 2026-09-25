import type {Metadata} from 'next';
import Builder from '@/components/builder';
import JsonLd from '@/components/json-ld';
import {graph,webApplicationNode} from '@/lib/structured-data';

/**
 * The builder is the page people actually search for ("pds builder", "cs form 212"),
 * so it carries its own metadata. Without it this route inherited the homepage's
 * title, description *and* `alternates.canonical:'/'` from the root layout — the
 * canonical was the damaging part: it told Google this page is a duplicate of `/`,
 * which is how a search target quietly stops being indexed in its own right.
 */
export const metadata:Metadata={
  title:'PDS Builder — CS Form 212 (Revised 2026)',
  description:'Free CSC Personal Data Sheet builder for CS Form 212, Revised 2026. Type once and watch the official form fill itself, print at 100% on A4, then export — nothing is uploaded.',
  keywords:['PDS builder','CSC Personal Data Sheet','CS Form 212','Revised 2026 PDS','free PDS maker Philippines','print PDS on A4','Civil Service Commission form'],
  alternates:{canonical:'/builder'},
  openGraph:{
    title:'Free PDS Builder — CS Form 212 (Revised 2026)',
    description:'Fill the official 2026 Personal Data Sheet with a live mirrored preview. Private, browser-only, print-ready on A4.',
    url:'/builder',
  },
};

export default function BuilderPage(){
  return <>
    <JsonLd data={graph([webApplicationNode({
      path:'/builder',
      name:'CareerForm PH PDS Builder — CS Form 212 (Revised 2026)',
      description:'A free in-browser builder for the Civil Service Commission Personal Data Sheet, CS Form 212, Revised 2026. Type once into a mapped form and a live mirror of the official four-page sheet fills itself, ready to print at 100% on A4.',
      features:[
        'Live mirror of the official four-page CS Form 212',
        '177+ fields mapped from the Revised 2026 workbook',
        'Import an existing PDS from CSV, Excel, PDF or JSON',
        'Print or export the official A4 sheet',
        'Runs entirely in the browser — no upload, no sign-up required',
      ],
      keywords:['PDS builder','PDS maker','CS Form 212','Revised 2026','CSC Personal Data Sheet','Philippines'],
    })])}/>
    <Builder/>
  </>;
}
