import type {Metadata,Viewport} from 'next';
import './globals.css';
import SiteChrome from '@/components/site-chrome';

// System font stacks — no external fetch needed, builds work offline
const fontVarsClass = 'font-vars-applied';

export const metadata:Metadata={
  title:{default:'CareerForm PH — Free CSC PDS Builder (Revised 2026)',template:'%s · CareerForm PH'},
  description:'Build your Civil Service Personal Data Sheet (CS Form 212, Revised 2026) free, in your browser. Live official-form preview, smart import, application letters — no sign-up, nothing uploaded.',
  keywords:['PDS','Personal Data Sheet','CS Form 212','Revised 2026','CSC','Civil Service Commission','Philippines','government jobs','resume builder'],
  authors:[{name:'Sam Pangilinan',url:'https://www.zeticuz.xyz'}],
  creator:'Sam Pangilinan (ZETICUZ)',
  openGraph:{title:'CareerForm PH — Free CSC PDS Builder (Revised 2026)',description:'Fill the official 2026 Personal Data Sheet with a live preview. Free, private, entirely in your browser.',type:'website',locale:'en_PH',siteName:'CareerForm PH'},
  icons:{icon:'/careerform-icon.png',apple:'/careerform-icon.png'},
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
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
