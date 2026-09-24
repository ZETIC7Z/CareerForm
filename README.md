# CareerForm PH — CSC Personal Data Sheet (CS Form 212, Revised 2026) Builder & Government Jobs Portal

<div align="center">
  <img src="public/zeticuz-logo.png" alt="ZETICUZ Developer Logo" width="160" />
  <h3>SITE DEVELOPER BY: <strong>ZETICUZ</strong></h3>
  <p><strong>Free, Private, Client-Side Civil Service Personal Data Sheet Builder & Government Jobs Studio</strong></p>
  <p>
    <a href="https://CareerForm-PH.vercel.app"><strong>Visit Live App: CareerForm-PH.vercel.app</strong></a>
  </p>
</div>

---

## 🌟 Overview

**CareerForm PH** is a modern, high-performance web platform designed specifically for Filipino civil servants, government job seekers, and HR professionals. It provides a complete, 100% private, client-side toolkit for preparing, editing, previewing, and exporting the official **Civil Service Commission Personal Data Sheet (CS Form No. 212, Revised 2026)** and generating tailored government application letters.

Filling and exporting a PDS needs **no account and no network** — the editor, the live mirror, the signature studio and the passport-photo studio all run in your browser. Signing in is optional and only adds continuity: your named projects, bookmarked jobs and job alerts are stored so they follow you to another device.

---

## 🔐 Accounts, Dashboard & Cloud Sync

Signing in is the only time anything leaves your device, and it only ever stores the documents you created while signed in.

- **Dashboard** — a dark-rail shell with **Overview, Projects, Recent, Bookmarks, Plan** and **Manage Profile**. The Overview carries a four-stage pipeline (Draft → In Progress → Ready to Submit → Complete) built from each document's real completion percentage, and the top bar pairs a `Home / <section>` breadcrumb with the notification bell.
- **Notifications** — the bell shows an unread count badge. New agency postings, bookmark confirmations and sync receipts land in the notification list; “Mark all read” clears them.
- **Job bookmarks** — tap **Save** on any posting (or the bookmark slot beside the job title in the detail view) and it appears under the dashboard's Bookmarks tab, on every device, in deadline order.
- **Device job alerts** — **Get <agency> Job Alerts** asks the browser for notification permission once, records the standing subscription on your account, fires one notification immediately as confirmation, and then notifies the device whenever that agency publishes a new vacancy.
- **Create Cover Letter** — create a cover letter straight from the dashboard; it is filed alongside your PDS projects under the same name.
- **One workspace** — the builder and the dashboard read the same project list. Open the builder while signed in and it offers your recent documents; start a new one and the Project Name you type is the name that appears on the dashboard.
- **Sign-in sync** — when you sign in, this device's offline drafts are handed to your account. Existing projects are merged with the newer edit winning; anything new becomes a real project. Work you started before you had an account is no longer stranded on one device.

### Security posture

- Database credentials are **never** in the source. `MONGODB_URI` is read from the server environment only, and the server refuses to start without it.
- Every `/api/projects`, `/api/bookmarks`, `/api/notifications` and `/api/user/sync` handler is scoped to the `userId` inside a signed, HttpOnly session cookie — no request can address another account's data.
- Passwords are stored as salted PBKDF2-SHA512 hashes (10 000 iterations, 64-byte derived key) and compared in constant time.
- API responses contain only the fields the UI renders; no raw database document or connection detail is ever returned, and nothing about the storage vendor is exposed in the interface.

---

## 🔑 Signing In — Username, Google, Reset Links & Authenticator Apps

Three independent ways into the same account, so losing one never locks anyone out.

| Method | How it works |
| --- | --- |
| **Username or email + password** | Sign-up collects a full name, a **username**, an email, a password and a **confirmation** field. `POST /api/auth/signin` takes a single `identifier`, so either the username or the email address signs you in — no need to remember which one you registered with. |
| **Continue with Google** | Full OAuth 2.0 authorization-code flow (`/api/auth/google` → `/api/auth/google/callback`), no SDK and no extra dependency. If the Google address matches an existing account, Google is **attached to that same account** instead of creating a duplicate — your username and password keep working. A brand-new Google visitor gets an account named after their Google profile, with a free username derived from the address. |
| **Forgot password** | `POST /api/auth/forgot` emails a single-use link (`/reset-password?token=…`) that expires in 30 minutes; only the SHA-256 hash of the token is stored, and pressing it opens the “new password / confirm password” box before `POST /api/auth/reset` saves it. |
| **Authenticator app (2FA)** | Set up under **Dashboard → Account & Security**. The server mints a secret (`/api/auth/totp` action `setup`), renders the `otpauth://` URI as a QR code and shows a manually typeable key, then verifies the first code before switching protection on. Ten single-use backup codes are issued once, and sign-in then also asks for the 6-digit code. |

