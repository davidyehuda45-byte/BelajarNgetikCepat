/* ==========================================================================
 * engine.js — Mesin tes mengetik (pure logic, tanpa DOM).
 *
 * Sengaja dipisahkan dari app.js supaya logika perhitungan (WPM, akurasi,
 * konsistensi, backspace lintas kata, dst.) bisa diuji otomatis di Node.
 * Dipakai di browser lewat `window.TypeCraft.Engine`.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TypeCraft = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var WORD_LISTS = (typeof require === 'function' && typeof module === 'object')
    ? require('./words.js').WORD_LISTS
    : (root && root.TypeCraftData ? root.TypeCraftData.WORD_LISTS : null);

  /* ---------------------------------------------------------------- utils */

  function defaultRng() { return Math.random(); }

  function mean(list) {
    if (!list.length) return 0;
    var sum = 0;
    for (var i = 0; i < list.length; i++) sum += list[i];
    return sum / list.length;
  }

  function stdDev(list) {
    if (list.length < 2) return 0;
    var m = mean(list);
    var acc = 0;
    for (var i = 0; i < list.length; i++) acc += Math.pow(list[i] - m, 2);
    return Math.sqrt(acc / list.length);
  }

  /**
   * Konsistensi = 100 - coefficient of variation (dalam %).
   * Makin stabil raw WPM antar detik, makin tinggi nilainya.
   */
  function computeConsistency(rawSamples) {
    var values = (rawSamples || []).filter(function (v) { return typeof v === 'number' && v > 0; });
    if (values.length < 2) return 0;
    var m = mean(values);
    if (m <= 0) return 0;
    var cv = stdDev(values) / m;
    return Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  /* -------------------------------------------------- word generator */

  var NUMBER_POOL = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '15', '20', '25',
    '30', '45', '60', '99', '100', '2024', '2025', '365', '1024', '0.5', '1.5', '90%', '50%'];

  /**
   * Membuat generator kata acak. Mendukung sisipan tanda baca & angka
   * ala monkeytype: awal kalimat kapital, kadang ada koma/titik/tanda tanya.
   *
   * @param {object} opts { list, punctuation, numbers, rng, fixedWords }
   * @returns {{ next: function():string, peek: function():string }}
   */
  function createWordGenerator(opts) {
    opts = opts || {};
    var rng = opts.rng || defaultRng;
    var list = opts.fixedWords && opts.fixedWords.length ? opts.fixedWords : (opts.list || []);
    var punctuation = !!opts.punctuation;
    var numbers = !!opts.numbers;
    var fixed = !!(opts.fixedWords && opts.fixedWords.length);
    var cursor = 0;
    var newSentence = true;
    var pending = null;

    function baseWord() {
      if (!list.length) return 'kata';
      if (fixed) {
        // Kutipan/kode: urut, lalu berulang kalau teksnya habis.
        var w = list[cursor % list.length];
        cursor++;
        return w;
      }
      return list[Math.floor(rng() * list.length) % list.length];
    }

    function decorate(word) {
      if (numbers && rng() < 0.08) {
        word = NUMBER_POOL[Math.floor(rng() * NUMBER_POOL.length)];
      }
      if (punctuation && !fixed) {
        var roll = rng();
        if (roll < 0.06) {
          word += ',';
        } else if (roll < 0.11) {
          word += '.';
          pending = 'end-sentence';
        } else if (roll < 0.13) {
          word += '?';
          pending = 'end-sentence';
        } else if (roll < 0.15) {
          word += '!';
          pending = 'end-sentence';
        } else if (roll < 0.17) {
          word += ':';
        } else if (roll < 0.19) {
          word += ';';
        } else if (roll < 0.205) {
          word = '"' + word + '"';
        } else if (roll < 0.22) {
          word = '(' + word + ')';
        }
      }
      // Kapitalisasi awal kalimat hanya untuk mode kata acak.
      // Kutipan & potongan kode harus tampil apa adanya.
      if (newSentence && !fixed) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
        newSentence = false;
      }
      if (pending === 'end-sentence') {
        pending = null;
        newSentence = true;
      }
      return word;
    }

    return {
      next: function () { return decorate(baseWord()); },
      peek: function () { return list.length ? list[fixed ? cursor % list.length : 0] : ''; },
      get exhausted() { return fixed && cursor >= list.length; },
      remaining: function () { return fixed ? Math.max(0, list.length - cursor) : Infinity; }
    };
  }

  /* -------------------------------------------------------------- engine */

  /**
   * @param {object} config
   *   mode:        'time' | 'words' | 'quote' | 'code' | 'custom' | 'zen'
   *   timeLimit:   detik (mode time)
   *   wordLimit:   jumlah kata (mode words)
   *   language:    'indonesia' | 'english'
   *   punctuation: boolean
   *   numbers:     boolean
   *   fixedWords:  array kata (mode quote/code/custom)
   *   typoStop:    boolean — tidak boleh lanjut kalau kata salah
   *   bufferSize:  jumlah kata yang disiapkan di depan (mode tanpa batas)
   *   rng:         function pengacak (untuk test yang deterministik)
   *   clock:       function():ms (untuk test)
   */
  function Engine(config) {
    config = config || {};
    this.mode = config.mode || 'time';
    this.timeLimit = config.timeLimit || 30;
    this.wordLimit = config.wordLimit || 25;
    this.language = config.language || 'indonesia';
    this.punctuation = !!config.punctuation;
    this.numbers = !!config.numbers;
    this.typoStop = !!config.typoStop;
    this.bufferSize = config.bufferSize || 60;
    this.clock = config.clock || function () { return Date.now(); };

    var source = WORD_LISTS ? WORD_LISTS[this.language] : null;
    this.generator = createWordGenerator({
      list: source || [],
      fixedWords: config.fixedWords,
      punctuation: this.punctuation,
      numbers: this.numbers,
      rng: config.rng
    });

    this.words = [];
    this.typed = [];          // string[] — apa yang diketik per kata
    this.submitted = [];      // boolean[] — kata sudah dilewati (spasi)
    this.wordIndex = 0;
    this.keystrokes = { correct: 0, incorrect: 0 };
    this.samples = [];        // {wpm, raw, errors, time}
    this.elapsedMs = 0;
    this.startedAt = null;
    this.endedAt = null;
    this.status = 'idle';     // 'idle' | 'running' | 'finished'

    this._prepareWords(this.mode === 'time' || this.mode === 'zen'
      ? this.bufferSize
      : (this.mode === 'words' ? this.wordLimit : this.bufferSize));
  }

  Engine.prototype._prepareWords = function (count) {
    var guard = 0;
    while (this.words.length < count && guard < 10000) {
      if (this.generator.exhausted) {
        // mode quote/kode: berhenti menambah kata bila teks sudah habis
        break;
      }
      this.words.push(this.generator.next());
      this.typed.push('');
      guard++;
    }
  };

  Engine.prototype._ensureBuffer = function () {
    if (this.mode === 'words') return;
    var ahead = this.words.length - this.wordIndex;
    if (ahead < 20) this._prepareWords(this.words.length + this.bufferSize);
  };

  Engine.prototype.isInfinite = function () {
    return this.mode === 'time' || this.mode === 'zen';
  };

  Engine.prototype.currentWord = function () { return this.words[this.wordIndex] || ''; };
  Engine.prototype.currentTyped = function () { return this.typed[this.wordIndex] || ''; };

  /** Karakter yang seharusnya diketik berikutnya (untuk highlight keyboard virtual). */
  Engine.prototype.expectedChar = function () {
    var word = this.currentWord();
    var typed = this.currentTyped();
    if (typed.length < word.length) return word.charAt(typed.length);
    return null;
  };

  Engine.prototype.isCurrentWordCorrect = function () {
    return this.currentTyped() === this.currentWord();
  };

  /** Mengetik satu karakter. Return info posisi, atau null bila ditolak. */
  Engine.prototype.typeChar = function (ch) {
    if (this.status === 'finished') return null;
    if (typeof ch !== 'string' || ch.length !== 1) return null;
    if (this.status === 'idle') this.start();

    var word = this.currentWord();
    var typed = this.currentTyped() + ch;
    this.typed[this.wordIndex] = typed;

    var idx = typed.length - 1;
    var state;
    if (idx < word.length) {
      state = (ch === word.charAt(idx)) ? 'correct' : 'incorrect';
    } else {
      state = 'extra'; // karakter tambahan di luar panjang kata
    }

    if (state === 'correct') this.keystrokes.correct++;
    else this.keystrokes.incorrect++;

    this._ensureBuffer();
    return { state: state, wordIndex: this.wordIndex, charIndex: idx };
  };

  /** Spasi: menyelesaikan kata saat ini. */
  Engine.prototype.submitWord = function () {
    if (this.status === 'finished') return null;
    if (this.status === 'idle') this.start();

    var typed = this.currentTyped();
    if (typed.length === 0) return null; // spasi di awal kata diabaikan

    var correct = this.isCurrentWordCorrect();
    if (this.typoStop && !correct) return { blocked: true };

    this.keystrokes[correct ? 'correct' : 'incorrect']++;
    this.submitted[this.wordIndex] = true;
    this.wordIndex++;

    var isLast = (this.mode === 'words' || this.mode === 'quote' ||
                  this.mode === 'code' || this.mode === 'custom') &&
                 this.wordIndex >= this.words.length;

    if (isLast) {
      this.finish();
      return { finished: true };
    }

    this._ensureBuffer();
    return { finished: false };
  };

  /** Backspace satu karakter; kalau kata kosong, mundur ke kata sebelumnya. */
  Engine.prototype.backspace = function () {
    if (this.status === 'finished') return null;
    var typed = this.currentTyped();
    if (typed.length > 0) {
      this.typed[this.wordIndex] = typed.slice(0, -1);
      return { movedWord: false };
    }
    if (this.wordIndex > 0) {
      this.wordIndex--;
      return { movedWord: true };
    }
    return { movedWord: false };
  };

  /** Ctrl+Backspace: hapus satu kata penuh. */
  Engine.prototype.backspaceWord = function () {
    if (this.status === 'finished') return null;
    if (this.currentTyped().length > 0) {
      this.typed[this.wordIndex] = '';
      return { cleared: true };
    }
    if (this.wordIndex > 0) {
      this.wordIndex--;
      this.typed[this.wordIndex] = '';
      return { cleared: true, movedWord: true };
    }
    return { cleared: false };
  };

  Engine.prototype.start = function () {
    if (this.status !== 'idle') return;
    this.status = 'running';
    this.startedAt = this.clock();
  };

  Engine.prototype.finish = function () {
    if (this.status === 'finished') return;
    if (this.status === 'idle') this.start();
    this.status = 'finished';
    this.endedAt = this.clock();
  };

  /** Dipanggil tiap detak (default 1 detik) oleh lapisan UI. */
  Engine.prototype.tick = function (deltaMs) {
    if (this.status !== 'running') return this.status;
    this.elapsedMs += (typeof deltaMs === 'number' ? deltaMs : 1000);
    if (this.mode === 'time' && this.elapsedMs >= this.timeLimit * 1000) {
      this.elapsedMs = this.timeLimit * 1000;
      this.finish();
    }
    return this.status;
  };

  /** Rekam satu sampel (dipakai untuk grafik & konsistensi). */
  Engine.prototype.sample = function () {
    var s = this.stats();
    var point = {
      time: Math.round(this.elapsedMs / 1000),
      wpm: s.wpm,
      raw: s.raw,
      errors: s.incorrectChars + s.extraChars
    };
    this.samples.push(point);
    return point;
  };

  Engine.prototype.elapsedSeconds = function () {
    return Math.max(0.0001, this.elapsedMs / 1000);
  };

  Engine.prototype.remainingSeconds = function () {
    if (this.mode !== 'time') return null;
    return Math.max(0, Math.ceil((this.timeLimit * 1000 - this.elapsedMs) / 1000));
  };

  /** Progress 0..1 untuk bar progres. */
  Engine.prototype.progress = function () {
    if (this.mode === 'time') {
      return clamp(this.elapsedMs / (this.timeLimit * 1000), 0, 1);
    }
    if (this.words.length) return clamp(this.wordIndex / this.words.length, 0, 1);
    return 0;
  };

  /** Hitung detail karakter (benar/salah/lebih/terlewat). */
  Engine.prototype.countChars = function () {
    var correct = 0, incorrect = 0, extra = 0, missed = 0, spaces = 0;

    for (var i = 0; i < this.words.length; i++) {
      var word = this.words[i];
      var typed = this.typed[i] || '';
      // Lewati kata yang belum pernah disentuh sama sekali.
      if (i > this.wordIndex && !this.submitted[i] && typed.length === 0) continue;

      var limit = Math.min(word.length, typed.length);
      for (var j = 0; j < limit; j++) {
        if (typed.charAt(j) === word.charAt(j)) correct++;
        else incorrect++;
      }
      if (typed.length > word.length) extra += typed.length - word.length;

      if (this.submitted[i]) {
        spaces++;
        if (typed.length < word.length) missed += word.length - typed.length;
      }
    }
    return {
      correct: correct,
      incorrect: incorrect,
      extra: extra,
      missed: missed,
      spaces: spaces
    };
  };

  /** Statistik lengkap (live maupun final). */
  Engine.prototype.stats = function () {
    var c = this.countChars();
    var seconds = this.elapsedSeconds();
    var minutes = seconds / 60;
    var typedTotal = c.correct + c.incorrect + c.extra + c.spaces;

    var wpm = Math.round(((c.correct + c.spaces) / 5) / minutes);
    var raw = Math.round((typedTotal / 5) / minutes);
    var keystrokeTotal = this.keystrokes.correct + this.keystrokes.incorrect;
    var acc = keystrokeTotal > 0
      ? Math.round((this.keystrokes.correct / keystrokeTotal) * 1000) / 10
      : 100;

    // Sebelum timer benar-benar berjalan, hindari angka tak masuk akal.
    if (this.elapsedMs < 100) { wpm = 0; raw = 0; }

    if (!isFinite(wpm)) wpm = 0;
    if (!isFinite(raw)) raw = 0;

    return {
      wpm: wpm,
      raw: raw,
      acc: acc,
      consistency: computeConsistency(this.samples.map(function (s) { return s.raw; })),
      correctChars: c.correct,
      incorrectChars: c.incorrect,
      extraChars: c.extra,
      missedChars: c.missed,
      spaces: c.spaces,
      totalTyped: typedTotal,
      wordsTyped: this.wordIndex,
      seconds: Math.round(seconds * 10) / 10
    };
  };

  Engine.prototype.result = function () {
    var s = this.stats();
    s.mode = this.mode;
    s.modeValue = this.mode === 'time' ? this.timeLimit : this.wordLimit;
    s.language = this.language;
    s.punctuation = this.punctuation;
    s.numbers = this.numbers;
    s.samples = this.samples.slice();
    s.finishedAt = Date.now();
    return s;
  };

  return {
    Engine: Engine,
    createWordGenerator: createWordGenerator,
    computeConsistency: computeConsistency,
    mean: mean,
    stdDev: stdDev,
    clamp: clamp
  };
});
