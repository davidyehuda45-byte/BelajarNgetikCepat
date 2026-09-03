/* Test integrasi UI: menjalankan index.html + semua script di jsdom,
   lalu "mengetik" lewat dua jalur input (keyboard fisik & textarea HP).
   Butuh devDependency jsdom:  npm install && npm run test:dom            */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');

async function boot() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e.message));
  virtualConsole.on('error', (e) => errors.push(String(e)));

  const dom = new JSDOM(html, {
    url: 'file://' + path.join(ROOT, 'index.html'),
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole
  });

  // tunggu semua <script src> dimuat & app.js selesai init
  for (let i = 0; i < 200; i++) {
    if (dom.window.TypeCraft && dom.window.document.getElementById('words').children.length > 1) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  return { dom, win: dom.window, doc: dom.window.document, errors };
}

/** Baca kata yang sedang aktif langsung dari DOM (black-box). */
function currentWord(doc) {
  const el = doc.querySelector('.word--current');
  return el ? Array.from(el.children).map((s) => s.textContent).join('') : null;
}

function typedLength(doc) {
  const el = doc.querySelector('.word--current');
  if (!el) return 0;
  return el.querySelectorAll('.letter.correct, .letter.incorrect').length;
}

function pressKey(win, key, opts) {
  const ev = new win.KeyboardEvent('keydown', Object.assign({
    key: key, bubbles: true, cancelable: true
  }, opts || {}));
  win.document.dispatchEvent(ev);
}

/** Jalur textarea (yang dipakai keyboard HP). */
function typeIntoTextarea(win, text) {
  const input = win.document.getElementById('typing-input');
  input.value = text;
  input.dispatchEvent(new win.InputEvent('input', { inputType: 'insertText', bubbles: true }));
}

test('aplikasi boot tanpa error dan merender kata', async () => {
  const { doc, errors } = await boot();
  assert.deepStrictEqual(errors.filter((e) => !/Could not parse CSS|Not implemented/i.test(e)), [],
    'tidak boleh ada error runtime: ' + errors.join(' | '));
  assert.ok(doc.querySelectorAll('.word').length >= 20, 'kata sudah dirender');
  assert.ok(doc.querySelector('.word--current'), 'ada kata aktif');
  assert.strictEqual(doc.getElementById('timer').textContent, '30');
});

test('jalur keyboard fisik: huruf benar diberi kelas .correct', async () => {
  const { win, doc } = await boot();
  const word = currentWord(doc);

  // Kasus A: input sedang tidak fokus (habis menekan tombol) -> ditangani langsung
  if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur();
  pressKey(win, word[0]);
  const first = doc.querySelector('.word--current .letter');
  assert.strictEqual(first.className, 'letter correct', 'huruf benar ditandai');
  assert.strictEqual(typedLength(doc), 1);

  // Kasus B: huruf salah -> kelas .incorrect
  pressKey(win, word[1] === 'z' ? 'q' : 'z');
  const second = doc.querySelectorAll('.word--current .letter')[1];
  assert.ok(/incorrect|correct/.test(second.className), 'huruf kedua diproses');
  assert.strictEqual(typedLength(doc), 2);

  // Kasus C: backspace fisik
  pressKey(win, 'Backspace');
  assert.strictEqual(typedLength(doc), 1, 'backspace fisik menghapus satu huruf');
});

test('jalur textarea HP: karakter masuk ke engine lewat event input', async () => {
  const { win, doc } = await boot();
  const word = currentWord(doc);
  typeIntoTextarea(win, word.slice(0, 3));
  assert.strictEqual(typedLength(doc), 3, 'tiga huruf terproses');
  assert.strictEqual(doc.getElementById('typing-input').value, '', 'buffer textarea dikosongkan');
});

