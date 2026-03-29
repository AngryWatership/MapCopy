# VISION.md
> Long-term research direction for the MapCopy project.
> MapCopy is both the input engine and the optimiser built around it.

---

## The Core Idea

MapCopy is a **laboratory for exploring whether a personalised, measured, iteratively optimised key layout can outperform any universal assumption** — Qwerty, Dvorak, Colemak, or otherwise. MapCopy is both the input engine and the laboratory: a two-key-pair chording system with a measurable, discrete cost per character.

The answer is not a layout. The answer is a **process**.

---

## The Function

```
optimal(user, context, hardware) → layout
```

None of these three inputs are fixed. All three are measured. The output is personal, contextual, and revisable.

---

## The Two-Phase Loop

### Phase A — Measurement (repeatable, standalone)

This phase runs independently of any layout. It only needs the user and their current hardware.

```
1. User selects their 4 most comfortable keys → home row anchor
2. System presents a target pair on screen
3. For each pair, two latencies are recorded:
     L1 = signal-on-screen → first keydown     (recognition + reach cost)
     L2 = first keydown → second keydown        (transition cost)
4. Each pair is presented 4+ times in randomised order → mean per latency, discard outliers
5. Rhythm policy: sweep the presentation speed like a harmonic sweep —
     show targets at progressively faster then slower tempos,
     record where the user breaks down, recovers, and where their natural rhythm lives.
     This is a frequency-response analysis of the user as a system:
     input = stimulus tempo, output = latency + error rate.
     The resonant frequency is the user's natural comfortable pace for that pair.
6. A→A pairs (same key twice) are valid and measured identically.
7. Output: cost_matrix[pair] = f(L1_mean, L2_mean, rhythm_resonance, CV)
```

This phase can be rerun at any time — different day, different physical keyboard, different hand fatigue state. It is not a one-time calibration. It is an ongoing measurement instrument.

The home row anchor ensures the geometry is grounded in the user's own comfort, not an assumed neutral position.

---

### Phase B — Optimisation (runs after Phase A)

```
1. User provides or selects a text corpus representing their use domain:
   - Literature (Shakespeare, novels)
   - Code (Python, JS, C — open source repos)
   - Professional writing (legal, medical, academic)
   - Personal — paste their own documents
   - Mixed — weighted combination

2. System computes character frequency from corpus:
   frequency[char] = count(char) / total_chars
   Also computes bigram frequency:
   bigram_freq[A→B] = count(AB) / total_bigrams

3. Optimisation:
   assign lowest cost_matrix pairs → highest frequency characters
   objective: minimise sum(cost_matrix[pair] × bigram_freq[pair]) across all pairs

4. Output: layout_vN — a ranked assignment of characters to key pairs

5. User can override: manually fix any character to any pair
   Fixed assignments are excluded from the optimiser's search space

6. Test the new layout → rerun Phase A → iterate
```

---

## The Geometry Layer

Hardware is a constraint only in the sense that keys exist. Everything else is free.

The user declares:
- Which physical keys they want to use — any keys, any rows, any count
- Grouping is entirely user-defined: keys from different physical rows can form a logical row
- No hand assignment, no assumed finger mapping, no physical spacing input
- The system does not assume anything about anatomy or reach

All ergonomic cost is **inferred entirely from measured latency**. If two keys are physically far apart but the user is fast and consistent between them, they are cheap. If two adjacent keys produce hesitant, variable latency, they are expensive. The measurement is the geometry.

This means the optimiser is hardware-agnostic. A 12-key grid, a full 100% keyboard, a split board, a foot pedal — the same measurement loop applies.

---

## The Bigram Insight

Most keyboard layout research (Dvorak, Colemak, Workman) optimises **single-key placement**: put the most frequent character on the easiest key.

MapCopy's input model is fundamentally different: every character is a **key pair**. The unit of work is a bigram in the key space, not a single keypress.

**MapCopy's input model is fundamentally different:** every character is a **key pair**. The unit of work is a bigram in the key space, not a single keypress.

This means the optimisation target is also a bigram: place the most frequent **character** on the key pair with the lowest **transition cost**, where transition cost is measured directly from the user's own latency data. All cost is inferred from latency alone — no assumptions about anatomy, reach, or finger strength.

