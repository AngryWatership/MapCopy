/**
 * app.js — MapCopy bootstrap
 */

import { KeyEngine  } from './engine/KeyEngine.js';
import { Layout     } from './engine/Layout.js';
import { Stats      } from './ui/Stats.js';
import { TypingArea } from './ui/TypingArea.js';
import { StatsBar   } from './ui/StatsBar.js';

// ── Constants ──────────────────────────────────────────────────────────────
const BANDS     = [[8,9,10,11],[0,1,2,3],[4,5,6,7]];
const isSpecial = c => c.length > 1 || ['…','•','×','÷','±','€','£','¥','©'].includes(c);

// Map engine tokens → what gets inserted into the textarea
const TOKEN_INSERT = {
  'SP':  ' ',
  'TAB': '\t',
  'ENT': '\n',
};

// Map engine tokens → keyboard key equivalents for dispatchEvent
const TOKEN_KEY = {
  'BS':   'Backspace',
  'DEL':  'Delete',
  'ESC':  'Escape',
  'HOME': 'Home',
  'END':  'End',
  'PGUP': 'PageUp',
  'PGDN': 'PageDown',
  '←':   'ArrowLeft',
  '→':   'ArrowRight',
  '↑':   'ArrowUp',
  '↓':   'ArrowDown',
};

// ── State ──────────────────────────────────────────────────────────────────
const engine = new KeyEngine();
const layout = new Layout();
const stats  = new Stats();
let layoutData  = null;
let wordList    = [];
let typingArea  = null;
let statsBar    = null;
let regularMode = false;
let testMode    = true;
let testActive  = false;
let currentView = 'training';

// ── DOM refs ───────────────────────────────────────────────────────────────
const $field          = document.getElementById('output-field');
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

// ── Textarea helpers ───────────────────────────────────────────────────────

/** Insert a string at the textarea cursor position */
function fieldInsert(text) {
  const s = $field.selectionStart;
  const e = $field.selectionEnd;
  const v = $field.value;
  $field.value = v.slice(0, s) + text + v.slice(e);
  $field.selectionStart = $field.selectionEnd = s + text.length;
}

/** Delete one character before cursor (backspace) */
function fieldBackspace() {
  const s = $field.selectionStart;
  const e = $field.selectionEnd;
  if (s !== e) {
    // Delete selection
    $field.value = $field.value.slice(0, s) + $field.value.slice(e);
    $field.selectionStart = $field.selectionEnd = s;
  } else if (s > 0) {
    $field.value = $field.value.slice(0, s-1) + $field.value.slice(s);
    $field.selectionStart = $field.selectionEnd = s - 1;
  }
}

/** Delete one character after cursor (delete) */
function fieldDelete() {
  const s = $field.selectionStart;
  const e = $field.selectionEnd;
  if (s !== e) {
    $field.value = $field.value.slice(0, s) + $field.value.slice(e);
    $field.selectionStart = $field.selectionEnd = s;
  } else if (s < $field.value.length) {
    $field.value = $field.value.slice(0, s) + $field.value.slice(s+1);
    $field.selectionStart = $field.selectionEnd = s;
  }
}

/** Move the textarea cursor for navigation keys */
function fieldFireKey(key) {
  // Manipulate cursor directly — no synthetic events to avoid re-triggering our listener
  const s = $field.selectionStart;
  const v = $field.value;
  const len = v.length;
  if (key === 'Home')      { $field.selectionStart = $field.selectionEnd = 0; }
  else if (key === 'End')  { $field.selectionStart = $field.selectionEnd = len; }
  else if (key === 'ArrowLeft'  && s > 0)   { $field.selectionStart = $field.selectionEnd = s - 1; }
  else if (key === 'ArrowRight' && s < len) { $field.selectionStart = $field.selectionEnd = s + 1; }
  else if (key === 'PageUp')   { $field.selectionStart = $field.selectionEnd = 0; }
  else if (key === 'PageDown') { $field.selectionStart = $field.selectionEnd = len; }
  else if (key === 'Escape')   { $field.value = ''; }
  else if (key === 'ArrowUp' || key === 'ArrowDown') {
    // Move to previous/next line
    const lines = v.slice(0, s).split('\n');
    const lineIdx = lines.length - 1;
    const colIdx  = lines[lineIdx].length;
    if (key === 'ArrowUp' && lineIdx > 0) {
      const prevLine = lines[lineIdx - 1];
      const newCol   = Math.min(colIdx, prevLine.length);
      const newPos   = lines.slice(0, lineIdx - 1).join('\n').length + (lineIdx > 1 ? 1 : 0) + newCol;
      $field.selectionStart = $field.selectionEnd = newPos;
    } else if (key === 'ArrowDown') {
      const allLines  = v.split('\n');
      if (lineIdx < allLines.length - 1) {
        const nextLine = allLines[lineIdx + 1];
        const newCol   = Math.min(colIdx, nextLine.length);
        const before   = allLines.slice(0, lineIdx + 1).join('\n').length + 1;
        $field.selectionStart = $field.selectionEnd = before + newCol;
      }
    }
  }
}

