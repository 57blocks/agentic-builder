# T8 — Manual Integration Acceptance: demo HTML capture

**Branch:** feat/demo-prototype · **Scope:** sub-project 1 (capture foundation)

This is the ONE end-to-end check the static review could not cover: that capturing a
real Vite SPA (`csma-demo2`) actually produces a usable self-contained HTML snapshot.
Capture uses Electron `renderReferenceUrl`, so it **must run in the desktop app** (not
a browser/headless run).

## 0. Run the code (it lives on `feat/demo-prototype`)

Pick one:
- **From the worktree that already has the branch:**
  `cd .claude/worktrees/reverent-booth-c1b020 && npm run electron:dev`
- **Or in your main repo:** check out the branch first, then `npm run electron:dev`
  (the branch is currently checked out in the worktree above — free it or use the worktree path).

The desktop app opens once `wait-on http://localhost:3000` succeeds.

## 1. Set up a project

- Open (or create) a project whose **PRD declares page routes** and whose design-reference
  **entry/demo URL is `https://csma-demo2.vercel.app/auth`**.
- Go to the **Design** step → **Reference Screenshots / Route Mapping** panel.

## 2. Run the capture

- Use **"auto-capture from one entry URL"** with `https://csma-demo2.vercel.app/auth`.
- Wait for the route cards to fill (matching spinners settle).

## 3. Acceptance checks

Let `DIR = .blueprint/projects/<projectId>/design-references/` (in the project's output tree).

- [ ] **A. Two artifacts per page.** Open `DIR/manifest.json`. For each captured PRD page,
      expect **two entries sharing one `pageHint`** (e.g. `PAGE-003`): one `kind:"image"`
      (`*.jpg`) + one `kind:"html"` (`*.html`).
      Quick check: `grep -c '"kind": "html"' DIR/manifest.json` is > 0 and ≈ the number of
      captured pages.
- [ ] **B. Snapshot renders.** Open one `DIR/*.html` in a browser. Layout + styling should
      resemble the live page (Tailwind classes + inlined `<style>`), scripts inert. (Minor:
      a relative `srcset` image/font may 404 — known limitation; layout should still hold.)
- [ ] **C. CSS actually inlined.** That `.html` contains a non-empty
      `<style data-reference-inlined>` block. Empty → the demo's stylesheet was read as
      cross-origin and skipped (for csma-demo2 it is same-origin, so it SHOULD populate).
- [ ] **D. Role-gate safety.** Role-gated pages (e.g. `/teacher/*`, `/admin/*`) capture the
      correct page (session seeding works); a page that redirects to login does NOT get a
      wrong-page `.html` bound to its `PAGE-id` (no mismatched pageHint in the manifest).
- [ ] **E. Isolation (the "don't break the old flow" check).** Open/create a project with
      **no demo URL**, run the normal flow → confirm nothing new is captured and the existing
      screenshot-only behavior is unchanged.

## Troubleshooting

- **No `html` entries appear** → open the app DevTools console; look for
  `[DesignUI] html snapshot persist failed …` warnings, or an Electron-side `htmlCapture`
  that came back `null` (check the `render-reference-url` logs). The screenshot still binds
  regardless — so an image-only result means the HTML leg failed, not the whole capture.
- **`<style data-reference-inlined>` empty** → the page's stylesheets were treated as
  cross-origin (skipped). Expected to be populated for the same-origin csma-demo2 bundle.

## Pass criteria

A + B + C + E all hold → the capture foundation is validated on the real demo → green light
to implement sub-project 2 (the prototype step). D is a correctness guard; a failure there is
a bug to fix before building on top.
