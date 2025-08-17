const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 전역 경로(초기엔 비워두고, init에서 설정)
let userDataPath = '';
let learnedWordsPath = '';

/** 안전 파싱 */
function safeParseJSON(text, fallback) {
  try {
    if (typeof text !== 'string' || text.trim() === '') return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // --- DOM Elements ---
  const fontFamilyInput = document.getElementById('font-family-input');
  const fontSizeInput   = document.getElementById('font-size-input');
  const wordColorInput  = document.getElementById('word-color-input');
  const fontColorInput  = document.getElementById('font-color-input');
  const timerInput      = document.getElementById('timer-input');
  const saveButton      = document.getElementById('save-button');
  const learnedListContainer = document.getElementById('learned-list-container');

  // --- userDataPath / learned.json 경로 확보 ---
  try {
    userDataPath = await ipcRenderer.invoke('get-userData-path');
  } catch {
    userDataPath = __dirname; // 폴백
  }
  learnedWordsPath = path.join(userDataPath, 'learned.json');

  // --- Settings 불러오기 ---
  const settings = await ipcRenderer.invoke('get-settings');
  fontFamilyInput.value = settings.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  fontSizeInput.value   = Number(settings.fontSize ?? 24);
  wordColorInput.value  = settings.wordColor || '#61afef';
  fontColorInput.value  = settings.fontColor || '#abb2bf';
  timerInput.value      = Number(settings.timerSeconds ?? 10);

  // --- Learned 목록 로드 ---
  loadLearnedWords();

  // === 이벤트 바인딩 ===
  // 저장
  saveButton.addEventListener('click', () => {
    const newSettings = {
      fontFamily: fontFamilyInput.value,
      fontSize: parseInt(fontSizeInput.value, 10),
      wordColor: wordColorInput.value,
      fontColor: fontColorInput.value,
      timerSeconds: parseInt(timerInput.value, 10),
    };
    ipcRenderer.send('save-settings', newSettings);
    window.close();
  });

  // Learned 삭제 (이벤트 위임)
  learnedListContainer.addEventListener('click', (event) => {
    const btn = event.target;
    if (!btn.classList.contains('remove-learned-btn')) return;

    const wordToRemove = btn.dataset.word;
    try {
      const raw = fs.existsSync(learnedWordsPath) ? fs.readFileSync(learnedWordsPath, 'utf-8') : '[]';
      const arr = safeParseJSON(raw, []);
      const set = new Set(arr);
      if (set.delete(wordToRemove)) {
        fs.writeFileSync(learnedWordsPath, JSON.stringify(Array.from(set), null, 2));
        ipcRenderer.send('learned-words-updated'); // 메인에 알림 → 메인이 메인창에 reload-words 브로드캐스트
        loadLearnedWords(); // 목록 갱신
      }
    } catch (error) {
      console.error('Failed to remove word:', error);
    }
  });

  // --- 함수들 ---
  function loadLearnedWords() {
    learnedListContainer.innerHTML = '';
    try {
      if (!fs.existsSync(learnedWordsPath)) {
        learnedListContainer.innerHTML = '<p>No words marked as learned yet.</p>';
        return;
      }
      const raw = fs.readFileSync(learnedWordsPath, 'utf-8');
      const arr = safeParseJSON(raw, []);
      const set = new Set(arr);

      if (set.size === 0) {
        learnedListContainer.innerHTML = '<p>No words marked as learned yet.</p>';
        return;
      }

      // 정렬해서 보기 좋게
      Array.from(set).sort((a, b) => a.localeCompare(b)).forEach(word => {
        const item = document.createElement('div');
        item.className = 'learned-item';
        item.innerHTML = `
          <span class="learned-term">${word}</span>
          <button class="remove-learned-btn" data-word="${word}">Remove</button>
        `;
        learnedListContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Could not load or parse learned.json', error);
      learnedListContainer.innerHTML = '<p>Error loading learned words.</p>';
    }
  }
});