import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const BASE='http://127.0.0.1:3000';
const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT=path.join(ROOT,'tmp','shots');

async function run(browser,theme,names){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(themeKey=>{
    sessionStorage.setItem('careerform-intro-v1','seen');
    localStorage.removeItem('zeticuz-draft');
    localStorage.setItem('careerform-theme',themeKey);
  },theme);
  const page=await context.newPage();

  await page.goto(BASE+'/',{waitUntil:'networkidle'});
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(OUT,names.home),fullPage:true});

  await page.goto(BASE+'/builder',{waitUntil:'networkidle'});
  const live=page.getByRole('region',{name:'Live PDS preview'});
  try{
    await live.getByText('LIVE',{exact:true}).waitFor({state:'visible',timeout:25_000});
  }catch{/* fallback image may be visible; still capture */}
  await page.waitForTimeout(900);
  await page.screenshot({path:path.join(OUT,names.builder)});
  await context.close();
}

fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
await run(browser,'dark',{home:'home-dark.png',builder:'builder-dark.png'});
await run(browser,'light',{home:'home-light.png',builder:'builder-light.png'});
await browser.close();
console.log('screenshots ->',OUT);
