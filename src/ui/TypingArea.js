/**
 * TypingArea.js
 * Word prompt only. Receives single printable chars from app.js.
 * No knowledge of tokens, output field, or engine.
 */
export class TypingArea {
  constructor(promptEl, words, count = 30) {
    this._el      = promptEl;
    this._words   = words;
    this._count   = count;
    this._target  = [];
    this._cursor  = 0;
    this._errors  = new Set();
    this._timers  = {};
    this.onChar     = null;
    this.onComplete = null;
  }

  start() {
    this._cursor = 0;
    this._errors = new Set();
    Object.values(this._timers).forEach(clearTimeout);
    this._timers = {};
    const out = [];
    for (let i = 0; i < this._count; i++) {
      if (i > 0) out.push(' ');
      out.push(...this._words[Math.floor(Math.random() * this._words.length)].split(''));
    }
    this._target = out;
    this._render();
  }

  /** Single printable char — advance cursor, check correctness. */
  push(char) {
    if (this._cursor >= this._target.length) return;
    const correct = char === this._target[this._cursor];
    if (!correct) this._errors.add(this._cursor);
    if (this.onChar) this.onChar(correct);
    const idx = this._cursor++;
    this._render();
    if (correct) this._flash(idx);
    if (this._cursor >= this._target.length && this.onComplete) this.onComplete();
  }

  /** Undo last char. */
  pop() {
    if (this._cursor <= 0) return;
    this._cursor--;
    this._errors.delete(this._cursor);
    clearTimeout(this._timers[this._cursor]);
    delete this._timers[this._cursor];
    this._render();
  }

  get done() { return this._cursor >= this._target.length; }

  _flash(idx) {
    const s = this._el.children[idx];
    if (!s) return;
    s.classList.add('tc-flash');
    this._timers[idx] = setTimeout(() => {
      const el = this._el.children[idx];
      if (el) el.classList.remove('tc-flash');
      delete this._timers[idx];
    }, 75);
  }

  _render() {
    this._el.innerHTML = this._target.map((ch, i) => {
      const d = ch === ' ' ? '&nbsp;' : ch;
      const c = i < this._cursor
        ? (this._errors.has(i) ? 'tc-wrong' : 'tc-correct')
        : i === this._cursor ? 'tc-cursor' : 'tc-pending';
      return `<span class="${c}">${d}</span>`;
    }).join('');
    // Re-apply active flashes after re-render
    Object.keys(this._timers).forEach(i => {
      const s = this._el.children[+i];
      if (s) s.classList.add('tc-flash');
    });
  }
}
