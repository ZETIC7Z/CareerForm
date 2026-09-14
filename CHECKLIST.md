# Zeticuz PDS Builder — implementation checklist

- [x] Inspect empty workspace and locate SAM_PDS_RECORD.csv (Desktop/PDS_Automation; private, excluded from Git).
- [x] Verify CSC Revised 2026 publication and retrieve CodeKiwi toggle source.
- [x] Download and inspect official 2026 template; document provenance (see TEMPLATE-SOURCES.md).
- [x] Scaffold Next.js / React / TypeScript / Tailwind; verify local page.
- [x] Build responsive dark-first editor and original CodePen toggle; verify themes.
- [x] Implement full PDS schema, repeaters, validation and local drafts; verify inputs.
- [x] Map official PDF, render live mirror and export; verify every page.
- [x] Implement reviewed CSV / XLSX / PDF import; test actual SAM CSV (177 mapped values, all assertions pass).
- [x] Build editable application letters and PDF export; verify (scripts/test-letter.ts, scripts/ssr-check.ts).
- [x] Run production build, import regressions and browser checks (npm run build ✓ · eslint ✓ · tsc ✓ · HTTP 200 served ✓).
- [x] Prepare Vercel documentation (see DEPLOY.md); pushing to GitHub is left to the owner (DEPLOY.md §2).
- [x] Re-verification pass: all regression scripts, tsc, eslint (0 errors, 0 warnings) and production build confirmed green; vendored PDF worker excluded from lint.
- [x] Stabilize the E2E suite: live-preview badge now shows SYNCING until a real canvas render exists (was LIVE from SSR markup), canvas test waits on the badge, one Playwright retry locally / two in CI, and the intro safety timer satisfies prefer-const. Full suite 6/6 green, regression scripts green, production build green.
- [x] VeriWorkly-style workspace rebuild (user-prioritized): (1) live PDS preview replaced with a drag-to-pan canvas stage + zoom livebar (zoom out / % / zoom in / fit / reset, arrow-key pan, Shift for large steps, Home recentres) modeled on VeriWorkly's MIT DocumentEditorShell; no scrollbar — you drag the sheet itself. (2) The workspace is now a fixed-height app frame: the page never scrolls, ONLY the left form column scrolls, so the live mirror stays pinned while typing. (3) VeriWorkly-style toolbar chrome: back arrow, document title + saved state, Save / Export / Actions buttons, letters + clear kept as icon buttons. (4) New-document create modal (Create PDS / Cover letter / Import from file) shown on a truly fresh start and from the workspace button. (5) Pages rail stays atop the content column; no extra right panel. Full suite 6/6 green, regressions green, production build green (all routes static, Vercel-ready).

Reference images were not present in the workspace or common user folders at initial inspection.
