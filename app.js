/* ============================================================
   TypeCraft — app.js
   Full rewrite with: mobile support, live stats, caps lock,
   extra chars, punctuation/numbers mode, word-count mode,
   local storage history, personal best, dark/light theme,
   consistency score, raw WPM, chart.js results.
   ============================================================ */

'use strict';

/* ── DOM Refs ─────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const wordsEl        = $('words');
const wordsWrapper   = $('wordsWrapper');
const hiddenInput    = $('hiddenInput');
const timerValue     = $('timerValue');
const timerLabel     = $('timerLabel');
const timerDisplay   = $('timerDisplay');
const capsWarning    = $('capsWarning');
const liveStats      = $('liveStats');
const liveWpmEl      = $('liveWpm');
const liveAccEl      = $('liveAcc');
const liveErrorsEl   = $('liveErrors');
const mobileHint     = $('mobileHint');
const typingCard     = $('typingCard');

const restartBtn     = $('restartBtn');
const themeToggle    = $('themeToggle');
const historyBtn     = $('historyBtn');

const resultOverlay  = $('resultOverlay');
const resultWpm      = $('resultWpm');
const resultAcc      = $('resultAcc');
const resultRaw      = $('resultRaw');
const resultChars    = $('resultChars');
const resultErrors   = $('resultErrors');
const resultConsistency = $('resultConsistency');
const pbBadge        = $('pbBadge');
const closeResult    = $('closeResult');
const resultRestart  = $('resultRestart');
const resultHistory  = $('resultHistory');

const historyModal   = $('historyModal');
const closeHistory   = $('closeHistory');
const historyList    = $('historyList');
const historyEmpty   = $('historyEmpty');
const clearHistory   = $('clearHistory');

const togglePunctuation = $('togglePunctuation');
const toggleNumbers     = $('toggleNumbers');

/* ── State ────────────────────────────────────────────── */
let state = {
  language:   'indonesia',
  mode:       'time',        // 'time' | 'words'
  duration:   30,            // seconds (time mode)
  wordCount:  25,            // target words (words mode)
  punctuation: false,
  numbers:     false,

  words:       [],           // array of word strings for this test
  wordEls:     [],           // array of word DOM elements
  currentWordIdx: 0,
  currentInput:   '',

  started:  false,
  finished: false,

  timeLeft:    30,
  timeElapsed: 0,
  timerInterval: null,
  secondInterval: null,

  correctChars:   0,
  incorrectChars: 0,
  totalTyped:     0,
  errorCount:     0,        // total wrong keypresses

  wpmHistory:     [],       // one entry per second
  rawHistory:     [],
  rawCharsPerSec: 0,        // raw chars accumulated in current second

  chart: null,
};

/* ── Punctuation & Number Sets ────────────────────────── */
const PUNCT_CHARS   = [',', '.', '!', '?', ';', ':',  '"', "'", '-'];
const NUMBER_CHARS  = ['0','1','2','3','4','5','6','7','8','9'];

/* ── Theme ────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('tc_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('tc_theme', theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ── Config Buttons ───────────────────────────────────── */
function initConfigButtons() {
  // Language
  $$('#langOptions .config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#langOptions .config-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.language = btn.dataset.value;
      resetGame();
    });
  });

  // Mode
  $$('#modeOptions .config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#modeOptions .config-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.value;
      $('timeGroup').classList.toggle('hidden', state.mode !== 'time');
      $('wordGroup').classList.toggle('hidden', state.mode !== 'words');
      resetGame();
    });
  });

  // Time options
  $$('#timeOptions .config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#timeOptions .config-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.duration = parseInt(btn.dataset.value, 10);
      resetGame();
    });
  });

  // Word count options
  $$('#wordCountOptions .config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#wordCountOptions .config-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.wordCount = parseInt(btn.dataset.value, 10);
      resetGame();
    });
  });

  // Punctuation toggle
  togglePunctuation.addEventListener('click', () => {
    const active = togglePunctuation.dataset.active === 'true';
    togglePunctuation.dataset.active = String(!active);
    state.punctuation = !active;
    resetGame();
  });

  // Numbers toggle
  toggleNumbers.addEventListener('click', () => {
    const active = toggleNumbers.dataset.active === 'true';
    toggleNumbers.dataset.active = String(!active);
    state.numbers = !active;
    resetGame();
  });
}

