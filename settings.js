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
  const labelExampleColor = document.querySelector('label[for="example-color-input"]');
  const labelTimer      = document.querySelector('label[for="timer-input"]');
  const saveButton      = document.getElementById('save-button');
  const learnedListContainer = document.getElementById('learned-list-container');

  const languageSelect  = document.getElementById('language-select');   // ★ 추가
  const fontFamilyInput = document.getElementById('font-family-input');
  const fontSizeInput   = document.getElementById('font-size-input');
  const wordColorInput  = document.getElementById('word-color-input');
  const fontColorInput  = document.getElementById('font-color-input');
  const exampleColorInput = document.getElementById('example-color-input');
  const timerInput      = document.getElementById('timer-input');
  const ttslanguageSelect = document.getElementById('tts-lang');
  const voicesList       = document.getElementById('voices-list');
  const voicesNote       = document.getElementById('voices-note');
  const voicesRefreshBtn = document.getElementById('voices-refresh');

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
      exampleColor: 'Example Color',
      timer: 'Word Interval (seconds)',
      ttsLangLabel: 'TTS Language',
      voicesHdr: 'Available Voices',
      voicesRefresh: 'Refresh',
      voicesNone: 'No voices detected yet. They usually appear a few seconds after opening this window.',
      hintMissingTpl: (code) => `No installed voice for "${code}". On Windows: Settings → Time & Language → Speech → Add voices.`,
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
      exampleColor: '예문 색상',
      timer: '전환 간격(초)',
      ttsLangLabel: 'TTS 언어',
      voicesHdr: '사용 가능한 음성',
      voicesRefresh: '새로고침',
      voicesNone: '아직 감지된 음성이 없습니다. 이 창을 연 직후에는 몇 초 뒤 나타날 수 있습니다.',
      hintMissingTpl: (code) => `선택한 언어("${code}")용 음성이 설치되어 있지 않습니다. Windows: 설정 → 시간 및 언어 → 음성 → ‘음성 추가’에서 설치하세요.`,
      save: '저장 후 적용',
      noLearned: '외운 단어가 아직 없습니다.',
      errorLearned: '외운 단어 목록을 불러오지 못했습니다.',
      remove: '삭제'
    }
  };

  async function waitForVoicesReady(maxWait = 4000) {
  // 한번 호출해 로딩 트리거
  try { window.speechSynthesis.getVoices(); } catch {}
  const start = Date.now();
  return await new Promise((resolve) => {
    const tick = () => {
      const ready = (window.speechSynthesis.getVoices() || []).length > 0;
      if (ready) return resolve(true);
      if (Date.now() - start >= maxWait) return resolve(false);
      setTimeout(tick, 100);
    };
    tick();
  });
}

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
    labelExampleColor.textContent = tr.exampleColor;
    labelTimer.textContent      = tr.timer;
    document.querySelector('label[for="tts-lang"]').textContent = tr.ttsLangLabel;
    saveButton.textContent      = tr.save;
    document.getElementById('voices-title').textContent = tr.voicesHdr;
    document.getElementById('voices-refresh').textContent = tr.voicesRefresh;
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
  exampleColorInput.value = settings.exampleColor || '#c8ccd4';
  timerInput.value      = Number(settings.timerSeconds ?? 10);
  ttslanguageSelect.value = settings.ttsLang || '';

  // 텍스트 반영
  applyTexts();

  await waitForVoicesReady();
  renderVoicesList();
  updateMissingHint();

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
      exampleColor: exampleColorInput.value,
      timerSeconds: parseInt(timerInput.value, 10),
      ttsLang: ttslanguageSelect.value || '',
      language: lang
    };
    ipcRenderer.send('save-settings', newSettings);
    window.close();
  });

  function getVoicesSafe() {
    try { return window.speechSynthesis.getVoices() || []; }
    catch { return []; }
  }

  function renderVoicesList() {
    const tr = trMap[lang];
    const voices = getVoicesSafe();
    voicesList.innerHTML = '';

     // ✅ 아직 로딩 전이면 힌트 숨김
  if (!voices.length) {
    voicesNote.textContent = '';
    voicesNote.style.display = 'none';
    return;
  }
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';

    voices.forEach(v => {
      const li = document.createElement('li');
      li.style.padding = '2px 0';
      li.textContent = `${v.name} — ${v.lang}${v.default ? ' (default)' : ''}`;
      ul.appendChild(li);
    });
    voicesList.appendChild(ul);
  }

  function updateMissingHint() {
  const tr = trMap[lang];
  const code = (ttslanguageSelect.value || 'en-US').trim();

  const voices = getVoicesSafe();
  if (!voices.length) {                // ← 로딩 전: 메시지 숨김
    voicesNote.textContent = '';
    voicesNote.style.display = 'none';
    return;
  }

  if (!code) { voicesNote.textContent = ''; voicesNote.style.display = 'none'; return; }

  const lc = code.toLowerCase();
  const has = voices.some(v => {
    const L = (v.lang || '').toLowerCase();
    return L === lc || L.startsWith(lc.split('-')[0]);
  });

  if (has) {
    voicesNote.textContent = '';
    voicesNote.style.display = 'none';
  } else {
    voicesNote.textContent = tr.hintMissingTpl(code);
    voicesNote.style.display = '';
  }
}

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
  voicesRefreshBtn?.addEventListener('click', () => {
    // 일부 환경에선 getVoices가 지연 로딩 → 약간 딜레이 후 다시 렌더
    renderVoicesList();
    setTimeout(() => { renderVoicesList(); updateMissingHint(); }, 300);
  });

  // ▼ TTS 언어 선택 변경 시 안내 갱신
  ttslanguageSelect?.addEventListener('change', updateMissingHint);

  // ▼ 브라우저(Chromium)에서 음성 목록 로딩 완료 이벤트
  window.speechSynthesis?.addEventListener?.('voiceschanged', () => {
  renderVoicesList();
  updateMissingHint();
});


});

const closeBtn = document.getElementById('win-close');
if (closeBtn && process.platform !== 'darwin') closeBtn.style.display = 'none';

document.getElementById('win-close')?.addEventListener('click', () => {
  ipcRenderer.send('close-settings-window');
});