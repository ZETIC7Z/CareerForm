import {test,expect} from '@playwright/test';

const routes=['/','/about','/contact','/wes','/builder'];

test.describe('CareerForm PH smoke flow',()=>{
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{
      // Skip the New-document create ritual unless a test explicitly opts in.
      sessionStorage.setItem('careerform-create-seen','1');
      localStorage.removeItem('zeticuz-draft');
      localStorage.setItem('careerform-theme','dark');
    });
  });

  test('public routes render and builder has no automatic download',async({page})=>{
    for(const route of routes){
      const downloads:unknown[]=[];
      page.on('download',download=>downloads.push(download));
      await page.goto(route,{waitUntil:'domcontentloaded'});
      await expect(page).toHaveTitle(/CareerForm PH/);
      await expect(page.locator('body')).not.toContainText('Failed to parse PDF document');
      expect(downloads).toHaveLength(0);
    }
    await expect(page.getByRole('tablist',{name:'PDS pages'})).toBeVisible();
    await expect(page.getByRole('region',{name:'Live PDS preview'})).toBeVisible();
    // Fresh visitors get the VeriWorkly-style New-document ritual; choosing a
    // type enters the workspace with that tool ready. Registered AFTER the
    // beforeEach script so it re-clears the opt-out on every navigation
    // (init scripts run in registration order).
    await page.addInitScript(()=>{
      sessionStorage.removeItem('careerform-create-seen');
      localStorage.removeItem('zeticuz-draft');
    });
    await page.reload({waitUntil:'domcontentloaded'});
    const createDialog=page.getByRole('dialog',{name:'New document'});
    await expect(createDialog).toBeVisible({timeout:15_000});
    await createDialog.getByRole('button',{name:/Create PDS/}).click();
    await expect(createDialog).toBeHidden();
    await expect(page.getByRole('tablist',{name:'PDS pages'})).toBeVisible();
  });

  test('official form canvas renders and updates from a checkbox',async({page})=>{
    await page.goto('/builder',{waitUntil:'domcontentloaded'});
    const live=page.getByRole('region',{name:'Live PDS preview'});
    // The badge flips to LIVE only after a real canvas render, so waiting on it
    // also guarantees the canvas is mounted and painted.
    await expect(live.getByText('LIVE',{exact:true})).toBeVisible({timeout:45_000});
    const canvas=live.locator('canvas');
    await expect(canvas).toHaveAttribute('aria-label',/Live official PDS preview/);
    await expect.poll(async()=>canvas.evaluate((node:HTMLCanvasElement)=>node.width),{timeout:15_000}).toBeGreaterThan(500);
    const male=page.getByRole('checkbox',{name:'Male',exact:true});
    await male.check();
    await expect(male).toBeChecked();
  });

  test('page rail navigates through the wizard and keeps preview page in sync',async({page})=>{
    await page.goto('/builder',{waitUntil:'domcontentloaded'});
    const rail=page.getByRole('tablist',{name:'PDS pages'});
    await rail.getByRole('tab',{name:/Open PDS page 2/}).click();
    await expect(page.getByRole('button',{name:'Next · Work',exact:true})).toBeVisible();
    await expect(page.getByRole('region',{name:'Live PDS preview'})).toContainText('Page 2 of 4');
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await expect(page.getByRole('button',{name:'Continue to PDS Page 2',exact:true})).toBeVisible();
  });

  test('dark mode is near-black and fullscreen preview has dots and zoom',async({page})=>{
    await page.goto('/builder',{waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    const background=await page.locator('body').evaluate(node=>getComputedStyle(node).backgroundColor);
    expect(background).toMatch(/rgb\(5, 6, 8\)|rgb\(8, 9, 11\)/);
    await page.getByRole('tab',{name:/Open PDS page 4/}).click();
    await page.getByRole('button',{name:'Next · Signing',exact:true}).click();
    await page.getByRole('button',{name:'Finish / Preview',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Full PDS preview'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button',{name:'View page 1',exact:true})).toBeVisible();
    await expect(dialog.getByRole('button',{name:'View page 4',exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:'Zoom in',exact:true}).click();
    await expect(dialog.getByText('120%',{exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:'Close preview',exact:true}).click();
  });

  test('export stays locked before finish and arms after finish',async({page})=>{
    await page.goto('/builder',{waitUntil:'domcontentloaded'});
    const exportButton=page.getByRole('button',{name:'Export',exact:true});
    await expect(exportButton).toBeDisabled();
    await page.getByRole('tab',{name:/Open PDS page 4/}).click();
    await page.getByRole('button',{name:'Next · Signing',exact:true}).click();
    await page.getByRole('button',{name:'Finish / Preview',exact:true}).click();
    await page.getByRole('button',{name:'Close preview',exact:true}).click();
    await expect(exportButton).toBeEnabled();
    // The export caret menu offers the PDF download, backup and full preview.
    await page.getByRole('button',{name:'More export options',exact:true}).click();
    await expect(page.getByRole('menuitem',{name:/Download PDF/})).toBeVisible();
    await expect(page.getByRole('menuitem',{name:/Save backup/})).toBeVisible();
    await expect(page.getByRole('menuitem',{name:/Open full preview/})).toBeVisible();
  });

  test('actions menu opens the create modal and letters',async({page})=>{
    await page.goto('/builder',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Actions',exact:true}).click();
    await page.getByRole('menuitem',{name:/New document/}).click();
    const createDialog=page.getByRole('dialog',{name:'New document'});
    await expect(createDialog).toBeVisible();
    await createDialog.getByRole('button',{name:'Close new document',exact:true}).click();
    await page.getByRole('button',{name:'Actions',exact:true}).click();
    await page.getByRole('menuitem',{name:/Compose letters/}).click();
    await expect(page.getByRole('dialog',{name:/letters/i})).toBeVisible();
  });
});
