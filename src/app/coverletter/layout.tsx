import type {Metadata} from 'next';
import JsonLd from '@/components/json-ld';
import {graph,webApplicationNode} from '@/lib/structured-data';

/**
 * Same reason as the jobs board: the tool is a client component, so its metadata has
 * to live in a wrapper. Its own canonical also stops it from being reported to Google
 * as a duplicate of the homepage.
 */
export const metadata:Metadata={
  title:'Application Letter Generator for Government Jobs',
  description:'Write a polished application letter for any government job in minutes. Choose a template, match it to the vacancy, and download a print-ready PDF — free and private.',
  keywords:['application letter generator','cover letter for government job','job application letter Philippines','government application letter sample','free cover letter maker PH'],
  alternates:{canonical:'/coverletter'},
  openGraph:{
    title:'Application Letter Generator for Government Jobs',
    description:'Match your letter to the vacancy, preview it as you type, and export a print-ready PDF.',
    url:'/coverletter',
  },
};

export default function CoverLetterLayout({children}:{children:React.ReactNode}){
  return <>
    <JsonLd data={graph([webApplicationNode({
      path:'/coverletter',
      name:'CareerForm PH Application Letter Generator',
      description:'A free generator for Philippine government job application letters and transmittal letters. Details already entered in a Personal Data Sheet fill the letter placeholders automatically, and the finished letter previews as you type.',
      applicationCategory:'BusinessApplication',
      features:[
        'Application, transmittal and cover letter templates',
        'Placeholders filled from your PDS details',
        'Live preview while you edit',
        'Print-ready output — nothing uploaded',
      ],
      keywords:['application letter generator','cover letter for government job','transmittal letter','job application letter Philippines'],
    })])}/>
    {children}
  </>;
}
