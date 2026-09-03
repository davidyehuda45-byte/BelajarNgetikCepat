/* ==========================================================================
 * words.js — Kumpulan kata & kutipan untuk latihan mengetik.
 * Tidak ada dependensi eksternal. Di-expose ke `window.TypeCraftData`
 * dan juga bisa di-require dari Node (untuk keperluan testing).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TypeCraftData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var INDONESIA = [
    // Kata dasar & penghubung
    "yang", "untuk", "dengan", "pada", "adalah", "sebagai", "dalam", "bisa", "akan", "dari",
    "karena", "mereka", "kita", "bukan", "hanya", "sampai", "banyak", "antara", "secara", "sudah",
    "waktu", "dapat", "harus", "orang", "setiap", "paling", "tanpa", "tentang", "kembali", "sangat",
    "juga", "atau", "saat", "bila", "jika", "maka", "selain", "hingga", "agar", "supaya",
    "namun", "tetapi", "sehingga", "sedangkan", "meskipun", "bahwa", "bagi", "oleh", "serta", "setelah",
    "sebelum", "selama", "ketika", "masih", "belum", "pernah", "hampir", "kurang", "lebih", "cukup",

    // Teknologi & pemrograman
    "program", "aplikasi", "komputer", "internet", "belajar", "teknologi", "pengembang", "sistem",
    "layar", "ketik", "kecepatan", "akurasi", "fokus", "latihan", "proyek", "kode", "fungsi",
    "data", "jaringan", "perangkat", "lunak", "keras", "situs", "web", "desain", "pustaka", "variabel",
    "objek", "array", "logika", "algoritma", "rekayasa", "keamanan", "server", "basis", "proses", "layanan",
    "antarmuka", "peramban", "berkas", "folder", "tautan", "tombol", "kursor", "papan", "ketik", "mouse",
    "digital", "otomatis", "analisis", "laporan", "masuk", "keluar", "simpan", "hapus", "ubah", "cari",

    // Kehidupan sehari-hari
    "rumah", "jalan", "makan", "minum", "tidur", "kerja", "sekolah", "buku", "tulis", "baca",
    "suara", "kata", "kalimat", "cerita", "dunia", "hidup", "pikir", "rasa", "hati", "mata",
    "tangan", "langkah", "tujuan", "hasil", "usaha", "pagi", "siang", "malam", "hari", "minggu",
    "bulan", "tahun", "kota", "negeri", "alam", "udara", "air", "api", "tanah", "cahaya",
    "keluarga", "teman", "guru", "murid", "pasar", "toko", "uang", "harga", "belanja", "masak",
    "kopi", "nasi", "sayur", "buah", "hujan", "angin", "gunung", "laut", "sungai", "pohon",

    // Kata kerja & sifat
    "membuat", "membawa", "melihat", "mendengar", "merasakan", "menulis", "membaca", "berjalan", "berlari", "terbang",
    "cepat", "lambat", "tinggi", "rendah", "besar", "kecil", "panjang", "pendek", "kuat", "lemah",
    "mudah", "sulit", "jelas", "gelap", "terang", "indah", "bersih", "kotor", "baru", "lama",
    "rajin", "malas", "senang", "sedih", "marah", "tenang", "ramai", "sepi", "hangat", "dingin",
    "tepat", "salah", "benar", "jujur", "sabar", "tekun", "cermat", "waspada", "berani", "rendah"
  ];

  var ENGLISH = [
    // Common words
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",

    // Tech & coding
    "code", "developer", "typing", "speed", "accuracy", "project", "system", "screen", "focus",
    "computer", "software", "hardware", "network", "internet", "database", "variable", "function", "array", "object",
    "logic", "algorithm", "design", "library", "framework", "browser", "engine", "process", "memory", "storage",
    "security", "server", "client", "request", "response", "event", "handler", "script", "element", "style",
    "keyboard", "cursor", "click", "button", "mobile", "device", "cloud", "cache", "index", "query",
    "build", "deploy", "merge", "branch", "commit", "issue", "review", "test", "error", "debug",

    // Daily & abstract
    "time", "person", "year", "way", "day", "thing", "man", "world", "life", "hand",
    "part", "child", "eye", "woman", "place", "work", "week", "case", "point", "company",
    "number", "group", "problem", "fact", "house", "area", "money", "story", "month", "study",
    "lot", "right", "book", "word", "business", "issue", "side", "kind", "head", "family",
    "friend", "morning", "coffee", "water", "city", "country", "music", "movie", "paper", "phone",
    "table", "window", "street", "garden", "market", "kitchen", "office", "travel", "health", "energy",

    // Verbs & adjectives
    "make", "know", "take", "see", "come", "think", "look", "want", "give", "use",
    "find", "tell", "ask", "work", "seem", "feel", "try", "leave", "call", "good",
    "new", "first", "last", "long", "great", "little", "own", "other", "old", "right",
    "big", "high", "different", "small", "large", "next", "early", "young", "important", "few",
    "public", "bad", "same", "able", "sure", "clear", "easy", "hard", "open", "close",
    "fast", "slow", "quiet", "bright", "dark", "clean", "warm", "cold", "strong", "weak"
  ];

  /* Kutipan singkat (bebas lisensi / pepatah umum) untuk mode "quote". */
  var QUOTES = {
    indonesia: [
      "sedikit demi sedikit lama lama menjadi bukit",
      "rajin pangkal pandai hemat pangkal kaya",
      "belajar mengetik cepat itu soal kebiasaan bukan bakat",
      "disiplin adalah jembatan antara cita cita dan pencapaian",
      "orang yang berhenti belajar akan menjadi pemilik masa lalu",
      "kesuksesan adalah hasil dari persiapan kerja keras dan belajar dari kegagalan",
      "mulailah dari hal kecil karena hal besar selalu dimulai dari yang kecil",
      "fokus pada kemajuan bukan pada kesempurnaan",
      "waktu yang kamu habiskan untuk berlatih tidak akan pernah sia sia",
      "kunci kecepatan adalah ketenangan bukan ketergesaan"
    ],
    english: [
      "practice does not make perfect it only makes progress",
      "the secret of getting ahead is getting started",
      "small daily improvements are the key to lasting results",
      "focus on being productive instead of being busy",
      "typing fast is a habit built one session at a time",
      "quality means doing it right when no one is looking",
      "it always seems impossible until it is done",
      "do not watch the clock do what it does and keep going",
      "success is the sum of small efforts repeated every day",
      "stay patient the skills you build today carry you tomorrow"
    ]
  };

  /* Kode & simbol untuk latihan pemrograman (opsional, diaktifkan via mode "code"). */
  var CODE_SNIPPETS = {
    javascript: [
      "const words = list.slice(0, 200);",
      "function reset() { state = {}; render(); }",
      "if (typed.length > word.length) return false;",
      "let wpm = Math.round((chars / 5) / minutes);",
      "document.addEventListener('keydown', handleKey);",
      "words.forEach((word) => root.appendChild(word));",
      "return Array.from(text).filter((c) => c !== ' ');",
      "try { save(state); } catch (err) { console.warn(err); }"
    ],
    python: [
      "def wpm(chars, minutes):",
      "    return round((chars / 5) / minutes)",
      "for word in word_list:",
      "    if word == typed:",
      "        correct += 1",
      "with open('words.txt', encoding='utf-8') as f:",
      "    data = f.read().split()",
      "print(f'akurasi: {accuracy:.1f}%')"
    ]
  };

  return {
    WORD_LISTS: { indonesia: INDONESIA, english: ENGLISH },
    QUOTES: QUOTES,
    CODE_SNIPPETS: CODE_SNIPPETS,
    /* Kata lama dipertahankan agar kode/skrip lama tidak rusak. */
    get DEFAULT_LIST() { return INDONESIA; }
  };
});