// ── Dispatch committed char from engine ────────────────────────────────────
function dispatchChar(char) {
  // Printable insert
  if (TOKEN_INSERT[char] !== undefined) {
    fieldInsert(TOKEN_INSERT[char]);
    if (testActive && testMode) typingArea.commit(TOKEN_INSERT[char] === ' ' ? ' ' : TOKEN_INSERT[char]);
    else if (testActive) stats.commit(true);
    return;
  }
  // Nav / edit keys
  if (TOKEN_KEY[char]) {
    const key = TOKEN_KEY[char];
    if (key === 'Backspace') fieldBackspace();
    else if (key === 'Delete') fieldDelete();
    else fieldFireKey(key);
    if (testActive && testMode && key === 'Backspace') typingArea.stepBack();
    return;
  }
  // Regular printable char
  fieldInsert(char);
  if (testActive && testMode) typingArea.commit(char);
  else if (testActive) stats.commit(true);
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
  renderKb();
}

function handleSpace() {
  flashCtrl($btnSpace);
  if (regularMode) { fieldInsert(' '); if(testActive&&testMode) typingArea.commit(' '); return; }
  const evt = engine.space();
  if (evt.type === 'commit' || evt.type === 'duplicate') {
    dispatchChar(evt.char);
    $status.textContent = evt.type === 'duplicate' ? `duplicated '${evt.char}'` : `space → '${evt.char}'`;
  }
  renderKb();
}

function handleBackspace() {
  flashCtrl($btnBack);
  if (regularMode) {
    fieldBackspace();
    if (testActive && testMode) typingArea.stepBack();
    return;
  }
  const evt = engine.backspace();
  if (evt.type === 'cancel') { $status.textContent = `cancelled [${evt.trigger}]`; }
  if (evt.type === 'delete') {
    fieldBackspace();
    if (testActive && testMode) typingArea.stepBack();
    $status.textContent = `deleted '${evt.char}'`;
  }
  renderKb();
}

function handleClear() {
  flashCtrl($btnClear);
  engine.reset();
  $field.value = '';
  $status.textContent = '';
  renderKb();
  $field.focus();
}

// ── Test lifecycle ─────────────────────────────────────────────────────────
function startTest() {
  testActive = true;
  stats.reset();
  statsBar.reset();
  engine.reset();
  $field.value = '';
  $resultsSection.classList.add('hidden');
  $testSection.classList.toggle('hidden', !testMode);
  if (testMode) typingArea.start();
  statsBar.start();
  $field.focus();
  renderKb();
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

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const result = await layout.fetch('./docs/layout.json');
  if (!result.ok) { $status.textContent = 'Layout error: ' + result.errors.join(', '); return; }
  layoutData = layout.raw;
  engine.loadLayout(layoutData);
  buildTraining();
  buildMature();

  try { wordList = await (await fetch('./words/en-200.json')).json(); }
  catch { wordList = ['the','be','to','of','and','in','that','have','it','for']; }

  typingArea = new TypingArea($typingArea, wordList, 30);
  typingArea.onChar     = (correct) => stats.commit(correct);
  typingArea.onComplete = () => endTest();

  statsBar = new StatsBar({
    wpm:  document.getElementById('stat-wpm'),
    acc:  document.getElementById('stat-acc'),
    time: document.getElementById('stat-time'),
  }, stats);

  startTest();
}

