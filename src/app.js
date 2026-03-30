/**
 * app.js — MapCopy bootstrap
 * Handles: layout loading, keyboard views, typing test, open writing, special tokens.
 */

import { KeyEngine  } from './engine/KeyEngine.js';
import { Layout     } from './engine/Layout.js';
import { Stats      } from './ui/Stats.js';
import { TypingArea } from './ui/TypingArea.js';
import { StatsBar   } from './ui/StatsBar.js';

// ── Constants ──────────────────────────────────────────────────────────────
const BANDS     = [[8,9,10,11],[0,1,2,3],[4,5,6,7]];
const isSpecial = c => c.length > 1 || ['…','•','×','÷','±','€','£','¥','©'].includes(c);

// Tokens that produce side effects on the output area
const TOKEN_EFFECTS = {
  'SP':   (el) => { el.textContent += ' '; },
  'TAB':  (el) => { el.textContent += '\t'; },
  'ENT':  (el) => { el.appendChild(document.createElement('br')); },
  'BS':   (el) => {
    if (el.lastChild?.nodeName === 'BR') { el.removeChild(el.lastChild); }
    else if (el.textContent.length > 0) { el.textContent = el.textContent.slice(0,-1); }
  },
  'DEL':  (el) => {
    if (el.lastChild?.nodeName === 'BR') { el.removeChild(el.lastChild); }
    else if (el.textContent.length > 0) { el.textContent = el.textContent.slice(0,-1); }
  },
  'ESC':  (el) => { el.textContent = ''; while(el.firstChild) el.removeChild(el.firstChild); },
};

// Tokens that map to a single printable char for the typing prompt
const TOKEN_TO_CHAR = { 'SP': ' ', 'TAB': '\t', 'ENT': '\n' };

// ── State ──────────────────────────────────────────────────────────────────
const engine = new KeyEngine();
const layout = new Layout();
const stats  = new Stats();
let layoutData   = null;
let wordList     = [];
let typingArea   = null;
let statsBar     = null;
let regularMode  = false;   // bypass engine, type with normal keyboard
let testMode     = true;    // true = typing test active, false = open writing with WPM
let testActive   = false;
let currentView  = 'training';

// ── DOM refs ───────────────────────────────────────────────────────────────
const $committed      = document.getElementById('committed-text');
const $pending        = document.getElementById('pending-char');
const $status         = document.getElementById('status-line');
const $kbTraining     = document.getElementById('keyboard-training');
const $kbMature       = document.getElementById('keyboard-mature');
const $matrixBody     = document.getElementById('matrix-body');
const $btnSpace       = document.getElementById('btn-space');
const $btnBack        = document.getElementById('btn-back');
const $btnClear       = document.getElementById('btn-clear');
const $btnRegular     = document.getElementById('btn-regular');
const $btnTestMode    = document.getElementById('btn-test-mode');
const $testSection    = document.getElementById('test-section');
const $resultsSection = document.getElementById('results-section');
const $typingArea     = document.getElementById('typing-area');
const $btnRestart     = document.getElementById('btn-restart');
const $btnAgain       = document.getElementById('btn-again');

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const result = await layout.fetch('./docs/layout.json');
  if (!result.ok) { $status.textContent = 'Layout error: ' + result.errors.join(', '); return; }
  layoutData = layout.raw;
  engine.loadLayout(layoutData);
  buildTraining();
  buildMature();

  try {
    const res = await fetch('./words/en-200.json');
    wordList  = await res.json();
  } catch { wordList = ['the','be','to','of','and','in','that','have','it','for']; }

  typingArea = new TypingArea($typingArea, wordList, 30);
  typingArea.onChar = (correct) => stats.commit(correct);
  typingArea.onComplete = () => endTest();

  statsBar = new StatsBar({
    wpm:  document.getElementById('stat-wpm'),
    acc:  document.getElementById('stat-acc'),
    time: document.getElementById('stat-time'),
  }, stats);

  startTest();
  render();
}

// ── Test lifecycle ─────────────────────────────────────────────────────────
function startTest() {
  testActive = true;
  stats.reset();
  statsBar.reset();
  engine.reset();
  $committed.textContent = '';
  while ($committed.firstChild) $committed.removeChild($committed.firstChild);
  $resultsSection.classList.add('hidden');
  if (testMode) {
    $testSection.classList.remove('hidden');
    typingArea.start();
  } else {
    $testSection.classList.add('hidden');
  }
  statsBar.start();
  render();
}

function endTest() {
  testActive = false;
  statsBar.stop();
  const elapsed = stats.elapsed() * 1000 || 10000;
  document.getElementById('res-wpm').textContent   = stats.wpm(elapsed);
  document.getElementById('res-acc').textContent   = stats.accuracy() + '%';
  document.getElementById('res-chars').textContent = stats.committed;
  document.getElementById('res-time').textContent  = stats.elapsed() + 's';
  $resultsSection.classList.remove('hidden');
}

// ── Dispatch committed char from engine ────────────────────────────────────
function dispatchChar(char) {
  // Special token — apply side effect to output area
  if (TOKEN_EFFECTS[char]) {
    TOKEN_EFFECTS[char]($committed);
    if (testActive) stats.commit(true);
    return;
  }

  // Printable char — feed to typing test if active
  if (testActive && testMode) {
    typingArea.commit(char);
  } else if (testActive && !testMode) {
    // Open writing — commit to output and count for WPM
    $committed.textContent += char;
    stats.commit(true);
    // End open writing session when user presses ESC via engine (handled in TOKEN_EFFECTS)
  } else {
    $committed.textContent += char;
  }
}