**Account & Security** (rail → *Account & Security*) is the control room: it reports the username, the connected Google account and whether an authenticator is active, and lets you change or first-set your password, connect Google, set up or remove the authenticator, and export your backup codes.

Sign-in is also where the site talks to you: every published entry in **Site Updates & Patch Notes** is delivered once to each account's notification bell, so people learn about new features and fixes without hunting for the home-page box.

---

## 🚀 Key Features & Capabilities

### 1. 📋 Official CSC Form 212 (Revised 2026) Engine
- **Accurate 4-Page Mirror**: Side-by-side live rendering of **Page C1, C2, C3, and C4** matching official CSC typography, line heights, cell borders, and the official **A4** page geometry at 100%. The geometry is calibrated against the bundled official PDF and hash-locked (see *Frozen Live Form*).
- **Interactive Form Navigation**: Sleek breadcrumb wizard (Personal Information, Family Background, Educational Background, Civil Service Eligibility, Work Experience, Voluntary Work, Learning & Development, Other Information, 40-42 Questionnaire, References, Government ID).
- **Auto-Formatting & Data Masking**:
  - Currency fields automatically format to official currency notation (e.g., `21877` -> `₱21,877.00`).
  - Government IDs (SSS, GSIS, TIN, PhilHealth, Pag-IBIG) auto-format into official delimited masks.
  - Automatic `N/A` fallback prevents leaving blanks that disqualify applications.
  - Real-time validation jumps directly to incomplete fields with visual warning indicators.
- **Smart Date Accomplished Engine**:
  - Adheres strictly to the official CSC Revised 2026 guidelines (full dates e.g. `September 15, 2026`).
  - Independent Page 4 Date Accomplished toggle with live real-time sync across all 4 pages.

### 2. 🖋️ Digital E-Signature Studio
- **Multi-Source Affixing**:
  - **Draw Signature**: Ultra-smooth vector ink drawing with undo, clear, stroke smoothing, and thickness control.
  - **Upload Signature**: Automatic background removal converting paper photos into pure transparent black ink signatures.
  - **Camera Capture**: Integrated webcam capture with intelligent retake, edge detection, and auto-camera shutdown on close/cancel to protect privacy and device resources.
  - **Google Drive Import**: Connect via Google Picker API to pull existing e-signatures.
- **Official Placement**: Signatures are affixed on top of guideline text with pixel-perfect official bounding boxes.

### 3. 🖼️ Passport Photo Studio (Cut-It-Out AI Integration)
- **AI Background Remover**: Powered by `@imgly/background-removal` (Cut-It-Out architecture) executing entirely client-side via WebAssembly/Web Workers.
- **Background Replacer**:
  - CSC Official White Background
  - Standard Government Sky Blue Background
  - Transparent PNG Output
- **HD Image & Pixel Enhancer**: Unsharp-masking, bicubic upscaling, and noise reduction restoring blurry or low-resolution ID photos into sharp, high-definition passport photos.

### 4. 🇵🇭 Government Jobs PH Board (Inspired by govjobsph.com)
- **Save & Alerts**: Amber `View Details` cards each carry a **Save** bookmark button, and the job detail view adds a bookmark slot beside the position title plus a **Get <agency> Job Alerts** control for device notifications.
- **Jobs Closing Soon Banner**: Red-accented container with countdown alert (`Urgent: Deadlines within 7 days`) highlighting immediate closing vacancies.
- **Metrics Dashboard**: Real-time counters for **Total Active Jobs (61)**, **New Jobs Posted (6)**, and **New This Week (40)**.
- **Strict Navigation Rule**: All cards feature **`View Details`** amber buttons (`#f59e0b`) — no premature "Apply Now" dead ends.
- **New Jobs Today Feed**: Immediate listings from agencies like the Office of Civil Defense (OCD-DND Region 8).
- **Top Hiring Agencies**: Philippine Information Agency (PIA), Department of Environment and Natural Resources (DENR), Jose B. Lingad Memorial General Hospital (JBLMGH), OCD-DND, and National Authority for Child Care (NACC).
- **Browse by Region**: Quick filter pills across all 17 administrative regions (NCR, CAR, BARMM, Regions 1–13).

