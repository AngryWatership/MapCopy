/**
 * app.js
 * Bootstrap: loads layout + word list, wires KeyEngine,
 * builds training + mature views, handles typing test mode.
 */

import { KeyEngine  } from './engine/KeyEngine.js';
import { Layout     } from './engine/Layout.js';
import { Stats      } from './ui/Stats.js';
import { TypingArea } from './ui/TypingArea.js';
import { StatsBar   } from './ui/StatsBar.js';

const COLS     = 4;
const BANDS    = [[8,9,10,11],[0,1,2,3],[4,5,6,7]];
const isSpecial = c => c.length > 1 || ['…','•','×','÷','±','€','£','¥','©'].includes(c);

// ── Core instances ─────────────────────────────────────────────────────────
const engine = new KeyEngine();
const layout = new Layout();
const stats  = new Stats();
let   layoutData = null;
let   wordList   = [];
let   typingArea = null;
let   statsBar   = null;
let   currentView = 'training';   // 'training' | 'type'
let   testActive  = false;

// ── DOM refs ───────────────────────────────────────────────────────────────
const $committed    = document.getElementById('committed-text');
const $pending      = document.getElementById('pending-char');
const $status       = document.getElementById('status-line');
const $kbTraining   = document.getElementById('keyboard-training');
const $kbMature     = document.getElementById('keyboard-mature');
const $matrixBody   = document.getElementById('matrix-body');
const $btnSpace     = document.getElementById('btn-space');
const $btnBack      = document.getElementById('btn-back');
const $btnClear     = document.getElementById('btn-clear');
const $testSection  = document.getElementById('test-section');
const $resultsSection = document.getElementById('results-section');
const $typingArea   = document.getElementById('typing-area');
const $btnRestart   = document.getElementById('btn-restart');
const $btnAgain     = document.getElementById('btn-again');

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  // Load layout
  const result = await layout.fetch('./docs/layout.json');
  if (!result.ok) {
    $status.textContent = 'Layout error: ' + result.errors.join(', ');
    return;
  }
  layoutData = layout.raw;
  engine.loadLayout(layoutData);
  buildTraining();
  buildMature();

  // Load word list
  try {
    const res = await fetch('./words/en-200.json');
    wordList  = await res.json();
  } catch {
    wordList = ['the','be','to','of','and','in','that','have','it','for'];
  }

  // Typing area
  typingArea = new TypingArea($typingArea, wordList, 30);
  typingArea.onChar = (correct) => {
    stats.commit(correct);
  };
  typingArea.onComplete = () => {
    endTest();
  };

  // Stats bar
  statsBar = new StatsBar({
    wpm:  document.getElementById('stat-wpm'),
    acc:  document.getElementById('stat-acc'),
    time: document.getElementById('stat-time'),
  }, stats);

  startTest();
  render();
}

// ── View switching ─────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Only switch keyboard display — everything else stays visible
    document.getElementById('keyboard-training').classList.toggle('active', view === 'training');
    document.getElementById('keyboard-mature').classList.toggle('active', view === 'type');
    render();
  });
});

// ── Test lifecycle ─────────────────────────────────────────────────────────
function startTest() {
  testActive = true;
  stats.reset();
  statsBar.reset();
  typingArea.start();
  statsBar.start();
  $resultsSection.classList.add('hidden');
  engine.reset();
  render();
}

function stopTest() {
  testActive = false;
  statsBar.stop();
}

function endTest() {
  stopTest();
  document.getElementById('res-wpm').textContent   = stats.wpm(stats.elapsed() * 1000 || 10000);
  document.getElementById('res-acc').textContent   = stats.accuracy() + '%';
  document.getElementById('res-chars').textContent = stats.committed;
  document.getElementById('res-time').textContent  = stats.elapsed() + 's';
  $resultsSection.classList.remove('hidden');
}

$btnRestart.addEventListener('click', startTest);
$btnAgain.addEventListener('click', () => {
  $resultsSection.classList.add('hidden');
  startTest();
});

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  $committed.textContent = engine.text;
  $pending.textContent   = engine.pending
    ? engine._byT[engine.pending].chars[0] : '';

  document.querySelectorAll('.key-btn').forEach(btn => {
    const t = btn.dataset.t;
    btn.classList.toggle('is-pending', engine.pending === t);
    btn.querySelectorAll('.kc').forEach(cell => {
      const ci  = parseInt(cell.dataset.ci);
      const res = engine.pending ? engine.resolve(engine.pending, t) : null;
      cell.classList.toggle('hi', !!(res && res.idx === ci));
    });
  });

  document.querySelectorAll('.mkey').forEach(btn => {
    const t  = btn.dataset.t;
    btn.classList.toggle('is-pending', engine.pending === t);
    const pv = btn.querySelector('.mkey-preview');
    if (!pv) return;
    const char  = engine.pending ? engine.resolve(engine.pending, t).char : engine._byT[t].chars[0];
    pv.textContent = char.length > 4 ? char.slice(0,3)+'…' : char;
    pv.className   = 'mkey-preview' + (isSpecial(char) ? ' sp' : '');
  });
}

// ── Key press ──────────────────────────────────────────────────────────────
function handlePress(trigger) {
  flashBtn(trigger);
  const evt = engine.press(trigger);

  if (testActive && evt.type === 'commit') {
    typingArea.commit(evt.char);
  }

  if (evt.type === 'pending') {
    $status.textContent = `[${trigger}] pending`;
  } else if (evt.type === 'commit') {
    $status.textContent = `[${evt.firstKey}]→[${evt.secondKey}] idx${evt.idx} → '${evt.char}'`;
  }
  render();
}

