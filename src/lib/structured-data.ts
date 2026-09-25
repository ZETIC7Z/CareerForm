import {SITE,SITE_ORIGIN} from './site';

/**
 * Schema.org entity graph for the site.
 *
 * Search engines no longer rank on a single keyword stuffed into a title — they build an
 * entity model of who publishes a page, what the thing on it *is*, and whether it is a
 * real, free, working product. Without markup Google has to guess that "CareerForm PH"
 * is an organization and that `/builder` is a piece of software named a PDS builder;
 * with it, that reading is handed over directly, and it is what feeds knowledge panels,
 * "free tool" labels and AI answers that cite a source.
 *
 * Every node carries a stable `@id` so nodes can reference each other by pointer
 * (`{'@id':ORGANIZATION_ID}`) instead of repeating themselves on every page.
 */

export const ORGANIZATION_ID=`${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID=`${SITE_ORIGIN}/#website`;

/** Absolute URL for a site-relative path — required in every structured-data URL field. */
export const abs=(path:string)=>new URL(path,SITE_ORIGIN).toString();

type Node=Record<string,unknown>;

export type Graph={'@context':'https://schema.org';'@graph':Node[]};

/** Wraps nodes in the `@graph` envelope so one script tag can describe several things. */
export function graph(nodes:Node[]):Graph{
  return {'@context':'https://schema.org','@graph':nodes};
}

/**
 * Who publishes CareerForm PH. `@id` is what the other nodes point at; `sameAs` is how a
 * search engine ties this site to the same person/account it already knows elsewhere.
 */
export function organizationNode():Node{
  const socials=SITE.socials.map(s=>s.href).filter(h=>!h.startsWith('mailto:'));
  return {
    '@type':'Organization',
    '@id':ORGANIZATION_ID,
    name:SITE.name,
    alternateName:'CareerForm PH — PDS Builder',
    // "CareerForm" and "Career Form" are both searched; this teaches the spacing variant.
    url:SITE_ORIGIN,
    slogan:SITE.tagline,
    description:'A free, independent browser-based toolkit for Filipino government applicants: the CS Form 212 Personal Data Sheet (Revised 2026), application and transmittal letters, work experience sheets, and a board of current agency vacancies.',
    logo:{'@type':'ImageObject',url:abs('/icon.png'),width:512,height:512},
    image:abs('/images/og-cover.jpg'),
    email:SITE.email,
    contactPoint:{
      '@type':'ContactPoint',
      contactType:'customer support',
      email:SITE.email,
      url:abs('/contact'),
      availableLanguage:['English','Filipino'],
    },
    founder:{
      '@type':'Person',
      name:SITE.owner,
      alternateName:SITE.handle,
      jobTitle:SITE.role,
      url:SITE.portfolio,
      sameAs:[SITE.portfolio,SITE.streaming,...socials],
    },
    areaServed:{'@type':'Country',name:'Philippines'},
    knowsAbout:[
      'Personal Data Sheet',
      'CS Form 212',
      'Civil Service Commission Philippines',
      'government job applications',
      'application letters',
    ],
    ...(socials.length?{sameAs:socials}:{}),
  };
}

/**
 * The site itself. There is deliberately no `SearchAction` (the sitelinks searchbox rich
 * result): Google retired it, and the site has no on-site search query endpoint anyway.
 */
export function websiteNode():Node{
  return {
    '@type':'WebSite',
    '@id':WEBSITE_ID,
    url:SITE_ORIGIN,
    name:SITE.name,
    alternateName:'CS Form 212 PDS Builder',
    description:'Free CSC Personal Data Sheet builder for CS Form 212, Revised 2026, plus application letters and a board of Philippine government job vacancies.',
    inLanguage:'en-PH',
    publisher:{'@id':ORGANIZATION_ID},
    copyrightYear:2026,
  };
}

/**
 * A tool on the site, typed as software rather than a plain page. `offers` at price 0
 * states the free-ness machine-readably; there is intentionally no `aggregateRating`
 * because it has no real reviews, and inventing one is both a lie and a Google violation.
 */
export function webApplicationNode(tool:{
  path:string;
  name:string;
  description:string;
  applicationCategory?:string;
  features:string[];
  keywords:string[];
}):Node{
  const url=abs(tool.path);
  return {
    '@type':'WebApplication',
    '@id':`${url}#app`,
    name:tool.name,
    url,
    description:tool.description,
    applicationCategory:tool.applicationCategory??'BusinessApplication',
    applicationSubCategory:'Form builder',
    operatingSystem:'Any (web browser)',
    browserRequirements:'Requires JavaScript',
    isAccessibleForFree:true,
    inLanguage:'en-PH',
    offers:{'@type':'Offer',price:'0',priceCurrency:'PHP',availability:'https://schema.org/InStock'},
    featureList:tool.features,
    keywords:tool.keywords.join(', '),
    publisher:{'@id':ORGANIZATION_ID},
    isPartOf:{'@id':WEBSITE_ID},
  };
}

/** A browsable listing (the jobs board) rather than a single document. */
export function collectionPageNode(page:{path:string;name:string;description:string;about:string}):Node{
  return {
    '@type':'CollectionPage',
    '@id':abs(page.path),
    url:abs(page.path),
    name:page.name,
    description:page.description,
    inLanguage:'en-PH',
    about:{'@type':'Thing',name:page.about},
    publisher:{'@id':ORGANIZATION_ID},
    isPartOf:{'@id':WEBSITE_ID},
  };
}

/**
 * FAQ markup mirrors questions that are actually answered on the page — Google requires
 * the answer to be visible to the reader, so the homepage renders this exact copy in a
 * discoverable section and only then describes it here.
 */
export function faqPageNode(items:{question:string;answer:string}[]):Node{
  return {
    '@type':'FAQPage',
    '@id':`${SITE_ORIGIN}/#faq`,
    isPartOf:{'@id':WEBSITE_ID},
    mainEntity:items.map(item=>({
      '@type':'Question',
      name:item.question,
      acceptedAnswer:{'@type':'Answer',text:item.answer},
    })),
  };
}
