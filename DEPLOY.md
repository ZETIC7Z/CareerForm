# Deploying the Zeticuz PDS Builder

The app is a static-first Next.js (App Router) project with no server logic, no database and no environment variables. Any Node host works; Vercel is the zero-config option.

## 1. Verify locally first

```bash
npm ci
npm run build     # production build + prerender
npm run start     # serve the production build at http://localhost:3000
```

Regression scripts used during development (the CSV fixture lives in the private folder, which is excluded from Git):

```bash
npx tsx scripts/test-import.ts   # CSV import + PDS generation regression
npx tsx scripts/test-pdf.ts      # template PDF generation
npx tsx scripts/test-letter.ts   # application/transmittal letter PDFs
npx tsx scripts/ssr-check.ts     # letter dialog render smoke test
```

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/zeticuz-pds-builder.git
git push -u origin main
```

The `.gitignore` already excludes `private/` (source records), `tmp/`, `.next/` and `node_modules/`. Double-check that no personal data is staged before pushing: `git status` and `git ls-files private` should return nothing from the private folder.

## 3. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
2. Vercel auto-detects Next.js. Defaults are correct: framework **Next.js**, build command `next build`, install command `npm ci`, Node 20.x.
3. No environment variables are required.
4. Click **Deploy**. First build takes about a minute.

Or from the CLI:

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

## 4. After the first deploy

- Open the deployed URL and walk through one full flow: import `SAM_PDS_RECORD.csv`, review each section, download the PDF, and compose a letter PDF.
- All processing (import, PDF generation, localStorage drafts) happens in the browser, so the Vercel server only serves static assets.
- Set a custom domain in Vercel → Settings → Domains if desired.

## Notes

- `public/csc-2026.pdf` (the CS Form 212 Revised 2026 background exported from the official workbook) and `public/NotoSans.ttf` are required at runtime and are fetched by the browser, so keep them in the repository.
- See `TEMPLATE-SOURCES.md` for template provenance and licensing.
