/**
 * StatsBar.js
 * Live HUD — reads from Stats instance, updates DOM.
 */

export class StatsBar {
  /**
   * @param {{ wpm: HTMLElement, acc: HTMLElement, time: HTMLElement }} els
   * @param {Stats} stats
   */
  constructor(els, stats) {
    this._els   = els;
    this._stats = stats;
    this._timer = null;
  }

  start() {
    this._timer = setInterval(() => this._tick(), 250);
    this._tick();
  }

  stop() {
    clearInterval(this._timer);
    this._timer = null;
    this._tick();
  }

  reset() {
    this.stop();
    if (this._els.wpm)  this._els.wpm.textContent  = '0';
    if (this._els.acc)  this._els.acc.textContent   = '100%';
    if (this._els.time) this._els.time.textContent  = '0s';
  }

  _tick() {
    if (this._els.wpm)  this._els.wpm.textContent  = this._stats.wpm();
    if (this._els.acc)  this._els.acc.textContent   = this._stats.accuracy() + '%';
    if (this._els.time) this._els.time.textContent  = this._stats.elapsed() + 's';
  }
}
