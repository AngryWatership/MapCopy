/**
 * LayoutEditor.js
 * Visual 4×3 grid editor for the MapCopy layout.
 * - Click any char cell to edit it inline
 * - Validates: no duplicates, exactly 12 chars per key
 * - Persists to localStorage
 * - Export as JSON download / import from file
 * - Reset to canonical default
 *
 * Usage:
 *   const editor = new LayoutEditor(containerEl, defaultLayout, onLayoutChange);
 *   editor.render();
 */

const STORAGE_KEY = 'mapcopy_layout_v1';

export class LayoutEditor {
  /**
   * @param {HTMLElement}  el              — container
   * @param {object[]}     defaultLayout   — canonical layout array from layout.json
   * @param {function}     onChange        — called with new layout array on every valid change
   */
  constructor(el, defaultLayout, onChange) {
    this._el       = el;
    this._default  = JSON.parse(JSON.stringify(defaultLayout));  // deep copy
    this._layout   = this._load() || JSON.parse(JSON.stringify(defaultLayout));
    this._onChange = onChange;
    this._editing  = null;  // { keyIdx, charIdx }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  render() {
    this._el.innerHTML = '';
    this._el.appendChild(this._buildToolbar());
    this._el.appendChild(this._buildGrid());
    this._el.appendChild(this._buildErrors());
  }

  /** Return current layout (may differ from canonical). */
  get layout() { return JSON.parse(JSON.stringify(this._layout)); }

  // ── Toolbar ────────────────────────────────────────────────────────────

  _buildToolbar() {
    const bar = document.createElement('div');
    bar.className = 'le-toolbar';

    const resetBtn = this._btn('reset to default', () => {
      if (!confirm('Reset layout to canonical default? This cannot be undone.')) return;
      this._layout = JSON.parse(JSON.stringify(this._default));
      this._save();
      this._emit();
      this.render();
    });

    const exportBtn = this._btn('export json', () => {
      const blob = new Blob([JSON.stringify(this._layout, null, 2)], { type: 'application/json' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = 'mapcopy_layout.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    const importLabel = document.createElement('label');
    importLabel.className   = 'le-btn';
    importLabel.textContent = 'import json';
    const importInput = document.createElement('input');
    importInput.type    = 'file';
    importInput.accept  = '.json';
    importInput.style.display = 'none';
    importInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          const err  = this._validate(data);
          if (err) { alert('Invalid layout: ' + err); return; }
          this._layout = data;
          this._save();
          this._emit();
          this.render();
        } catch { alert('Could not parse JSON file.'); }
      };
      reader.readAsText(file);
    });
    importLabel.appendChild(importInput);

    bar.appendChild(resetBtn);
    bar.appendChild(exportBtn);
    bar.appendChild(importLabel);
    return bar;
  }

  // ── Grid ───────────────────────────────────────────────────────────────

  _buildGrid() {
    const grid = document.createElement('div');
    grid.className = 'le-grid';

    const ROW_LABELS = ['top', 'home', 'bottom'];
    const BAND_LABELS = ['↑ row above', '→ same row', '↓ row below'];
    const BANDS = [[8,9,10,11],[0,1,2,3],[4,5,6,7]];

    this._layout.forEach((key, ki) => {
      const rowLabel = ROW_LABELS[Math.floor(ki / 4)];

      const card = document.createElement('div');
      card.className = 'le-key-card';

      const header = document.createElement('div');
      header.className = 'le-key-header';
      header.textContent = key.t;
      card.appendChild(header);

      BANDS.forEach((group, bi) => {
        const bandEl = document.createElement('div');
        bandEl.className = 'le-band';

        const bandLabel = document.createElement('div');
        bandLabel.className   = 'le-band-label';
        bandLabel.textContent = BAND_LABELS[bi];
        bandEl.appendChild(bandLabel);

        const cells = document.createElement('div');
        cells.className = 'le-cells';

        group.forEach(ci => {
          const char = key.chars[ci];
          const cell = document.createElement('div');
          cell.className   = 'le-cell';
          cell.textContent = char;
          cell.dataset.ki  = ki;
          cell.dataset.ci  = ci;
          cell.title       = `key [${key.t}] slot ${ci}`;

          cell.addEventListener('click', () => this._startEdit(cell, ki, ci));
          cells.appendChild(cell);
        });
        bandEl.appendChild(cells);
        card.appendChild(bandEl);
      });

      grid.appendChild(card);
    });

    return grid;
  }

  // ── Inline edit ────────────────────────────────────────────────────────

  _startEdit(cell, ki, ci) {
    // Cancel any existing edit
    this._cancelEdit();

    this._editing = { ki, ci };
    const original = this._layout[ki].chars[ci];

    cell.classList.add('le-cell-editing');
    cell.innerHTML = '';

    const input = document.createElement('input');
    input.className   = 'le-input';
    input.value       = original;
    input.maxLength   = 6;  // allow tokens like 'PGDN'
    input.spellcheck  = false;
    cell.appendChild(input);
    input.focus();
    input.select();

    const commit = () => {
      const val = input.value.trim();
      if (!val) { this._cancelEdit(); return; }
      const err = this._validateCell(ki, ci, val);
      if (err) {
        input.classList.add('le-input-error');
        input.title = err;
        return;
      }
      this._layout[ki].chars[ci] = val;
      this._save();
      this._emit();
      this._editing = null;
      this.render();
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); this._cancelEdit(); }
      e.stopPropagation();  // don't let MapCopy engine see these
    });
    input.addEventListener('blur', commit);
  }

  _cancelEdit() {
    if (!this._editing) return;
    this._editing = null;
    this.render();
  }

  // ── Validation ─────────────────────────────────────────────────────────

  _validateCell(ki, ci, val) {
    // Check for duplicate across entire layout
    const all = this._layout.flatMap((k, i) =>
      k.chars.map((c, j) => ({ c, ki: i, ci: j }))
    );
    const dupe = all.find(e => e.c === val && !(e.ki === ki && e.ci === ci));
    if (dupe) return `'${val}' already used in key [${this._layout[dupe.ki].t}] slot ${dupe.ci}`;
    return null;
  }

  _validate(data) {
    if (!Array.isArray(data) || data.length !== 12) return 'must be array of 12 keys';
    const seen = new Set();
    for (const k of data) {
      if (!k.t || !Array.isArray(k.chars) || k.chars.length !== 12)
        return `key '${k.t}' must have exactly 12 chars`;
      for (const c of k.chars) {
        if (seen.has(c)) return `duplicate char '${c}'`;
        seen.add(c);
      }
    }
    return null;
  }

  _buildErrors() {
    const err = this._validate(this._layout);
    if (!err) return document.createDocumentFragment();
    const div = document.createElement('div');
    div.className   = 'le-error';
    div.textContent = '⚠ ' + err;
    return div;
  }

  // ── Persistence ────────────────────────────────────────────────────────

  _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._layout)); } catch {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (this._validate(data)) return null;
      return data;
    } catch { return null; }
  }

  _emit() {
    if (this._onChange) this._onChange(this.layout);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  _btn(label, onClick) {
    const b = document.createElement('button');
    b.className   = 'le-btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
}
