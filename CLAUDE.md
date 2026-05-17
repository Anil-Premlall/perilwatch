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

## Current State
- Site is intentionally tiny right now: homepage + privacy/terms/cookies. Functions primarily as a brand/parent page for the LiabilityScore network.
- **Lighthouse CI** runs on every push/PR + manual dispatch. `http-server` + LHCI tests all 4 pages. Asserts a11y >= 0.9 and SEO >= 0.95 (errors); perf/best-practices warn-only. Reports as 14-day GitHub artifacts.
- **PSI scan** on demand via `node scripts/run-psi.js` — reads `PSI_API_KEY` from `C:\ClaudeProjects\.env` (workspace-wide).
- Monthly Content Freshness workflow runs on cron (set up like sister projects).
- `_headers` recently dropped `X-XSS-Protection` (commit `30cc0b1`); sitemap fixed to include all pages (`308028d`).

## Open Questions / Next Steps
- Decide whether perilwatch grows beyond a brand/landing page or stays minimal. If it stays minimal, current setup is sufficient.
- First LHCI run will baseline scores; investigate any a11y/SEO failures.
- **Homepage mobile perf** — re-run PSI after CF Pages redeploys the GTM defer. Expected 68 → 90+. If still under 90, look at hero asset / render-blocking CSS as the next layer.

## Session Log
### 2026-05-04
- CLAUDE.md scaffolded as part of mirroring the CI/PSI pattern across all sister projects.
- Added `.github/workflows/lighthouse.yml`, `lighthouserc.json` (4-URL coverage = whole site), and `scripts/run-psi.js` (commit `151683a`). PSI key shared via `C:\ClaudeProjects\.env` — see workspace memory `reference_workspace_env.md`. Same per-push assertions as the other static sites.
- First PSI scan: homepage mobile perf is **68** (LCP 4.0s, TBT 800ms) — biggest fixable issue. `/terms.html` mobile is 76 (LCP 4.5s, FCP 3.6s). All `.html` URLs were paying a 308 redirect cost (CF Pages strips extensions); updated PSI URL list to canonical paths (commit `94490d4`).

### 2026-05-05
- **GTM defer shipped** (commit `547f716` via `scripts/defer-gtm.js`). Same fix as the sister sites — wrapped the inline GTM IIFE in `window.addEventListener('load', …)` so the 278 KiB GTM payload no longer blocks FCP/LCP. Applied to all 4 HTML files. Expected homepage mobile perf 68 → 90+ once CF Pages redeploys. Cost: pageviews <500ms miss tracking.
