# SESSION START — READ FIRST

Before taking any action in this session, complete these checks. Skipping them has caused real damage. No exceptions.

## 1. Discover the canonical state

This project is part of a five-repo ecosystem:
- liabilityscore-app (Next.js app)
- liabilityscore-foundation (standing rules, style guides, compliance docs, PARKED.md)
- tenantexposure (static SEO site)
- shouldisignthislease (static SEO site)
- perilwatch (static brand/landing site — PerilWatch™ parent brand)

Canonical references live in liabilityscore-foundation. The app repo has its own scoped audits and triage docs. **Same filename in two repos does not mean drift — it usually means two valid scopes.**

Before reporting that a file "does not exist," check:
- The current repo
- liabilityscore-foundation (for standing rules and canonical docs)
- The other four project repos if cross-repo context is involved

## 2. Hard stop conditions

The following actions require explicit user confirmation before proceeding. Do not execute, do not propose execution, do not bundle into a "do these five things" prompt:

- Editing any file in liabilityscore-foundation referenced by other repos
- Renaming, deleting, or repointing references to any of these canonical files:
  - UPL_COMPLIANCE.md
  - MASTER_STYLE_GUIDE.md
  - README.md (any repo)
  - PARKED.md
  - CLAUDE.md (any repo)
- Cross-repo find-and-replace operations
- Mass deletion or mass renaming (>3 files at once)
- Any operation that would orphan a doc referenced from another repo

When a hard stop fires, surface the proposed action, list what would change, and wait for user direction. The user will either confirm, redirect, or cancel.

## 3. State the assumption before acting

For any non-trivial task, state the assumption being acted on in one sentence before executing. Example: "Acting on the assumption that UPL_COMPLIANCE.md should be renamed because the app-repo audit reported it missing." If the assumption is wrong, the user catches it before damage is done.

## 4. Two-commit hygiene still applies

No bundling unrelated changes. Infrastructure work before QA. One logical change per commit.

## 5. PARKED.md discipline

Trigger-based conditions only, not gut feel. When a trigger fires, copy the entry to a GitHub Issue and delete from file. Do not add items to PARKED.md without a concrete trigger condition.

## 6. Project state vs. cross-project preferences