// ── Key press ──────────────────────────────────────────────────────────────
function handlePress(trigger) {
  flashBtn(trigger);
  const evt = engine.press(trigger);
  if (evt.type === 'pending') {
    $status.textContent = `[${trigger}] pending`;
  } else if (evt.type === 'commit') {
    $status.textContent = `[${evt.firstKey}]→[${evt.secondKey}] idx${evt.idx} → '${evt.char}'`;
    dispatchChar(evt.char);
  }
  render();
}

function handleSpace() {
  flashCtrl($btnSpace);
  if (regularMode) { dispatchChar(' '); render(); return; }
  const evt = engine.space();
  if (evt.type === 'commit')    { dispatchChar(evt.char); $status.textContent = `space → '${evt.char}'`; }
  if (evt.type === 'duplicate') { dispatchChar(evt.char); $status.textContent = `duplicated '${evt.char}'`; }
  render();
}

function handleBackspace() {
  flashCtrl($btnBack);
  if (regularMode) {
    if (testActive && testMode) typingArea.stepBack();
    else TOKEN_EFFECTS['BS']($committed);
    render(); return;
  }
  const evt = engine.backspace();
  if (evt.type === 'cancel') { $status.textContent = `cancelled [${evt.trigger}]`; }
  if (evt.type === 'delete') {
    // Backspace on committed — undo last char in output and step back in test
    if (testActive && testMode) typingArea.stepBack();
    TOKEN_EFFECTS['BS']($committed);
    $status.textContent = `deleted '${evt.char}'`;
  }
  render();
}

function handleClear() {
  flashCtrl($btnClear);
  engine.reset();
  $committed.textContent = '';
  while ($committed.firstChild) $committed.removeChild($committed.firstChild);
  $status.textContent = '';
  render();
}

// ── View toggle ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentView = btn.dataset.view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $kbTraining.classList.toggle('active', currentView === 'training');
    $kbMature.classList.toggle('active',   currentView === 'type');
    render();
  });
});

// ── Regular mode toggle ────────────────────────────────────────────────────
$btnRegular.addEventListener('click', () => {
  regularMode = !regularMode;
  $btnRegular.classList.toggle('active', regularMode);
  $btnRegular.textContent = regularMode ? 'mapcopy' : 'regular';
  engine.reset();
  render();
});

// ── Test mode toggle ───────────────────────────────────────────────────────
$btnTestMode.addEventListener('click', () => {
  testMode = !testMode;
  $btnTestMode.classList.toggle('active', testMode);
  $btnTestMode.textContent = testMode ? 'open' : 'test';
  startTest();
});

$btnRestart.addEventListener('click', startTest);
$btnAgain.addEventListener('click',   () => { $resultsSection.classList.add('hidden'); startTest(); });

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  // Only update pending display — committed-text is managed by dispatchChar
  $pending.textContent = engine.pending ? engine._byT[engine.pending].chars[0] : '';

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
    const char = engine.pending ? engine.resolve(engine.pending, t).char : engine._byT[t].chars[0];
    pv.textContent = char.length > 4 ? char.slice(0,3)+'…' : char;
    pv.className   = 'mkey-preview' + (isSpecial(char) ? ' sp' : '');
  });
}

// ── Flash helpers ──────────────────────────────────────────────────────────
function flashBtn(t) {
  document.querySelectorAll(`[data-t="${CSS.escape(t)}"]`).forEach(el => {
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 110);
  });
}
function flashCtrl(el) {
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 110);
}

// ── Build training keyboard ────────────────────────────────────────────────
function buildTraining() {
  [{ label:'top',    keys: layoutData.slice(0,4)  },
   { label:'home',   keys: layoutData.slice(4,8)  },
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

// ── Build mature keyboard ──────────────────────────────────────────────────
function buildMature() {
  [{ label:'top',    keys: layoutData.slice(0,4)  },
   { label:'home',   keys: layoutData.slice(4,8)  },
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
      td.addEventListener('click', () => { dispatchChar(char); render(); });
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
  // Regular keyboard mode
  if (regularMode) {
    if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
    if (e.key === 'Escape')    { handleClear(); return; }
    if (e.key === ' ')         { e.preventDefault(); dispatchChar(' '); render(); return; }
    if (e.key === 'Enter')     { e.preventDefault(); dispatchChar('\n'); TOKEN_EFFECTS['ENT']($committed); render(); return; }
    if (e.key === 'Tab')       { e.preventDefault(); dispatchChar('\t'); TOKEN_EFFECTS['TAB']($committed); render(); return; }
    if (e.key.length === 1)    { dispatchChar(e.key); $committed.textContent += e.key; if(testActive&&testMode) {} render(); return; }
    return;
  }
  // MapCopy mode
  if (e.key === ' ')         { e.preventDefault(); handleSpace();     return; }
  if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
  if (e.key === 'Escape')    { handleClear(); return; }
  if (!layoutData) return;
  const triggers = layoutData.map(k => k.t);
  if (triggers.includes(e.key))               { e.preventDefault(); handlePress(e.key);               return; }
  if (triggers.includes(e.key.toLowerCase())) { e.preventDefault(); handlePress(e.key.toLowerCase()); }
});

init();
