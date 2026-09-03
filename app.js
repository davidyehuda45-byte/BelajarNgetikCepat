/* ==========================================================================
 * app.js — Lapisan UI: DOM, input (fisik + layar), timer, hasil, pengaturan.
 * Semua perhitungan ada di engine.js supaya bisa diuji.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- guard */
  if (!window.TypeCraft || !window.TypeCraftStore) {
    document.body.innerHTML =
      '<p style="padding:2rem;font-family:monospace;color:#ff5555">' +
      'Gagal memuat aplikasi. Pastikan file engine.js, store.js, words.js, ' +
      'chart.js, dan keyboard.js ikut ter-upload.</p>';
    return;
  }

  var Engine = window.TypeCraft.Engine;
  var Store = window.TypeCraftStore;
  var Chart = window.TypeCraftChart;
  var Data = window.TypeCraftData || { QUOTES: { indonesia: ['kata'], english: ['word'] }, CODE_SNIPPETS: {} };

  /* ---------------------------------------------------------------- dom */
  function $(id) { return document.getElementById(id); }

  var wordsEl = $('words');
  var wordsWrapper = $('words-wrapper');
  var caretEl = $('caret');
  var input = $('typing-input');
  var timerEl = $('timer');
  var resultContainer = $('result-container');
  var tapHint = $('tap-hint');
  var restartBtn = $('restart-btn');
  var valueSelector = $('value-selector');
  var progressFill = $('progress-fill');
  var liveWpmEl = $('live-wpm');
  var liveAccEl = $('live-acc');
  var liveChartEl = $('live-chart');
  var toastEl = $('toast');
  var scrim = $('scrim');
  var vkbdMount = $('vkbd-mount');

  /* ------------------------------------------------------------- state */
  var settings = Store.getSettings();
  var engine = null;
  var loopTimer = null;
  var lastLoopTime = 0;
  var lastSampleSecond = -1;
  var wordEls = [];
  var renderedFrom = 0;
  var translateY = 0;
  var vkbd = null;
  var vkbdVisible = false;
  var vkbdActive = false;
  var drawerOpen = null;
  var lastResult = null;
  var audioCtx = null;

  var KEEP_BEHIND = 10;     // jumlah kata riwayat yang tetap ditampilkan
  var MAX_RENDERED = 200;   // batas node kata sebelum DOM dibangun ulang

  /* ------------------------------------------------------------- themes */
  var THEMES = {
    pink:   { label: 'pink',   bg: '#1e1e2e', main: '#ff79c6', sub: '#6272a4', text: '#f8f8f2', error: '#ff5555' },
    serika: { label: 'serika', bg: '#323437', main: '#e2b714', sub: '#646669', text: '#d1d0c5', error: '#ca4754' },
    ocean:  { label: 'ocean',  bg: '#0b132b', main: '#4cc9f0', sub: '#4a6fa5', text: '#e0fbfc', error: '#ef476f' },
    forest: { label: 'forest', bg: '#0f1d14', main: '#7ee787', sub: '#4a7c59', text: '#e6ffed', error: '#ff7b72' },
    dracula:{ label: 'dracula',bg: '#282a36', main: '#bd93f9', sub: '#6272a4', text: '#f8f8f2', error: '#ff5555' },
    light:  { label: 'light',  bg: '#f5f5f7', main: '#e11d48', sub: '#9ca3af', text: '#1f2937', error: '#b91c1c' }
  };

  function applyTheme(name) {
    var t = THEMES[name] || THEMES.pink;
    var root = document.documentElement;
    root.style.setProperty('--bg-color', t.bg);
    root.style.setProperty('--main-color', t.main);
    root.style.setProperty('--sub-color', t.sub);
    root.style.setProperty('--text-color', t.text);
    root.style.setProperty('--error-color', t.error);
    root.style.setProperty('--surface', Chart.hexToRgba(t.text, 0.06));
    root.style.setProperty('--main-soft', Chart.hexToRgba(t.main, 0.18));
    root.style.setProperty('--main-softer', Chart.hexToRgba(t.main, 0.4));
    root.style.setProperty('--sub-soft', Chart.hexToRgba(t.sub, 0.25));
    root.style.setProperty('--overlay', Chart.hexToRgba(t.bg, 0.8));
    root.style.setProperty('--vkbd-bg', Chart.hexToRgba(t.bg, 0.97));
    var meta = $('meta-theme-color');
    if (meta) meta.setAttribute('content', t.bg);
    root.classList.toggle('theme-light', name === 'light');
  }

  /* -------------------------------------------------------------- sound */
  function playSound(ok) {
    if (!settings.sound) return;
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = ok ? 1400 : 520;
      gain.gain.value = 0.03;
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) { /* audio tidak tersedia — abaikan */ }
  }

  /* -------------------------------------------------------------- toast */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------------------------------------------------- bangun kata di DOM */
  function paintWord(el, index) {
    var word = engine.words[index];
    var typed = engine.typed[index] || '';
    var total = Math.max(word.length, typed.length);

    if (el.childElementCount !== total) {
      el.textContent = '';
      for (var n = 0; n < total; n++) el.appendChild(document.createElement('span'));
    }
    for (var i = 0; i < total; i++) {
      var span = el.children[i];
      var ch = i < word.length ? word.charAt(i) : typed.charAt(i);
      if (span.textContent !== ch) span.textContent = ch;

      var cls = 'letter';
      if (i < typed.length) {
        if (i >= word.length) cls += ' incorrect extra';
        else cls += (typed.charAt(i) === word.charAt(i)) ? ' correct' : ' incorrect';
      }
      if (span.className !== cls) span.className = cls;
    }

    var done = index < engine.wordIndex;
    el.classList.toggle('word--current', index === engine.wordIndex);
    el.classList.toggle('word--done', done);
    el.classList.toggle('word--error', done && typed !== word);
  }

  function buildWordEl(index) {
    var el = document.createElement('div');
    el.className = 'word';
    paintWord(el, index);
    return el;
  }

  function rebuildWords() {
    renderedFrom = Math.max(0, engine.wordIndex - KEEP_BEHIND);
    var old = wordsEl.querySelectorAll('.word');
    for (var i = 0; i < old.length; i++) old[i].remove();
    wordEls = [];
    var frag = document.createDocumentFragment();
    for (var w = renderedFrom; w < engine.words.length; w++) {
      var el = buildWordEl(w);
      wordEls.push(el);
      frag.appendChild(el);
    }
    wordsEl.appendChild(frag);
    translateY = -1; // paksa hitung ulang
    scrollToCurrentLine(false);
  }

  function syncWordsDom() {
    if (wordEls.length === 0 || wordEls.length > MAX_RENDERED) { rebuildWords(); return; }
    for (var i = renderedFrom + wordEls.length; i < engine.words.length; i++) {
      var el = buildWordEl(i);
      wordEls.push(el);
      wordsEl.appendChild(el);
    }
  }

  function repaintChangedWords() {
    var start = engine.wordIndex - renderedFrom;
    for (var i = Math.max(0, start - 1); i <= Math.min(wordEls.length - 1, start); i++) {
      paintWord(wordEls[i], renderedFrom + i);
    }
  }

  function currentWordEl() { return wordEls[engine.wordIndex - renderedFrom] || null; }

  /* ------------------------------------------------------------ scrolling */
  function lineHeightPx() {
    var probe = wordEls[0] || null;
    if (probe && probe.offsetHeight) {
      var gap = parseFloat(getComputedStyle(wordsEl).rowGap);
      return probe.offsetHeight + (isFinite(gap) ? gap : 0);
    }
    return 48; // fallback sebelum layout tersedia
  }

  function scrollToCurrentLine(animate) {
    var el = currentWordEl();
    if (!el) return;
    var lh = lineHeightPx();
    var target = Math.max(0, el.offsetTop - lh); // sisakan 1 baris riwayat
    if (target === translateY) return;
    translateY = target;
    wordsEl.style.transition = animate === false ? 'none' : 'transform 0.18s ease-out';
    wordsEl.style.transform = 'translateY(' + (-target) + 'px)';
    if (animate === false) {
      void wordsEl.offsetHeight; // flush agar transition:none benar-benar terpakai
      wordsEl.style.transition = '';
    }
  }

  /* --------------------------------------------------------------- kursor */
  function isInputActive() {
    return document.activeElement === input || (vkbdVisible && vkbdActive);
  }

  function updateCaret() {
    if (settings.caretStyle === 'off' || !isInputActive() || !engine || engine.status === 'finished') {
      caretEl.style.opacity = '0';
      return;
    }
    var wordEl = currentWordEl();
    if (!wordEl || !wordEl.children.length) { caretEl.style.opacity = '0'; return; }

    var idx = (engine.typed[engine.wordIndex] || '').length;
    var atEnd = idx >= wordEl.children.length;
    var ref = atEnd ? wordEl.children[wordEl.children.length - 1] : wordEl.children[idx];
    var underline = settings.caretStyle === 'underline';

    caretEl.style.opacity = '1';
    caretEl.style.height = (underline ? 3 : ref.offsetHeight) + 'px';
    caretEl.style.width = settings.caretStyle === 'line' ? '2px' : Math.max(2, ref.offsetWidth) + 'px';
    var x = atEnd ? ref.offsetLeft + ref.offsetWidth : ref.offsetLeft;
    var y = underline ? ref.offsetTop + ref.offsetHeight - 3 : ref.offsetTop;
    caretEl.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    caretEl.classList.toggle('blink', engine.status !== 'running');
  }

  /* --------------------------------------------------------- input engine */
  function afterChange(repaintAll) {
    if (repaintAll) rebuildWords(); else { syncWordsDom(); repaintChangedWords(); }
    scrollToCurrentLine(true);
    updateCaret();
    updateLiveStats();
    updateProgress();
    highlightNextKey();
  }

  function ensureRunning() {
    if (!engine || engine.status === 'finished') return false;
    if (engine.status === 'idle') startLoop();
    return true;
  }

  function typeChar(ch) {
    if (!ensureRunning()) return;
    if (ch === ' ') { submitWord(); return; }
    var res = engine.typeChar(ch);
    if (!res) return;
    playSound(res.state === 'correct');
    if (vkbd && vkbdVisible) vkbd.flash(ch, res.state === 'correct');
    if (settings.typoStop && res.state !== 'correct') {
      afterChange(false);
      wordsWrapper.classList.add('shake');
      setTimeout(function () { wordsWrapper.classList.remove('shake'); }, 260);
      return;
    }
    afterChange(false);
  }

  function submitWord() {
    if (!ensureRunning()) return;
    var res = engine.submitWord();
    if (!res) return;
    if (res.blocked) {
      wordsWrapper.classList.add('shake');
      setTimeout(function () { wordsWrapper.classList.remove('shake'); }, 260);
      return;
    }
    playSound(true);
    if (res.finished) { finishTest(); return; }
    afterChange(false);
  }

  function backspace() {
    if (!engine || engine.status === 'finished') return;
    engine.backspace();
    afterChange(false);
  }

  function backspaceWord() {
    if (!engine || engine.status === 'finished') return;
    engine.backspaceWord();
    afterChange(false);
  }

  /* ------------------------------------------------------------ timer loop */
  function startLoop() {
    stopLoop();
    lastLoopTime = performance.now();
    lastSampleSecond = -1;
    loopTimer = setInterval(loopTick, 100);
  }

  function stopLoop() {
    if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  }

  function loopTick() {
    var now = performance.now();
    if (document.hidden || !engine || engine.status !== 'running') {
      lastLoopTime = now;   // jeda saat tab/aplikasi di-background (penting di HP)
      return;
    }
    var delta = Math.min(1000, now - lastLoopTime);
    lastLoopTime = now;

    engine.tick(delta);

    var second = Math.floor(engine.elapsedMs / 1000);
    if (second > lastSampleSecond) {
      lastSampleSecond = second;
      engine.sample();
      if (settings.liveChart) drawSparkline();
    }

    updateTimerDisplay();
    updateLiveStats();
    updateProgress();

    if (engine.status === 'finished') finishTest();
  }

  /* -------------------------------------------------------- live stats UI */
  function updateLiveStats() {
    if (!engine) return;
    var s = engine.stats();
    liveWpmEl.textContent = s.wpm;
    liveAccEl.textContent = Math.round(s.acc) + '%';
  }

  function updateTimerDisplay() {
    if (!engine) return;
    if (engine.mode === 'time') {
      timerEl.textContent = engine.remainingSeconds();
    } else if (engine.mode === 'zen') {
      timerEl.textContent = Math.floor(engine.elapsedMs / 1000) + 's';
    } else {
      timerEl.textContent = Math.min(engine.wordIndex + 1, engine.words.length) + '/' + engine.words.length;
    }
  }

  function updateProgress() {
    if (!engine) return;
    var zen = engine.mode === 'zen';
    progressFill.parentNode.classList.toggle('hidden', zen);
    progressFill.style.width = zen ? '0%' : (engine.progress() * 100).toFixed(1) + '%';
  }

  function drawSparkline() {
    if (!liveChartEl || !engine) return;
    var samples = engine.samples;
    var ctx = liveChartEl.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = liveChartEl.clientWidth || 160;
    var h = 44;
    liveChartEl.width = w * dpr;
    liveChartEl.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (samples.length < 2) return;

    var max = Chart.niceMax(Math.max.apply(null, samples.map(function (s) { return s.wpm; })));
    var style = getComputedStyle(document.documentElement);
    ctx.strokeStyle = style.getPropertyValue('--main-color').trim() || '#ff79c6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach(function (s, i) {
      var x = (i / (samples.length - 1)) * w;
      var y = h - (s.wpm / max) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  /* ------------------------------------------------------------ lifecycle */
  function wordsForTest() {
    var lang = settings.language;
    if (settings.mode === 'quote') {
      var list = (Data.QUOTES && Data.QUOTES[lang]) || Data.QUOTES.indonesia;
      var q = list[Math.floor(Math.random() * list.length)];
      return q.split(' ').filter(Boolean);
    }
    if (settings.mode === 'code') {
      var variant = settings.codeVariant || 'javascript';
      var snippets = (Data.CODE_SNIPPETS && Data.CODE_SNIPPETS[variant]) || [];
      return snippets.join(' ').split(' ').filter(Boolean);
    }
    if (settings.mode === 'custom') {
      var custom = (settings.customWords || '').trim().split(/\s+/).filter(Boolean);
      return custom.length ? custom : null;
    }
    return null;
  }

  function startTest() {
    stopLoop();
    var fixed = wordsForTest();
    engine = new Engine({
      mode: settings.mode,
      timeLimit: settings.time,
      wordLimit: settings.words,
      language: settings.language,
      punctuation: settings.punctuation,
      numbers: settings.numbers,
      typoStop: settings.typoStop && settings.mode !== 'quote' && settings.mode !== 'code',
      fixedWords: fixed
    });

    resultContainer.classList.add('hidden');
    $('best-banner').classList.add('hidden');
    wordsEl.style.transform = 'translateY(0)';
    translateY = 0;
    lastResult = null;
    input.value = '';
    caretEl.className = 'caret caret--' + settings.caretStyle +
      (settings.smoothCaret ? ' smooth' : '');

    rebuildWords();
    updateTimerDisplay();
    updateLiveStats();
    updateProgress();
    updateCaret();
    highlightNextKey();
    if (settings.liveChart) drawSparkline();
    updateTapHint();
  }

  function restart() {
    startTest();
    activateInput(true);
  }

  function finishTest() {
    if (!engine || engine.status === 'idle') return;
    stopLoop();
    engine.finish();
    if (engine.elapsedMs < 1000) engine.elapsedMs = 1000; // hindari hasil aneh < 1 detik

    var result = engine.result();
    lastResult = result;

    var best = Store.recordResult(result);
    Store.pushHistory(result);

    $('res-wpm').textContent = result.wpm;
    $('res-acc').textContent = Math.round(result.acc) + '%';
    $('res-raw').textContent = result.raw;
    $('res-consistency').textContent = result.consistency + '%';
    $('res-chars').textContent =
      result.correctChars + '/' + result.incorrectChars + '/' + result.extraChars + '/' + result.missedChars;
    $('res-time').textContent = Math.round(result.seconds) + 's';
    $('best-banner').classList.toggle('hidden', !best.isBest);

    resultContainer.classList.remove('hidden');
    renderResultChart();
    caretEl.style.opacity = '0';
    if (vkbd && vkbdVisible) vkbd.clearHighlight();
    updateTapHint();

    if (best.isBest && best.previous) toast('🏆 rekor baru: ' + result.wpm + ' wpm');
    if (document.activeElement === input) input.blur();
  }

  function renderResultChart() {
    if (!lastResult) return;
    var t = THEMES[settings.theme] || THEMES.pink;
    Chart.render($('wpmChart'), {
      samples: lastResult.samples,
      height: window.innerWidth < 600 ? 180 : 240,
      colors: { accent: t.main, dim: t.sub, error: t.error }
    });
  }

  /* ---------------------------------------------------------- input focus */
  function updateTapHint() {
    var show = !isInputActive() && (!engine || engine.status !== 'finished');
    tapHint.classList.toggle('show', show);
    wordsWrapper.classList.toggle('inactive', show);
  }

  function activateInput(preventScroll) {
    if (engine && engine.status === 'finished') return;
    if (vkbdVisible) {
      vkbdActive = true;
      if (document.activeElement === input) input.blur();
    } else {
      vkbdActive = false;
      try { input.focus({ preventScroll: !!preventScroll }); }
      catch (e) { input.focus(); }
    }
    updateTapHint();
    updateCaret();
  }

  function highlightNextKey() {
    if (!vkbd || !vkbdVisible) return;
    if (!settings.showNextKey || !engine || engine.status === 'finished') { vkbd.clearHighlight(); return; }
    vkbd.highlight(engine.expectedChar());
  }

  /* ------------------------------------------------- keyboard virtual UI */
  function shouldShowVkbd() {
    if (settings.virtualKeyboard === 'on') return true;
    if (settings.virtualKeyboard === 'off') return false;
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  function refreshVkbd() {
    var want = shouldShowVkbd();
    if (want && !vkbd) {
      vkbd = window.TypeCraftKeyboard.create(vkbdMount, {
        onChar: typeChar,
        onSpace: submitWord,
        onBackspace: backspace,
        onEnter: function () { if (engine && engine.mode === 'zen') finishTest(); },
        onWordBackspace: backspaceWord
      });
    }
    vkbdVisible = want && !!vkbd;
    vkbdMount.hidden = !vkbdVisible;
    document.body.classList.toggle('vkbd-on', vkbdVisible);
    $('btn-keyboard').classList.toggle('active', vkbdVisible);
    if (!vkbdVisible) { vkbdActive = false; }
    highlightNextKey();
    updateTapHint();
  }

  /* ------------------------------------------------- event: input & kunci */
  input.addEventListener('input', function (e) {
    var value = input.value;
    var type = e.inputType || '';
    input.value = ''; // buffer selalu dikosongkan — sumber kebenaran ada di engine

    if (!ensureRunning()) return;

    if (type.indexOf('delete') === 0) { backspace(); return; }
    if (!value) return;

    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (ch === ' ') submitWord();
      else if (ch === '\n') { if (engine.mode === 'zen') finishTest(); }
      else typeChar(ch);
    }
  });

  input.addEventListener('focus', function () { vkbdActive = false; updateTapHint(); updateCaret(); });
  input.addEventListener('blur', function () { updateTapHint(); updateCaret(); });

  document.addEventListener('keydown', function (e) {
    if (drawerOpen) {
      if (e.key === 'Escape') closeDrawers();
      return;
    }
    // Jangan bajak ketikan di kolom pengaturan.
    if (e.target && e.target.id === 'custom-words') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') { e.preventDefault(); backspaceWord(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.isComposing) return;

    if (e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); restart(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (e.key === 'Enter') {
      if (engine && engine.mode === 'zen' && engine.status === 'running') finishTest();
      return;
    }
    if (e.key.length !== 1) return;

    // Karakter biasa: biarkan masuk ke textarea (diproses event input).
    // Kalau input tidak sedang fokus (misal habis menekan tombol), tangani langsung.
    if (document.activeElement !== input) {
      e.preventDefault();
      typeChar(e.key);
    }
  });

  wordsWrapper.addEventListener('pointerdown', function (e) {
    if (!vkbdVisible && e.target === input) return; // biarkan fokus native
    e.preventDefault();
    activateInput(true);
  });
  tapHint.addEventListener('click', function (e) { e.preventDefault(); activateInput(true); });
  restartBtn.addEventListener('click', function () { restart(); });
  $('next-test-btn').addEventListener('click', function () { restart(); });
  $('btn-keyboard').addEventListener('click', function () {
    settings.virtualKeyboard = vkbdVisible ? 'off' : 'on';
    Store.saveSettings(settings);
    refreshVkbd();
    if (vkbdVisible) activateInput(true);
    toast(vkbdVisible ? 'keyboard layar aktif' : 'keyboard layar mati');
  });

  /* ------------------------------------------------------- salin / bagi */
  function resultText() {
    if (!lastResult) return '';
    var r = lastResult;
    var label = r.mode === 'time' ? r.modeValue + 's' : (r.mode === 'words' ? r.modeValue + ' kata' : r.mode);
    return 'typecraft · ' + r.language + ' ' + label +
      (r.punctuation ? ' @punctuation' : '') + (r.numbers ? ' #numbers' : '') +
      '\nwpm ' + r.wpm + ' · acc ' + Math.round(r.acc) + '% · raw ' + r.raw +
      ' · konsistensi ' + r.consistency + '%';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('hasil disalin'); },
        function () { legacyCopy(text); });
    } else legacyCopy(text);
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('hasil disalin');
    } catch (e) { toast('tidak bisa menyalin di browser ini'); }
  }

  $('copy-result-btn').addEventListener('click', function () { copyText(resultText()); });
  $('share-result-btn').addEventListener('click', function () {
    var text = resultText();
    if (navigator.share) {
      navigator.share({ title: 'typecraft', text: text }).catch(function () { copyText(text); });
    } else copyText(text);
  });

  /* --------------------------------------------------------- config bar */
  function setActive(group, attr, value) {
    var btns = group.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', String(btns[i].dataset[attr]) === String(value));
    }
  }

  function renderValueSelector() {
    valueSelector.innerHTML = '';
    var options = [];
    if (settings.mode === 'time') options = [15, 30, 60, 120].map(function (v) { return { value: v, label: v + 's' }; });
    else if (settings.mode === 'words') options = [10, 25, 50, 100].map(function (v) { return { value: v, label: v }; });
    else if (settings.mode === 'code') options = [{ value: 'javascript', label: 'js' }, { value: 'python', label: 'python' }];
    else if (settings.mode === 'quote') options = [{ value: 'next', label: 'kutipan baru' }];
    else if (settings.mode === 'custom') options = [{ value: 'custom', label: 'kata kustom' }];
    else options = [{ value: 'zen', label: 'tanpa batas' }];

    options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt.label;
      b.dataset.value = opt.value;
      var current = settings.mode === 'time' ? settings.time
        : settings.mode === 'words' ? settings.words
          : settings.mode === 'code' ? (settings.codeVariant || 'javascript') : opt.value;
      if (String(current) === String(opt.value)) b.classList.add('active');
      b.addEventListener('click', function () {
        if (settings.mode === 'time') settings.time = opt.value;
        else if (settings.mode === 'words') settings.words = opt.value;
        else if (settings.mode === 'code') settings.codeVariant = opt.value;
        Store.saveSettings(settings);
        setActive(valueSelector, 'value', opt.value);
        startTest();
        activateInput(true);
      });
      valueSelector.appendChild(b);
    });
  }

  $('mode-selector').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    settings.mode = btn.dataset.mode;
    Store.saveSettings(settings);
    setActive($('mode-selector'), 'mode', settings.mode);
    renderValueSelector();
    startTest();
    activateInput(true);
  });

  $('toggle-selector').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var key = btn.dataset.toggle;
    settings[key] = !settings[key];
    btn.classList.toggle('active', !!settings[key]);
    if (key === 'focusMode') wordsEl.classList.toggle('focus-mode', settings.focusMode);
    Store.saveSettings(settings);
    startTest();
    activateInput(true);
  });

  /* ------------------------------------------------------------ drawers */
  function openDrawer(id) {
    closeDrawers();
    drawerOpen = id;
    var el = $(id);
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('show'); });
    if (id === 'history-drawer') renderHistory();
  }

  function closeDrawers() {
    drawerOpen = null;
    ['settings-drawer', 'history-drawer'].forEach(function (id) {
      $(id).classList.remove('open');
      $(id).setAttribute('aria-hidden', 'true');
    });
    scrim.classList.remove('show');
    setTimeout(function () { if (!drawerOpen) scrim.hidden = true; }, 200);
  }

  scrim.addEventListener('click', closeDrawers);
  document.querySelectorAll('[data-close-drawer]').forEach(function (b) {
    b.addEventListener('click', closeDrawers);
  });
  $('btn-settings').addEventListener('click', function () { openDrawer('settings-drawer'); });
  $('btn-history').addEventListener('click', function () { openDrawer('history-drawer'); });

  /* -------------------------------------------------------- settings UI */
  function bindPillGroup(groupId, attr, onChange) {
    var group = $(groupId);
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var val = btn.dataset[attr];
      settings[{'lang': 'language', 'fontsize': 'fontSize', 'caret': 'caretStyle', 'vkbd': 'virtualKeyboard'}[attr] || attr] =
        (val === 'true') ? true : (val === 'false') ? false : val;
      setActive(group, attr, val);
      Store.saveSettings(settings);
      if (onChange) onChange(val);
    });
  }

  function syncSettingsUI() {
    setActive($('lang-selector'), 'lang', settings.language);
    setActive($('fontsize-selector'), 'fontsize', settings.fontSize);
    setActive($('caret-selector'), 'caret', settings.caretStyle);
    setActive($('vkbd-selector'), 'vkbd', settings.virtualKeyboard);
    setActive($('mode-selector'), 'mode', settings.mode);
    $('toggle-selector').querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', !!settings[b.dataset.toggle]);
    });
    ['smoothCaret', 'sound', 'showNextKey', 'liveChart'].forEach(function (key) {
      var sw = $('switch-' + key);
      if (sw) {
        sw.classList.toggle('on', !!settings[key]);
        sw.setAttribute('aria-checked', String(!!settings[key]));
      }
    });
    var themeGroup = $('theme-selector');
    themeGroup.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.theme === settings.theme);
    });
    if ($('custom-words') && settings.customWords) $('custom-words').value = settings.customWords;
  }

  function buildThemeButtons() {
    var group = $('theme-selector');
    group.innerHTML = '';
    Object.keys(THEMES).forEach(function (key) {
      var t = THEMES[key];
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.theme = key;
      b.title = t.label;
      b.innerHTML = '<span class="swatch" style="background:' + t.bg + '">' +
        '<i style="background:' + t.main + '"></i><i style="background:' + t.sub + '"></i></span>' +
        '<span class="theme-name">' + t.label + '</span>';
      group.appendChild(b);
    });
  }

  bindPillGroup('lang-selector', 'lang', function () { startTest(); activateInput(true); });
  bindPillGroup('fontsize-selector', 'fontsize', function () {
    document.body.dataset.fontsize = settings.fontSize;
    rebuildWords();
  });
  bindPillGroup('caret-selector', 'caret', function () {
    caretEl.className = 'caret caret--' + settings.caretStyle +
      (settings.smoothCaret ? ' smooth' : '');
    updateCaret();
  });
  bindPillGroup('vkbd-selector', 'vkbd', function () { refreshVkbd(); activateInput(true); });
  bindPillGroup('theme-selector', 'theme', function () {
    applyTheme(settings.theme);
    if (lastResult) renderResultChart();
  });

  ['smoothCaret', 'sound', 'showNextKey', 'liveChart'].forEach(function (key) {
    var sw = $('switch-' + key);
    if (!sw) return;
    sw.addEventListener('click', function () {
      settings[key] = !settings[key];
      sw.classList.toggle('on', settings[key]);
      sw.setAttribute('aria-checked', String(settings[key]));
      Store.saveSettings(settings);
      if (key === 'smoothCaret') caretEl.classList.toggle('smooth', settings.smoothCaret);
      if (key === 'showNextKey') highlightNextKey();
      if (key === 'liveChart') {
        liveChartEl.style.display = settings.liveChart ? 'block' : 'none';
        if (settings.liveChart) drawSparkline();
      }
      if (key === 'sound' && settings.sound) playSound(true);
    });
  });

  $('apply-custom-words').addEventListener('click', function () {
    var text = $('custom-words').value.trim();
    var words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2) { toast('masukkan minimal 2 kata'); return; }
    settings.customWords = text;
    settings.mode = 'custom';
    Store.saveSettings(settings);
    setActive($('mode-selector'), 'mode', 'custom');
    closeDrawers();
    startTest();
    activateInput(true);
    toast('mode kustom: ' + words.length + ' kata');
  });

  $('reset-settings').addEventListener('click', function () {
    settings = Object.assign({}, Store.DEFAULTS);
    Store.saveSettings(settings);
    applySettingsAll();
    startTest();
    toast('pengaturan dikembalikan');
  });

  /* ------------------------------------------------------- history UI */
  function renderHistory() {
    var s = Store.summary();
    $('summary-cards').innerHTML =
      card('tes', s.count) + card('rata-rata', s.avgWpm + ' wpm') +
      card('terbaik', s.bestWpm + ' wpm') + card('akurasi', s.avgAcc + '%');

    var bests = Store.getBests();
    var keys = Object.keys(bests);
    $('best-list').innerHTML = keys.length
      ? keys.map(function (k) {
          return '<li><span class="best-key">' + k + '</span><span class="best-val">' +
            bests[k].wpm + ' wpm · ' + Math.round(bests[k].acc) + '%</span></li>';
        }).join('')
      : '<li class="empty">belum ada rekor</li>';

    var list = Store.getHistory();
    $('history-list').innerHTML = list.length
      ? list.map(function (r) {
          var d = new Date(r.date);
          var when = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' +
            d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          var label = r.mode === 'time' ? r.modeValue + 's' : (r.mode === 'words' ? r.modeValue + 'w' : r.mode);
          return '<li><span class="hist-wpm">' + r.wpm + '</span>' +
            '<span class="hist-meta">' + label + ' · ' + Math.round(r.acc) + '% · ' + r.language + '</span>' +
            '<span class="hist-date">' + when + '</span></li>';
        }).join('')
      : '<li class="empty">belum ada riwayat — selesaikan satu tes dulu</li>';
  }

  function card(label, value) {
    return '<div class="summary-card"><span class="summary-label">' + label +
      '</span><span class="summary-value">' + value + '</span></div>';
  }

  $('clear-history').addEventListener('click', function () {
    Store.clearHistory();
    renderHistory();
    toast('riwayat dihapus');
  });

  /* ------------------------------------------------------ resize & lifecycle */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      translateY = -1;
      scrollToCurrentLine(false);
      updateCaret();
      if (!resultContainer.classList.contains('hidden')) renderResultChart();
      refreshVkbd();
    }, 150);
  });

  window.addEventListener('orientationchange', function () {
    setTimeout(function () { translateY = -1; scrollToCurrentLine(false); updateCaret(); }, 300);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    lastLoopTime = performance.now();
    updateCaret();
  });

  // iOS: mencegah halaman memantul / ikut ter-scroll saat mengetik.
  document.addEventListener('touchmove', function (e) {
    if (e.target.closest && e.target.closest('.drawer-body')) return;
    if (document.activeElement === input) e.preventDefault();
  }, { passive: false });

  /* ------------------------------------------------------------ init */
  function applySettingsAll() {
    applyTheme(settings.theme);
    document.body.dataset.fontsize = settings.fontSize;
    wordsEl.classList.toggle('focus-mode', !!settings.focusMode);
    caretEl.className = 'caret caret--' + settings.caretStyle +
      (settings.smoothCaret ? ' smooth' : '');
    liveChartEl.style.display = settings.liveChart ? 'block' : 'none';
    buildThemeButtons();
    renderValueSelector();
    syncSettingsUI();
    refreshVkbd();
    $('storage-note').textContent = Store.isStorageAvailable()
      ? '' : 'penyimpanan dimatikan browser — rekor tidak tersimpan';
  }

  function init() {
    applySettingsAll();
    startTest();
    // Di desktop langsung siap mengetik; di HP tunggu tap (aturan browser).
    if (!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) {
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }
    updateTapHint();
    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    var secure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!secure) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline opsional */ });
    });
  }

  // Mulai hanya setelah DOM benar-benar siap.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
