const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let userDataPath = '';
let learnedWordsPath = '';

function safeParseJSON(text, fallback) {
  try { if (typeof text !== 'string' || text.trim() === '') return fallback; return JSON.parse(text); }
  catch { return fallback; }
}

window.addEventListener('DOMContentLoaded', async () => {
  // DOM
  const h1El = document.querySelector('h1');
  const sectionHeads = document.querySelectorAll('.settings-section > h2');
  const labelFontFamily = document.querySelector('label[for="font-family-input"]');
  const labelFontSize   = document.querySelector('label[for="font-size-input"]');
  const labelWordColor  = document.querySelector('label[for="word-color-input"]');
  const labelFontColor  = document.querySelector('label[for="font-color-input"]');
  const labelTimer      = document.querySelector('label[for="timer-input"]');
  const saveButton      = document.getElementById('save-button');
  const learnedListContainer = document.getElementById('learned-list-container');

  const languageSelect  = document.getElementById('language-select');   // ★ 추가
  const fontFamilyInput = document.getElementById('font-family-input');
  const fontSizeInput   = document.getElementById('font-size-input');
  const wordColorInput  = document.getElementById('word-color-input');
  const fontColorInput  = document.getElementById('font-color-input');
  const timerInput      = document.getElementById('timer-input');

  // 언어/설정
  let settings = await ipcRenderer.invoke('get-settings');
  let lang = settings.language || ((navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en');

  const trMap = {
    en: {
      pageTitle: 'Settings',
      sections: ['Language', 'Appearance', 'Behavior', 'Learned Words'],
      languageLabel: 'Interface Language',
      fontFamily: 'Font Family',
      fontSize: 'Word Font Size (px)',
      wordColor: 'Word Color',
      fontColor: 'Meaning Color',
      timer: 'Word Interval (seconds)',
      save: 'Save and Apply',
      noLearned: 'No words marked as learned yet.',
      errorLearned: 'Error loading learned words.',
      remove: 'Remove'
    },
    ko: {
      pageTitle: '설정',
      sections: ['언어', '모양', '동작', '외운 단어'],
      languageLabel: '인터페이스 언어',
      fontFamily: '글꼴 패밀리',
      fontSize: '단어 글꼴 크기(px)',
      wordColor: '단어 색상',
      fontColor: '뜻 색상',
      timer: '전환 간격(초)',
      save: '저장 후 적용',
      noLearned: '외운 단어가 아직 없습니다.',
      errorLearned: '외운 단어 목록을 불러오지 못했습니다.',
      remove: '삭제'
    }
  };

  function applyTexts() {
    const tr = trMap[lang];
    document.title = tr.pageTitle;
    if (h1El) h1El.textContent = tr.pageTitle;

    // 섹션 헤더 순서: Language(우리가 추가), Appearance, Behavior, Learned
    if (sectionHeads[0]) sectionHeads[0].textContent = tr.sections[0];
    if (sectionHeads[1]) sectionHeads[1].textContent = tr.sections[1];
    if (sectionHeads[2]) sectionHeads[2].textContent = tr.sections[2];
    if (sectionHeads[3]) sectionHeads[3].textContent = tr.sections[3];

    // 라벨
    document.querySelector('label[for="language-select"]').textContent = tr.languageLabel;
    labelFontFamily.textContent = tr.fontFamily;
    labelFontSize.textContent   = tr.fontSize;
    labelWordColor.textContent  = tr.wordColor;
    labelFontColor.textContent  = tr.fontColor;
    labelTimer.textContent      = tr.timer;
    saveButton.textContent      = tr.save;
  }

  // userData 경로
  try { userDataPath = await ipcRenderer.invoke('get-userData-path'); }
  catch { userDataPath = __dirname; }
  learnedWordsPath = path.join(userDataPath, 'learned.json');

  // 설정 값 채우기
  languageSelect.value = (lang === 'ko' ? 'ko' : 'en');
  fontFamilyInput.value = settings.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  fontSizeInput.value   = Number(settings.fontSize ?? 24);
  wordColorInput.value  = settings.wordColor || '#61afef';
  fontColorInput.value  = settings.fontColor || '#abb2bf';
  timerInput.value      = Number(settings.timerSeconds ?? 10);

  // 텍스트 반영
  applyTexts();

  // Learned 목록 로드
  loadLearnedWords();

  // 언어 변경 즉시 반영(+메모리)
  languageSelect.addEventListener('change', () => {
    lang = languageSelect.value;                  // 'en' | 'ko'
    applyTexts();                                 // 현재 창 라벨 즉시 변경
    ipcRenderer.send('set-language', lang);       // 메인/메인창에도 즉시 반영/저장
  });

  // 삭제 클릭
  learnedListContainer.addEventListener('click', (e) => {
    const btn = e.target;
    if (!btn.classList.contains('remove-learned-btn')) return;
    const w = btn.dataset.word;
    try {
      const raw = fs.existsSync(learnedWordsPath) ? fs.readFileSync(learnedWordsPath, 'utf-8') : '[]';
      const arr = safeParseJSON(raw, []);
      const set = new Set(arr);
      if (set.delete(w)) {
        fs.writeFileSync(learnedWordsPath, JSON.stringify(Array.from(set), null, 2));
        ipcRenderer.send('learned-words-updated');
        loadLearnedWords();
      }
    } catch (err) {
      console.error('Failed to remove word:', err);
    }
  });

  // 저장
  saveButton.addEventListener('click', () => {
    const newSettings = {
      fontFamily: fontFamilyInput.value,
      fontSize: parseInt(fontSizeInput.value, 10),
      wordColor: wordColorInput.value,
      fontColor: fontColorInput.value,
      timerSeconds: parseInt(timerInput.value, 10),
      language: lang
    };
    ipcRenderer.send('save-settings', newSettings);
    window.close();
  });

  function loadLearnedWords() {
    learnedListContainer.innerHTML = '';
    const tr = trMap[lang];

    try {
      if (!fs.existsSync(learnedWordsPath)) {
        learnedListContainer.innerHTML = `<p>${tr.noLearned}</p>`;
        return;
      }
      const raw = fs.readFileSync(learnedWordsPath, 'utf-8');
      const arr = safeParseJSON(raw, []);
      const set = new Set(arr);

      if (set.size === 0) {
        learnedListContainer.innerHTML = `<p>${tr.noLearned}</p>`;
        return;
      }

      Array.from(set).sort((a, b) => a.localeCompare(b)).forEach(word => {
        const item = document.createElement('div');
        item.className = 'learned-item';
        item.innerHTML = `
          <span class="learned-term">${word}</span>
          <button class="remove-learned-btn" data-word="${word}">${tr.remove}</button>
        `;
        learnedListContainer.appendChild(item);
      });
    } catch (e) {
      console.error('Could not load or parse learned.json', e);
      learnedListContainer.innerHTML = `<p>${tr.errorLearned}</p>`;
    }
  }
});