/* ── Word Generation ──────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function maybeAddPunct(word) {
  if (!state.punctuation) return word;
  const roll = Math.random();
  if (roll < 0.12) return word + ',';
  if (roll < 0.18) return word + '.';
  if (roll < 0.21) return word + '!';
  if (roll < 0.24) return word + '?';
  if (roll < 0.26) return word + ';';
  if (roll < 0.28) return '"' + word + '"';
  return word;
}

function maybeInsertNumber() {
  if (!state.numbers) return null;
  if (Math.random() < 0.15) {
    return String(Math.floor(Math.random() * 9000) + 1000);
  }
  return null;
}

function generateWords() {
  const pool   = WORD_LISTS[state.language] || WORD_LISTS['english'];
  const count  = state.mode === 'words' ? state.wordCount : 200;
  const result = [];
  const shuffled = shuffle(pool);

  for (let i = 0; result.length < count; i++) {
    const base = shuffled[i % shuffled.length];
    const num  = maybeInsertNumber();
    if (num) result.push(num);
    if (result.length < count) result.push(maybeAddPunct(base));
  }

  return result.slice(0, count);
}

/* ── Render Words ─────────────────────────────────────── */
function renderWords() {
  wordsEl.innerHTML = '';
  state.wordEls = [];

  state.words.forEach((word, wi) => {
    const wordDiv = document.createElement('div');
    wordDiv.className = 'word';
    wordDiv.dataset.index = wi;

    [...word].forEach((ch, li) => {
      const span = document.createElement('span');
      span.className = 'letter' + (wi === 0 && li === 0 ? ' current' : '');
      span.textContent = ch;
      wordDiv.appendChild(span);
    });

    wordsEl.appendChild(wordDiv);
    state.wordEls.push(wordDiv);
  });

  wordsEl.style.transform = 'translateY(0)';
}

/* ── Cursor helpers ───────────────────────────────────── */
function clearCursor() {
  const cur = wordsEl.querySelector('.letter.current');
  if (cur) cur.classList.remove('current');
}

function setCursor(wordIdx, letterIdx) {
  clearCursor();
  const wordEl = state.wordEls[wordIdx];
  if (!wordEl) return;
  const letters = wordEl.querySelectorAll('.letter');
  // cursor goes on the letter at letterIdx, or after last if beyond
  const target = letters[letterIdx] || letters[letters.length - 1];
  if (target) {
    target.classList.add('current');
    if (letterIdx >= letters.length) {
      // place cursor AFTER last real letter — add a pseudo-span
      target.classList.remove('current');
      // we'll just keep cursor on last letter for simplicity
      letters[letters.length - 1].classList.add('current');
    }
  }
}

/* ── Auto-scroll ──────────────────────────────────────── */
function scrollToCurrentWord() {
  const wordEl = state.wordEls[state.currentWordIdx];
  if (!wordEl) return;
  const wrapperTop   = wordsWrapper.getBoundingClientRect().top;
  const wordTop      = wordEl.getBoundingClientRect().top;
  const relTop       = wordTop - wrapperTop;
  const lineHeight   = wordEl.offsetHeight + 10; // approx gap

  if (relTop > lineHeight * 1.5) {
    const currentTransform = new WebKitCSSMatrix
      ? new WebKitCSSMatrix(wordsEl.style.transform).m42
      : parseFloat((wordsEl.style.transform.match(/translateY\((.+)px\)/) || [0,'0'])[1]);
    wordsEl.style.transform = `translateY(${currentTransform - relTop + lineHeight}px)`;
  }
}

/* ── Timer ────────────────────────────────────────────── */
function startTimer() {
  if (state.started) return;
  state.started = true;

  liveStats.classList.remove('hidden');
  mobileHint.classList.add('hidden');

  if (state.mode === 'time') {
    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      state.timeElapsed++;
      updateTimerDisplay();
      recordWpmTick();

      // urgency classes
      timerDisplay.classList.toggle('urgent',   state.timeLeft <= 10 && state.timeLeft > 5);
      timerDisplay.classList.toggle('critical', state.timeLeft <= 5);

      if (state.timeLeft <= 0) finishGame();
    }, 1000);
  } else {
    // words mode — track elapsed time
    state.secondInterval = setInterval(() => {
      state.timeElapsed++;
      timerValue.textContent = state.timeElapsed;
      recordWpmTick();
    }, 1000);
  }
}

