/* ============================================================
   TypeCraft — words.js
   Expanded word lists: ~400 words per language
   Categories: common, tech, daily life, verbs, adjectives,
               abstract, nature, food, places, emotions
   ============================================================ */

const WORD_LISTS = {

  /* ══════════════════════════════════════════════════════════
     INDONESIA
     ══════════════════════════════════════════════════════════ */
  indonesia: [
    // ── Kata penghubung & umum ──
    'dan', 'atau', 'yang', 'ini', 'itu', 'ada', 'juga', 'dengan',
    'untuk', 'dari', 'pada', 'ke', 'di', 'tidak', 'bisa', 'akan',
    'sudah', 'belum', 'punya', 'mau', 'maka', 'agar', 'supaya',
    'karena', 'tetapi', 'namun', 'bahwa', 'jika', 'ketika', 'saat',
    'selama', 'setelah', 'sebelum', 'antara', 'tanpa', 'tentang',
    'oleh', 'seperti', 'sebagai', 'lebih', 'sangat', 'cukup',

    // ── Kata benda umum ──
    'orang', 'anak', 'buku', 'rumah', 'jalan', 'kota', 'negara',
    'waktu', 'hari', 'malam', 'pagi', 'sore', 'tahun', 'bulan',
    'minggu', 'tangan', 'mata', 'kepala', 'hati', 'pikiran', 'suara',
    'tempat', 'dunia', 'hidup', 'nama', 'warna', 'cahaya', 'langit',
    'tanah', 'air', 'api', 'angin', 'bumi', 'laut', 'hutan', 'gunung',
    'sungai', 'danau', 'pulau', 'pantai', 'padang', 'udara',

    // ── Teknologi & pemrograman ──
    'data', 'kode', 'fungsi', 'program', 'server', 'jaringan',
    'sistem', 'aplikasi', 'perangkat', 'komputer', 'layar', 'proses',
    'variabel', 'objek', 'kelas', 'metode', 'array', 'loop', 'kondisi',
    'basis', 'query', 'antarmuka', 'model', 'tampilan', 'pengembang',
    'algoritma', 'struktur', 'modul', 'pustaka', 'kerangka', 'mesin',
    'platform', 'token', 'enkripsi', 'protokol', 'koneksi', 'sinyal',
    'memori', 'penyimpanan', 'pengguna', 'autentikasi', 'otorisasi',
    'kontainer', 'deployment', 'repositori', 'versi', 'komit',

    // ── Kata kerja ──
    'membuat', 'menggunakan', 'menjalankan', 'membangun', 'mencari',
    'menemukan', 'membaca', 'menulis', 'belajar', 'mengajar', 'bekerja',
    'bermain', 'berlari', 'berjalan', 'berbicara', 'mendengar', 'melihat',
    'merasa', 'berpikir', 'mencoba', 'membantu', 'menjaga', 'mengelola',
    'memilih', 'mengambil', 'memberikan', 'menerima', 'mengirim',
    'membayar', 'membeli', 'menjual', 'mengubah', 'memindahkan',
    'menghapus', 'menyimpan', 'memuat', 'merender', 'mengakses',

    // ── Kata sifat ──
    'bagus', 'baik', 'buruk', 'besar', 'kecil', 'panjang', 'pendek',
    'tinggi', 'rendah', 'cepat', 'lambat', 'baru', 'lama', 'tua',
    'muda', 'cantik', 'indah', 'kuat', 'lemah', 'pintar', 'bodoh',
    'keras', 'lembut', 'panas', 'dingin', 'terang', 'gelap', 'ramai',
    'sepi', 'bersih', 'kotor', 'mudah', 'sulit', 'mahal', 'murah',
    'senang', 'sedih', 'takut', 'berani', 'malas', 'rajin', 'sabar',

    // ── Makanan & minuman ──
    'nasi', 'mie', 'roti', 'ayam', 'daging', 'ikan', 'telur', 'sayur',
    'buah', 'apel', 'pisang', 'jeruk', 'mangga', 'pepaya', 'tomat',
    'bawang', 'cabai', 'gula', 'garam', 'kopi', 'teh', 'susu', 'jus',
    'sup', 'soto', 'rendang', 'sate', 'bakso', 'tempe', 'tahu',
    'sambal', 'kecap', 'minyak', 'mentega', 'keju', 'coklat', 'kue',

    // ── Tempat & lingkungan ──
    'sekolah', 'kantor', 'pasar', 'toko', 'restoran', 'rumah sakit',
    'stasiun', 'bandara', 'pelabuhan', 'hotel', 'mall', 'perpustakaan',
    'universitas', 'masjid', 'gereja', 'taman', 'lapangan', 'jembatan',
    'terowongan', 'gedung', 'lantai', 'kamar', 'dapur', 'ruangan',

    // ── Emosi & perasaan ──
    'bahagia', 'gembira', 'cemas', 'gelisah', 'marah', 'kesal',
    'kecewa', 'bangga', 'malu', 'rindu', 'cinta', 'kasih', 'benci',
    'heran', 'kagum', 'bingung', 'lelah', 'bersemangat', 'tenang',

    // ── Abstrak & konsep ──
    'ide', 'konsep', 'teori', 'ilmu', 'pengetahuan', 'pengalaman',
    'kebiasaan', 'budaya', 'tradisi', 'nilai', 'norma', 'etika',
    'logika', 'kreasi', 'inovasi', 'solusi', 'masalah', 'tantangan',
    'peluang', 'risiko', 'strategi', 'rencana', 'tujuan', 'hasil',
    'prinsip', 'kebijakan', 'kepercayaan', 'keyakinan', 'harapan',

    // ── Alam ──
    'pohon', 'bunga', 'rumput', 'batu', 'pasir', 'tanah', 'daun',
    'akar', 'ranting', 'awan', 'hujan', 'petir', 'bintang', 'bulan',
    'matahari', 'pelangi', 'kabut', 'salju', 'es', 'gelombang',

    // ── Aktivitas & hobi ──
    'membaca', 'menulis', 'menggambar', 'memasak', 'berolahraga',
    'menyanyi', 'menari', 'bermain', 'traveling', 'fotografi',
    'coding', 'gaming', 'streaming', 'desain', 'editing',
  ],

  /* ══════════════════════════════════════════════════════════
     ENGLISH
     ══════════════════════════════════════════════════════════ */
  english: [
    // ── High-frequency / connectors ──
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has',
    'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two',
    'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she',
    'too', 'use', 'with', 'that', 'this', 'have', 'from', 'they',
    'will', 'been', 'some', 'what', 'when', 'make', 'like', 'than',
    'into', 'time', 'look', 'more', 'come', 'over', 'also', 'back',
    'just', 'then', 'than', 'know', 'take', 'year', 'good', 'much',
    'very', 'only', 'even', 'most', 'well', 'long', 'down', 'each',

    // ── Tech & programming ──
    'code', 'data', 'loop', 'func', 'type', 'node', 'tree', 'hash',
    'list', 'sort', 'heap', 'stack', 'queue', 'graph', 'array',
    'index', 'cache', 'query', 'class', 'build', 'fetch', 'parse',
    'state', 'store', 'async', 'await', 'error', 'throw', 'catch',
    'debug', 'trace', 'bench', 'scope', 'block', 'chunk', 'frame',
    'token', 'route', 'event', 'hooks', 'props', 'render', 'effect',
    'logic', 'model', 'proxy', 'patch', 'merge', 'clone', 'spawn',
    'thread', 'worker', 'stream', 'buffer', 'socket', 'server',
    'client', 'deploy', 'bundle', 'module', 'import', 'export',
    'config', 'script', 'schema', 'migrate', 'commit', 'branch',
    'rebase', 'review', 'sprint', 'kanban', 'docker', 'kernel',

    // ── Common nouns ──
    'home', 'door', 'room', 'wall', 'desk', 'book', 'page', 'word',
    'line', 'path', 'road', 'city', 'town', 'land', 'lake', 'hill',
    'tree', 'leaf', 'seed', 'root', 'rain', 'wind', 'fire', 'snow',
    'star', 'moon', 'sun', 'wave', 'rock', 'sand', 'soil', 'dust',
    'face', 'hand', 'mind', 'soul', 'body', 'heart', 'life', 'name',
    'game', 'move', 'plan', 'idea', 'goal', 'task', 'role', 'team',
    'work', 'job', 'tool', 'rule', 'form', 'kind', 'part', 'side',
    'case', 'fact', 'note', 'sign', 'mark', 'link', 'edge', 'base',
    'core', 'step', 'mode', 'view', 'map', 'key', 'set', 'row',

    // ── Verbs ──
    'run', 'use', 'add', 'ask', 'try', 'fix', 'cut', 'hit', 'sit',
    'eat', 'fly', 'win', 'pay', 'lie', 'buy', 'set', 'led', 'met',
    'read', 'send', 'find', 'give', 'help', 'hold', 'keep', 'lead',
    'live', 'lose', 'open', 'pass', 'pull', 'push', 'show', 'talk',
    'tell', 'turn', 'walk', 'work', 'call', 'feel', 'fill', 'grow',
    'hang', 'hear', 'join', 'jump', 'kill', 'know', 'left', 'link',
    'meet', 'move', 'need', 'pick', 'play', 'rest', 'rise', 'roll',
    'save', 'skip', 'stop', 'test', 'vote', 'wait', 'want', 'wrap',
    'write', 'build', 'check', 'clean', 'click', 'close', 'cover',
    'count', 'drive', 'enter', 'fetch', 'force', 'guess', 'learn',
    'press', 'print', 'prove', 'raise', 'reach', 'reply', 'reset',
    'serve', 'share', 'shift', 'solve', 'speak', 'spend', 'stand',
    'start', 'store', 'study', 'think', 'throw', 'touch', 'track',
    'trust', 'watch', 'yield',

    // ── Adjectives ──
    'big', 'old', 'new', 'hot', 'dry', 'raw', 'low', 'red', 'top',
    'far', 'bad', 'odd', 'slow', 'fast', 'easy', 'hard', 'dark',
    'free', 'full', 'high', 'huge', 'just', 'kind', 'late', 'lazy',
    'loud', 'main', 'nice', 'open', 'pale', 'pure', 'real', 'rich',
    'safe', 'slim', 'soft', 'tall', 'thin', 'true', 'vast', 'weak',
    'wide', 'wild', 'wise', 'young', 'light', 'clean', 'clear',
    'close', 'cold', 'cool', 'dark', 'deep', 'dense', 'empty',
    'equal', 'exact', 'extra', 'final', 'fresh', 'funny', 'grand',
    'great', 'happy', 'heavy', 'inner', 'large', 'local', 'lucky',
    'minor', 'mixed', 'plain', 'prime', 'prior', 'quick', 'quiet',
    'ready', 'rough', 'round', 'sharp', 'short', 'smart', 'small',
    'solid', 'steep', 'still', 'stiff', 'tight', 'tired', 'total',
    'upper', 'valid', 'vital', 'vivid', 'whole', 'wrong',

    // ── Food & drink ──
    'rice', 'bread', 'cake', 'meat', 'fish', 'milk', 'egg', 'salt',
    'soup', 'salad', 'fruit', 'apple', 'grape', 'lemon', 'olive',
    'pasta', 'pizza', 'steak', 'sushi', 'taco', 'wrap', 'juice',
    'water', 'coffee', 'cream', 'sugar', 'honey',

    // ── Nature ──
    'ocean', 'river', 'beach', 'cloud', 'storm', 'frost', 'field',
    'plain', 'slope', 'cliff', 'cave', 'creek', 'brook', 'pond',
    'grove', 'shrub', 'moss', 'fern', 'dew', 'mist', 'fog',
    'breeze', 'gust', 'tide', 'coral', 'ember',

    // ── Abstract & concepts ──
    'truth', 'peace', 'trust', 'faith', 'hope', 'love', 'fear',
    'pain', 'joy', 'pride', 'shame', 'doubt', 'rage', 'calm',
    'logic', 'proof', 'cause', 'effect', 'value', 'power', 'force',
    'space', 'time', 'order', 'chaos', 'limit', 'bound', 'scope',
    'depth', 'width', 'scale', 'speed', 'flow', 'rate', 'trend',
    'shift', 'cycle', 'phase', 'stage', 'level', 'grade', 'point',
    'chance', 'choice', 'trade', 'skill', 'craft', 'style', 'taste',
    'sense', 'sight', 'sound', 'touch', 'smell', 'taste',

    // ── Emotions ──
    'happy', 'angry', 'upset', 'proud', 'brave', 'timid', 'eager',
    'bored', 'tense', 'tired', 'joyful', 'scared', 'lonely',
    'grateful', 'hopeful', 'content', 'nervous', 'curious',
  ],
};
