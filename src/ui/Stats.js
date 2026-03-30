/**
 * Stats.js
 * Tracks WPM (rolling 10-second window) and accuracy.
 * Pure JS — no DOM dependency.
 */

export class Stats {
  constructor() { this.reset(); }

  reset() {
    this._events    = [];
    this._committed = 0;
    this._errors    = 0;
    this._startedAt = null;
  }

  /** Call when a character is committed. correct = matches target char. */
  commit(correct = true) {
    const now = Date.now();
    if (!this._startedAt) this._startedAt = now;
    this._committed++;
    this._events.push({ t: now });
    if (!correct) this._errors++;
  }

  /** WPM over rolling window (default 10 s). Word = 5 chars. */
  wpm(windowMs = 10000) {
    const now    = Date.now();
    const cutoff = now - windowMs;
    const chars  = this._events.filter(e => e.t >= cutoff).length;
    return Math.round((chars / 5) / (windowMs / 60000));
  }

  /** Accuracy: correct chars / total committed, as integer percent. */
  accuracy() {
    if (this._committed === 0) return 100;
    return Math.round(((this._committed - this._errors) / this._committed) * 100);
  }

  elapsed() {
    if (!this._startedAt) return 0;
    return Math.round((Date.now() - this._startedAt) / 1000);
  }

  get committed() { return this._committed; }
  get errors()    { return this._errors; }
}