function stopTimer() {
  clearInterval(state.timerInterval);
  clearInterval(state.secondInterval);
}

function updateTimerDisplay() {
  timerValue.textContent = state.timeLeft;
}

function recordWpmTick() {
  const minutes = state.timeElapsed / 60;
  const wpm     = minutes > 0 ? Math.round((state.correctChars / 5) / minutes) : 0;
  const rawWpm  = minutes > 0 ? Math.round(((state.correctChars + state.incorrectChars) / 5) / minutes) : 0;
  state.wpmHistory.push(wpm);
  state.rawHistory.push(rawWpm);

  // update live stats
  liveWpmEl.textContent    = wpm;
  liveAccEl.textContent    = state.totalTyped > 0
    ? Math.round((state.correctChars / state.totalTyped) * 100)
    : 100;
  liveErrorsEl.textContent = state.errorCount;
}

/* ── Caps Lock Detection ──────────────────────────────── */
function handleCapsLock(e) {
  if (e.getModifierState) {
    const caps = e.getModifierState('CapsLock');
    capsWarning.classList.toggle('hidden', !caps);
  }
}

/* ── Input Handling ───────────────────────────────────── */
hiddenInput.addEventListener('input', handleInput);
hiddenInput.addEventListener('keydown', handleKeydown);
hiddenInput.addEventListener('keyup', handleCapsLock);
hiddenInput.addEventListener('keydown', handleCapsLock);

function handleKeydown(e) {
  if (state.finished) return;

  // Tab+Enter = restart
  if (e.key === 'Tab') { e.preventDefault(); }

  // Backspace
  if (e.key === 'Backspace') {
    e.preventDefault();
    handleBackspace(e.ctrlKey || e.metaKey);
    return;
  }
}

function handleInput(e) {
  if (state.finished) return;

  const raw = hiddenInput.value;

  // Start timer on first input
  if (!state.started && raw.length > 0) startTimer();

  const currentWordStr = state.words[state.currentWordIdx] || '';

  // Space / advance word
  if (raw.endsWith(' ')) {
    hiddenInput.value = '';
    state.currentInput = '';
    advanceWord();
    return;
  }

  state.currentInput = raw;
  hiddenInput.value  = raw; // keep in sync

  // Render letters for current word
  renderWordLetters(state.currentWordIdx, raw, currentWordStr);
  setCursor(state.currentWordIdx, raw.length);
  updateLiveStats();
}

function handleBackspace(ctrl) {
  if (state.finished) return;

  if (ctrl) {
    // ctrl+backspace: clear whole current word input
    state.currentInput = '';
    hiddenInput.value  = '';
    renderWordLetters(state.currentWordIdx, '', state.words[state.currentWordIdx]);
    setCursor(state.currentWordIdx, 0);
    return;
  }

  if (state.currentInput.length > 0) {
    state.currentInput = state.currentInput.slice(0, -1);
    hiddenInput.value  = state.currentInput;
    renderWordLetters(state.currentWordIdx, state.currentInput, state.words[state.currentWordIdx]);
    setCursor(state.currentWordIdx, state.currentInput.length);
  }
  // (no going back to previous word — consistent with monkeytype default)
}

function renderWordLetters(wordIdx, typed, target) {
  const wordEl  = state.wordEls[wordIdx];
  if (!wordEl) return;

  // Remove old extra spans
  wordEl.querySelectorAll('.letter.extra').forEach(s => s.remove());

  const letters = wordEl.querySelectorAll('.letter');

  // reset stats contribution for this word before recalculating
  // (we track cumulatively via advanceWord, so here just visual)
  let local = { correct: 0, incorrect: 0 };

  letters.forEach((span, i) => {
    span.classList.remove('correct', 'incorrect', 'current');
    if (i < typed.length) {
      if (typed[i] === target[i]) {
        span.classList.add('correct');
        local.correct++;
      } else {
        span.classList.add('incorrect');
        local.incorrect++;
      }
    }
  });

  // Extra characters beyond word length
  if (typed.length > target.length) {
    const extra = typed.slice(target.length);
    [...extra].forEach(ch => {
      const span = document.createElement('span');
      span.className = 'letter extra';
      span.textContent = ch;
      wordEl.appendChild(span);
    });
  }

  // Mark word as having errors
  const hasError = local.incorrect > 0 || typed.length > target.length;
  wordEl.classList.toggle('incorrect-word', hasError && typed.length > 0);
}

