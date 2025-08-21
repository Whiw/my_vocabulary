const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');


 

window.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements

  const container = document.querySelector('.container');  // ★ 추가
  const wordEl = document.getElementById('word');
  const meaningEl = document.getElementById('meaning');
  const exampleEl = document.getElementById('example');
  const learnedCheckbox = document.getElementById('learned-checkbox');
  const loadButton = document.getElementById('load-button');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const modeButton = document.getElementById('mode-button');
  const editButton = document.getElementById('edit-button');
  const settingsButton = document.getElementById('settings-button');
  const helpButton = document.getElementById('help-button');
  const speakButton = document.getElementById('speak-button');
 


  // userData 경로 얻기 (메인에 핸들러 없으면 __dirname 폴백)
  let userDataPath = __dirname;
  try {
    const p = await ipcRenderer.invoke('get-userData-path');
    if (p) userDataPath = p;
  } catch (_) { /* fallback to __dirname */ }
  const learnedWordsPath = path.join(userDataPath, 'learned.json');

  // State
  let words = [];
  let learnedWords = new Set();
  let currentFilePath = null;
  let currentIndex = 0;
  let timer = null;
  let settings = {};
  let isHovered = false;

  
  if (speakButton) speakButton.addEventListener('click', () => {
  if (words.length > 0) TTS.speak(words[currentIndex].word);
});

  
 

  // --- SETTINGS ---

async function initialize() {
  loadLearnedWords();
  const initialSettings = await ipcRenderer.invoke('get-settings');
  await applySettings(initialSettings);

  const lastPath = initialSettings.lastFilePath;
  if (lastPath && fs.existsSync(lastPath)) {
    try {
      const content = fs.readFileSync(lastPath, 'utf-8');
      currentFilePath = lastPath;
      loadAndFilterWords(content);
    } catch (e) {
      console.error('Auto-load last file failed:', e);
    }
  }
}


  async function applySettings(newSettings) {
    settings = newSettings || {};
    document.body.style.setProperty('--font-family', settings.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif");
    document.body.style.setProperty('--font-size', `${settings.fontSize ?? 24}px`);
    document.body.style.setProperty('--word-color', settings.wordColor || '#61afef');
    document.body.style.setProperty('--font-color', settings.fontColor || '#abb2bf');
    document.body.style.setProperty('--example-color', settings.exampleColor || '#c8ccd4');
    resetTimer(); // 타이머 갱신
  }

  // --- DATA HANDLING ---
  function loadLearnedWords() {
    try {
      if (fs.existsSync(learnedWordsPath)) {
        learnedWords = new Set(JSON.parse(fs.readFileSync(learnedWordsPath, 'utf-8')));
      }
    } catch (error) {
      console.error('Error loading learned words:', error);
      learnedWords = new Set();
    }
  }

  function saveLearnedWords() {
    try {
      fs.writeFileSync(learnedWordsPath, JSON.stringify(Array.from(learnedWords), null, 2));
      //ipcRenderer.send('learned-words-updated');
    } catch (error) {
      console.error('Error saving learned words:', error);
    }
  }

  // --- UI & WORD DISPLAY ---
  function displayWord() {
    if (words.length === 0) {
      wordEl.textContent = 'All Done!';
      meaningEl.textContent = 'Load a new file or restart.';
      if (exampleEl) exampleEl.style.display = '';
      if (timer) clearInterval(timer);
      if (speakButton) speakButton.disabled = true; 
      return;
    }
    const current = words[currentIndex];
    wordEl.textContent = current.word;
    meaningEl.textContent = current.meaning;

    if (exampleEl) {
      if (current.example && current.example.length > 0) {
        exampleEl.textContent = current.example;
        exampleEl.style.display = '';
      } else {
        exampleEl.textContent = '';
        exampleEl.style.display = 'none';
      }
    }
    learnedCheckbox.checked = false;
    if (speakButton) speakButton.disabled = false; 
  }

  function resetTimer() {
    if (timer) clearInterval(timer);
    const sec = Number(settings.timerSeconds || 10);
    if (words.length > 0 && sec > 0 && !isHovered) {
      timer = setInterval(showNextWord, sec * 1000);
    }
  }

  function showNextWord() {
    if (words.length === 0) return;
    currentIndex = (currentIndex + 1) % words.length;
    displayWord();
    resetTimer();
  }

  function showPrevWord() {
    if (words.length === 0) return;
    currentIndex = (currentIndex - 1 + words.length) % words.length;
    displayWord();
    resetTimer();
  }

  function loadAndFilterWords(fileContent) {
    const allWords = fileContent
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(line => {
      // 단어 ↹ 뜻 [↹ 예문] (3번째 칼럼은 선택)
      const parts = line.split('\t');
      const word = (parts[0] || '').trim();
      const meaning = (parts[1] || '').trim();
      const example = (parts[2] || '').trim(); // 없으면 빈 문자열
      return { word, meaning, example };
    });

  loadLearnedWords();
  words = allWords.filter(w => w.word && !learnedWords.has(w.word));

  editButton.disabled = false;
  if (words.length > 0) {
    currentIndex = 0;
    displayWord();
    resetTimer();
  } else {
    wordEl.textContent = 'All learned!';
    meaningEl.textContent = 'Every word in this file is learned.';
    exampleEl.style.display = 'none';
    if (timer) clearInterval(timer);
  }
}

  // --- EVENT LISTENERS ---
  loadButton.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('dialog:openFile');
    if (!result || !result.filePath) return;

    currentFilePath = result.filePath;
    loadAndFilterWords(result.content);

    ipcRenderer.send('set-last-file', currentFilePath);
  });

  learnedCheckbox.addEventListener('change', () => {
    if (learnedCheckbox.checked && words.length > 0) {
      const learnedWord = words[currentIndex].word;
      learnedWords.add(learnedWord);
      saveLearnedWords();

      words.splice(currentIndex, 1);
      if (currentIndex >= words.length) currentIndex = 0;

      displayWord();
      resetTimer();
    }
  });

  prevButton.addEventListener('click', showPrevWord);
  nextButton.addEventListener('click', showNextWord);

  // Hide/Show: 단어/뜻/Show만 남김
  modeButton.addEventListener('click', () => {
    const isHidden = document.body.classList.toggle('ui-hidden');
    modeButton.textContent = isHidden ? 'Show' : 'Hide';
  });

  editButton.addEventListener('click', () => {
    if (currentFilePath) ipcRenderer.send('edit-file', currentFilePath);
  });

  settingsButton.addEventListener('click', () => ipcRenderer.send('open-settings-window'));
  helpButton.addEventListener('click', () => ipcRenderer.send('open-about-window'));

  ipcRenderer.on('settings-updated', (_evt, newSettings) => applySettings(newSettings));
  ipcRenderer.on('reload-words', () => {
    if (currentFilePath) {
      const fileContent = fs.readFileSync(currentFilePath, 'utf-8');
      loadAndFilterWords(fileContent);
    }
  });

 // --- MOUSE HOVER HANDLING ---