// ── Render keyboard only ───────────────────────────────────────────────────
function renderKb() {
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

// ── View toggle ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentView = btn.dataset.view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $kbTraining.classList.toggle('active', currentView === 'training');
    $kbMature.classList.toggle('active',   currentView === 'type');
    renderKb();
  });
});

// ── Control toggles ────────────────────────────────────────────────────────
$btnRegular.addEventListener('click', () => {
  regularMode = !regularMode;
  $btnRegular.classList.toggle('active', regularMode);
  $btnRegular.textContent = regularMode ? 'mapcopy' : 'regular';
  engine.reset();
  renderKb();
  $field.focus();
});

$btnTestMode.addEventListener('click', () => {
  testMode = !testMode;
  $btnTestMode.classList.toggle('active', testMode);
  $btnTestMode.textContent = testMode ? 'open' : 'test';
  startTest();
});

$btnRestart.addEventListener('click', startTest);
$btnAgain.addEventListener('click', () => { $resultsSection.classList.add('hidden'); startTest(); });
$btnSpace.addEventListener('click', () => { handleSpace();     $field.focus(); });
$btnBack.addEventListener('click',  () => { handleBackspace(); $field.focus(); });
$btnClear.addEventListener('click', () => { handleClear();     $field.focus(); });

// ── Keyboard events ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'BUTTON') return;
  if (regularMode) {
    if (e.key === 'Escape') { e.preventDefault(); handleClear(); return; }
    if (testActive && !testMode && e.key.length === 1) stats.commit(true);
    return;
  }
  // MapCopy mode — we handle everything, block native textarea input
  if (e.key === ' ')         { e.preventDefault(); handleSpace();     return; }
  if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
  if (e.key === 'Escape')    { e.preventDefault(); handleClear();     return; }
  if (!layoutData) return;
  const triggers = layoutData.map(k => k.t);
  if (triggers.includes(e.key))               { e.preventDefault(); handlePress(e.key);               return; }
  if (triggers.includes(e.key.toLowerCase())) { e.preventDefault(); handlePress(e.key.toLowerCase()); return; }
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) e.preventDefault();
});

// ── Matrix (lazy) ──────────────────────────────────────────────────────────
document.querySelector('.matrix-panel').addEventListener('toggle', e => {
  if (e.target.open) buildMatrix();
});

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
      td.addEventListener('click', () => { dispatchChar(char); renderKb(); });
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); $matrixBody.appendChild(tbl);
}

// ── Build keyboards ────────────────────────────────────────────────────────
function buildTraining() {
  [{ label:'top', keys:layoutData.slice(0,4) },
   { label:'home', keys:layoutData.slice(4,8) },
   { label:'bottom', keys:layoutData.slice(8,12) }].forEach(row => {
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
      btn.addEventListener('pointerdown', e => { e.preventDefault(); });
      btn.addEventListener('click', () => { handlePress(key.t); $field.focus(); });
      rd.appendChild(btn);
    });
    $kbTraining.appendChild(rd);
  });
}

function buildMature() {
  [{ label:'top', keys:layoutData.slice(0,4) },
   { label:'home', keys:layoutData.slice(4,8) },
   { label:'bottom', keys:layoutData.slice(8,12) }].forEach(row => {
    const rd = document.createElement('div'); rd.className = 'kb-row';
    const lb = document.createElement('div'); lb.className = 'row-label'; lb.textContent = row.label;
    rd.appendChild(lb);
    row.keys.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'mkey'; btn.dataset.t = key.t;
      btn.innerHTML = `<span class="mkey-trigger">${key.t}</span><span class="mkey-preview">${key.chars[0]}</span>`;
      btn.addEventListener('pointerdown', e => { e.preventDefault(); });
      btn.addEventListener('click', () => { handlePress(key.t); $field.focus(); });
      rd.appendChild(btn);
    });
    $kbMature.appendChild(rd);
  });
}

init();