CLAUDE.md owns project state. Claude memory (Anthropic's memory system) owns cross-project preferences and habits. Do not duplicate cross-project preferences into CLAUDE.md, and do not put project state into Claude memory.

---

# perilwatch

## Purpose
Static brand/landing site for PerilWatch™, the parent brand for the LiabilityScore™ network. Currently minimal — homepage + legal pages.

## Stack
- Static HTML/CSS/JS (no framework)
- `/css/`, `/js/`, `/assets/`
- `_headers` file (Cloudflare Pages security/cache headers)
- GitHub Actions: `.github/workflows/monthly-freshness.yml`, `.github/workflows/lighthouse.yml`
- `llms.txt`, `robots.txt`, `sitemap.xml` shipped

## Structure
- `index.html` — homepage
- `privacy.html`, `terms.html`, `cookies.html` — legal trio
- `favicon.svg`
- 4 pages total (per sitemap.xml)

## Conventions
- Uses ™ on every "PerilWatch" instance (per recent commit `10fde61`)
- **UPL voice rule applies to all user-facing marketing copy** (homepage, landing pages, anything in the parent-brand surface area). Observational voice, never directive. No "you should", "push back on", "negotiate from strength", "do not sign". Source of truth: `liabilityscore-foundation/UPL_COMPLIANCE.md` (north-star sentence + voice test + forbidden-phrase list). PerilWatch had been overlooked in prior UPL sweeps because the workspace docs didn't list it as a workspace repo — fixed 2026-05-17.

## Connections
> Concrete IDs/slugs for every external system this project talks to. Update via `/wrap connections` whenever a connection is added, removed, or repointed. Do not touch otherwise.

### Repository
- GitHub: `Anil-Premlall/perilwatch` (default branch `main`)
- Workspace path: `C:\ClaudeProjects\perilwatch`

### Hosting (Cloudflare Pages)
- Production URL: https://perilwatch.com
- `_headers` carries security/cache headers (X-XSS-Protection dropped 2026-05-04 in `30cc0b1`)
- Auto-deploys from `main`
- Cloudflare account / Pages project name: GAP — fill from CF dashboard

### Analytics
- GTM container: `GTM-TNNKFWLQ` (shared across the 3 satellite sites)
- GA4 measurement ID: GAP — fill from GTM tag config
- Google Search Console property: `perilwatch.com` (verified)

### CI (GitHub Actions)
- `.github/workflows/lighthouse.yml` — push/PR/manual-dispatch, all 4 pages (full site coverage)
- `.github/workflows/monthly-freshness.yml` — cron set up like sister projects
- PSI on demand via `node scripts/run-psi.js` — reads `PSI_API_KEY` from `C:\ClaudeProjects\.env`

### MCP / tooling wired to this project
- No project-specific MCP. Operates via direct git + GitHub Actions + Cloudflare Pages auto-deploy

### Environment variables
- No runtime env (static site)
- Workspace-shared: `C:\ClaudeProjects\.env` for `PSI_API_KEY`

### Gaps to fill
- [ ] Cloudflare account + Pages project name
- [ ] GA4 measurement ID (configured inside the GTM container)

## Current State
- Site is intentionally tiny right now: homepage + privacy/terms/cookies. Functions primarily as a brand/parent page for the LiabilityScore network.
- **Lighthouse CI** runs on every push/PR + manual dispatch. `http-server` + LHCI tests all 4 pages. Asserts a11y >= 0.9 and SEO >= 0.95 (errors); perf/best-practices warn-only. Reports as 14-day GitHub artifacts.
- **PSI scan** on demand via `node scripts/run-psi.js` — reads `PSI_API_KEY` from `C:\ClaudeProjects\.env` (workspace-wide).
- Monthly Content Freshness workflow runs on cron (set up like sister projects).
- `_headers` recently dropped `X-XSS-Protection` (commit `30cc0b1`); sitemap fixed to include all pages (`308028d`).
- **SESSION START block prepended to CLAUDE.md (2026-05-17, `bfb1573`).** First time CLAUDE.md is git-tracked in this repo. Same 6-section block as the 4 sister repos, updated to reference the 5-repo ecosystem (including this repo).
- **UPL voice cleanup shipped on homepage (2026-05-17, `7768b53`).** 3 directive phrases reframed to observational voice: hero subtitle ("you need to watch out for" → "drive contract risk"), step 4 title ("Negotiate from strength" → "See where leverage lives"), step 4 body ("clauses to push back on" → "clauses negotiated versions of this contract type commonly revise"). Privacy/cookies "you should" lines audited and intentionally left untouched (those describe reader privacy choices, not contract-signing advice).

## Open Questions / Next Steps
- Decide whether perilwatch grows beyond a brand/landing page or stays minimal. If it stays minimal, current setup is sufficient.
- First LHCI run will baseline scores; investigate any a11y/SEO failures.
- **Homepage mobile perf** — re-run PSI after CF Pages redeploys the GTM defer. Expected 68 → 90+. If still under 90, look at hero asset / render-blocking CSS as the next layer.

## Session Log
### 2026-05-17
- **UPL voice cleanup PR shipped + merged on homepage (`06c7c82` → merged as `7768b53`).** 3 violations on `index.html`: (1) hero subtitle "clauses you need to watch out for" → "clauses that drive contract risk"; (2) step 4 title "Negotiate from strength" → "See where leverage lives"; (3) step 4 body "Know exactly which clauses to push back on — and why — before you sign anything" → "See which clauses negotiated versions of this contract type commonly revise — and the reasoning behind each". Branch `voice/upl-homepage-cleanup` deleted local + origin post-merge.
- **SESSION START block prepended to CLAUDE.md (`bfb1573`).** First time CLAUDE.md is git-tracked in this repo. Same 6-section block as the 4 sister repos, with `§1` updated to enumerate the 5-repo ecosystem (added perilwatch as the 5th).
- **Pattern parity restored across the 5-repo workspace.** Prior workspace docs listed only 4 repos, which caused PerilWatch to be skipped in prior UPL sweeps and audits. Surfaced when a sister-property audit prompt asked "did you scan perilwatch?" — the answer was no, because the workspace doc said it wasn't there. Identical `§1` "five-repo ecosystem" change applied to all 5 repos' SESSION START blocks plus added to the workspace `.claude/CLAUDE.md` "Active subprojects" list.

### 2026-05-04
- CLAUDE.md scaffolded as part of mirroring the CI/PSI pattern across all sister projects.
- Added `.github/workflows/lighthouse.yml`, `lighthouserc.json` (4-URL coverage = whole site), and `scripts/run-psi.js` (commit `151683a`). PSI key shared via `C:\ClaudeProjects\.env` — see workspace memory `reference_workspace_env.md`. Same per-push assertions as the other static sites.
- First PSI scan: homepage mobile perf is **68** (LCP 4.0s, TBT 800ms) — biggest fixable issue. `/terms.html` mobile is 76 (LCP 4.5s, FCP 3.6s). All `.html` URLs were paying a 308 redirect cost (CF Pages strips extensions); updated PSI URL list to canonical paths (commit `94490d4`).

### 2026-05-05
- **GTM defer shipped** (commit `547f716` via `scripts/defer-gtm.js`). Same fix as the sister sites — wrapped the inline GTM IIFE in `window.addEventListener('load', …)` so the 278 KiB GTM payload no longer blocks FCP/LCP. Applied to all 4 HTML files. Expected homepage mobile perf 68 → 90+ once CF Pages redeploys. Cost: pageviews <500ms miss tracking.
