/**
 * KeyEngine.js
 * Pure state machine for MapCopy two-key-pair input.
 * No DOM dependency — fully unit-testable.
 *
 * Algorithm: docs/LOGIC.md §2-4
 */

export class KeyEngine {
  constructor() {
    this._layout    = null;   // loaded from Layout
    this._byT       = {};     // trigger → { t, chars, row, col }
    this._pending   = null;   // trigger string | null
    this._committed = [];     // array of committed char strings
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  loadLayout(layoutArray) {
    this._layout  = layoutArray;
    this._byT     = {};
    const COLS    = 4;
    layoutArray.forEach((key, i) => {
      this._byT[key.t] = {
        ...key,
        row: Math.floor(i / COLS),
        col: i % COLS,
      };
    });
    this._pending   = null;
    this._committed = [];
  }

  get triggers() {
    return Object.keys(this._byT);
  }

  // ── Core formula ──────────────────────────────────────────────────────────

  resolve(firstT, secondT) {
    const COLS   = 4;
    const ROWS   = 3;
    const a      = this._byT[firstT];
    const b      = this._byT[secondT];
    if (!a || !b) return null;
    const colOff = (b.col - a.col + COLS) % COLS;
    const rowOff = (b.row - a.row + ROWS) % ROWS;
    const idx    = rowOff * COLS + colOff;
    return { char: a.chars[idx], idx, colOff, rowOff };
  }

  // ── Input handling ────────────────────────────────────────────────────────

  /**
   * Press a layout key.
   * Returns an event object describing what happened.
   */
  press(trigger) {
    const key = this._byT[trigger];
    if (!key) return { type: 'unknown', trigger };

    if (!this._pending) {
      this._pending = trigger;
      return {
        type:    'pending',
        trigger,
        preview: key.chars[0],
      };
    }

    const result = this.resolve(this._pending, trigger);
    const prev   = this._pending;
    this._pending = null;
    this._committed.push(result.char);

    return {
      type:      'commit',
      char:      result.char,
      idx:       result.idx,
      colOff:    result.colOff,
      rowOff:    result.rowOff,
      firstKey:  prev,
      secondKey: trigger,
      committed: [...this._committed],
    };
  }

  /**
   * Space key:
   * - If pending → commit chars[0] of pending key
   * - If idle + committed → duplicate last char
   * - If idle + empty → no-op
   */
  space() {
    if (this._pending) {
      const key  = this._byT[this._pending];
      const char = key.chars[0];
      const prev = this._pending;
      this._pending = null;
      this._committed.push(char);
      return {
        type:      'commit',
        char,
        idx:       0,
        firstKey:  prev,
        secondKey: null,
        via:       'space',
        committed: [...this._committed],
      };
    }
    if (this._committed.length > 0) {
      const char = this._committed[this._committed.length - 1];
      this._committed.push(char);
      return {
        type:      'duplicate',
        char,
        committed: [...this._committed],
      };
    }
    return { type: 'noop' };
  }

  /**
   * Backspace key:
   * - If pending → cancel pending
   * - If idle + committed → delete last char
   * - If idle + empty → no-op
   */
  backspace() {
    if (this._pending) {
      const prev    = this._pending;
      this._pending = null;
      return { type: 'cancel', trigger: prev };
    }
    if (this._committed.length > 0) {
      const removed = this._committed.pop();
      return {
        type:      'delete',
        char:      removed,
        committed: [...this._committed],
      };
    }
    return { type: 'noop' };
  }

  // ── State accessors ───────────────────────────────────────────────────────

  get pending()   { return this._pending; }
  get committed() { return [...this._committed]; }
  get text()      { return this._committed.join(''); }

  reset() {
    this._pending   = null;
    this._committed = [];
  }

  /**
   * For training view: given a pending key, return a map of
   * trigger → { char, idx } for every key in the layout.
   */
  previewAll(pendingTrigger) {
    const map = {};
    for (const t of Object.keys(this._byT)) {
      map[t] = this.resolve(pendingTrigger, t);
    }
    return map;
  }
}