function advanceWord() {
  const typed  = state.currentInput || hiddenInput.value.trim();
  const target = state.words[state.currentWordIdx];

  if (!target) return;

  // Count chars
  let correct   = 0;
  let incorrect = 0;

  const len = Math.max(typed.length, target.length);
  for (let i = 0; i < len; i++) {
    if (i < typed.length && i < target.length) {
      if (typed[i] === target[i]) correct++;
      else { incorrect++; state.errorCount++; }
    } else if (i < typed.length) {
      // extra chars
      incorrect++;
      state.errorCount++;
    } else {
      // missed chars
      incorrect++;
      state.errorCount++;
    }
  }

  state.correctChars   += correct;
  state.incorrectChars += incorrect;
  state.totalTyped     += typed.length;

  // Finalize visual state for this word
  renderWordLetters(state.currentWordIdx, typed, target);
  clearCursor();

  state.currentWordIdx++;
  state.currentInput = '';
  hiddenInput.value  = '';

  // Words mode: check if done
  if (state.mode === 'words' && state.currentWordIdx >= state.words.length) {
    finishGame();
    return;
  }

  if (state.currentWordIdx < state.wordEls.length) {
    setCursor(state.currentWordIdx, 0);
    scrollToCurrentWord();
  }

  updateLiveStats();
}

function updateLiveStats() {
  if (!state.started) return;
  const minutes = state.timeElapsed / 60;
  const wpm     = minutes > 0 ? Math.round((state.correctChars / 5) / minutes) : 0;
  const acc     = state.totalTyped > 0
    ? Math.round((state.correctChars / state.totalTyped) * 100)
    : 100;
  liveWpmEl.textContent    = wpm;
  liveAccEl.textContent    = acc;
  liveErrorsEl.textContent = state.errorCount;
}

/* ── Focus Management ─────────────────────────────────── */
// Click anywhere in typing card to focus
typingCard.addEventListener('click', () => focusInput());
wordsWrapper.addEventListener('click', () => focusInput());

function focusInput() {
  hiddenInput.focus();
  hiddenInput.setSelectionRange(hiddenInput.value.length, hiddenInput.value.length);
}

// Keep focus when clicking outside (desktop)
document.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); }
  if (resultOverlay.classList.contains('hidden') &&
      historyModal.classList.contains('hidden') &&
      document.activeElement !== hiddenInput) {
    hiddenInput.focus();
  }
  // Tab pressed: arm next Enter as restart
  if (e.key === 'Tab') { document._tabArmed = true; }
});

document.addEventListener('keyup', e => {
  if (e.key === 'Enter' && document._tabArmed) {
    document._tabArmed = false;
    resetGame();
  }
  if (e.key !== 'Tab') { document._tabArmed = false; }
});

/* ── Finish Game ──────────────────────────────────────── */
function finishGame() {
  if (state.finished) return;
  state.finished = true;
  stopTimer();
  clearCursor();

  if (state.mode === 'time') {
    state.timeElapsed = state.duration - state.timeLeft + 1;
  }

  const minutes   = Math.max(state.timeElapsed, 1) / 60;
  const wpm       = Math.round((state.correctChars / 5) / minutes);
  const rawWpm    = Math.round(((state.correctChars + state.incorrectChars) / 5) / minutes);
  const acc       = state.totalTyped > 0
    ? Math.round((state.correctChars / state.totalTyped) * 100) : 100;
  const consistency = calcConsistency(state.wpmHistory);

  // Check personal best
  const pb = getPersonalBest(state.language, state.mode, state.duration || state.wordCount);
  const isNewPb = wpm > (pb || 0);

  // Save to history
  saveResult({
    wpm, rawWpm, acc, consistency,
    correct: state.correctChars,
    incorrect: state.incorrectChars,
    errors: state.errorCount,
    language: state.language,
    mode: state.mode,
    setting: state.mode === 'time' ? state.duration : state.wordCount,
    time: state.timeElapsed,
    isPb: isNewPb,
    date: new Date().toISOString(),
  });

  if (isNewPb) updatePersonalBest(state.language, state.mode, state.duration || state.wordCount, wpm);

  showResult({ wpm, rawWpm, acc, consistency, isNewPb });
}

