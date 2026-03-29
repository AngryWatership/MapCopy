# MapCopy Keyboard — Architecture & Roadmap

> A T9-style alternative keyboard layout tester, targeting a MonkeyType-like web experience deployable on GitHub Pages.

---

## 1. Current Architecture

### 1.1 Overview

The current implementation is a **single-file desktop GUI** built with Python's `tkinter`. It has no persistence, no configuration layer, and no separation of concerns.

```
mapcopy.py
│
├── State (globals)
│   ├── key_press_count: dict      # Tracks how many times each key was pressed
│   ├── ancient_key: str           # Previously pressed key (unused in logic)
│   └── current_char: str         # Last character rendered to text widget
│
├── Data (hardcoded)
│   └── key_alternatives: list    # Static key→character mapping
│
├── Logic
│   └── on_key_press(event)       # Single monolithic handler for all input
│
└── View
    ├── tk.Tk root window
    └── tk.Text widget            # Raw text output area
```

### 1.2 Key Mapping Model

Each physical key maps to a list of output characters. Cycling is index-based (modulo list length). The layout has two conceptual zones:

| Zone | Physical Keys | Purpose |
|---|---|---|
| Alpha/Symbol | `u i o p j k l ö` | Character input (8 keys × 4 chars = 32 chars) |
| Control | `h` | Space / Backspace (2 controls) |

### 1.3 Cycling Logic

- Press count per key is tracked in `key_press_count`.
- On each keypress, the displayed character is **replaced** (delete last, insert new).
- Pressing `Space` **commits** the current character and clears all counters.
- A **row-relative counter adjustment** attempts to sync cycles when switching keys within the same row — this logic is subtle and partially broken (see §4 Known Issues).

### 1.4 Current Weaknesses

| # | Issue | Impact |
|---|---|---|
| 1 | Hardcoded key map | Zero user configurability |
| 2 | Global mutable state | Fragile, not testable |
| 3 | No WPM / accuracy metrics | No feedback loop |
| 4 | No word list / test mode | Can't use as a typing trainer |
| 5 | Desktop-only (tkinter) | Not shareable, not deployable |
| 6 | `ancient_key` is unused | Dead code |
| 7 | Row-relative counter logic | Buggy on edge cases |
| 8 | No persistence | Config lost on close |

---

## 2. Target Architecture — Web App on GitHub Pages

The goal is a **static, zero-backend** web application deployable via GitHub Pages. All configuration lives in JSON (committed or localStorage). The stack is intentionally minimal.

```
/
├── index.html                  # Entry point
├── config/
│   └── layouts/
│       ├── default.json        # Bundled default layout (mapcopy original)
│       └── custom.json         # User-saved layout (gitignored or localStorage)
├── src/
│   ├── engine/
│   │   ├── KeyEngine.js        # Pure state machine — no DOM dependency
│   │   ├── Layout.js           # Layout loader & validator
│   │   └── Stats.js            # WPM, accuracy, streak tracking
│   ├── ui/
│   │   ├── TypingArea.js       # Renders prompt + typed text diff
│   │   ├── KeyboardVisual.js   # On-screen key state display
│   │   ├── StatsBar.js         # Live WPM / accuracy HUD
│   │   └── LayoutEditor.js     # Config UI (drag/remap keys)
│   └── app.js                  # Bootstrap & wiring
├── words/
│   └── en-200.json             # Word list (like MonkeyType)
└── README.md
```

### 2.1 Component Responsibilities

**`KeyEngine.js` — Core State Machine**

The heart of the system. Pure JS, no DOM, fully testable.

```
State:
  pressCount: Map<key, number>
  currentChar: string
  committed: string[]           ← full committed text buffer

Methods:
  press(key) → { display, committed, changed }
  commit()   → { char, newState }
  reset()    → void
  loadLayout(layoutObj) → void
```

**`Layout.js` — Configuration Layer**

Loads and validates a layout JSON schema:

```json
{
  "name": "MapCopy Default",
  "version": "1.0",
  "commitKey": " ",
  "rows": [
    {
      "keys": [
        { "trigger": "u", "chars": ["u","v","w","x"] },
        { "trigger": "i", "chars": ["i","j","k","l"] }
      ]
    }
  ]
}
```

**`Stats.js` — Metrics**

- WPM: rolling 10-second window on committed characters
- Accuracy: committed chars vs backspaces ratio
- Streak: consecutive correct characters against a prompt

**`TypingArea.js` — MonkeyType-like Prompt**

- Renders a target word sequence
- Colors correct / incorrect / pending characters
- Auto-advances through words

**`LayoutEditor.js` — In-browser Config**

- Visual grid of all keys
- Click a key → edit its character list
- Export to JSON / save to localStorage

---

## 3. Upgrade Roadmap

### Phase 0 — Repo & CI Setup *(Day 1)*

- [ ] Create GitHub repo with `main` + `gh-pages` branches
- [ ] Add `index.html` shell, basic `README.md`
- [ ] GitHub Actions: on push to `main` → deploy to `gh-pages`
- [ ] Add ESLint + Prettier config
- [ ] Migrate `mapcopy.py` as `legacy/mapcopy.py` for reference

**Deliverable:** Live empty shell at `https://<user>.github.io/<repo>`

---

### Phase 1 — Port Core Engine *(Days 2–4)*

