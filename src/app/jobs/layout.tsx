import type {Metadata} from 'next';
import JsonLd from '@/components/json-ld';
import {collectionPageNode,graph} from '@/lib/structured-data';

/**
 * The jobs board is a client component, so it cannot export metadata of its own — the
 * audit lives here instead. The board is the site's answer to "government jobs"
 * searches, and it was previously indexed under the homepage's title and canonical,
 * so nothing on this route could rank on its own terms.
 */
export const metadata:Metadata={
  title:'Government Jobs PH — CSC Vacancies & Plantilla Openings',
  description:'Browse current Philippine government job openings — CSC published vacancies, plantilla positions and agency hiring across every region. Free to search, no sign-up.',
  keywords:['government jobs Philippines','CSC job vacancies','plantilla positions 2026','government hiring PH','job openings Philippines','civil service jobs','agency vacancies'],
  alternates:{canonical:'/jobs'},
  openGraph:{
    title:'Government Jobs PH — CSC Vacancies & Plantilla Openings',
    description:'Current Philippine government job openings by agency and region, with application letters built in.',
    url:'/jobs',
  },
};

export default function JobsLayout({children}:{children:React.ReactNode}){
  return <>
    <JsonLd data={graph([collectionPageNode({
      path:'/jobs',
      name:'Government Jobs PH — CSC Vacancies & Plantilla Openings',
      description:'A free board of current Philippine government job openings — CSC published vacancies, plantilla positions and agency hiring — filterable by salary grade, eligibility, region and deadline.',
      about:'Government job vacancies in the Philippines',
    })])}/>
    {children}
  </>;
}
