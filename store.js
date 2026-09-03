/* ==========================================================================
 * store.js — Penyimpanan pengaturan, rekor (personal best), dan riwayat.
 *
 * Semua akses localStorage dibungkus try/catch: di Safari mode privat atau
 * saat storage penuh, operasi ini bisa melempar error — aplikasi tetap harus
 * jalan normal (fallback ke memori).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TypeCraftStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var KEYS = {
    settings: 'typecraft.settings.v1',
    bests: 'typecraft.bests.v1',
    history: 'typecraft.history.v1'
  };

  var memoryFallback = {};
  var available = true;

  try {
    var probe = '__typecraft_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
  } catch (e) {
    available = false;
  }

  function read(key, fallback) {
    var raw = null;
    try {
      raw = available ? window.localStorage.getItem(key) : memoryFallback[key];
    } catch (e) {
      raw = memoryFallback[key];
    }
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    var raw = JSON.stringify(value);
    memoryFallback[key] = raw;
    try {
      if (available) window.localStorage.setItem(key, raw);
    } catch (e) {
      /* storage penuh / diblokir — data tetap ada di memori sesi ini */
    }
    return value;
  }

  var DEFAULTS = {
    mode: 'time',            // time | words | quote | code | custom | zen
    time: 30,
    words: 25,
    codeVariant: 'javascript',
    customWords: '',
    language: 'indonesia',
    punctuation: false,
    numbers: false,
    typoStop: false,
    focusMode: false,
    caretStyle: 'line',      // line | block | underline | off
    smoothCaret: true,
    sound: false,
    fontSize: 'md',          // sm | md | lg
    theme: 'pink',
    virtualKeyboard: 'auto', // auto | on | off
    showNextKey: true,
    liveChart: false
  };

  function getSettings() {
    var stored = read(KEYS.settings, {}) || {};
    var merged = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      merged[k] = (stored && Object.prototype.hasOwnProperty.call(stored, k))
        ? stored[k] : DEFAULTS[k];
    });
    // Validasi nilai agar tidak ada state rusak yang bikin UI error.
    if (typeof merged.time !== 'number') merged.time = DEFAULTS.time;
    if (typeof merged.words !== 'number') merged.words = DEFAULTS.words;
    if (['sm', 'md', 'lg'].indexOf(merged.fontSize) < 0) merged.fontSize = 'md';
    if (['line', 'block', 'underline', 'off'].indexOf(merged.caretStyle) < 0) merged.caretStyle = 'line';
    if (['auto', 'on', 'off'].indexOf(merged.virtualKeyboard) < 0) merged.virtualKeyboard = 'auto';
    return merged;
  }

  function saveSettings(settings) {
    return write(KEYS.settings, settings);
  }

  function modeKey(r) {
    return [r.mode, r.mode === 'time' ? r.modeValue + 's' : r.modeValue,
      r.language, r.punctuation ? 'p' : '-', r.numbers ? 'n' : '-'].join(':');
  }

  function getBests() { return read(KEYS.bests, {}) || {}; }

  /** Simpan hasil bila memecahkan rekor. Return {isBest, previous}. */
  function recordResult(result) {
    var bests = getBests();
    var key = modeKey(result);
    var previous = bests[key] || null;
    var isBest = !previous || result.wpm > previous.wpm;
    if (isBest) {
      bests[key] = {
        wpm: result.wpm,
        acc: result.acc,
        raw: result.raw,
        consistency: result.consistency,
        date: result.finishedAt || Date.now()
      };
      write(KEYS.bests, bests);
    }
    return { isBest: isBest, previous: previous, key: key };
  }

  function bestFor(result) { return getBests()[modeKey(result)] || null; }

  var HISTORY_LIMIT = 30;

  function getHistory() {
    var list = read(KEYS.history, []);
    return Array.isArray(list) ? list : [];
  }

  function pushHistory(result) {
    var list = getHistory();
    list.unshift({
      wpm: result.wpm,
      raw: result.raw,
      acc: result.acc,
      consistency: result.consistency,
      mode: result.mode,
      modeValue: result.modeValue,
      language: result.language,
      date: result.finishedAt || Date.now()
    });
    if (list.length > HISTORY_LIMIT) list = list.slice(0, HISTORY_LIMIT);
    write(KEYS.history, list);
    return list;
  }

  function clearHistory() { write(KEYS.history, []); return []; }

  /** Ringkasan statistik keseluruhan untuk panel riwayat. */
  function summary() {
    var list = getHistory();
    if (!list.length) return { count: 0, avgWpm: 0, bestWpm: 0, avgAcc: 0 };
    var best = 0, sumW = 0, sumA = 0;
    list.forEach(function (r) {
      if (r.wpm > best) best = r.wpm;
      sumW += r.wpm;
      sumA += (r.acc || 0);
    });
    return {
      count: list.length,
      avgWpm: Math.round(sumW / list.length),
      bestWpm: best,
      avgAcc: Math.round(sumA / list.length)
    };
  }

  return {
    DEFAULTS: DEFAULTS,
    getSettings: getSettings,
    saveSettings: saveSettings,
    recordResult: recordResult,
    bestFor: bestFor,
    getBests: getBests,
    getHistory: getHistory,
    pushHistory: pushHistory,
    clearHistory: clearHistory,
    summary: summary,
    modeKey: modeKey,
    isStorageAvailable: function () { return available; }
  };
});