- [ ] Implement `KeyEngine.js` as a pure state machine
- [ ] Port the exact key mapping from `mapcopy.py` into `default.json`
- [ ] Fix the row-relative counter bug (see §4)
- [ ] Unit test `KeyEngine` with Jest (no DOM required)
- [ ] Wire keyboard events in `app.js` → engine → text display

**Deliverable:** Working keyboard input in browser, same behavior as Python version.

---

### Phase 2 — Typing Test Mode *(Days 5–8)*

- [ ] Add `words/en-200.json` word list
- [ ] Implement `TypingArea.js` with character-level diff rendering
- [ ] Add `Stats.js` with WPM and accuracy
- [ ] Add `StatsBar.js` HUD (live WPM, accuracy, time)
- [ ] Add results screen (WPM summary, accuracy graph)
- [ ] Add test length selector (15 / 30 / 60 / 120 words)

**Deliverable:** Full MonkeyType-like test loop using the T9 layout.

---

### Phase 3 — Layout Configuration *(Days 9–13)*

- [ ] Implement `Layout.js` loader + JSON schema validator
- [ ] Implement `LayoutEditor.js` — visual key remapping UI
- [ ] Add localStorage persistence for custom layout
- [ ] Add JSON import / export (download / upload file)
- [ ] Add layout reset to default
- [ ] Show current cycle state on `KeyboardVisual.js` (highlight active char)

**Deliverable:** Users can fully reconfigure the layout in-browser without editing code.

---

### Phase 4 — Polish & GitHub Pages Release *(Days 14–16)*

- [ ] Dark / light theme toggle
- [ ] Mobile responsiveness (on-screen key buttons as fallback)
- [ ] Keyboard shortcut reference panel
- [ ] Share layout via URL hash (base64-encoded JSON)
- [ ] Add `og:` meta tags for social sharing
- [ ] Write contributing guide for adding word lists / layouts

**Deliverable:** Public release, shareable URL, community-ready.

---

## 4. Known Bugs to Fix During Port

### Bug 1 — Row-Relative Counter Adjustment

**Location:** `on_key_press`, inner loop over `_key_tuple`

**Current code:**
```python
key_press_count[row[_index][0]] = (index - _index + len(row)) % len(row)
```

**Problem:** This adjusts *other* keys in the same row to a position relative to the currently pressed key. The intent is to allow smooth inter-key cycling within a row, but the formula doesn't account for the current press count of the other keys — it overwrites them with a positional offset, which causes incorrect cycling when switching back.

**Fix:** Track press counts independently per key. Do not adjust sibling counts. Let each key's cycle be self-contained. The original "row sync" intent can be replaced with a simpler rule: pressing a different key within the same row is treated as a new key press starting from index 0.

---

### Bug 2 — `ancient_key` is Dead Code

`ancient_key` is assigned on line 9 and never read. Remove it.

---

### Bug 3 — Space Commits Without Appending to Buffer

The current code inserts `current_char` to the widget on spacebar, but there's no buffer — the widget itself *is* the state. In the web version, separate the text buffer from the DOM.

---

## 5. Configuration Schema (v1)

```json
{
  "$schema": "https://your-repo/config/layout.schema.json",
  "name": "My Custom Layout",
  "version": "1.0",
  "commitKey": " ",
  "backspaceKey": "Backspace",
  "rows": [
    {
      "label": "Top Row",
      "keys": [
        { "trigger": "u", "chars": ["u","v","w","x"] },
        { "trigger": "i", "chars": ["i","j","k","l"] },
        { "trigger": "o", "chars": ["q","r","s","t"] },
        { "trigger": "p", "chars": ["+","-","?","!"] }
      ]
    },
    {
      "label": "Home Row",
      "keys": [
        { "trigger": "j", "chars": ["a","b","c","d"] },
        { "trigger": "k", "chars": ["e","f","g","h"] },
        { "trigger": "l", "chars": ["m","n","o","p"] },
        { "trigger": "ö", "chars": ["y","z",",","."] }
      ]
    },
    {
      "label": "Control Row",
      "keys": [
        { "trigger": "h", "chars": [" ","\b"] }
      ]
    }
  ]
}
```

---

## 6. Tech Stack Summary

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Vanilla JS (ES Modules) | Zero build step, GitHub Pages compatible |
| Styling | CSS custom properties | Themeable, no framework bloat |
| Testing | Jest + jsdom | Unit test engine without browser |
| CI/CD | GitHub Actions | Free, native to GitHub Pages |
| Persistence | localStorage + JSON file | No backend needed |
| Word lists | Static JSON | Bundled, versioned, forkable |

No React, no Vite, no bundler required for v1. If the project grows, Vite can be added in Phase 5 without changing the architecture.

---

## 7. File Structure for GitHub Repo

```
mapcopy-web/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages deployment
├── config/
│   └── layouts/
│       └── default.json        # Canonical MapCopy layout
├── src/
│   ├── engine/
│   │   ├── KeyEngine.js
│   │   ├── Layout.js
│   │   └── Stats.js
│   ├── ui/
│   │   ├── TypingArea.js
│   │   ├── KeyboardVisual.js
│   │   ├── StatsBar.js
│   │   └── LayoutEditor.js
│   └── app.js
├── words/
│   └── en-200.json
├── tests/
│   └── KeyEngine.test.js
├── legacy/
│   └── mapcopy.py              # Original Python reference
├── index.html
├── style.css
├── package.json                # Only for Jest; no bundler
└── README.md
```

---

*Document version: 1.0 | Status: Pre-implementation*
