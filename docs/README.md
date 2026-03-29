# MapCopy

A minimal alternative keyboard layout for 12 physical keys, covering all 144 character combinations through two-key pairs. Comes with a MonkeyType-style typing trainer deployable on GitHub Pages.

---

## The Idea

Instead of a full keyboard, MapCopy uses a 4×3 grid of 12 keys. Every character is typed as a two-key sequence: the first key selects a character list, the second key selects which character from that list based on its grid position. No cycling, no modes, no held modifiers.

12 keys × 12 possible second keys = **144 unique characters** — enough for all printable ASCII, common symbols, F-keys, nav keys, and Ctrl shortcuts.

---

## Key Grid

```
u  i  o  p      ← top row
j  k  l  ö      ← home row
n  m  ,  .      ← bottom row
```

**Space** — commits the pending character (or duplicates the last one if idle).
**Backspace** — cancels a pending key, or deletes the last committed character.

---

## Quick Start

```bash
# Clone
git clone https://github.com/<user>/mapcopy-web
cd mapcopy-web

# Open in browser (no build step needed)
open index.html

# Or serve locally
npx serve .
```

---

## Docs

All documentation lives in `docs/`:

| File | Contents |
|---|---|
| [LOGIC.md](LOGIC.md) | Algorithm, index formula, full character layout |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, file structure, tech stack, roadmap |
| [STATUS.md](STATUS.md) | Current state and next step |
| [CHANGELOG.md](CHANGELOG.md) | Session-by-session progress log |
| [DECISIONS.md](DECISIONS.md) | Why things are the way they are |

---

## Layout Verification

The canonical layout is defined in `docs/mapcopy_layout.py` and output to `docs/layout.json`.

```bash
python3 docs/mapcopy_layout.py
# Prints the full 12×12 matrix and confirms zero duplicates
```

---

## Status

Pre-implementation. Design and algorithm are complete. See [STATUS.md](STATUS.md).

---

*Inspired by T9. Built for keyboards with fewer keys, or just a preference for chording.*
