/**
 * TypingArea.js
 * Renders a target word sequence and tracks typed progress.
 * Only advances the cursor on printable characters that match the target.
 * Special tokens are NOT passed here — they are handled in app.js directly.
 *
 * Emits: onComplete(), onChar(correct: bool)
 */

export class TypingArea {
  constructor(promptEl, words, count = 30) {
    this._prompt      = promptEl;
    this._words       = words;
    this._count       = count;
    this._target      = [];
    this._cursor      = 0;
    this._mistakes    = new Set();
    this._flashTimers = {};
    this.onComplete   = null;
    this.onChar       = null;
  }

  start() {
    this._cursor   = 0;
    this._mistakes = new Set();
    Object.values(this._flashTimers).forEach(clearTimeout);
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

  /**
   * Commit a printable character against the target.
   * @param {string} char — a single printable character (not a token)
   */
  commit(char) {
    if (this._cursor >= this._target.length) return;

    const expected = this._target[this._cursor];
    const correct  = char === expected;

    if (!correct) this._mistakes.add(this._cursor);
    if (this.onChar) this.onChar(correct);

    const idx = this._cursor;
    this._cursor++;
    this._render();

    if (correct) this._flash(idx);
    if (this._cursor >= this._target.length && this.onComplete) this.onComplete();
  }

  stepBack() {
    if (this._cursor <= 0) return;
    this._cursor--;
    this._mistakes.delete(this._cursor);
    if (this._flashTimers[this._cursor]) {
      clearTimeout(this._flashTimers[this._cursor]);
      delete this._flashTimers[this._cursor];
    }
    this._render();
  }

  get done()     { return this._cursor >= this._target.length; }
  get progress() { return this._cursor / (this._target.length || 1); }

  _flash(idx) {
    const span = this._prompt.children[idx];
    if (!span) return;
    span.classList.add('tc-flash');
    this._flashTimers[idx] = setTimeout(() => {
      const s = this._prompt.children[idx];
      if (s) s.classList.remove('tc-flash');
      delete this._flashTimers[idx];
    }, 75);
  }

  _render() {
    const frags = this._target.map((ch, i) => {
      const display = ch === ' ' ? '&nbsp;' : ch;
      let cls = 'tc-pending';
      if      (i < this._cursor)  cls = this._mistakes.has(i) ? 'tc-wrong' : 'tc-correct';
      else if (i === this._cursor) cls = 'tc-cursor';
      return `<span class="${cls}">${display}</span>`;
    });
    this._prompt.innerHTML = frags.join('');

    // Re-apply active flashes after re-render
    for (const idx of Object.keys(this._flashTimers)) {
      const s = this._prompt.children[+idx];
      if (s) s.classList.add('tc-flash');
    }
  }
}
