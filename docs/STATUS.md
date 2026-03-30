# STATUS.md
> Overwrite this file at the start of each session to reflect current state.
> For history see [CHANGELOG.md](CHANGELOG.md).

---

## Current State

**Phase: v0.0.2 built — ready to deploy**
**Repo:  https://github.com/AngryWatership/MapCopy**
**Tag:   v0.0.1 (v0.0.2 pending)**
**Local: /mnt/c/Users/PC MAROC/projects/MapCopy (WSL)**
**Live:  https://angrywatership.github.io/MapCopy**

---

## What Is Done

- [x] Engine, layout, 167/167 tests, CI pipeline
- [x] Site live at v0.0.1
- [x] `words/en-200.json` — 200-word list
- [x] `src/ui/Stats.js` — WPM + accuracy
- [x] `src/ui/StatsBar.js` — live HUD
- [x] `src/ui/TypingArea.js` — word prompt, push/pop API, 75ms green flash
- [x] `src/app.js` — clean rewrite: textarea I/O, token dispatch, modes
- [x] `index.html` — textarea output field, test/results/stats sections
- [x] `style.css` — textarea styles, typing char classes, tc-flash
- [x] MapCopy mode — engine drives textarea, all native input blocked
- [x] Regular mode — full native textarea, stats tracked in open mode
- [x] Test mode — word prompt active, WPM vs target
- [x] Open mode — free writing, WPM tracked, results on restart
- [x] Special tokens (SP, TAB, ENT, BS, DEL, ESC, nav) → real textarea effects
- [x] Training / type view toggle — keyboard display only, all features available in both

---

## What Is Not Done

- [ ] Deploy v0.0.2 — **action required (see below)**
- [ ] `ö` trigger — non-Nordic keyboard remapping (open)
- [ ] Layout editor / remapping UI (Phase 3)
- [ ] Measurement session / optimiser (VISION.md)

---

## Next Step — Action Required From You

Run `mapcopy_git.sh`, then:
```bash
cd "/mnt/c/Users/PC MAROC/projects/MapCopy"
git push origin main
git tag -a v0.0.2 -m "Phase 2: typing test, open mode, textarea output, token dispatch"
git push origin v0.0.2
```

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | `ö` key — remap for non-Nordic keyboards? | Open |
| 2 | `^C` etc. — fire OS shortcut or output token string? | Open |
| 3 | Word list language — English only for v1? | Open |

---

*Last updated: session 1 end — v0.0.2 ready to deploy*
