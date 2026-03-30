# STATUS.md
> Overwrite this file at the start of each session to reflect current state.
> For history see [CHANGELOG.md](CHANGELOG.md).

---

## Current State

**Phase: v0.0.2 — Phase 2 built, ready to deploy**
**Repo:  https://github.com/AngryWatership/MapCopy**
**Tag:   v0.0.1 (v0.0.2 pending deploy)**
**Local: /mnt/c/Users/PC MAROC/projects/MapCopy (WSL)**
**Live:  https://angrywatership.github.io/MapCopy**

---

## What Is Done

- [x] Algorithm specified, sign bug corrected, formula verified
- [x] 144-slot zero-duplicate layout — all printable ASCII + specials + F-keys + shortcuts
- [x] `docs/mapcopy_layout.py` + `docs/layout.json` — canonical source + generated output
- [x] `src/engine/KeyEngine.js` — pure state machine, no DOM
- [x] `src/engine/Layout.js` — loader + duplicate validator
- [x] `src/app.js` — bootstrap, training view, mature view, physical keyboard wiring
- [x] `index.html` + `style.css` — shell
- [x] `tests/KeyEngine.test.js` — 167/167 passing
- [x] `.github/workflows/deploy.yml` — test → deploy pipeline
- [x] `mapcopy_git.sh` — zip deploy script, filename-based lookup table
- [x] All seven `docs/` md files current
- [x] Site live at https://angrywatership.github.io/MapCopy
- [x] v0.0.1 tagged and pushed

---

## What Is Done (Phase 2 additions)

- [x] `words/en-200.json` — 200-word list
- [x] `src/ui/TypingArea.js` — char-level diff renderer
- [x] `src/ui/Stats.js` — WPM (rolling window) + accuracy
- [x] `src/ui/StatsBar.js` — live HUD
- [x] Results screen (WPM, accuracy, chars, time)
- [x] `index.html` + `app.js` + `style.css` updated for Phase 2

## What Is Not Done

- [ ] Phase 2 not yet deployed (run `mapcopy_git.sh`)
- [ ] `ö` trigger — remap for non-Nordic keyboards (open question)
- [ ] Layout editor / remapping UI (Phase 3)
- [ ] Measurement session / optimiser (VISION.md)

---

## Next Step

**Deploy Phase 2, then tag v0.0.2.**

Run `mapcopy_git.sh`, then:
```bash
cd "/mnt/c/Users/PC MAROC/projects/MapCopy"
git push origin main
git tag -a v0.0.2 -m "Phase 2: typing test mode — TypingArea, Stats, StatsBar, results screen"
git push origin v0.0.2
```

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | `ö` key — remap for non-Nordic keyboards? | Open |
| 2 | Cross-row second key — commits first at idx 0, second becomes pending | Confirmed |
| 3 | `^C` etc. — fire OS shortcut or output token string? | Open |
| 4 | Word list language — English only for v1? | Open |

---

*Last updated: session 1 — Phase 2 built, awaiting deploy*
