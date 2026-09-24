export interface PatchNote {
  id: string;
  date: string;
  version: string;
  isLatest?: boolean;
  title: string;
  changes: string[];
}

/**
 * Site Patch Notes & Update History.
 * Always kept in reverse chronological order (newest patch at the very top).
 */
export const PATCH_NOTES: PatchNote[] = [
  {
    id: 'patch-2026-09-24-3',
    date: 'Sep 24, 2026',
    version: 'v2.1.0',
    isLatest: true,
    title: 'Google Sign-In, Password Reset & Account Security',
    changes: [
      'New CareerForm identity: the logo mark now replaces the “CareerForm 2026” text in the site header, the workspace headers, the footer and the dashboard',
      'Sign up now asks for a username, a password and a matching confirmation, with a live password-strength meter and a three-point checklist that turns green as the password improves',
      'Sign in with either your username or your email address — one field accepts both',
      'Continue with Google: sign in or sign up in one tap. If the Google address already belongs to a CareerForm account, Google is connected to that same account instead of creating a second one, and your username and password keep working',
      'Forgot password: we email a single-use reset link that expires in 30 minutes; it opens a page to add a new password and confirm it',
      'Authenticator apps (Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden): set one up under Account & Security with a QR code or a typed key, verify it with a 6-digit code, and receive ten single-use backup codes',
      'New Account & Security menu in the dashboard: change or add a password, connect Google, manage the authenticator, and see every sign-in method on the account at a glance',
      'Site Updates & Patch Notes are now delivered to every signed-in member’s notification bell, so new releases reach you without hunting for the home-page box',
      'The home page patch-notes box is more compact, and the space beside it now explains what CareerForm PH is and what a free account unlocks',
      'The Donate / Support control moved into the dashboard rail’s empty space, keeping the account card a single clean row',
      'Removed the developer’s personal code-hosting links from the site',
      'Email service can be switched on with a free provider key — until then, reset links are logged on the server so nothing breaks',
      'Performance & security pass: unused components dropped from the bundle, every credential read from the environment only, a database-credential script removed from the repository, and a documented production deployment',
    ],
  },
  {
    id: 'patch-2026-09-24-2',
    date: 'Sep 24, 2026',
    version: 'v2.0.0',
    title: 'Accounts, Dashboard & Locked Form',
    changes: [
      'New dashboard: dark rail navigation (Overview, Projects, Recent, Bookmarks, Plan, Manage Profile), Home / section breadcrumb, category tabs with live counts and a four-stage project pipeline',
      'Notification bell with an unread badge — new postings, bookmark confirmations and sync receipts land there',
      'Bookmark any government job; saved jobs follow your account and appear in the dashboard Bookmarks tab',
      '“Get Job Alerts” now asks your browser for permission and notifies the device the moment an agency posts a new vacancy',
      'Create Cover Letter directly from the dashboard, side by side with your PDS projects',
      'Builder and dashboard are now one workspace: pick a recent project when you open the builder, or name a new one so it appears on your dashboard',
      'Signing in hands this device\u2019s offline PDS drafts to your account, so work started before you had an account is no longer stranded',
      'Show / hide password control on sign in and sign up',
      'Fixed the /jobs toolbar colliding with the site navigation\u2019s Sign in and Sign up buttons; every route now clears the header',
      'Live form frozen: the calibrated PDF pipeline is hash-locked and verified on every build',
      'Security: database credentials removed from source and read-only from the environment, vendor branding removed from all user-facing surfaces, and every project, bookmark, notification and alert endpoint scoped to the signed-in session',
      'Optimisation: 6 MB of unreferenced test assets and one-off migration scripts removed from the public bundle',
    ],
  },
  {
    id: 'patch-2026-09-24-1',
    date: 'Sep 24, 2026',
    version: 'v1.3.0',
    title: 'Official A4 Form & Live Render Fixes',
    changes: [
      'Official CS Form 212 (Revised 2026) page geometry restored to true A4',
      'Work experience dates now print in full mm/dd/yyyy instead of mm/yyyy',
      'Uploaded signatures are made transparent automatically and stay centred inside their cell on every page',
      'Passport photo placement and per-page signature / date rows corrected',
      'Site background is now a single edge-to-edge animated field on every route',
    ],
  },
  {
    id: 'patch-2026-09-20-3',
    date: 'Sep 20, 2026',
    version: 'v1.2.6',
    title: 'Signature Transparency & Grid Precision',
    changes: [
      'Removed white background block — transparent PNG signatures now preserve 100% alpha transparency on the official form',
      'Auto-resized and centered signature inside cell bounds so ink stays bold and never crosses borders',
      'Restored Vocational / Trade Course horizontal grid line across the entire education section',
      'Added live Site Updates & Patch Notes box to track all releases and improvements',
    ],
  },
  {
    id: 'patch-2026-09-20-2',
    date: 'Sep 20, 2026',
    version: 'v1.2.5',
    title: 'Fullscreen Preview & Export Controls',
    changes: [
      'Added smooth dragging and panning at all zoom levels in Fullscreen Preview',
      'Integrated direct Download PDF & Excel buttons on the preview toolbar',
      'Single-line date auto-fitting down to 4.0pt to prevent awkward text wrapping',
      'Standardized regular Helvetica 5.5pt font across education table levels',
    ],
  },
  {
    id: 'patch-2026-09-20-1',
    date: 'Sep 20, 2026',
    version: 'v1.2.0',
    title: 'Mobile Optimization & Theme Stability',
    changes: [
      'Fully responsive UI layout for mobile, tablet, and desktop viewports',
      'Eliminated theme flicker on page refresh with persistent dark mode',
      'Automatic work experience reverse-chronological sorting',
      'Zero-flicker offscreen canvas rendering pipeline for official PDF mirror',
    ],
  },
];
