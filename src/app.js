/**
 * app.js — MapCopy
 * Single responsibility per layer:
 *   KeyEngine  → two-key-pair state machine
 *   TypingArea → word prompt display only
 *   Stats      → WPM / accuracy
 *   StatsBar   → HUD
 *   app.js     → everything else: textarea I/O, token dispatch, modes, UI wiring
 */

import { KeyEngine  } from './engine/KeyEngine.js';
import { Layout     } from './engine/Layout.js';
import { Stats      } from './ui/Stats.js';
import { TypingArea } from './ui/TypingArea.js';
import { StatsBar   } from './ui/StatsBar.js';

// ── Constants ──────────────────────────────────────────────────────────────
const BANDS      = [[8,9,10,11],[0,1,2,3],[4,5,6,7]];
const isSpecial  = c => c.length > 1 || ['…','•','×','÷','±','€','£','¥','©'].includes(c);

// Tokens → what to insert as text
const TOKEN_TEXT = { SP: ' ', TAB: '\t', ENT: '\n' };

// Tokens → cursor movement / edit action (handled in applyToken)
const TOKEN_NAV  = new Set(['BS','DEL','ESC','HOME','END','PGUP','PGDN','←','→','↑','↓']);

// ── State ──────────────────────────────────────────────────────────────────
const engine    = new KeyEngine();
const layout    = new Layout();
const stats     = new Stats();
let layoutData  = null;
let wordList    = [];
let typingArea  = null;
let statsBar    = null;
let regularMode = false;   // true → textarea native, false → MapCopy engine
let testMode    = true;    // true → word prompt, false → open writing
let testActive  = false;
let currentView = 'training';

// ── DOM ────────────────────────────────────────────────────────────────────
const $field     = document.getElementById('output-field');
const $pending   = document.getElementById('pending-char');
const $status    = document.getElementById('status-line');
const $kbTrain   = document.getElementById('keyboard-training');
const $kbMature  = document.getElementById('keyboard-mature');
const $matrix    = document.getElementById('matrix-body');
const $btnSpace  = document.getElementById('btn-space');
const $btnBack   = document.getElementById('btn-back');
const $btnClear  = document.getElementById('btn-clear');
const $btnReg    = document.getElementById('btn-regular');
const $btnTest   = document.getElementById('btn-test-mode');
const $testSec   = document.getElementById('test-section');
const $resultSec = document.getElementById('results-section');
const $prompt    = document.getElementById('typing-area');
const $btnRestart= document.getElementById('btn-restart');
const $btnAgain  = document.getElementById('btn-again');

// ── Textarea helpers ───────────────────────────────────────────────────────
// All writes go through these so MapCopy never triggers our keydown listener.

function insert(text) {
  const s = $field.selectionStart, e = $field.selectionEnd, v = $field.value;
  $field.value = v.slice(0,s) + text + v.slice(e);
  const p = s + text.length;
  $field.selectionStart = $field.selectionEnd = p;
}

function backspace() {
  const s = $field.selectionStart, e = $field.selectionEnd;
  if (s !== e) { insert(''); return; }
  if (s === 0) return;
  $field.value = $field.value.slice(0,s-1) + $field.value.slice(s);
  $field.selectionStart = $field.selectionEnd = s - 1;
}

function del() {
  const s = $field.selectionStart, e = $field.selectionEnd;
  if (s !== e) { insert(''); return; }
  if (s >= $field.value.length) return;
  $field.value = $field.value.slice(0,s) + $field.value.slice(s+1);
  $field.selectionStart = $field.selectionEnd = s;
}

function moveCursor(key) {
  const s = $field.selectionStart, v = $field.value, len = v.length;
  let p = s;
  if      (key === 'HOME' || key === 'PGUP') p = 0;
  else if (key === 'END'  || key === 'PGDN') p = len;
  else if (key === '←'  && s > 0)   p = s - 1;
  else if (key === '→'  && s < len) p = s + 1;
  else if (key === '↑' || key === '↓') {
    const lines    = v.split('\n');
    let row = 0, col = 0, acc = 0;
    for (let i = 0; i < lines.length; i++) {
      if (acc + lines[i].length >= s) { row = i; col = s - acc; break; }
      acc += lines[i].length + 1;
    }
    const targetRow  = key === '↑' ? Math.max(0, row-1) : Math.min(lines.length-1, row+1);
    const targetCol  = Math.min(col, lines[targetRow].length);
    p = lines.slice(0, targetRow).reduce((a,l) => a + l.length + 1, 0) + targetCol;
  }
  $field.selectionStart = $field.selectionEnd = p;
}

