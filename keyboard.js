/* ==========================================================================
 * keyboard.js — Keyboard virtual (on-screen) untuk HP & tablet.
 *
 * Alasan fitur ini ada: di HP, aplikasi mengetik sering error / tidak bisa
 * dipakai karena bergantung pada event keydown dari keyboard sistem. Keyboard
 * bawaan layar ini mengirim karakter langsung ke engine, jadi aplikasi tetap
 * 100% bisa dipakai walau keyboard sistem bermasalah (atau memang tidak ada).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TypeCraftKeyboard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '?']
  ];

  /* Jumlah slot sama dengan ROWS[3] sehingga cukup tukar label, tanpa rebuild DOM.
     Halaman 2 berisi simbol untuk mode kode: ( ) { } = > ! % / *              */
  var PUNCT_PAGES = [
    [',', '.', '?', '!', "'", ';', ':', '-', '_', '+'],
    ['(', ')', '{', '}', '=', '>', '%', '/', '"', '@']
  ];

  var LABEL = { backspace: '⌫', enter: '⏎', space: 'spasi', shift: '⇧', punct: '?123', abc: 'abc' };

  /**
   * @param {HTMLElement} mountEl
   * @param {object} handlers { onChar, onBackspace, onEnter, onSpace, onWordBackspace }
   */
  function create(mountEl, handlers) {
    handlers = handlers || {};
    var shift = false;
    var punctPage = -1; // -1 = huruf, 0/1 = halaman tanda baca / simbol
    var slots = [];      // semua tombol karakter, berurutan per baris
    var fnKeys = {};     // shift / punct / backspace / space / enter

    mountEl.classList.add('vkbd');
    mountEl.setAttribute('role', 'group');
    mountEl.setAttribute('aria-label', 'Keyboard virtual');

    function charFor(slot) {
      return punctPage >= 0 && slot.row === 3 ? PUNCT_PAGES[punctPage][slot.index] : slot.base;
    }

    function refreshLabels() {
      slots.forEach(function (slot) {
        var ch = charFor(slot);
        var isLetter = /^[a-z]$/.test(ch);
        slot.btn.textContent = (shift && isLetter) ? ch.toUpperCase() : ch;
        slot.btn.dataset.char = ch;
      });
      fnKeys.shift.classList.toggle('active', shift && punctPage < 0);
      fnKeys.punct.textContent = punctPage < 0 ? LABEL.punct : (punctPage === 0 ? '2/3' : LABEL.abc);
      fnKeys.punct.classList.toggle('active', punctPage >= 0);
    }

    function press(key) {
      if (key === 'shift') { shift = !shift; refreshLabels(); return; }
      if (key === 'punct') { punctPage = punctPage >= 1 ? -1 : punctPage + 1; refreshLabels(); return; }
      if (key === 'backspace') { if (handlers.onBackspace) handlers.onBackspace(); return; }
      if (key === 'wordbackspace') { if (handlers.onWordBackspace) handlers.onWordBackspace(); return; }
      if (key === 'space') { if (handlers.onSpace) handlers.onSpace(); return; }
      if (key === 'enter') { if (handlers.onEnter) handlers.onEnter(); return; }
      if (handlers.onChar) handlers.onChar(key);
      if (shift && /^[a-z]$/.test(key)) { shift = false; refreshLabels(); } // auto-unshift
    }

    function makeKey(kind, key, label, extraClass) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vkbd-key' + (extraClass ? ' ' + extraClass : '');
      btn.textContent = label;
      btn.dataset.key = key;
      btn.tabIndex = -1;
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();      // cegah fokus pindah & double-tap zoom
        btn.classList.add('vkbd-key--down');
        press(kind === 'char' ? btn.dataset.char : key);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
        btn.addEventListener(evt, function () { btn.classList.remove('vkbd-key--down'); });
      });
      if (kind === 'fn') fnKeys[key] = btn;
      return btn;
    }

    // --- bangun DOM -------------------------------------------------------
    ROWS.forEach(function (row, rowIdx) {
      var rowEl = document.createElement('div');
      rowEl.className = 'vkbd-row';
      rowEl.dataset.row = String(rowIdx);
      row.forEach(function (base, i) {
        var btn = makeKey('char', base, base);
        slots.push({ btn: btn, base: base, row: rowIdx, index: i });
        rowEl.appendChild(btn);
      });
      if (rowIdx === 3) {
        rowEl.appendChild(makeKey('fn', 'backspace', LABEL.backspace, 'vkbd-key--fn'));
      }
      mountEl.appendChild(rowEl);
    });

    var bottom = document.createElement('div');
    bottom.className = 'vkbd-row vkbd-row--bottom';
    bottom.dataset.row = 'bottom';
    bottom.appendChild(makeKey('fn', 'punct', LABEL.punct, 'vkbd-key--fn'));
    bottom.appendChild(makeKey('fn', 'shift', LABEL.shift, 'vkbd-key--fn'));
    bottom.appendChild(makeKey('fn', 'space', LABEL.space, 'vkbd-key--space'));
    bottom.appendChild(makeKey('fn', 'enter', LABEL.enter, 'vkbd-key--fn vkbd-key--enter'));
    mountEl.appendChild(bottom);

    refreshLabels();

    function findByChar(ch) {
      if (!ch) return null;
      var lower = String(ch).toLowerCase();
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].btn.dataset.char === lower || slots[i].btn.dataset.char === ch) {
          return slots[i].btn;
        }
      }
      return null;
    }

    return {
      el: mountEl,
      /** Sorot tombol yang seharusnya ditekan berikutnya (bantuan belajar). */
      highlight: function (ch) {
        slots.forEach(function (s) { s.btn.classList.remove('vkbd-key--expected'); });
        fnKeys.shift.classList.remove('vkbd-key--expected');
        if (!ch) return;
        if (ch !== ch.toLowerCase()) fnKeys.shift.classList.add('vkbd-key--expected');
        var el = findByChar(ch);
        if (el) el.classList.add('vkbd-key--expected');
      },
      /** Umpan balik singkat: tombol berkedip hijau/merah. */
      flash: function (ch, ok) {
        var el = findByChar(ch);
        if (!el) return;
        el.classList.add(ok ? 'vkbd-key--good' : 'vkbd-key--bad');
        setTimeout(function () {
          el.classList.remove('vkbd-key--good', 'vkbd-key--bad');
        }, 160);
      },
      clearHighlight: function () { this.highlight(null); },
      isPunctMode: function () { return punctPage >= 0; },
      destroy: function () { mountEl.innerHTML = ''; slots = []; fnKeys = {}; }
    };
  }

  return { create: create, ROWS: ROWS, PUNCT_PAGES: PUNCT_PAGES };
});