function calcConsistency(history) {
  if (history.length < 2) return 100;
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  if (avg === 0) return 100;
  const variance = history.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / history.length;
  const cv = Math.sqrt(variance) / avg;
  return Math.max(0, Math.round((1 - cv) * 100));
}

/* ── Show Result ──────────────────────────────────────── */
function showResult({ wpm, rawWpm, acc, consistency, isNewPb }) {
  resultWpm.textContent         = wpm;
  resultAcc.textContent         = acc + '%';
  resultRaw.textContent         = rawWpm;
  resultChars.textContent       = `${state.correctChars}/${state.incorrectChars}`;
  resultErrors.textContent      = state.errorCount;
  resultConsistency.textContent = consistency + '%';

  pbBadge.classList.toggle('hidden', !isNewPb);

  renderChart();
  resultOverlay.classList.remove('hidden');
}

function renderChart() {
  const ctx = document.getElementById('wpmChart').getContext('2d');
  if (state.chart) { state.chart.destroy(); state.chart = null; }

  const isDark   = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor  = isDark ? '#7c8db5' : '#5a6480';
  const accentColor= isDark ? '#e879f9' : '#9333ea';
  const rawColor   = isDark ? '#7c8db5' : '#9aa3be';

  const labels = state.wpmHistory.map((_, i) => i + 1);

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'WPM',
          data: state.wpmHistory,
          borderColor: accentColor,
          backgroundColor: isDark ? 'rgba(232,121,249,0.08)' : 'rgba(147,51,234,0.08)',
          borderWidth: 2,
          pointRadius: state.wpmHistory.length > 30 ? 0 : 3,
          pointBackgroundColor: accentColor,
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Raw',
          data: state.rawHistory,
          borderColor: rawColor,
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { color: textColor, font: { family: 'JetBrains Mono', size: 11 }, boxWidth: 12 } },
        tooltip: { backgroundColor: isDark ? '#1a1a2e' : '#fff', titleColor: textColor, bodyColor: textColor, borderColor: isDark ? '#2a2a45' : '#d1d5e8', borderWidth: 1 },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 10 } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } }, beginAtZero: true },
      },
    },
  });
}

/* ── Local Storage ────────────────────────────────────── */
const STORAGE_KEY    = 'tc_history';
const PB_KEY         = 'tc_pb';
const MAX_HISTORY    = 100;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveResult(result) {
  const history = loadHistory();
  history.unshift(result);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getPersonalBest(lang, mode, setting) {
  try {
    const pbs = JSON.parse(localStorage.getItem(PB_KEY)) || {};
    return pbs[`${lang}_${mode}_${setting}`] || 0;
  } catch { return 0; }
}

function updatePersonalBest(lang, mode, setting, wpm) {
  try {
    const pbs = JSON.parse(localStorage.getItem(PB_KEY)) || {};
    pbs[`${lang}_${mode}_${setting}`] = wpm;
    localStorage.setItem(PB_KEY, JSON.stringify(pbs));
  } catch {}
}

/* ── History Modal ────────────────────────────────────── */
let activeFilter = 'all';

historyBtn.addEventListener('click', openHistory);
closeHistory.addEventListener('click', () => historyModal.classList.add('hidden'));
resultHistory.addEventListener('click', () => {
  resultOverlay.classList.add('hidden');
  openHistory();
});

$$('.history-filters .config-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.history-filters .config-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderHistoryList();
  });
});

