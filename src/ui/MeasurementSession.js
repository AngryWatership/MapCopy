/**
 * MeasurementSession.js
 * Phase A — harmonic sweep latency profiler.
 *
 * Measures L1 (signal → first key) and L2 (first → second key) for every
 * key pair across a tempo sweep. Computes a cost_matrix from the results.
 *
 * State machine:
 *   idle → running → (pair loop) → complete
 *
 * Each pair goes through TRIALS_PER_PAIR trials at varying tempos (slow→fast→slow).
 * Each trial:
 *   1. Show target pair on screen (record t_signal)
 *   2. Wait for first keydown matching first key (record L1 = t_key1 - t_signal)
 *   3. Wait for second keydown matching second key (record L2 = t_key2 - t_key1)
 *   4. Record hit/miss, advance to next trial
 *
 * After all trials for a pair:
 *   - Discard outliers (>2σ from mean)
 *   - Compute mean L1, mean L2, CV (coefficient of variation = σ/mean)
 *   - cost = mean_L2 * (1 + CV)   — slow AND inconsistent = high cost
 *
 * Output: cost_matrix[firstTrigger][secondTrigger] = cost (lower = easier)
 */

const TRIALS_PER_PAIR = 8;   // total trials per pair across the sweep
const TEMPO_CURVE = [        // inter-stimulus intervals in ms (slow→fast→slow)
  2000, 1500, 1200, 900, 700, 900, 1200, 1500
];
const TIMEOUT_MS  = 3000;    // give up on a trial after this long

export class MeasurementSession {
  /**
   * @param {string[]}  triggers   — all 12 key triggers
   * @param {function}  onDisplay  — called with (firstTrigger, secondTrigger, trialN, totalTrials)
   * @param {function}  onProgress — called with (pairsComplete, pairsTotal)
   * @param {function}  onComplete — called with (costMatrix, rawData)
   */
  constructor(triggers, onDisplay, onProgress, onComplete) {
    this._triggers   = triggers;
    this._onDisplay  = onDisplay;
    this._onProgress = onProgress;
    this._onComplete = onComplete;

    this._state      = 'idle';
    this._queue      = [];   // [{fT, sT}] — ordered pair list
    this._pairIdx    = 0;
    this._trialIdx   = 0;
    this._tSignal    = 0;
    this._tKey1      = 0;
    this._pendingFirst = null;  // trigger we're waiting for as first key
    this._raw        = {};      // raw[fT][sT] = [{L1, L2, hit}]
    this._timer      = null;
    this._costMatrix = {};
  }

  // ── Public API ─────────────────────────────────────────────────────────

  start(pairSubset = null) {
    this._state    = 'running';
    this._pairIdx  = 0;
    this._trialIdx = 0;
    this._raw      = {};
    this._costMatrix = {};

    // Build pair queue — all 144 pairs, or a subset
    if (pairSubset) {
      this._queue = pairSubset;
    } else {
      this._queue = [];
      for (const fT of this._triggers)
        for (const sT of this._triggers)
          this._queue.push({ fT, sT });
      // Shuffle
      for (let i = this._queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._queue[i], this._queue[j]] = [this._queue[j], this._queue[i]];
      }
    }