function handleSpace() {
  flashCtrl($btnSpace);
  const evt = engine.space();
  if (testActive && evt.type === 'commit') {
    typingArea.commit(evt.char);
  }
  if (evt.type === 'commit')    $status.textContent = `space → '${evt.char}'`;
  if (evt.type === 'duplicate') $status.textContent = `duplicated '${evt.char}'`;
  render();
}

function handleBackspace() {
  flashCtrl($btnBack);
  const evt = engine.backspace();
  if (testActive && evt.type === 'delete') {
    typingArea.stepBack();
  }
  if (evt.type === 'cancel') $status.textContent = `cancelled [${evt.trigger}]`;
  if (evt.type === 'delete') $status.textContent = `deleted '${evt.char}'`;
  render();
}

function handleClear() {
  flashCtrl($btnClear);
  engine.reset();
  $status.textContent = '';
  render();
}

// ── Flash helpers ──────────────────────────────────────────────────────────
function flashBtn(trigger) {
  document.querySelectorAll(`[data-t="${CSS.escape(trigger)}"]`).forEach(el => {
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 110);
  });
}
function flashCtrl(el) {
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 110);
}

// ── Build keyboards ────────────────────────────────────────────────────────
function buildTraining() {
  [{ label:'top', keys: layoutData.slice(0,4) },
   { label:'home', keys: layoutData.slice(4,8) },
   { label:'bottom', keys: layoutData.slice(8,12) }].forEach(row => {
    const rd = document.createElement('div'); rd.className = 'kb-row';
    const lb = document.createElement('div'); lb.className = 'row-label'; lb.textContent = row.label;
    rd.appendChild(lb);
    row.keys.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'key-btn'; btn.dataset.t = key.t;
      const trig = document.createElement('span'); trig.className = 'key-trigger'; trig.textContent = key.t;
      btn.appendChild(trig);
      BANDS.forEach((group, bi) => {
        const band = document.createElement('div');
        band.className = 'char-band' + (bi < 2 ? ' sep' : '');
        group.forEach(ci => {
          const c = key.chars[ci];
          const sp = document.createElement('span');
          sp.className = 'kc' + (isSpecial(c) ? ' sp' : '');
          sp.dataset.ci = ci;
          sp.textContent = c.length > 4 ? c.slice(0,3)+'…' : c;
          band.appendChild(sp);
        });
        btn.appendChild(band);
      });
      btn.addEventListener('click', () => handlePress(key.t));
      rd.appendChild(btn);
    });
    $kbTraining.appendChild(rd);
  });
}

function buildMature() {
  [{ label:'top', keys: layoutData.slice(0,4) },
   { label:'home', keys: layoutData.slice(4,8) },
   { label:'bottom', keys: layoutData.slice(8,12) }].forEach(row => {
    const rd = document.createElement('div'); rd.className = 'kb-row';
    const lb = document.createElement('div'); lb.className = 'row-label'; lb.textContent = row.label;
    rd.appendChild(lb);
    row.keys.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'mkey'; btn.dataset.t = key.t;
      btn.innerHTML = `<span class="mkey-trigger">${key.t}</span><span class="mkey-preview">${key.chars[0]}</span>`;
      btn.addEventListener('click', () => handlePress(key.t));
      rd.appendChild(btn);
    });
    $kbMature.appendChild(rd);
  });
}

// ── Matrix (lazy) ──────────────────────────────────────────────────────────
function buildMatrix() {
  if ($matrixBody.dataset.built) return;
  $matrixBody.dataset.built = '1';
  const triggers = layoutData.map(k => k.t);
  const tbl = document.createElement('table'); tbl.className = 'mx-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr'); hr.innerHTML = '<th>↓1st 2nd→</th>';
  triggers.forEach(t => { const th = document.createElement('th'); th.textContent = t; hr.appendChild(th); });
  thead.appendChild(hr); tbl.appendChild(thead);
  const tbody = document.createElement('tbody');
  triggers.forEach(fT => {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); th.textContent = fT; tr.appendChild(th);
    triggers.forEach(sT => {
      const { char } = engine.resolve(fT, sT);
      const td = document.createElement('td');
      td.textContent = char.length > 4 ? char.slice(0,4) : char;
      td.title = `${fT}→${sT} = '${char}'`;
      if (isSpecial(char)) td.classList.add('sp');
      td.addEventListener('click', () => {
        engine._committed.push(char); engine._pending = null;
        $status.textContent = `matrix: [${fT}]→[${sT}] = '${char}'`;
        render();
      });
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); $matrixBody.appendChild(tbl);
}

// ── Event listeners ────────────────────────────────────────────────────────
$btnSpace.addEventListener('click', handleSpace);
$btnBack.addEventListener('click',  handleBackspace);
$btnClear.addEventListener('click', handleClear);

document.querySelector('.matrix-panel').addEventListener('toggle', e => {
  if (e.target.open) buildMatrix();
});

document.addEventListener('keydown', e => {
  if (e.key === ' ')         { e.preventDefault(); handleSpace();     return; }
  if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
  if (e.key === 'Escape')    { handleClear(); return; }
  if (!layoutData) return;
  const triggers = layoutData.map(k => k.t);
  if (triggers.includes(e.key))               { e.preventDefault(); handlePress(e.key);               return; }
  if (triggers.includes(e.key.toLowerCase())) { e.preventDefault(); handlePress(e.key.toLowerCase()); }
});

init();
