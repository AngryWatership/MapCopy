# CHANGELOG.md
> Append-only. One entry per session. Most recent at top.
> For current state see [STATUS.md](STATUS.md).

---

## v0.0.2 — Phase 2: typing test

- `words/en-200.json` — 200 common English words
- `src/ui/Stats.js` — WPM (rolling 10s window) + accuracy tracking
- `src/ui/TypingArea.js` — char-level diff renderer, stepBack support
- `src/ui/StatsBar.js` — live HUD updating every 250ms
- Results screen: WPM, accuracy, total chars, elapsed time
- `index.html` — test section + results section added
- `src/app.js` — full typing test lifecycle wired
- `style.css` — Phase 2 styles appended

---

## v0.0.1 — Site live

- GitHub Pages enabled, deploy pipeline confirmed working
- `mapcopy_git.sh` — deploy script stabilised, pure filename-based lookup table
- 167/167 tests passing on push
- Site live: https://angrywatership.github.io/MapCopy

---

## v0.0.1 — Session 1 ship

### Shipped
- `src/engine/KeyEngine.js` — pure state machine, 2D index formula, all special keys
- `src/engine/Layout.js` — loader + duplicate validator
- `src/app.js` — bootstrap, DOM wiring, training + mature views, physical keyboard
- `index.html` + `style.css` — shell
- `tests/KeyEngine.test.js` — 167 tests, 167 passing (144-pair matrix + state machine + layout validation)
- `docs/` — all seven md files, `layout.json`, `mapcopy_layout.py`
- `.github/workflows/deploy.yml` — test → deploy pipeline
- `git.sh` — deploy script (Downloads → repo → commit)
- Tagged: v0.0.1

### Fixed during session
- Jest config: removed `extensionsToTreatAsEsm` (invalid for `.js` with `"type":"module"`)
- Test file: `require()` replaced with ES module `import`
- Test file: wrong expected values in examples block (comments had eaten commas via sed)
- Formula sign bug from original Python confirmed corrected

---

## Session 1 — Design & Specification

### Algorithm
- Reverse-engineered the original `mapcopy.py` formula through iterative Q&A
- Corrected sign bug: formula is `(col_B - col_A + 4) % 4`, original had it inverted
- Confirmed two-key-pair model: no cycling, first key = selector, second key = picker
- Confirmed special key behaviours: space commits at idx 0 or duplicates, backspace cancels pending only

### Layout
- Expanded from 3-row × 4-key × 4-char (48 slots) to 4-col × 3-row × 12-char (144 slots)
- Extended index formula to 2D: `idx = row_off * 4 + col_off`
- Added bottom row: `n m , .` for digits and symbols
- Identified 16 duplicate slots in home-row cross pairs; replaced with Ctrl shortcuts
- Final result: 144 unique characters, zero duplicates, full printable ASCII coverage
- Confirmed visual band order: 1, 0, −1 (row above / same row / row below)

### Vision
- Project named MapCopy
- Measurement model defined: L1 + L2 latencies, harmonic sweep for rhythm
- All cost inferred from latency only — no anatomical assumptions
- Phase A (measure) / Phase B (optimise) loop defined
- Driver failsafe: hold Escape 3 seconds
- Commercial possibility noted

### Artefacts produced
- `mapcopy_layout.py` — canonical layout generator + verifier
- `layout.json` — generated character map (144 unique entries)
- Interactive browser demo: training view + mature view, physical keyboard wired
- `docs/` folder: README.md, ARCHITECTURE.md, LOGIC.md, STATUS.md, CHANGELOG.md, DECISIONS.md, VISION.md

---

*Format: add new sessions above this line*
