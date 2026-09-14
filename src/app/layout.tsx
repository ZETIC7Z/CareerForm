import type {Metadata,Viewport} from 'next';
import {Syne,Space_Grotesk,Montserrat} from 'next/font/google';
import './globals.css';
import SiteChrome from '@/components/site-chrome';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['300','400','500','600','700','800','900'],
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400','500','600','700','800'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['300','400','500','600','700'],
  display: 'swap',
});

export const metadata:Metadata={
  title:{default:'CareerForm PH — Free CSC PDS Builder (Revised 2026)',template:'%s · CareerForm PH'},
  description:'Build your Civil Service Personal Data Sheet (CS Form 212, Revised 2026) free, in your browser. Live official-form preview, smart import, application letters — no sign-up, nothing uploaded.',
  keywords:['PDS','Personal Data Sheet','CS Form 212','Revised 2026','CSC','Civil Service Commission','Philippines','government jobs','resume builder'],
  authors:[{name:'Sam Pangilinan',url:'https://www.zeticuz.xyz'}],
  creator:'Sam Pangilinan (ZETICUZ)',
  openGraph:{title:'CareerForm PH — Free CSC PDS Builder (Revised 2026)',description:'Fill the official 2026 Personal Data Sheet with a live preview. Free, private, entirely in your browser.',type:'website',locale:'en_PH',siteName:'CareerForm PH'},
  icons:{icon:'/careerform-icon.png',apple:'/careerform-icon.png'},
};
export const viewport:Viewport={themeColor:[{media:'(prefers-color-scheme: light)',color:'#f2f5f8'},{media:'(prefers-color-scheme: dark)',color:'#050608'}]};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en" suppressHydrationWarning className={`${syne.variable} ${spaceGrotesk.variable} ${montserrat.variable}`}>
    <head />
    <body>
      <SiteChrome>{children}</SiteChrome>
    </body>
  </html>;
}
