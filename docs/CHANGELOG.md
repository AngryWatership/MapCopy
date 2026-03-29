# CHANGELOG.md
> Append-only. One entry per session. Most recent at top.
> For current state see [STATUS.md](STATUS.md).

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
