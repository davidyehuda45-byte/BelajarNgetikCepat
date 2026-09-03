/* Test penyimpanan (store.js) — di Node otomatis memakai fallback memori. */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Store = require('../store.js');

function sample(wpm, acc) {
  return {
    wpm: wpm, acc: acc || 96, raw: wpm + 5, consistency: 80,
    mode: 'time', modeValue: 30, language: 'indonesia',
    punctuation: false, numbers: false, finishedAt: Date.now()
  };
}

test('pengaturan default lengkap & valid', () => {
  const s = Store.getSettings();
  assert.strictEqual(typeof s.mode, 'string');
  assert.ok([15, 30, 60, 120].indexOf(s.time) >= 0 || typeof s.time === 'number');
  assert.ok(['sm', 'md', 'lg'].indexOf(s.fontSize) >= 0);
  assert.ok(['line', 'block', 'underline', 'off'].indexOf(s.caretStyle) >= 0);
});

test('pengaturan bisa disimpan lalu dibaca lagi', () => {
  const s = Store.getSettings();
  s.theme = 'ocean';
  s.time = 60;
  Store.saveSettings(s);
  const back = Store.getSettings();
  assert.strictEqual(back.theme, 'ocean');
  assert.strictEqual(back.time, 60);
});

test('nilai rusak dibersihkan saat membaca pengaturan', () => {
  Store.saveSettings({ theme: 'ocean', fontSize: 'xxx', caretStyle: 'laser', time: 'banyak' });
  const s = Store.getSettings();
  assert.strictEqual(s.fontSize, 'md');
  assert.strictEqual(s.caretStyle, 'line');
  assert.strictEqual(s.time, 30);
});

test('rekor baru tercatat, rekor lama tidak menimpa yang lebih tinggi', () => {
  const first = Store.recordResult(sample(50));
  assert.strictEqual(first.isBest, true);

  const lower = Store.recordResult(sample(40));
  assert.strictEqual(lower.isBest, false, 'WPM lebih rendah bukan rekor');

  const higher = Store.recordResult(sample(70));
  assert.strictEqual(higher.isBest, true);
  assert.strictEqual(Store.bestFor(sample(0)).wpm, 70);
});

test('rekor dibedakan per mode/bahasa/opsi', () => {
  const a = sample(55);
  const b = sample(55);
  b.language = 'english';
  Store.recordResult(a);
  const res = Store.recordResult(b);
  assert.notStrictEqual(Store.modeKey(a), Store.modeKey(b));
  assert.strictEqual(res.isBest, true);
});

test('riwayat tersimpan dengan batas maksimum', () => {
  Store.clearHistory();
  for (let i = 1; i <= 35; i++) Store.pushHistory(sample(i));
  const list = Store.getHistory();
  assert.strictEqual(list.length, 30, 'riwayat dibatasi 30 entri');
  assert.strictEqual(list[0].wpm, 35, 'hasil terbaru di urutan pertama');
});

test('ringkasan riwayat menghitung rata-rata & terbaik', () => {
  Store.clearHistory();
  Store.pushHistory(sample(40));
  Store.pushHistory(sample(60));
  const s = Store.summary();
  assert.strictEqual(s.count, 2);
  assert.strictEqual(s.bestWpm, 60);
  assert.strictEqual(s.avgWpm, 50);
});

test('hapus riwayat mengosongkan daftar', () => {
  Store.pushHistory(sample(42));
  Store.clearHistory();
  assert.deepStrictEqual(Store.getHistory(), []);
  assert.strictEqual(Store.summary().count, 0);
});
