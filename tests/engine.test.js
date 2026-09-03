/* Test logika inti (engine.js) — jalankan dengan: npm test */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Engine, createWordGenerator, computeConsistency } = require('../engine.js');

/** RNG deterministik supaya tes tidak flaky. */
function seeded(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function fixed(words, opts) {
  return new Engine(Object.assign({ fixedWords: words, mode: 'words', wordLimit: words.length }, opts));
}

function type(engine, text) {
  for (const ch of text) {
    if (ch === ' ') engine.submitWord();
    else engine.typeChar(ch);
  }
}

test('kata benar: semua karakter dihitung benar dan WPM masuk akal', () => {
  const e = fixed(['kuda', 'lari']);
  type(e, 'kuda lari ');
  const s = e.stats();
  assert.strictEqual(s.correctChars, 8, '8 huruf benar');
  assert.strictEqual(s.incorrectChars, 0);
  assert.strictEqual(s.spaces, 2);
  assert.strictEqual(s.wordsTyped, 2);
  assert.strictEqual(e.stats().acc, 100);
});

test('karakter salah dihitung incorrect dan menurunkan akurasi', () => {
  const e = fixed(['kuda']);
  type(e, 'kuxa');
  const s = e.stats();
  assert.strictEqual(s.correctChars, 3);
  assert.strictEqual(s.incorrectChars, 1);
  assert.ok(s.acc < 100 && s.acc >= 70, `akurasi ${s.acc}`);
});

test('huruf tambahan di luar panjang kata dihitung extra', () => {
  const e = fixed(['ab']);
  type(e, 'abcd');
  const s = e.stats();
  assert.strictEqual(s.extraChars, 2);
  assert.strictEqual(s.correctChars, 2);
});

test('backspace menghapus karakter dan bisa mundur ke kata sebelumnya', () => {
  const e = fixed(['kuda', 'lari']);
  type(e, 'kuda ');
  assert.strictEqual(e.wordIndex, 1);
  e.backspace();                     // kata saat ini masih kosong -> mundur
  assert.strictEqual(e.wordIndex, 0, 'mundur ke kata sebelumnya');
  e.backspace();                     // hapus 'a'
  assert.strictEqual(e.currentTyped(), 'kud');
  e.backspaceWord();                 // hapus sisa kata
  assert.strictEqual(e.currentTyped(), '');
  assert.strictEqual(e.wordIndex, 0);
});

test('ctrl+backspace di tengah kata mengosongkan kata itu saja', () => {
  const e = fixed(['kuda', 'lari']);
  type(e, 'kuda la');
  e.backspaceWord();
  assert.strictEqual(e.currentTyped(), '');
  assert.strictEqual(e.wordIndex, 1, 'tidak pindah kata');
});

test('kata yang dilewati tanpa lengkap dihitung missed', () => {
  const e = fixed(['kuda', 'lari']);
  type(e, 'ku ');                    // kata pertama cuma diisi 2 huruf
  const s = e.stats();
  assert.strictEqual(s.missedChars, 2);
  assert.strictEqual(s.wordsTyped, 1);
});

test('mode words selesai setelah kata terakhir dikirim', () => {
  const e = fixed(['satu', 'dua']);
  type(e, 'satu dua ');
  assert.strictEqual(e.status, 'finished');
  assert.ok(e.stats().seconds >= 0);
});

test('mode time berhenti tepat di batas waktu', () => {
  const e = new Engine({ mode: 'time', timeLimit: 15, language: 'indonesia', rng: seeded(7) });
  e.typeChar('a');
  for (let i = 0; i < 14; i++) e.tick(1000);
  assert.strictEqual(e.status, 'running');
  e.tick(1000);
  assert.strictEqual(e.status, 'finished');
  assert.strictEqual(e.remainingSeconds(), 0);
});

test('sampel per detik mengisi data grafik & konsistensi stabil = 100', () => {
  const e = new Engine({ mode: 'time', timeLimit: 10, language: 'english', rng: seeded(3) });
  e.typeChar('a');
  for (let i = 0; i < 5; i++) { e.tick(1000); e.sample(); }
  assert.strictEqual(e.samples.length, 5);
  assert.strictEqual(e.samples[0].time, 1);
  const consistent = computeConsistency([50, 50, 50, 50]);
  assert.strictEqual(consistent, 100);
  const noisy = computeConsistency([10, 90, 10, 90]);
  assert.ok(noisy < 50, `konsistensi berisik harus rendah, dapat ${noisy}`);
  assert.strictEqual(computeConsistency([]), 0);
});

test('typoStop menolak spasi saat kata masih salah', () => {
  const e = fixed(['kuda'], { typoStop: true });
  type(e, 'kuxa');
  const res = e.submitWord();
  assert.strictEqual(res.blocked, true);
  assert.strictEqual(e.wordIndex, 0, 'tidak boleh lanjut');
});

test('spasi di awal kata diabaikan', () => {
  const e = fixed(['kuda']);
  const res = e.submitWord();
  assert.strictEqual(res, null);
  assert.strictEqual(e.wordIndex, 0);
});

test('mode tanpa batas (zen) menambah kata otomatis', () => {
  const e = new Engine({ mode: 'zen', language: 'indonesia', bufferSize: 5, rng: seeded(11) });
  const before = e.words.length;
  for (let i = 0; i < before; i++) { e.typeChar('x'); e.submitWord(); }
  assert.ok(e.words.length > before, 'kata baru harus ditambahkan');
  assert.strictEqual(e.status, 'running', 'zen tidak berakhir sendiri');
});

test('hasil (result) membawa metadata mode & bahasa', () => {
  const e = new Engine({ mode: 'time', timeLimit: 30, language: 'english', punctuation: true, rng: seeded(5) });
  e.typeChar('a');
  e.tick(1000);
  const r = e.result();
  assert.strictEqual(r.mode, 'time');
  assert.strictEqual(r.modeValue, 30);
  assert.strictEqual(r.language, 'english');
  assert.strictEqual(r.punctuation, true);
  assert.ok(Array.isArray(r.samples));
});

test('generator kata: huruf pertama kapital & tanda baca disisipkan', () => {
  const gen = createWordGenerator({ list: ['aku', 'kamu'], punctuation: true, rng: seeded(42) });
  const words = [];
  for (let i = 0; i < 60; i++) words.push(gen.next());
  assert.strictEqual(words[0].charAt(0), words[0].charAt(0).toUpperCase(), 'kata pertama kapital');
  const hasPunct = words.some((w) => /[,.?!:;]/.test(w));
  assert.ok(hasPunct, 'harus ada tanda baca dalam 60 kata');
});

test('generator kata: mode angka menyisipkan nomor', () => {
  const gen = createWordGenerator({ list: ['kata'], numbers: true, rng: seeded(99) });
  const words = [];
  for (let i = 0; i < 80; i++) words.push(gen.next());
  assert.ok(words.some((w) => /\d/.test(w)), 'harus ada angka');
});

test('generator fixed (kutipan) urut dan menandai habis', () => {
  const gen = createWordGenerator({ fixedWords: ['satu', 'dua', 'tiga'] });
  assert.strictEqual(gen.next(), 'satu');
  assert.strictEqual(gen.next(), 'dua');
  assert.strictEqual(gen.next(), 'tiga');
  assert.strictEqual(gen.exhausted, true);
  assert.strictEqual(gen.remaining(), 0);
});

test('daftar kata bawaan tersedia untuk dua bahasa dan tidak kosong', () => {
  const data = require('../words.js');
  for (const lang of ['indonesia', 'english']) {
    const list = data.WORD_LISTS[lang];
    assert.ok(Array.isArray(list) && list.length > 100, `${lang} punya ${list.length} kata`);
    assert.ok(list.every((w) => typeof w === 'string' && w.length > 0));
  }
  assert.ok(data.QUOTES.indonesia.length > 0);
  assert.ok(data.CODE_SNIPPETS.javascript.length > 0);
});

test('expectedChar menunjukkan huruf berikutnya (untuk highlight keyboard)', () => {
  const e = fixed(['kuda']);
  assert.strictEqual(e.expectedChar(), 'k');
  e.typeChar('k');
  assert.strictEqual(e.expectedChar(), 'u');
  type(e, 'uda');
  assert.strictEqual(e.expectedChar(), null, 'habis -> null');
});

test('tidak ada NaN pada statistik saat belum mulai', () => {
  const e = new Engine({ mode: 'time', timeLimit: 30, language: 'indonesia', rng: seeded(1) });
  const s = e.stats();
  for (const k of ['wpm', 'raw', 'acc', 'consistency', 'correctChars', 'seconds']) {
    assert.ok(Number.isFinite(s[k]), `${k} = ${s[k]}`);
  }
  assert.strictEqual(s.wpm, 0);
});

test('mode kutipan/kode menampilkan teks apa adanya (tidak dikapitalisasi)', () => {
  const data = require('../words.js');
  const snippet = data.CODE_SNIPPETS.javascript[0];
  const words = snippet.split(' ');
  const e = fixed(words, { mode: 'code' });
  assert.deepStrictEqual(e.words.slice(0, words.length), words, 'potongan kode tidak boleh diubah');
  assert.strictEqual(e.words[0].charAt(0), words[0].charAt(0));
});
