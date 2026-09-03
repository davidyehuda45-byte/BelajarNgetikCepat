/* ==========================================================================
 * chart.js — Grafik hasil (canvas murni, tanpa library eksternal).
 *
 * Versi sebelumnya memakai Chart.js dari CDN. Di HP dengan sinyal jelek,
 * CDN gagal dimuat -> "Chart is not defined" -> hasil tes tidak muncul.
 * Menggambar sendiri di canvas membuat aplikasi 100% offline & tanpa error.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TypeCraftChart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DEFAULT_COLORS = {
    accent: '#ff79c6',
    dim: '#6272a4',
    error: '#ff5555',
    grid: 'rgba(255,255,255,0.08)',
    text: 'rgba(255,255,255,0.45)'
  };

  function niceMax(value) {
    if (value <= 10) return 10;
    var step = value > 100 ? 25 : 10;
    return Math.ceil(value / step) * step;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts { samples: [{time,wpm,raw,errors}], colors }
   */
  function render(canvas, opts) {
    if (!canvas || !canvas.getContext) return;
    opts = opts || {};
    var colors = Object.assign({}, DEFAULT_COLORS, opts.colors || {});
    var samples = (opts.samples || []).filter(function (s) { return s && typeof s.wpm === 'number'; });

    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var cssWidth = canvas.clientWidth || canvas.parentNode && canvas.parentNode.clientWidth || 300;
    var cssHeight = opts.height || 220;
    canvas.style.height = cssHeight + 'px';
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));

    var ctx = canvas.getContext('2d');
    if (!ctx) return; // canvas tidak didukung / diblokir
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (samples.length < 2) {
      ctx.fillStyle = colors.text;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Data belum cukup untuk grafik', cssWidth / 2, cssHeight / 2);
      return;
    }

    var pad = { top: 16, right: 12, bottom: 24, left: 34 };
    var w = cssWidth - pad.left - pad.right;
    var h = cssHeight - pad.top - pad.bottom;

    var maxY = niceMax(Math.max.apply(null, samples.map(function (s) {
      return Math.max(s.wpm, s.raw || 0);
    })));
    var maxX = Math.max(1, samples[samples.length - 1].time);
    var maxErr = Math.max(3, Math.max.apply(null, samples.map(function (s) { return s.errors || 0; })));

    var x = function (t) { return pad.left + (t / maxX) * w; };
    var y = function (v) { return pad.top + h - (v / maxY) * h; };

    // grid + label sumbu
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.text;
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var g = 0; g <= 4; g++) {
      var val = (maxY / 4) * g;
      ctx.beginPath();
      ctx.moveTo(pad.left, y(val));
      ctx.lineTo(pad.left + w, y(val));
      ctx.stroke();
      ctx.fillText(String(Math.round(val)), pad.left - 6, y(val));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var labelEvery = maxX > 60 ? 15 : maxX > 20 ? 10 : 5;
    for (var t = 0; t <= maxX; t += labelEvery) {
      ctx.fillText(t + 's', x(t), pad.top + h + 6);
    }

    // garis raw (abu-abu)
    ctx.beginPath();
    ctx.strokeStyle = colors.dim;
    ctx.lineWidth = 1.5;
    samples.forEach(function (s, i) {
      var px = x(s.time), py = y(s.raw || 0);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // area + garis wpm (aksen)
    ctx.beginPath();
    samples.forEach(function (s, i) {
      var px = x(s.time), py = y(s.wpm);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.lineTo(x(samples[samples.length - 1].time), pad.top + h);
    ctx.lineTo(x(samples[0].time), pad.top + h);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(colors.accent, 0.12);
    ctx.fill();

    ctx.beginPath();
    samples.forEach(function (s, i) {
      var px = x(s.time), py = y(s.wpm);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // titik error di dasar grafik
    ctx.fillStyle = hexToRgba(colors.error, 0.75);
    samples.forEach(function (s) {
      if (!s.errors) return;
      var eh = Math.max(2, (s.errors / maxErr) * (h * 0.25));
      ctx.fillRect(x(s.time) - 1.5, pad.top + h - eh, 3, eh);
    });

    // legenda
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '11px monospace';
    ctx.fillStyle = colors.accent;
    ctx.fillText('● wpm', pad.left, 2);
    ctx.fillStyle = colors.dim;
    ctx.fillText('● raw', pad.left + 58, 2);
    ctx.fillStyle = colors.error;
    ctx.fillText('● error', pad.left + 112, 2);
  }

  function hexToRgba(hex, alpha) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#') return hex;
    var h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return hex;
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  return { render: render, hexToRgba: hexToRgba, niceMax: niceMax };
});