    this._initPairRaw();
    this._nextTrial();
  }

  /** Feed a keydown event. Returns true if consumed. */
  keydown(trigger) {
    if (this._state !== 'running') return false;
    const now = performance.now();

    if (!this._pendingFirst) {
      // Waiting for first key
      const { fT } = this._queue[this._pairIdx];
      if (trigger !== fT) return false;  // wrong key
      this._tKey1        = now;
      this._pendingFirst = fT;
      return true;
    } else {
      // Waiting for second key
      const { fT, sT } = this._queue[this._pairIdx];
      if (trigger !== sT) {
        // Wrong second key — count as miss, move on
        this._recordTrial(this._tKey1 - this._tSignal, now - this._tKey1, false);
        return true;
      }
      this._recordTrial(this._tKey1 - this._tSignal, now - this._tKey1, true);
      return true;
    }
  }

  stop() {
    this._state = 'idle';
    clearTimeout(this._timer);
    this._pendingFirst = null;
  }

  get state()      { return this._state; }
  get costMatrix() { return this._costMatrix; }
  get rawData()    { return this._raw; }

  /** Export session as JSON string. */
  export() {
    return JSON.stringify({
      version:    1,
      date:       new Date().toISOString(),
      triggers:   this._triggers,
      costMatrix: this._costMatrix,
      raw:        this._raw,
    }, null, 2);
  }

  // ── Trial sequencing ───────────────────────────────────────────────────

  _nextTrial() {
    if (this._pairIdx >= this._queue.length) {
      this._finish();
      return;
    }

    const { fT, sT } = this._queue[this._pairIdx];
    this._pendingFirst = null;
    this._tSignal      = performance.now();

    const tempo = TEMPO_CURVE[this._trialIdx % TEMPO_CURVE.length];
    this._onDisplay(fT, sT, this._trialIdx + 1, TRIALS_PER_PAIR);

    // Timeout — if user doesn't respond in time, record a miss
    this._timer = setTimeout(() => {
      if (this._state !== 'running') return;
      this._recordTrial(TIMEOUT_MS, TIMEOUT_MS, false);
    }, TIMEOUT_MS + tempo);
  }

  _recordTrial(L1, L2, hit) {
    clearTimeout(this._timer);
    const { fT, sT } = this._queue[this._pairIdx];

    if (!this._raw[fT])       this._raw[fT] = {};
    if (!this._raw[fT][sT])   this._raw[fT][sT] = [];
    this._raw[fT][sT].push({ L1: Math.round(L1), L2: Math.round(L2), hit });

    this._pendingFirst = null;
    this._trialIdx++;

    if (this._trialIdx >= TRIALS_PER_PAIR) {
      // Pair complete
      this._computePairCost(fT, sT);
      this._pairIdx++;
      this._trialIdx = 0;
      this._onProgress(this._pairIdx, this._queue.length);
      this._initPairRaw();
    }

    // Short pause between trials then show next
    const tempo = TEMPO_CURVE[(this._trialIdx) % TEMPO_CURVE.length];
    this._timer = setTimeout(() => this._nextTrial(), Math.min(tempo, 800));
  }

  _initPairRaw() {
    if (this._pairIdx >= this._queue.length) return;
    const { fT, sT } = this._queue[this._pairIdx];
    if (!this._raw[fT])     this._raw[fT] = {};
    if (!this._raw[fT][sT]) this._raw[fT][sT] = [];
  }

  // ── Cost computation ───────────────────────────────────────────────────

  _computePairCost(fT, sT) {
    const trials = (this._raw[fT]?.[sT] || []).filter(t => t.hit);
    if (trials.length === 0) {
      // All misses — assign max cost
      if (!this._costMatrix[fT]) this._costMatrix[fT] = {};
      this._costMatrix[fT][sT] = TIMEOUT_MS;
      return;
    }

    const l2s  = trials.map(t => t.L2);
    const mean = l2s.reduce((a,b) => a+b, 0) / l2s.length;
    const std  = Math.sqrt(l2s.map(v => (v-mean)**2).reduce((a,b) => a+b, 0) / l2s.length);
    const cv   = mean > 0 ? std / mean : 0;

    // Remove outliers (>2σ from mean) then recompute
    const filtered = l2s.filter(v => Math.abs(v - mean) <= 2 * std);
    const cleanMean = filtered.length > 0
      ? filtered.reduce((a,b) => a+b, 0) / filtered.length
      : mean;

    // cost = mean L2 × (1 + CV) — penalises slow AND inconsistent pairs
    const cost = Math.round(cleanMean * (1 + cv));

    if (!this._costMatrix[fT]) this._costMatrix[fT] = {};
    this._costMatrix[fT][sT] = cost;
  }

  _finish() {
    this._state = 'complete';
    this._onComplete(this._costMatrix, this._raw);
  }
}