clearHistory.addEventListener('click', () => {
  if (confirm('Clear all history? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistoryList();
  }
});

function openHistory() {
  renderHistoryList();
  historyModal.classList.remove('hidden');
}

function renderHistoryList() {
  const all = loadHistory();
  const filtered = activeFilter === 'all'
    ? all
    : all.filter(r => r.language === activeFilter);

  historyList.innerHTML = '';

  if (filtered.length === 0) {
    historyEmpty.classList.remove('hidden');
    return;
  }
  historyEmpty.classList.add('hidden');

  filtered.forEach(r => {
    const entry = document.createElement('div');
    entry.className = 'history-entry';

    const date = new Date(r.date);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const modeLabel = r.mode === 'time' ? `${r.setting}s` : `${r.setting}w`;
    const langFlag  = r.language === 'indonesia' ? '🇮🇩' : '🇬🇧';

    entry.innerHTML = `
      <div class="history-entry-left">
        <div class="history-entry-main">
          <span class="history-wpm">${r.wpm}</span>
          <span class="history-acc">${r.acc}%</span>
          ${r.isPb ? '<span class="history-pb-tag">PB</span>' : ''}
        </div>
        <div class="history-meta">
          <span>${langFlag} ${r.language}</span>
          <span>·</span>
          <span>${modeLabel}</span>
          <span>·</span>
          <span>raw ${r.rawWpm}</span>
          <span>·</span>
          <span>${r.correct}/${r.incorrect} chars</span>
        </div>
      </div>
      <div class="history-date">${dateStr}<br>${timeStr}</div>
    `;

    historyList.appendChild(entry);
  });
}

/* ── Close modals on overlay click ───────────────────── */
resultOverlay.addEventListener('click', e => {
  if (e.target === resultOverlay) resultOverlay.classList.add('hidden');
});
historyModal.addEventListener('click', e => {
  if (e.target === historyModal) historyModal.classList.add('hidden');
});

/* ── Restart ──────────────────────────────────────────── */
restartBtn.addEventListener('click', resetGame);
closeResult.addEventListener('click', () => {
  resultOverlay.classList.add('hidden');
  resetGame();
});
resultRestart.addEventListener('click', () => {
  resultOverlay.classList.add('hidden');
  resetGame();
});

/* ── Reset Game ───────────────────────────────────────── */
function resetGame() {
  stopTimer();

  if (state.chart) { state.chart.destroy(); state.chart = null; }

  // Reset state
  state.words          = generateWords();
  state.wordEls        = [];
  state.currentWordIdx = 0;
  state.currentInput   = '';
  state.started        = false;
  state.finished       = false;
  state.timeLeft       = state.duration;
  state.timeElapsed    = 0;
  state.correctChars   = 0;
  state.incorrectChars = 0;
  state.totalTyped     = 0;
  state.errorCount     = 0;
  state.wpmHistory     = [];
  state.rawHistory     = [];

  // Reset UI
  timerDisplay.classList.remove('urgent', 'critical');
  liveStats.classList.add('hidden');
  capsWarning.classList.add('hidden');
  mobileHint.classList.remove('hidden');
  hiddenInput.value = '';

  if (state.mode === 'time') {
    timerValue.textContent = state.duration;
    timerLabel.textContent = 'seconds';
  } else {
    timerValue.textContent = '0';
    timerLabel.textContent = 'elapsed';
  }

  liveWpmEl.textContent    = '0';
  liveAccEl.textContent    = '100';
  liveErrorsEl.textContent = '0';

  renderWords();
  setCursor(0, 0);

  // Focus after short delay to handle mobile
  setTimeout(() => focusInput(), 50);
}

/* ── Mobile: Virtual Keyboard ─────────────────────────── */
// On mobile, tapping the card opens keyboard
typingCard.addEventListener('touchend', e => {
  // Don't interfere with button taps
  if (e.target.closest('button')) return;
  e.preventDefault();
  focusInput();
}, { passive: false });

// Detect mobile for hint
function isMobile() {
  return /Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) || window.innerWidth < 640;
}

/* ── Textarea: prevent default behaviors on mobile ────── */
hiddenInput.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
hiddenInput.addEventListener('focus', () => {
  mobileHint.classList.add('hidden');
});
hiddenInput.addEventListener('blur', () => {
  if (!state.finished) {
    mobileHint.classList.remove('hidden');
  }
});

/* ── Init ─────────────────────────────────────────────── */
function init() {
  initTheme();
  initConfigButtons();

  // Hide mobile hint on desktop
  if (!isMobile()) mobileHint.classList.add('hidden');

  resetGame();
}

init();
