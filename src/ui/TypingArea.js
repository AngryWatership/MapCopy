/**
 * TypingArea.js
 * Renders a target word sequence and tracks progress.
 * Emits events: onComplete(stats), onChar(correct).
 */

export class TypingArea {
  /**
   * @param {HTMLElement} el       — container to render into
   * @param {string[]}    words    — word list to draw from
   * @param {number}      count   — number of words per test
   */
  constructor(el, words, count = 30) {
    this._el       = el;
    this._words    = words;
    this._count    = count;
    this._target   = [];   // array of chars for this test
    this._cursor   = 0;    // index into _target
    this._mistakes = new Set();
    this.onComplete = null;
    this.onChar     = null;
  }

  /** Pick random words, flatten to char array, render. */
  start() {
    this._cursor   = 0;
    this._mistakes = new Set();
    const chosen   = [];
    for (let i = 0; i < this._count; i++) {
      if (i > 0) chosen.push(' ');
      const word = this._words[Math.floor(Math.random() * this._words.length)];
      chosen.push(...word.split(''));
    }
    this._target = chosen;
    this._render();
  }

  /** Feed a committed character from the engine. */
  commit(char) {
    if (this._cursor >= this._target.length) return;
    const expected = this._target[this._cursor];

    // Normalise SP token to actual space
    const actual = char === 'SP' ? ' ' : char;
    const correct = actual === expected;

    if (!correct) this._mistakes.add(this._cursor);
    if (this.onChar) this.onChar(correct);

    this._cursor++;
    this._render();

    if (this._cursor >= this._target.length) {
      if (this.onComplete) this.onComplete();
    }
  }

  /** Step back one character (backspace on committed). */
  stepBack() {
    if (this._cursor <= 0) return;
    this._cursor--;
    this._mistakes.delete(this._cursor);
    this._render();
  }

  get progress() { return this._cursor / this._target.length; }
  get done()     { return this._cursor >= this._target.length; }

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
    this._el.innerHTML = frags.join('');
  }
}
