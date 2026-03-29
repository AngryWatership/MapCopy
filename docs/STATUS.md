# STATUS.md
> Overwrite this file at the start of each session to reflect current state.
> For history see [CHANGELOG.md](CHANGELOG.md).

---

## Current State

**Phase: Implementation started — core files built, ready to commit**
**Repo: https://github.com/AngryWatership/MapCopy**
**Local: /mnt/c/Users/PC MAROC/projects/MapCopy (WSL)**
**Live: https://angrywatership.github.io/MapCopy (after first deploy)**

---

## What Is Done

- [x] Algorithm fully specified and verified (see [LOGIC.md](LOGIC.md))
- [x] Zero-duplicate 144-char layout generated (`docs/mapcopy_layout.py` + `docs/layout.json`)
- [x] `src/engine/KeyEngine.js` — pure state machine, no DOM
- [x] `src/engine/Layout.js` — loader + validator
- [x] `src/app.js` — bootstrap, DOM wiring, both views
- [x] `index.html` + `style.css` — shell + dark utilitarian theme
- [x] `tests/KeyEngine.test.js` — full 144-pair matrix verification + state machine tests
- [x] `.github/workflows/deploy.yml` — test then deploy to GitHub Pages on push to main
- [x] `package.json` — Jest only, no bundler
- [x] All seven `docs/` files current

---

## What Is Not Done

- [ ] Files not yet committed to repo
- [ ] GitHub Pages not yet enabled in repo settings
- [ ] `Stats.js` — WPM / accuracy (Phase 2)
- [ ] `TypingArea.js` — typing test mode (Phase 2)
- [ ] Word list (Phase 2)
- [ ] `ö` trigger — remap decision for non-Nordic keyboards still open

---

## Next Step — Action Required From You

**Commit the files and enable GitHub Pages.**

```bash
# Clone first (one time only)
git clone https://github.com/AngryWatership/MapCopy.git "/mnt/c/Users/PC MAROC/projects/MapCopy"
cd "/mnt/c/Users/PC MAROC/projects/MapCopy"

# Copy all project files here, then:
npm install
npm test
git add .
git commit -m "feat: initial implementation — engine, layout, shell, tests, CI"
git push origin main
```

Then in GitHub repo settings:
- Settings → Pages → Source → **GitHub Actions**

Live URL after first successful deploy:
`https://angrywatership.github.io/MapCopy`

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | `ö` key — remap to a standard key for non-Nordic keyboards? | Open |
| 2 | Cross-row second key — commits first at idx 0, second becomes pending | Confirmed |
| 3 | Shortcut execution — `^C` fires browser shortcut or outputs string? | Open |
| 4 | Word list language — English only for v1? | Open |

---

*Last updated: session 1 — implementation*