### 5. 📄 Government Job Details & Application Letter Studio
- **Comprehensive Job Breakdown**:
  - Full Qualification Standards (Education, Training, Experience, Eligibility, Core Competencies).
  - Complete Documents Checklist (Signed application letter, CS Form 212 Revised 2026, WES, TOR/Diploma, Certificates).
  - Addressee Information (Regional Executive Director / Appointing Authority, official office address, hotline, email).
  - CSC Warning Note: *"APPLICATIONS WITH INCOMPLETE DOCUMENTS SHALL NOT BE ENTERTAINED."*
- **Instant Application Letter Studio**:
  - Pre-filled with Position Title, Salary Grade, Item Number, Agency, and Addressee.
  - **3 Tailored Letter Versions**:
    - *Version 1*: Brief and straight to the point.
    - *Version 2*: Professional & Qualifications Focused.
    - *Version 3*: Public Service Commitment & Impact Driven.
  - **Interactive Relevant Skills Pills**: Toggle job-specific skill pills that dynamically weave into letter prose in real-time.
  - **Export Formats**: Instant TXT and print-ready PDF export.
  - **Seamless Workspace Transition**: Closing or proceeding from the Letter Studio automatically routes the user directly into `/builder?position=...&agency=...`.

---

## 📌 Project Tasks & Roadmap Checklist

### Completed Tasks
- [x] Full Civil Service Commission CS Form 212 (Revised 2026) 4-page layout and print generator
- [x] Live PDS Mirror Canvas with real-time responsive scaling and zoom
- [x] Smart Auto-Fill & Validation (SSS, GSIS, TIN, PhilHealth, Pag-IBIG, Phone, Salary Currency formatting)
- [x] Date Accomplished full-word formatting and selective page toggle sync
- [x] Digital E-Signature Studio (Draw, Upload with auto-transparent background, WebCam capture with auto-off)
- [x] Passport Photo Studio with Cut-It-Out AI background remover, background swapper, and HD enhancer
- [x] Government Jobs Board with Closing Soon banner, 3 metrics cards (61/6/40), and Regional pills
- [x] Amber `View Details` card button standard
- [x] Job Details Modal with Qualifications, Documents Needed, How to Apply, and Notes
- [x] Government Application Letter Studio with 3 versions, interactive skill pills, and PDF/TXT export
- [x] Automatic redirection from Application Letter Studio into `/builder` PDS workspace
- [x] CodePen Montserrat font and typography matching
- [x] Developer branding in footer with official ZETICUZ logo and attribution: `SITE DEVELOPER BY: ZETICUZ`
- [x] Client-side-first privacy architecture: the whole editor works offline with no account
- [x] Optional accounts with dashboard, project sync, job bookmarks and device job alerts
- [x] Live form frozen and verified on every build (`npm run verify:form`)
- [x] Next.js 16 App Router build optimization with 0 errors

### Future Tasks & Roadmap
- [ ] CSC Job Portal live RSS / GraphQL automated ingestion
- [ ] Work Experience Sheet (WES Annex) PDF automated merger
- [ ] QR Code verification generation on Page 4 for authenticity checks
- [ ] Offline PWA (Progressive Web App) service worker installation support
- [ ] Multi-dialect user guide (Tagalog, Cebuano, Ilocano)
- [ ] Scheduled sweep that turns new agency postings into push notifications for subscribers

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: Tailwind CSS, CSS Grid / Flexbox
- **Icons**: Lucide React
- **Fonts**: Montserrat, Syne, Space Grotesk
- **AI & Image Processing**: `@imgly/background-removal` (WASM / Web Workers), HTML5 Canvas 2D
- **PDF & Export Engine**: `pdf-lib` vector assembly over the official template, Browser Print Engine, Canvas Rendering, Blob Streams
- **State Management**: React 19 client state, offline-first LocalStorage cache, account sync
- **Data**: MongoDB (server-side only), with the official form, calibration and field maps bundled in `src/lib/`

---

## 🔒 Frozen Live Form

The PDS pipeline — `src/lib/pdf.ts`, `pdf-calibration.json`, `pdf-map.json`, `schema.json`, `model.ts` and the bundled `public/csc-2026.pdf` / `.xlsx` — is calibrated by measuring the official form itself. A single retyped coordinate moves ink on a government document, so the whole set is hash-locked:

```bash
npm run verify:form          # fails if any frozen file drifted
npm run verify:form:accept   # re-freeze after an intentional, visually verified change
```

`npm run build` runs the check first, so a drifted form cannot be deployed by accident. To change the form on purpose: make the edit, render the pages, inspect them, then run `verify:form:accept` and commit both the change and the refreshed `src/lib/pdf-lock.json`.

---

