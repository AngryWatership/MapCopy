# STATUS.md
> Overwrite this file at the start of each session to reflect current state.
> For history see [CHANGELOG.md](CHANGELOG.md).

---

## Current State

**Phase: v0.0.5 built — ready to deploy**
**Repo:  https://github.com/AngryWatership/MapCopy**
**Tag:   v0.0.4**
**Local: /mnt/c/Users/PC MAROC/projects/MapCopy (WSL)**
**Live:  https://angrywatership.github.io/MapCopy**

---

## What Is Done

- [x] v0.0.1 — engine, layout, 167/167 tests, CI, site live
- [x] v0.0.2 — typing test, open mode, textarea output, token dispatch, regular/test toggles
- [x] v0.0.3 — layout editor (dblclick to edit, Enter to commit), localStorage, JSON import/export, reset to default

---

## What Is Not Done

- [x] v0.0.4 deployed and live
- [x] v0.0.5 — measurement session, harmonic sweep, L1/L2 recording, cost matrix, session export
- [ ] `ö` trigger — non-Nordic keyboard remapping (open)
- [x] Measurement session (Phase A from VISION.md)
- [ ] Phase B — optimiser (assign chars to pairs by cost × frequency)
- [ ] `ö` trigger — non-Nordic keyboard remapping (open)

---

## Next Step

**Deploy v0.0.5.**

Run `mapcopy_git.sh`, then:
```bash
cd "/mnt/c/Users/PC MAROC/projects/MapCopy"
git push origin main
git tag -a v0.0.5 -m "Phase 4: measurement session, harmonic sweep, cost matrix"
git push origin v0.0.5
```

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | `ö` key — remap for non-Nordic keyboards? | Open |
| 2 | `^C` etc. — fire OS shortcut or output token string? | Open |
| 3 | Word list language — English only for v1? | Open |

---

*Last updated: session 2 — v0.0.5 built, awaiting deploy*
