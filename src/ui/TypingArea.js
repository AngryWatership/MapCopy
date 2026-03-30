/**
 * TypingArea.js
 * Renders a target word sequence and tracks progress.
 * - Correct char flashes green for 75ms then turns white
 * - Special tokens (SP, TAB, ENT, BS, DEL, ESC, etc.) produce real effects
 * Emits: onComplete(), onChar(correct)
 */

// Special tokens that produce real DOM/browser effects
const SPECIAL_EFFECTS = {
  'SP':   (ta) => ta._insertSpace(),
  'TAB':  (ta) => ta._insertTab(),
  'ENT':  (ta) => ta._insertNewline(),
  'BS':   (ta) => ta._backspaceOutput(),
  'DEL':  (ta) => ta._deleteOutput(),
  'ESC':  (ta) => ta._clearOutput(),
  'HOME': (ta) => ta._scrollTop(),
  'END':  (ta) => ta._scrollBottom(),
  '←':   (ta) => ta._nudge('left'),
  '→':   (ta) => ta._nudge('right'),
  '↑':   (ta) => ta._nudge('up'),
  '↓':   (ta) => ta._nudge('down'),
};

export class TypingArea {
  /**
   * @param {HTMLElement} promptEl  — renders the word prompt
   * @param {HTMLElement} outputEl  — receives real special-key effects
   * @param {string[]}    words
   * @param {number}      count
   */
  constructor(promptEl, outputEl, words, count = 30) {
    this._prompt   = promptEl;
    this._output   = outputEl;   // the committed-text output area
    this._words    = words;
    this._count    = count;
    this._target   = [];
    this._cursor   = 0;
    this._mistakes = new Set();
    this._flashTimers = {};      // charIndex → timer id
    this.onComplete = null;
    this.onChar     = null;
  }

  start() {
    this._cursor   = 0;
    this._mistakes = new Set();
    // Clear any pending flash timers
    Object.values(this._flashTimers).forEach(t => clearTimeout(t));
    this._flashTimers = {};

    const chosen = [];
    for (let i = 0; i < this._count; i++) {
      if (i > 0) chosen.push(' ');
      const word = this._words[Math.floor(Math.random() * this._words.length)];
      chosen.push(...word.split(''));
    }
    this._target = chosen;
    this._render();
  }

  commit(char) {
    if (this._cursor >= this._target.length) return;

    // Special tokens — produce real effects, don't advance prompt cursor
    if (SPECIAL_EFFECTS[char]) {
      SPECIAL_EFFECTS[char](this);
      if (this.onChar) this.onChar(true);  // count as correct for stats
      return;
    }

    const expected = this._target[this._cursor];
    const actual   = char === 'SP' ? ' ' : char;
    const correct  = actual === expected;

    if (!correct) this._mistakes.add(this._cursor);
    if (this.onChar) this.onChar(correct);

    const charIdx = this._cursor;
    this._cursor++;
    this._render();

    // Flash green for 75ms on correct, then re-render to white
    if (correct) {
      this._markFlash(charIdx);
    }

    if (this._cursor >= this._target.length) {
      if (this.onComplete) this.onComplete();
    }
  }

  stepBack() {
    if (this._cursor <= 0) return;
    this._cursor--;
    this._mistakes.delete(this._cursor);
    // Cancel any pending flash for this char
    if (this._flashTimers[this._cursor]) {
      clearTimeout(this._flashTimers[this._cursor]);
      delete this._flashTimers[this._cursor];
    }
    this._render();
  }

  get progress() { return this._cursor / this._target.length; }
  get done()     { return this._cursor >= this._target.length; }

  // ── Flash mechanic ────────────────────────────────────────────────────────

  _markFlash(charIdx) {
    // Set flash class on the span
    const span = this._prompt.children[charIdx];
    if (!span) return;
    span.classList.add('tc-flash');

    // After 75ms, remove flash — char becomes normal tc-correct (white)
    const t = setTimeout(() => {
      const s = this._prompt.children[charIdx];
      if (s) s.classList.remove('tc-flash');
      delete this._flashTimers[charIdx];
    }, 75);
    this._flashTimers[charIdx] = t;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render() {
    const frags = this._target.map((ch, i) => {
      const display = ch === ' ' ? '&nbsp;' : ch;
      let cls = 'tc-pending';
      if (i < this._cursor) {
        cls = this._mistakes.has(i) ? 'tc-wrong' : 'tc-correct';
      } else if (i === this._cursor) {
        cls = 'tc-cursor';
      }
      return `<span class="${cls}">${display}</span>`;
    });
    this._prompt.innerHTML = frags.join('');

    // Re-apply any active flash timers after re-render
    for (const idxStr of Object.keys(this._flashTimers)) {
      const span = this._prompt.children[parseInt(idxStr)];
      if (span) span.classList.add('tc-flash');
    }
  }

  // ── Special key effects ───────────────────────────────────────────────────

  _insertSpace() {
    if (this._output) this._output.textContent += ' ';
  }

  _insertTab() {
    if (this._output) this._output.textContent += '\t';
  }

  _insertNewline() {
    if (this._output) {
      const br = document.createElement('br');
      this._output.appendChild(br);
    }
  }

  _backspaceOutput() {
    if (!this._output) return;
    const text = this._output.textContent;
    if (text.length > 0) {
      this._output.textContent = text.slice(0, -1);
    } else if (this._output.lastChild?.tagName === 'BR') {
      this._output.removeChild(this._output.lastChild);
    }
  }

  _deleteOutput() {
    // Same as backspace in this context
    this._backspaceOutput();
  }

  _clearOutput() {
    if (this._output) this._output.textContent = '';
  }

  _scrollTop() {
    if (this._prompt) this._prompt.scrollTop = 0;
  }

  _scrollBottom() {
    if (this._prompt) this._prompt.scrollTop = this._prompt.scrollHeight;
  }

  _nudge(dir) {
    // Visual nudge — briefly shift the cursor span
    const span = this._prompt.children[this._cursor];
    if (!span) return;
    const map = { left: '-4px', right: '4px', up: '-4px', down: '4px' };
    const prop = (dir === 'left' || dir === 'right') ? 'marginLeft' : 'marginTop';
    span.style[prop] = map[dir];
    setTimeout(() => { span.style[prop] = ''; }, 120);
  }
}
