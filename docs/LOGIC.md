# LOGIC.md
> Algorithm spec, index formula, canonical layout, and visual conventions.
> This document changes only when the core mechanic changes.
> For implementation see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Key Grid

12 physical keys arranged in a 4-column × 3-row grid:

```
col →    0     1     2     3
row 0    u     i     o     p      ← top row
row 1    j     k     l     ö      ← home row
row 2    n     m     ,     .      ← bottom row
```

---

## 2. Two-Key Input Model

Every character requires exactly **two keypresses**:

1. **First key** — selects *which key's character list* to draw from. Goes pending. Nothing is committed yet.
2. **Second key** — selects *which character* from the first key's list, via its grid position. Commits immediately.

There is no cycling, no timeout, no multi-press accumulation.

---

## 3. Index Formula

The second key's position relative to the first key determines the character index:

```
col_off = (col_B - col_A + 4) % 4
row_off = (row_B - row_A + 3) % 3
idx     = row_off * 4 + col_off
```

Each key holds exactly **12 characters** (indices 0–11), one per possible second key in the grid.

### Index table — what idx each (first, second) pair produces

```
second →    u(0,0) i(1,0) o(2,0) p(3,0) j(0,1) k(1,1) l(2,1) ö(3,1) n(0,2) m(1,2) ,(2,2) .(3,2)
first ↓
u (0,0)       0      1      2      3      4      5      6      7      8      9     10     11
i (1,0)       3      0      1      2      7      4      5      6     11      8      9     10
o (2,0)       2      3      0      1      6      7      4      5     10     11      8      9
p (3,0)       1      2      3      0      5      6      7      4      9     10     11      8
j (0,1)       8      9     10     11      0      1      2      3      4      5      6      7
k (1,1)      11      8      9     10      3      0      1      2      7      4      5      6
l (2,1)      10     11      8      9      2      3      0      1      6      7      4      5
ö (3,1)       9     10     11      8      1      2      3      0      5      6      7      4
n (0,2)       4      5      6      7      8      9     10     11      0      1      2      3
m (1,2)       7      4      5      6     11      8      9     10      3      0      1      2
, (2,2)       6      7      4      5     10     11      8      9      2      3      0      1
. (3,2)       5      6      7      4      9     10     11      8      1      2      3      0
```

### Worked examples

| Sequence | Formula | Result |
|---|---|---|
| `j → j` | col=(0-0)%4=0, row=(1-1)%3=0, idx=0 | `a` |
| `i → u` | col=(0-1+4)%4=3, row=(0-0)%3=0, idx=3 | `l` |
| `j → l` | col=(2-0)%4=2, row=(1-1)%3=0, idx=2 | `c` |
| `o → p` | col=(3-2)%4=1, row=(0-0)%3=0, idx=1 | `r` |
| `j → n` | col=(0-0)%4=0, row=(2-1+3)%3=1, idx=4 | `^S` |
| `j → u` | col=(0-0)%4=0, row=(0-1+3)%3=2, idx=8 | `A` |

---

## 4. Special Key Behaviours

| Key | State | Action |
|---|---|---|
| Space | pending | Commit first key's `chars[0]` (same as pressing same key twice) |
| Space | idle | Duplicate last committed character |
| Backspace | pending | Cancel pending key, nothing committed |
| Backspace | idle | Delete last committed character |
| Cross-row key | pending | Commit first key's `chars[0]`, second key becomes new pending |

---

## 5. Canonical Character Layout

Generated and verified by `mapcopy_layout.py`. **Do not edit `layout.json` by hand** — edit the layout dict in the Python script and regenerate.

```
Key   idx: 0    1    2    3    |  4     5     6     7    |  8     9    10    11
           ── same-row (row_off=0) ──   ── row+1 (row_off=1) ──   ── row+2 (row_off=2) ──
u          u    v    w    x       _     =     <     >       U     V     W     X
i          i    j    k    l       /     \     (     )       I     J     K     L
o          q    r    s    t       ^     ~     [     ]       Q     R     S     T
p          +    -    ?    !       |     ;     :     '       "     `     {     }
j          a    b    c    d       ^S    ^W    ^T    ^N      A     B     C     D
k          e    f    g    h       ^F    ^H    ^R    ^B      E     F     G     H
l          m    n    o    p       ^D    ^L    ^K    ^P      M     N     O     P
ö          y    z    ,    .       ^G    ^U    ^I    ^E      Y     Z     …     •
n          0    1    2    3       SP    TAB   ENT   ESC     BS    DEL   HOME  END
m          4    5    6    7       PGUP  PGDN  INS   ←       →     ↑     ↓     F1
,          8    9    @    #       F2    F3    F4    F5      F6    F7    F8    F9
.          $    %    &    *       F10   F11   F12   ^C      ^V    ^X    ^Z    ^A
```

### Coverage

- All 94 printable ASCII characters ✓
- Space, Tab, Enter, Escape, Backspace, Delete ✓
- Home, End, Page Up, Page Down, Insert ✓
- Arrow keys (←→↑↓) ✓
- F1–F12 ✓
- Ctrl shortcuts: ^A ^B ^C ^D ^E ^F ^G ^H ^I ^K ^L ^N ^P ^R ^S ^T ^U ^V ^W ^X ^Z ✓
- Special Unicode: … • × ÷ ± € £ ¥ © ✓
- Total: **144 unique entries, zero duplicates** ✓

---

## 6. Visual Band Order (Training View)

Inside each key, the 12 chars are displayed as 3 bands of 4, stacked top to bottom following the **1, 0, −1** spatial metaphor — the band that corresponds to pressing a key *above* the current key sits at the top:

```
┌─────────────────────┐
│  idx 8–11  row_off=2  ← selected by pressing a key one row above (wraps)
├─────────────────────┤
│  idx 0– 3  row_off=0  ← selected by pressing a key on the same row
├─────────────────────┤
│  idx 4– 7  row_off=1  ← selected by pressing a key one row below
└─────────────────────┘
```

Within each band, the four characters read left to right by column offset (0→1→2→3).

---

## 7. Shortcut Reference

| Trigger pair | Char | Meaning |
|---|---|---|
| `j → n` | `^S` | Ctrl+S — Save |
| `j → m` | `^W` | Ctrl+W — Close tab |
| `j → ,` | `^T` | Ctrl+T — New tab |
| `j → .` | `^N` | Ctrl+N — New window |
| `k → n` | `^F` | Ctrl+F — Find |
| `k → m` | `^H` | Ctrl+H — Replace |
| `k → ,` | `^R` | Ctrl+R — Reload |
| `k → .` | `^B` | Ctrl+B — Bold |
| `l → n` | `^D` | Ctrl+D — Bookmark |
| `l → m` | `^L` | Ctrl+L — Address bar |
| `l → ,` | `^K` | Ctrl+K — Link |
| `l → .` | `^P` | Ctrl+P — Print |
| `ö → n` | `^G` | Ctrl+G — Find next |
| `ö → m` | `^U` | Ctrl+U — Underline |
| `ö → ,` | `^I` | Ctrl+I — Italic |
| `ö → .` | `^E` | Ctrl+E — Centre |
| `. → .` | `$`  | Dollar sign |
| `. → n` | `^V` | Ctrl+V — Paste |
| `. → m` | `^X` | Ctrl+X — Cut |
| `. → ,` | `^Z` | Ctrl+Z — Undo |
| `. → u` | `^A` | Ctrl+A — Select all |
| `. → p` | `^C` | Ctrl+C — Copy |

---

*Last updated: session 1 | Canonical source: `mapcopy_layout.py`*