// ── Token dispatch ─────────────────────────────────────────────────────────
// Called whenever MapCopy engine commits a char (or regular mode produces one).
function dispatch(char) {
  // Insertable token
  if (TOKEN_TEXT.hasOwnProperty(char)) {
    insert(TOKEN_TEXT[char]);
    feedPrompt(TOKEN_TEXT[char]);
    return;
  }
  // Navigation / edit token
  if (TOKEN_NAV.has(char)) {
    applyToken(char);
    return;
  }
  // Printable char
  insert(char);
  feedPrompt(char);
}

// Feed a single printable char to the typing prompt if test is running
function feedPrompt(char) {
  if (!testActive) return;
  if (testMode) {
    typingArea.push(char);
  } else {
    stats.commit(true);  // open writing — just count
  }
}

function applyToken(token) {
  if (token === 'BS')  { backspace(); if (testActive && testMode) typingArea.pop(); }
  else if (token === 'DEL')  { del(); }
  else if (token === 'ESC')  { $field.value = ''; }
  else moveCursor(token);
}

// ── MapCopy key handlers ───────────────────────────────────────────────────
function pressKey(trigger) {
  flashKey(trigger);
  const evt = engine.press(trigger);
  if (evt.type === 'pending') {
    $pending.textContent = engine._byT[trigger].chars[0];
    $status.textContent  = `[${trigger}] pending`;
  } else if (evt.type === 'commit') {
    $pending.textContent = '';
    $status.textContent  = `[${evt.firstKey}]→[${evt.secondKey}] idx${evt.idx} → '${evt.char}'`;
    dispatch(evt.char);
  }
  renderKb();
}

function pressSpace() {
  flashCtrl($btnSpace);
  const evt = engine.space();
  $pending.textContent = '';
  if (evt.type === 'commit' || evt.type === 'duplicate') {
    dispatch(evt.char);
    $status.textContent = evt.type === 'duplicate' ? `dup '${evt.char}'` : `space → '${evt.char}'`;
  }
  renderKb();
}

function pressBack() {
  flashCtrl($btnBack);
  const evt = engine.backspace();
  $pending.textContent = '';
  if (evt.type === 'cancel') {
    $status.textContent = `cancelled [${evt.trigger}]`;
  } else if (evt.type === 'delete') {
    backspace();
    if (testActive && testMode) typingArea.pop();
    $status.textContent = `deleted '${evt.char}'`;
  }
  renderKb();
}

function pressClear() {
  flashCtrl($btnClear);
  engine.reset();
  $field.value = '';
  $pending.textContent = '';
  $status.textContent  = '';
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
  $pending.textContent = '';
  $resultSec.classList.add('hidden');
  $testSec.classList.toggle('hidden', !testMode);
  if (testMode) typingArea.start();
  statsBar.start();
  $field.focus();
  renderKb();
}

function endTest() {
  testActive = false;
  statsBar.stop();
  const ms = stats.elapsed() * 1000 || 10000;
  document.getElementById('res-wpm').textContent   = stats.wpm(ms);
  document.getElementById('res-acc').textContent   = stats.accuracy() + '%';
  document.getElementById('res-chars').textContent = stats.committed;
  document.getElementById('res-time').textContent  = stats.elapsed() + 's';
  $resultSec.classList.remove('hidden');
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const r = await layout.fetch('./docs/layout.json');
  if (!r.ok) { $status.textContent = 'Layout error: ' + r.errors.join(', '); return; }
  layoutData = layout.raw;
  engine.loadLayout(layoutData);
  buildKb($kbTrain,  true);
  buildKb($kbMature, false);

  try { wordList = await (await fetch('./words/en-200.json')).json(); }
  catch { wordList = ['the','be','to','of','and','in','it','for','you','that']; }

  typingArea = new TypingArea($prompt, wordList, 30);
  typingArea.onChar     = c => stats.commit(c);
  typingArea.onComplete = () => endTest();

  statsBar = new StatsBar({
    wpm:  document.getElementById('stat-wpm'),
    acc:  document.getElementById('stat-acc'),
    time: document.getElementById('stat-time'),
  }, stats);

  startTest();
}

// ── Keyboard handler ───────────────────────────────────────────────────────
$field.addEventListener('keydown', e => {
  if (regularMode) {
    // Full native textarea — only intercept Escape
    if (e.key === 'Escape') { e.preventDefault(); pressClear(); }
    // Count chars for open-mode stats
    if (testActive && !testMode && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      stats.commit(true);
    }
    return;
  }
  // MapCopy mode — block all native input
  e.preventDefault();
  e.stopPropagation();
  if (e.key === ' ')         { pressSpace(); return; }
  if (e.key === 'Backspace') { pressBack();  return; }
  if (e.key === 'Escape')    { pressClear(); return; }
  if (!layoutData) return;
  const triggers = layoutData.map(k => k.t);
  if (triggers.includes(e.key))               { pressKey(e.key);               return; }
  if (triggers.includes(e.key.toLowerCase())) { pressKey(e.key.toLowerCase()); }
});