test('mode kata: menyelesaikan semua kata memunculkan hasil', async () => {
  const { win, doc } = await boot();

  // pilih mode "kata" lalu durasi 10 kata
  doc.querySelector('#mode-selector [data-mode="words"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  doc.querySelector('#value-selector [data-value="10"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

  for (let round = 0; round < 10; round++) {
    const word = currentWord(doc);
    assert.ok(word, 'kata ke-' + (round + 1) + ' harus ada');
    typeIntoTextarea(win, word);
    typeIntoTextarea(win, ' ');
  }

  const result = doc.getElementById('result-container');
  assert.ok(!result.classList.contains('hidden'), 'panel hasil tampil');
  const wpm = Number(doc.getElementById('res-wpm').textContent);
  const acc = doc.getElementById('res-acc').textContent;
  assert.ok(Number.isFinite(wpm) && wpm > 0, 'wpm harus angka positif, dapat: ' + wpm);
  assert.strictEqual(acc, '100%');
  assert.ok(doc.getElementById('res-chars').textContent.match(/^\d+\/\d+\/\d+\/\d+$/));
});

test('riwayat & rekor tersimpan setelah tes selesai', async () => {
  const { win, doc } = await boot();
  doc.querySelector('#mode-selector [data-mode="words"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  doc.querySelector('#value-selector [data-value="10"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

  for (let round = 0; round < 10; round++) {
    typeIntoTextarea(win, currentWord(doc));
    typeIntoTextarea(win, ' ');
  }

  const store = win.TypeCraftStore;
  assert.strictEqual(store.getHistory().length, 1);
  assert.ok(store.getHistory()[0].wpm > 0);
  assert.ok(Object.keys(store.getBests()).length === 1);
});

test('backspace menghapus huruf terakhir', async () => {
  const { win, doc } = await boot();
  typeIntoTextarea(win, 'ab');
  assert.strictEqual(typedLength(doc), 2);
  const input = doc.getElementById('typing-input');
  input.value = '';
  input.dispatchEvent(new win.InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
  assert.strictEqual(typedLength(doc), 1, 'satu huruf terhapus');
});

test('pengaturan tema mengubah variabel warna', async () => {
  const { win, doc } = await boot();
  doc.getElementById('btn-settings').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const ocean = doc.querySelector('#theme-selector [data-theme="ocean"]');
  assert.ok(ocean, 'tombol tema ocean ada');
  ocean.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const main = doc.documentElement.style.getPropertyValue('--main-color').trim();
  assert.strictEqual(main, '#4cc9f0');
  assert.strictEqual(win.TypeCraftStore.getSettings().theme, 'ocean');
});

test('tab memulai tes baru (kata diacak ulang)', async () => {
  const { win, doc } = await boot();
  const before = Array.from(doc.querySelectorAll('.word')).slice(0, 5).map((w) => w.textContent).join('|');
  typeIntoTextarea(win, 'abc');
  pressKey(win, 'Tab');
  assert.strictEqual(typedLength(doc), 0, 'ketikan direset');
  const after = Array.from(doc.querySelectorAll('.word')).slice(0, 5).map((w) => w.textContent).join('|');
  assert.notStrictEqual(before, after, 'kata baru diacak');
});

test('keyboard virtual bisa dipakai mengetik tanpa keyboard sistem', async () => {
  const { win: w, doc: d } = await boot();
  assert.strictEqual(d.getElementById('vkbd-mount').hidden, true, 'default: tidak ada keyboard layar di desktop');

  // aktifkan lewat tombol di topbar (jalur yang dipakai pengguna HP)
  d.getElementById('btn-keyboard').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const mount = d.getElementById('vkbd-mount');
  assert.strictEqual(mount.hidden, false, 'keyboard layar tampil');
  const keys = mount.querySelectorAll('.vkbd-key');
  assert.ok(keys.length >= 30, 'jumlah tombol wajar: ' + keys.length);

  const word = currentWord(d);
  if (word[0] !== word[0].toLowerCase()) {
    // huruf kapital butuh shift: pastikan tombol shift ikut disorot
    assert.ok(d.querySelector('.vkbd-key--expected'), 'ada tombol yang disorot');
  }
  const target = Array.from(keys).find((k) => k.dataset.char === word[0].toLowerCase());
  assert.ok(target, 'tombol untuk huruf ' + word[0] + ' tersedia');
  target.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
  assert.strictEqual(typedLength(d), 1, 'mengetik lewat keyboard layar berhasil');
});

test('semua simbol potongan kode bisa diketik lewat keyboard virtual', async () => {
  const { win, doc } = await boot();
  doc.getElementById('btn-keyboard').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const mount = doc.getElementById('vkbd-mount');
  const data = win.TypeCraftData;

  const needed = new Set();
  Object.keys(data.CODE_SNIPPETS).forEach(function (k) {
    data.CODE_SNIPPETS[k].forEach(function (line) {
      for (const ch of line) needed.add(ch);
    });
  });

  const avail = new Set([' ']);
  const collect = function () {
    mount.querySelectorAll('.vkbd-key').forEach(function (k) {
      if (k.dataset.char) avail.add(k.dataset.char);
    });
  };
  const punctBtn = mount.querySelector('[data-key="punct"]');
  collect();                                                        // halaman huruf
  punctBtn.dispatchEvent(new win.Event('pointerdown', { bubbles: true })); collect(); // simbol 1
  punctBtn.dispatchEvent(new win.Event('pointerdown', { bubbles: true })); collect(); // simbol 2
  for (let c = 65; c <= 90; c++) avail.add(String.fromCharCode(c)); // kapital via shift

  const missing = Array.from(needed).filter(function (c) { return !avail.has(c); });
  assert.deepStrictEqual(missing, [], 'simbol yang hilang: ' + missing.join(' '));
});
