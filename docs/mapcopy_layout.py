"""
mapcopy_layout.py
=================
Canonical layout definition for the MapCopy keyboard.
Generates and verifies the full 12x12 character matrix.

Grid: 4 columns x 3 rows
Keys: u i o p  /  j k l ö  /  n m , .

Index formula (second key selects char from first key's list):
    col_off = (col_B - col_A + 4) % 4
    row_off = (row_B - row_A + 3) % 3
    idx     = row_off * 4 + col_off

Visual band order inside each key (top → bottom):
    top    = idx  8-11  (row_off=2, "row above" — uppercase / specials)
    middle = idx  0- 3  (row_off=0,  same row   — primary chars)
    bottom = idx  4- 7  (row_off=1, "row below" — symbols / shortcuts)

Shortcut notation:
    ^X = Ctrl+X,  SP = Space,  TAB = Tab,  ENT = Enter,  ESC = Escape
    BS = Backspace,  DEL = Delete,  HOME/END/PGUP/PGDN/INS = nav keys
    ← → ↑ ↓ = arrow keys,  F1-F12 = function keys
"""

import json
import string
from collections import Counter

# ---------------------------------------------------------------------------
# Layout definition — 12 keys × 12 chars each = 144 unique slots
# chars[idx] where idx = row_off*4 + col_off
# idx 0- 3  same-row pairs        (row_off=0)
# idx 4- 7  one-row-down pairs    (row_off=1)
# idx 8-11  two-rows-down pairs   (row_off=2, wraps = "row above")
# ---------------------------------------------------------------------------

LAYOUT = [
    # ── TOP ROW ─────────────────────────────────────────────────────────────
    #         same-row              row+1                row+2 (uppercase)
    {"t": "u", "chars": ["u","v","w","x",    "_","=","<",">",    "U","V","W","X"]},
    {"t": "i", "chars": ["i","j","k","l",    "/","\\","(",")",   "I","J","K","L"]},
    {"t": "o", "chars": ["q","r","s","t",    "^","~","[","]",    "Q","R","S","T"]},
    {"t": "p", "chars": ["+","-","?","!",    "|",";",":","'",    '"',"`","{","}"]},

    # ── HOME ROW ────────────────────────────────────────────────────────────
    #         same-row              row+1 (shortcuts)    row+2 (uppercase)
    {"t": "j", "chars": ["a","b","c","d",    "^S","^W","^T","^N","A","B","C","D"]},
    {"t": "k", "chars": ["e","f","g","h",    "^F","^H","^R","^B","E","F","G","H"]},
    {"t": "l", "chars": ["m","n","o","p",    "^D","^L","^K","^P","M","N","O","P"]},
    {"t": "ö", "chars": ["y","z",",",".",    "^G","^U","^I","^E","Y","Z","…","•"]},

    # ── BOTTOM ROW ──────────────────────────────────────────────────────────
    #         same-row (digits)     row+1 (nav/ctrl)     row+2 (nav/fn)
    {"t": "n", "chars": ["0","1","2","3",    "SP","TAB","ENT","ESC",  "BS","DEL","HOME","END"]},
    {"t": "m", "chars": ["4","5","6","7",    "PGUP","PGDN","INS","←", "→","↑","↓","F1"]},
    {"t": ",", "chars": ["8","9","@","#",    "F2","F3","F4","F5",     "F6","F7","F8","F9"]},
    {"t": ".", "chars": ["$","%","&","*",    "F10","F11","F12","^C",  "^V","^X","^Z","^A"]},
]

# ---------------------------------------------------------------------------
# Engine constants
# ---------------------------------------------------------------------------

COLS   = 4
ROWS   = 3
KEYS   = [k["t"] for k in LAYOUT]
BY_T   = {k["t"]: k["chars"] for k in LAYOUT}
ROW_OF = {t: i // COLS for i, t in enumerate(KEYS)}
COL_OF = {t: i % COLS  for i, t in enumerate(KEYS)}


def resolve(first: str, second: str) -> tuple[str, int]:
    """Return (char, idx) committed when pressing first then second."""
    col_off = (COL_OF[second] - COL_OF[first] + COLS) % COLS
    row_off = (ROW_OF[second] - ROW_OF[first] + ROWS) % ROWS
    idx     = row_off * COLS + col_off
    return BY_T[first][idx], idx


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

def verify() -> bool:
    all_chars = [c for k in LAYOUT for c in k["chars"]]
    counts    = Counter(all_chars)
    dupes     = {c: n for c, n in counts.items() if n > 1}
    printable = string.printable[:94]          # all printable ASCII
    missing   = [c for c in printable if c not in all_chars]

    ok = True
    print("=" * 70)
    print("VERIFICATION")
    print("=" * 70)
    print(f"  Total slots  : {len(all_chars)}")
    print(f"  Unique chars : {len(counts)}")

    if dupes:
        print(f"  DUPLICATES   : {len(dupes)} FOUND — {dupes}")
        ok = False
    else:
        print(f"  Duplicates   : 0  ✓ CLEAN")

    if missing:
        print(f"  Missing ASCII: {missing}")
        ok = False
    else:
        print(f"  Printable ASCII coverage: complete  ✓")

    print("=" * 70)
    return ok


# ---------------------------------------------------------------------------
# Matrix printer
# ---------------------------------------------------------------------------

def print_matrix():
    col_w = 7
    print("\n" + "=" * 70)
    print("FULL 12×12 MATRIX  (row = first key, col = second key)")
    print("=" * 70)
    header = f"{'':6}" + "".join(f"{t:{col_w}}" for t in KEYS)
    print(header)
    print("-" * (6 + col_w * len(KEYS)))
    for fT in KEYS:
        row = f"{fT:6}"
        for sT in KEYS:
            char, _ = resolve(fT, sT)
            row += f"{char:{col_w}}"
        print(row)
    print("=" * 70)


# ---------------------------------------------------------------------------
# JSON export
# ---------------------------------------------------------------------------

def export_json(path: str = "layout.json"):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(LAYOUT, f, ensure_ascii=False, indent=2)
    print(f"\nLayout written to: {path}")


# ---------------------------------------------------------------------------
# Key detail printer
# ---------------------------------------------------------------------------

def print_key_detail():
    print("\n" + "=" * 70)
    print("KEY DETAIL  (visual band order: top=row-1  mid=row0  bot=row+1)")
    print("=" * 70)
    for k in LAYOUT:
        t = k["t"]
        c = k["chars"]
        top = c[8:12]   # row_off=2 → "above"
        mid = c[0:4]    # row_off=0 → same row
        bot = c[4:8]    # row_off=1 → below
        print(f"  [{t}]  top: {top}")
        print(f"        mid: {mid}")
        print(f"        bot: {bot}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    ok = verify()
    print_matrix()
    print_key_detail()
    export_json("layout.json")
    if ok:
        print("\n✓ Layout is valid — 144 unique characters, all printable ASCII covered.")
    else:
        print("\n✗ Layout has errors — see above.")