// ── Render keyboard ────────────────────────────────────────────────────────
function renderKb() {
  document.querySelectorAll('.key-btn, .mkey').forEach(btn => {
    const t   = btn.dataset.t;
    const res = engine.pending ? engine.resolve(engine.pending, t) : null;
    btn.classList.toggle('is-pending', engine.pending === t);
    btn.querySelectorAll('.kc').forEach(cell => {
      cell.classList.toggle('hi', !!(res && res.idx === parseInt(cell.dataset.ci)));
    });
    const pv = btn.querySelector('.mkey-preview');
    if (pv) {
      const char = res ? res.char : engine._byT[t].chars[0];
      pv.textContent = char.length > 4 ? char.slice(0,3)+'…' : char;
      pv.className   = 'mkey-preview' + (isSpecial(char) ? ' sp' : '');
    }
  });
}

// ── Build keyboards ────────────────────────────────────────────────────────
function buildKb(container, training) {
  [{ label:'top',    keys: layoutData.slice(0,4)  },
   { label:'home',   keys: layoutData.slice(4,8)  },
   { label:'bottom', keys: layoutData.slice(8,12) }].forEach(row => {
    const rd = document.createElement('div'); rd.className = 'kb-row';
    const lb = document.createElement('div'); lb.className = 'row-label'; lb.textContent = row.label;
    rd.appendChild(lb);
    row.keys.forEach(key => {
      const btn = document.createElement('button');
      btn.dataset.t = key.t;
      if (training) {
        btn.className = 'key-btn';
        const trig = document.createElement('span'); trig.className = 'key-trigger'; trig.textContent = key.t;
        btn.appendChild(trig);
        BANDS.forEach((group, bi) => {
          const band = document.createElement('div');
          band.className = 'char-band' + (bi < 2 ? ' sep' : '');
          group.forEach(ci => {
            const c = key.chars[ci];
            const sp = document.createElement('span');
            sp.className  = 'kc' + (isSpecial(c) ? ' sp' : '');
            sp.dataset.ci = ci;
            sp.textContent = c.length > 4 ? c.slice(0,3)+'…' : c;
            band.appendChild(sp);
          });
          btn.appendChild(band);
        });
      } else {
        btn.className   = 'mkey';
        btn.innerHTML   = `<span class="mkey-trigger">${key.t}</span><span class="mkey-preview">${key.chars[0]}</span>`;
      }
      btn.addEventListener('mousedown', e => { e.preventDefault(); pressKey(key.t); });
      rd.appendChild(btn);
    });
    container.appendChild(rd);
  });
}

// ── Control buttons ────────────────────────────────────────────────────────
$btnSpace.addEventListener('click',   pressSpace);
$btnBack.addEventListener('click',    pressBack);
$btnClear.addEventListener('click',   pressClear);

$btnReg.addEventListener('click', () => {
  regularMode = !regularMode;
  $btnReg.classList.toggle('active', regularMode);
  $btnReg.textContent = regularMode ? 'mapcopy' : 'regular';
  engine.reset();
  $pending.textContent = '';
  renderKb();
  $field.focus();
});

$btnTest.addEventListener('click', () => {
  testMode = !testMode;
  $btnTest.classList.toggle('active', testMode);
  $btnTest.textContent = testMode ? 'open' : 'test';
  startTest();
});

$btnRestart.addEventListener('click', startTest);
$btnAgain.addEventListener('click',   () => { $resultSec.classList.add('hidden'); startTest(); });

// ── Matrix ─────────────────────────────────────────────────────────────────
document.querySelector('.matrix-panel').addEventListener('toggle', e => {
  if (!e.target.open || $matrix.dataset.built) return;
  $matrix.dataset.built = '1';
  const triggers = layoutData.map(k => k.t);
  const tbl = document.createElement('table'); tbl.className = 'mx-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr'); hr.innerHTML = '<th>↓ 2nd→</th>';
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
      td.title = `${fT}→${sT}`;
      if (isSpecial(char)) td.classList.add('sp');
      td.addEventListener('click', () => { dispatch(char); renderKb(); $field.focus(); });
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); $matrix.appendChild(tbl);
});

// ── Flash helpers ──────────────────────────────────────────────────────────
function flashKey(t) {
  document.querySelectorAll(`[data-t="${CSS.escape(t)}"]`).forEach(el => {
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 110);
  });
}
function flashCtrl(el) {
  if (!el) return;
  el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 110);
}

init();