This is a more correct framing of the problem. It has not, to our knowledge, been explored in this form.

---

## Data Sources for Frequency Analysis

Built-in corpora (open source, bundled or fetched):

| Domain | Source |
|---|---|
| English literature | Project Gutenberg — Shakespeare, Austen, Dickens |
| Python code | CPython stdlib, top 100 PyPI packages |
| JavaScript | Node.js core, popular npm packages |
| C/C++ | Linux kernel headers, LLVM |
| Academic writing | ArXiv abstracts (open access) |
| Web prose | Wikipedia plaintext dumps |

User-provided:
- Paste raw text
- Upload `.txt`, `.md`, `.py`, `.js`, `.c` files
- URL fetch (scrape and strip)

Frequency is computed client-side. Text never leaves the browser.

---

## Rhythm Policy (detail)

The measurement session sweeps presentation tempo like a harmonic sweep in systems analysis — the user is treated as a dynamic system, the stimulus tempo is the input frequency, and latency + error rate are the output signal.

The sweep:
- Start slow — give the user time to recognise and respond without pressure
- Accelerate gradually — push toward and past the comfortable pace
- Decelerate — let the user recover
- Repeat per key pair

What this reveals:
- **Resonant frequency** — the tempo at which the user is most fluid for this pair. Low L1 + low L2 + low CV. This is their natural comfortable pace.
- **Breakdown point** — the tempo at which errors appear or latency spikes. This is the ceiling.
- **Recovery shape** — how quickly fluency returns as tempo slows. Sharp recovery = motor skill. Slow recovery = cognitive load.

A pair with a high resonant frequency and a sharp breakdown is a **motor-limited** pair — fast by nature, trainable to go faster.
A pair with a low resonant frequency and a gradual breakdown is a **cognitively loaded** pair — the user has to think. Should be avoided for frequent characters.

The cost assigned to a pair reflects its resonant frequency, not its peak speed or average speed.

---

## Manual Override Layer

The optimiser produces a suggestion. The user always has final say.

- Pin any character to any pair — it is excluded from optimisation
- Swap two characters manually after optimisation
- Mark a pair as forbidden (e.g. a physically painful combination)
- Weight a character as more or less important than its corpus frequency suggests

The layout editor (see ARCHITECTURE.md §4) is the UI for this layer.

---

## Persistence and Portability

### Short term
- Export layout as `layout.json` (already implemented)
- Export measurement session as `session.json` — raw latency data, corpus used, keys declared

### Medium term
- Downloadable profile: `user.mapcopy` — layout + measurements + preferences
- Import on any device — instant personalised layout restoration

### Long term — the driver
- A system-level keyboard remapping driver
- Accepts `user.mapcopy` as input
- Remaps physical key events transparently, OS-wide
- The optimised layout *becomes* the keyboard — no software layer needed at runtime
- Platforms: macOS (Karabiner-Elements integration), Linux (xkb / evdev), Windows (AutoHotkey / KMK)

**Failsafe:** hold Escape for 3 seconds → driver suspends and restores system default layout. Prevents the user from being locked out if a critical key was unmapped.

This closes the loop: the laboratory produces a file, the file becomes hardware behaviour.

---

## What This Is Not (Yet)

- Not a replacement for standard keyboards
- Not a productivity claim ("type faster with MapCopy")

It began as a **curious exploration** of whether the optimal keyboard is a personal measurement, not a universal design. It may become more.

---

## Open Research Questions

| # | Question |
|---|---|
| 1 | Does the rhythm resonant frequency predict long-term comfort better than mean latency alone? |
| 2 | How stable are individual cost matrices across days and fatigue states? |
| 3 | Does optimising for bigram transition cost produce measurably different layouts than single-key frequency optimisation? |
| 4 | What is the minimum number of sweep trials needed for a stable cost matrix? |
| 5 | Can the home row anchor be inferred from Phase A data, or must it always be user-declared? |
| 6 | Does L1 (signal → first key) correlate with character recognition cost, independent of motor cost? |
| 7 | Is the breakdown point under tempo sweep predictive of error rate in real typing sessions? |
| 8 | For users who choose keys from mixed physical rows, does the optimiser still converge? |
| 9 | What is the commercial viability — niche accessibility tool, developer tool, or broader? |

---

*Last updated: session 1*
