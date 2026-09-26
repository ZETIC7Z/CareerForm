import type {Metadata,Viewport} from 'next';
import './globals.css';
import SiteChrome from '@/components/site-chrome';
import JsonLd from '@/components/json-ld';
import {SITE_ORIGIN} from '@/lib/site';
import {graph,organizationNode,websiteNode} from '@/lib/structured-data';

// System font stacks — no external fetch needed, builds work offline
const fontVarsClass = 'font-vars-applied';

export const metadata:Metadata={
  // Prefixes every relative URL in this metadata so OG/Twitter cards carry absolute
  // image URLs — the requirement social scrapers enforce before they render a preview.
  // SITE_ORIGIN (lib/site) is the same origin the JSON-LD graph below is built from.
  metadataBase:new URL(SITE_ORIGIN),
  title:{default:'CareerForm PH — Free CSC PDS Builder (Revised 2026)',template:'%s · CareerForm PH'},
  description:'Build your Civil Service Personal Data Sheet (CS Form 212, Revised 2026) free, in your browser. Live official-form preview, smart import, application letters — no sign-up, nothing uploaded.',
  keywords:['PDS','Personal Data Sheet','CS Form 212','Revised 2026','CSC','Civil Service Commission','Philippines','government jobs','plantilla','job application','resume builder'],
  authors:[{name:'Sam Pangilinan',url:'https://www.zeticuz.xyz'}],
  creator:'Sam Pangilinan (ZETICUZ)',
  category:'technology',
  // Google Search Console ownership verification (Search Console → URL prefix → HTML tag).
  verification:{google:'qQpKzJpPBnwHL9L9Q9wDJ9-oS9xyplfYR3alueF5lNw'},
  alternates:{canonical:'/'},
  openGraph:{
    title:'CareerForm PH — Free CSC PDS Builder (Revised 2026)',
    description:'Fill the official 2026 Personal Data Sheet with a live preview. Free, private, entirely in your browser.',
    url:'/',
    siteName:'CareerForm PH',
    type:'website',
    locale:'en_PH',
    images:[{url:'/images/og-cover.jpg',width:1200,height:630,alt:'CareerForm PH — the official CS Form 212 mirrored live as you type'}],
  },
  twitter:{
    card:'summary_large_image',
    title:'CareerForm PH — Free CSC PDS Builder (Revised 2026)',
    description:'Fill the official 2026 Personal Data Sheet with a live preview. Free, private, entirely in your browser.',
    images:['/images/og-cover.jpg'],
  },
  // Everything public is crawlable; auth/API surfaces are deliberately excluded in
  // robots.txt. These tags state the intent in-band for well-behaved crawlers too.
  robots:{
    index:true,
    follow:true,
    googleBot:{
      index:true,
      follow:true,
      'max-video-preview':-1,
      'max-image-preview':'large',
      'max-snippet':-1,
    },
  },
  // Browser-tab icon. The .ico is first because Chrome, Edge and the Windows shell look
  // for /favicon.ico before anything else — it is generated from the same emblem by
  // `node scripts/make-brand-assets.mjs`, so every path shows the CareerForm mark and never
  // the framework's default artwork. The PNG covers browsers that prefer it, and the
  // 180px square is what iOS puts on a home screen.
  icons:{
    icon:[
      {url:'/favicon.ico',sizes:'any'},
      {url:'/icon.png',type:'image/png',sizes:'512x512'},
    ],
    apple:[{url:'/apple-icon.png',type:'image/png',sizes:'180x180'}],
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={fontVarsClass}
      style={{ backgroundColor: '#000000', colorScheme: 'dark' }}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="HandheldFriendly" content="true" />
        <meta name="color-scheme" content="dark light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html { background-color: #000000; color-scheme: dark; }
              html[data-theme="light"] { background-color: #f8fafc; color-scheme: light; }
              body { background-color: #000000; }
              html[data-theme="light"] body { background-color: #f8fafc; }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('careerform-theme')||'dark';document.documentElement.setAttribute('data-theme',t);if(t==='light'){document.documentElement.style.backgroundColor='#f8fafc';document.documentElement.style.colorScheme='light';}else{document.documentElement.style.backgroundColor='#000000';document.documentElement.style.colorScheme='dark';}}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body>
        {/* Structured data for every page: who publishes the site, and what the site is.
            The per-tool WebApplication nodes live on their own routes. */}
        <JsonLd data={graph([organizationNode(),websiteNode()])}/>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
