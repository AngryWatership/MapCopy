# STATUS.md
> Overwrite this file at the start of each session to reflect current state.
> For history see [CHANGELOG.md](CHANGELOG.md).

---

## Current State

**Phase: v0.0.3 built — ready to deploy**
**Repo:  https://github.com/AngryWatership/MapCopy**
**Tag:   v0.0.2**
**Local: /mnt/c/Users/PC MAROC/projects/MapCopy (WSL)**
**Live:  https://angrywatership.github.io/MapCopy**

---

## What Is Done

- [x] v0.0.1 — engine, layout, 167/167 tests, CI, site live
- [x] v0.0.2 — typing test, open mode, textarea output, token dispatch, regular/test toggles
- [x] v0.0.3 — layout editor (dblclick to edit, Enter to commit), localStorage, JSON import/export, reset to default

---

## What Is Not Done

- [ ] Deploy v0.0.3 — action required
- [ ] `ö` trigger — non-Nordic keyboard remapping (open)
- [ ] Measurement session / optimiser (VISION.md)

---

## Next Step

**Deploy v0.0.3.**

Run `mapcopy_git.sh`, then:
```bash
cd "/mnt/c/Users/PC MAROC/projects/MapCopy"
git push origin main
git tag -a v0.0.3 -m "Phase 3: layout editor, localStorage, JSON import/export"
git push origin v0.0.3
```

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | `ö` key — remap for non-Nordic keyboards? | Open |
| 2 | `^C` etc. — fire OS shortcut or output token string? | Open |
| 3 | Word list language — English only for v1? | Open |

---

*Last updated: session 2 — v0.0.3 built, awaiting deploy*
