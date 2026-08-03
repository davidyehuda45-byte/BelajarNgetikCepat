let selectedLang = 'indonesia';
let maxTime = 30;
let timeLeft = maxTime;
let timer = null;
let isTyping = false;

let wordList = [];
let currentWordIndex = 0;
let currentLetterIndex = 0;

let correctChars = 0;
let incorrectChars = 0;
let totalTypedChars = 0;

let wpmHistory = [];
let timeLabels = [];
let chartInstance = null;

// DOM Elements
const wordsEl = document.getElementById('words');
const hiddenInput = document.getElementById('hidden-input');
const timerEl = document.getElementById('timer');
const resultContainer = document.getElementById('result-container');
const restartBtn = document.getElementById('restart-btn');
const wordsWrapper = document.getElementById('words-wrapper');

// Listener Opsi Bahasa
document.querySelectorAll('#lang-selector button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelector('#lang-selector .active').classList.remove('active');
    e.target.classList.add('active');
    selectedLang = e.target.dataset.lang;
    resetGame();
  });
});

// Listener Opsi Waktu
document.querySelectorAll('#time-selector button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelector('#time-selector .active').classList.remove('active');
    e.target.classList.add('active');
    maxTime = parseInt(e.target.dataset.time);
    resetGame();
  });
});

// Fungsi Acak Array
function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

// Inisialisasi Teks / Kata-kata
function initWords() {
  wordsEl.innerHTML = '';
  // Mengambil 200 kata acak agar teks tidak pernah habis
  wordList = shuffleArray(WORD_LISTS[selectedLang]).slice(0, 200);

  wordList.forEach((word) => {
    const wordDiv = document.createElement('div');
    wordDiv.classList.add('word');

    word.split('').forEach((char) => {
      const letterSpan = document.createElement('span');
      letterSpan.classList.add('letter');
      letterSpan.innerText = char;
      wordDiv.appendChild(letterSpan);
    });

    wordsEl.appendChild(wordDiv);
  });

  updateCursor();
}

// Update Posisi Kursor Kedip
function updateCursor() {
  document.querySelectorAll('.letter.current').forEach(el => el.classList.remove('current'));
  
  const currentWord = wordsEl.children[currentWordIndex];
  if (currentWord) {
    const currentLetter = currentWord.children[currentLetterIndex];
    if (currentLetter) {
      currentLetter.classList.add('current');
    }
  }
}

// Jalankan Penghitung Waktu
function startTimer() {
  timer = setInterval(() => {
    timeLeft--;
    timerEl.innerText = timeLeft;

    // Catat WPM real-time tiap detik untuk grafik
    const elapsedMinutes = (maxTime - timeLeft) / 60;
    const currentWPM = elapsedMinutes > 0 ? Math.round((correctChars / 5) / elapsedMinutes) : 0;
    
    wpmHistory.push(currentWPM);
    timeLabels.push(`${maxTime - timeLeft}s`);

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// Logika Utama Pengetikan
function handleTyping(e) {
  if (!isTyping && e.key.length === 1) {
    isTyping = true;
    startTimer();
  }

  const currentWordEl = wordsEl.children[currentWordIndex];
  if (!currentWordEl) return;

  const currentLetters = currentWordEl.children;

  // Hapus Ketikan (Backspace)
  if (e.key === 'Backspace') {
    if (currentLetterIndex > 0) {
      currentLetterIndex--;
      const prevLetter = currentLetters[currentLetterIndex];
      
      if (prevLetter.classList.contains('correct')) correctChars--;
      if (prevLetter.classList.contains('incorrect')) incorrectChars--;
      
      prevLetter.classList.remove('correct', 'incorrect');
      updateCursor();
    }
    return;
  }

  // Pindah ke Kata Berikutnya (Spasi)
  if (e.key === ' ') {
    e.preventDefault();
    if (currentLetterIndex > 0) {
      currentWordIndex++;
      currentLetterIndex = 0;
      updateCursor();
      scrollWords();
    }
    return;
  }

  // Mengetik Huruf Biasa
  if (e.key.length === 1 && currentLetterIndex < currentLetters.length) {
    const expectedChar = currentLetters[currentLetterIndex].innerText;
    totalTypedChars++;

    if (e.key === expectedChar) {
      // Benar -> Tambah Class Pink
      currentLetters[currentLetterIndex].classList.add('correct');
      correctChars++;
    } else {
      // Salah -> Tambah Class Merah
      currentLetters[currentLetterIndex].classList.add('incorrect');
      incorrectChars++;
    }

    currentLetterIndex++;
    updateCursor();
  }
}

// Auto Scroll Baris Teks saat Mengetik Ke Bawah
function scrollWords() {
  const currentWord = wordsEl.children[currentWordIndex];
  if (currentWord.offsetTop > 40) {
    wordsEl.style.transform = `translateY(-${currentWord.offsetTop}px)`;
  }
}

// Berhenti & Tampilkan Hasil
function endGame() {
  clearInterval(timer);
  
  const timeInMinutes = maxTime / 60;
  const finalWPM = Math.round((correctChars / 5) / timeInMinutes);
  const accuracy = totalTypedChars > 0 ? Math.round((correctChars / totalTypedChars) * 100) : 0;

  document.getElementById('res-wpm').innerText = finalWPM;
  document.getElementById('res-acc').innerText = `${accuracy}%`;
  document.getElementById('res-chars').innerText = `${correctChars}/${incorrectChars}`;

  resultContainer.classList.remove('hidden');
  renderChart();
}

// Render Grafik Hasil WPM Menggunakan Chart.js
function renderChart() {
  const ctx = document.getElementById('wpmChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'WPM',
        data: wpmHistory,
        borderColor: '#ff79c6',
        backgroundColor: 'rgba(255, 121, 198, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, grid: { color: '#444' } },
        x: { grid: { color: '#444' } }
      }
    }
  });
}

// Reset Ulang Tes
function resetGame() {
  clearInterval(timer);
  isTyping = false;
  timeLeft = maxTime;
  currentWordIndex = 0;
  currentLetterIndex = 0;
  correctChars = 0;
  incorrectChars = 0;
  totalTypedChars = 0;
  wpmHistory = [];
  timeLabels = [];

  timerEl.innerText = maxTime;
  wordsEl.style.transform = 'translateY(0)';
  resultContainer.classList.add('hidden');

  hiddenInput.value = '';
  initWords();
  hiddenInput.focus();
}

// Otomatis Menangkap Input Keyboard (Biar Langsung Bisa Ngetik)
document.addEventListener('keydown', (e) => {
  if (!e.ctrlKey && !e.altKey && !e.metaKey) {
    hiddenInput.focus();
  }
});

hiddenInput.addEventListener('keydown', handleTyping);
wordsWrapper.addEventListener('click', () => hiddenInput.focus());
restartBtn.addEventListener('click', resetGame);

// Jalankan Pertama Kali
resetGame();