// --- MOUSE HOVER HANDLING (REWRITE) ---
function checkHoverState() {
  const hovered = document.body.matches(':hover');  

  if (hovered && !isHovered) {
    
    isHovered = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  } else if (!hovered && isHovered) {
    
    isHovered = false;
    resetTimer();
  }
}

// 주기적으로 hover 상태 감시 (300ms마다)
setInterval(checkHoverState, 300);

  // --- INITIALIZATION ---
  initialize()

  const TTS = (() => {
    let voices = [];
    function refreshVoices() { voices = window.speechSynthesis.getVoices() || []; }
    refreshVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }

    function pickVoice(bcp47) {
      if (!bcp47) return null;
      const lc = bcp47.toLowerCase();
      const exact = voices.find(v => v.lang && v.lang.toLowerCase() === lc);
      if (exact) return exact;
       console.log(lc);
       if (lc.startsWith('zh')) {
        v = voices.find(v => v.name && v.name.toLowerCase().includes('chinese (simplified'));
    if (v) return v;
  }

      const pre = lc.split('-')[0];
      const loose = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(pre));
      return loose || null;
    }

    let speaking = false;
    function speak(text, opts = {}) {
    if (!text) return;
    const lang2 = (settings && settings.ttsLang) ? settings.ttsLang : 'en-US';
    const rate  = Number(settings?.ttsRate ?? 1.0); // 설정에서 없으면 1.0
    const pitch = Number(opts.pitch ?? 1.0);
    const volume = Number(opts.volume ?? 1.0);
    const onend = opts.onend;

    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang2;
    console.log(u.lang);
    const v = pickVoice(u.lang);
    if (v) u.voice = v;
    u.rate = rate; u.pitch = pitch; u.volume = volume;

    u.onstart = () => {
      speaking = true;
    };
    u.onend = () => { speaking = false; onend && onend();  };
    u.onerror = () => { speaking = false; onend && onend();  };

    // 같은 단어 연타 시 중복 방지
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
    function stop(){ window.speechSynthesis.cancel(); speaking = false; }
    function isSpeaking(){ return speaking; }

    return { speak, stop, isSpeaking };
  })();

  // ===== 언어 감지(가벼운 규칙 + 폴백) =====
  function detectByScript(text){
    if (/[\uac00-\ud7af]/.test(text)) return 'ko-KR';        // 한글
    if (/[\u3040-\u30ff]/.test(text)) return 'ja-JP';        // 히라가나/가타카나
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';        // 한자 -> 중국어로 가정
    if (/[А-Яа-яЁё]/.test(text)) return 'ru-RU';             // 키릴
    if (/[א-ת]/.test(text)) return 'he-IL';                  // 히브리
    if (/[أ-ي]/.test(text)) return 'ar-SA';                  // 아랍
    if (/[ก-๙]/.test(text)) return 'th-TH';                  // 태국
    if (/[ह-ॿ]/.test(text)) return 'hi-IN';                  // 데바나가리(힌디어 등)
    return null; // 라틴 문자권 등
  }

  // 설정에서 TTS 기본값 꺼내오기(없으면 폴백)
  function getTtsConfig() {
    // settings 창에서 ttsLang, ttsRate 저장하지 않았다면 폴백만 사용
    try { return JSON.parse(localStorage.getItem('myvocab.tts') || '{}'); }
    catch { return {}; }
  }

  function guessSpeakLang(text) {
    // 1) 스크립트로 확실하게 구분되면 그걸 사용
    const byScript = detectByScript(text);
    if (byScript) return byScript;

    // 2) 라틴 문자권: 설정의 기본 학습 언어로 읽기 (없으면 en-US)
    const cfg = getTtsConfig();
    return cfg.ttsLang || 'en-US';
  }
});