## 💻 Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/CareerForm.git
   cd CareerForm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the environment** — copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   | Variable | Needed for | Required? |
   | --- | --- | --- |
   | `MONGODB_URI` | Accounts, projects, bookmarks, notifications | **Yes** — the server refuses to start without it |
   | `MONGODB_DB` | Database name (defaults to `auth_db`) | No |
   | `JWT_SECRET` | Signing session cookies and the OAuth `state` value | **Yes in production** |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | “Continue with Google” | No — the buttons explain that setup is pending until both are set |
   | `RESEND_API_KEY` / `MAIL_FROM` | Welcome mail and password-reset links | No — without it, links are logged to the server console (and returned to the browser in development so the flow stays testable) |

   All of these are server-side only and are never exposed to the browser. **Add the same variables to your hosting provider's environment settings before deploying** — they are deliberately not committed.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Check and build for production**:
   ```bash
   npm run check       # typecheck + frozen-form verification
   npm run build
   npm run start
   ```

---

## ☁️ Deploying to Vercel (Production)

1. **Push the repository** and import it in Vercel (framework preset: **Next.js**; no custom build command is needed).
2. **Environment variables** — add every key from `.env.example` for the *Production* (and *Preview*) environment:
   - `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET` (required)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for Google sign-in)
   - `RESEND_API_KEY`, `MAIL_FROM` (for reset emails)
3. **Authorised origins in Google Cloud Console** → *APIs & Services → Credentials → OAuth client ID (Web application)*:
   - Authorised redirect URIs: `https://<your-domain>/api/auth/google/callback` (plus `http://localhost:3000/api/auth/google/callback` while developing).
   - The consent screen only needs the `openid`, `email` and `profile` scopes, so no Google verification review is required.
4. **Prepare the database** — in your MongoDB host, permit access from anywhere (`0.0.0.0/0`) or from Vercel's egress, then run `node scripts/init-db.mjs` locally against the production URI once to create the indexes (including the unique index on `username`, which is what makes “sign in with a username” unambiguous).

   > **If a database password has ever been committed to this repository, rotate it.** Deleting the file does not remove it from git history: changing the password in your MongoDB host is the only way to invalidate the leaked one.
5. **Deploy.** `npm run build` first runs `verify:form`, so a form that drifted from the frozen baseline fails the deployment instead of shipping.

**What makes it fast in production:** the PDF/XLSX engines, PDF.js and the background-removal model load only when a tool that needs them is opened; the official template assets are served with a one-year immutable cache and a revision token (`TEMPLATE_REVISION`) so returning visitors never re-download them; the CSS field test page and unreferenced assets are not in the bundle; images go through the Next.js optimiser; API responses are `no-store` so nothing stale is ever replayed.

---

## 📜 Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run check` | Typecheck plus frozen-form verification |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify:form` | Fail if the calibrated PDF pipeline drifted |
| `npm run verify:form:accept` | Re-freeze the live form after an intended change |
| `npm run verify:accounts` | Drive every account flow against a running server and a real database, then clean up (see *Verifying accounts*) |
| `node scripts/init-db.mjs` | Create the account/document indexes. Safe to re-run on a live database; it never drops or deletes anything |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright end-to-end suite |

### Verifying accounts

`scripts/verify-account-flows.ts` is the acceptance test for everything above. It runs
against a real server and a real database — no mocks — and deletes the throwaway account
it creates when it finishes:

```bash
npm run build
npm run start -- -p 3000          # in one terminal
npm run verify:accounts            # in another
```

It covers: page rendering and the brand mark, the absence of GitHub links and vendor
branding, security headers, sign-up validation (weak password, mismatched confirmation,
invalid username, duplicate email/username), the Site Updates & Patch Notes notification
and its idempotency, sign-in by username and by email, wrong-password and unknown-account
rejection, session scoping, authenticator setup / enable / require / verify / backup code
with reuse prevention, forgot-password and reset-token expiry plus replay prevention,
password change, the Google entry point and a forged OAuth callback, and finally reads
MongoDB directly to confirm the account, notification and session rows are really stored.

---

## 👤 Developer Attribution

- **Developed by**: **ZETICUZ**
- **Website**: [CareerForm PH](https://CareerForm-PH.vercel.app)
- **Developer Attribution**: `SITE DEVELOPER BY: ZETICUZ`

---

## ⚖️ Disclaimer

*CareerForm PH is an independent, open-source productivity tool developed by ZETICUZ for Filipino civil service applicants. It is not officially affiliated with, endorsed by, or operated by the Civil Service Commission (CSC) of the Republic of the Philippines. All trademarks and official forms belong to their respective government entities.*
