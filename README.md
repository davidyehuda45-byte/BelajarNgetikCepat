# Belajar Ngetik Cepat (typecraft)

Aplikasi tes kecepatan mengetik (*typing test*) ala [monkeytype](https://monkeytype.com),
dibangun dengan **Vanilla JavaScript murni tanpa dependensi runtime**.
Dirancang agar **ringan dan benar-benar bisa dipakai di HP**, plus fitur latihan
khas monkeytype.

[🌐 Live Demo (Vercel)](https://belajar-ngetik-cepat.vercel.app/) ·
[🔗 GitHub Pages](https://davidyehuda45-byte.github.io/BelajarNgetikCepat/)

---

## 📱 Kenapa sekarang enak di HP?

Versi lama bergantung penuh pada `keydown` dari keyboard fisik dan Chart.js dari CDN,
sehingga sering error / tidak bisa dipakai di ponsel. Versi ini memperbaiki semuanya:

- **Input lintas platform** — mengetik diproses lewat event `input` pada `<textarea>`
  sungguhan (bukan input tersembunyi 0px), jadi keyboard layar Android/iOS langsung muncul.
  Keyboard fisik, keyboard virtual bawaan, dan jalur `keydown` semuanya masuk ke mesin yang sama.
- **Keyboard virtual on-screen (⌨)** — QWERTY lengkap dengan shift, spasi, backspace,
  enter, dan mode tanda baca. Aplikasi tetap 100% bisa dipakai walau keyboard sistem bermasalah.
  Muncul otomatis di perangkat layar sentuh (`pointer: coarse`), bisa dipaksa nyala/mati.
- **Tanpa CDN** — Chart.js eksternal diganti renderer canvas buatan sendiri,
  jadi tidak ada lagi `Chart is not defined` saat sinyal jelek.
- **Tombol & area sentuh besar** (≥ 44px), baris opsi bisa digeser, `safe-area inset`,
  `100dvh`, bebas zoom-otomatis iOS (`font-size` input 16px), dan anti double-tap zoom.
- **Timer tahan latar-belakang** — waktu dijeda saat tab/aplikasi pindah ke background
  (perilaku umum di HP), jadi hasil tidak rusak.
- **PWA** — manifest + service worker: bisa di-*install* dan dibuka **offline**.

## ✨ Fitur (ala monkeytype)

| Kategori | Fitur |
| --- | --- |
| **Mode tes** | waktu (15/30/60/120s), kata (10/25/50/100), kutipan, kode (js/python), kata kustom, bebas/zen (stopwatch) |
| **Opsi kata** | `@ punctuation`, `# numbers`, dua bahasa (Indonesia / English) |
| **Opsi ngetik** | focus mode, typo stop, gaya kursor (garis/blok/garis bawah/mati), kursor halus, suara ketikan |
| **Statistik** | WPM, raw, akurasi, **konsistensi**, rincian karakter (benar/salah/lebih/terlewat), grafik wpm/raw/error per detik |
| **Progres** | WPM & akurasi live, grafik mini live, bar progres, timer |
| **Data** | rekor pribadi per mode, riwayat 30 tes terakhir, ringkasan statistik (tersimpan di `localStorage`) |
| **Belajar** | sorot tombol berikutnya di keyboard virtual, umpan balik benar/salah per tombol |
| **Tampilan** | 6 tema (pink, serika, ocean, forest, dracula, light), 3 ukuran huruf |
| **Lainnya** | salin / bagikan hasil (Web Share API), pintasan `Tab`/`Esc` (ulang), `Ctrl+Backspace` (hapus kata), `Enter` (selesai di mode zen) |

## 🧪 Menjalankan

```bash
# buka langsung (file statis) atau pakai server apa pun:
npx serve .

# tes otomatis (logika inti + integrasi UI via jsdom):
npm install
npm test          # semua: engine, store, dom
npm run test:unit # cepat, tanpa jsdom
```

Test berada di `tests/`:
- `engine.test.js` — perhitungan WPM/akurasi/konsistensi, backspace lintas kata,
  mode waktu/kata/zen, generator tanda baca & angka (deterministik).
- `store.test.js` — rekor, riwayat, sanitasi pengaturan.
- `dom.test.js` — menjalankan `index.html` utuh di jsdom dan "mengetik" lewat
  jalur keyboard fisik, textarea HP, dan keyboard virtual.

## 🗂️ Struktur

| File | Isi |
| --- | --- |
| `engine.js` | Mesin tes murni (tanpa DOM) — gampang di-test |
| `words.js` | Daftar kata, kutipan, potongan kode |
| `store.js` | Pengaturan/rekor/riwayat (`localStorage` aman) |
| `chart.js` | Grafik canvas mandiri |
| `keyboard.js` | Keyboard virtual on-screen |
| `app.js` | Lapisan UI & input |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA / offline |

## 💻 Teknologi

HTML5 · CSS3 · JavaScript ES6+ (tanpa framework, tanpa dependensi runtime) ·
Node.js + `node:test` & jsdom hanya untuk pengembangan.
