const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

window.addEventListener('DOMContentLoaded', async () => {
  const langSelect = document.getElementById('lang-select-about');

  // 언어 결정
  let lang = 'en';
  try {
    const s = await ipcRenderer.invoke('get-settings');
    lang = s?.language || ((navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  } catch {
    lang = (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }

  const dict = {
    en: {
      title: 'About My Vocabulary',
      appName: 'My Vocabulary',
      author: 'Created by whiw',
      aboutH2: 'About the App',
      aboutP: 'My Vocabulary is a simple, overlay-style flashcard application designed to help you learn new words while you work or browse.',
      howH2: 'How to Use',
      li1: 'Click <strong>Load</strong> to open a TSV (Tab-Separated Value) file. The file should be formatted with one word and its meaning per line, separated by a tab.',
      li2: 'Words will cycle automatically. Hover your mouse over the window to pause the timer.',
      li3: 'Use the <strong>&lt;</strong> and <strong>&gt;</strong> arrows to navigate manually.',
      li4: 'Check the <strong>Learned</strong> box to remove a word from the current session. It won\'t appear again unless you unlearn it in Settings.',
      li5: 'Click <strong>Settings</strong> to change the timer speed, font styles, and manage your learned words list.',
      supH2: 'Support the Developer',
      supP: 'If you find this app helpful, please consider supporting its development!',
      paypal: 'Support with PayPal',
      patreon: 'Become a Patron',
      bmac: 'Buy Me a Coffee',
      langLabel: 'Language',

      krTitle: 'Support in Korea',
      krText: 'Buy a coffee (₩5,000) to support the developer ☕️',
      kakaoCaption: 'KakaoPay QR',
      tossCaption: 'Toss QR'
    },
    ko: {
      title: 'My vocabulary 정보',
      appName: 'My Vocabulary',
      author: '제작: whiw',
      aboutH2: '앱 소개',
      aboutP: 'My Vocabulary는 작업하거나 웹서핑할 때도 새 단어를 자연스럽게 익히도록 돕는 오버레이형 플래시카드 앱입니다.',
      howH2: '사용 방법',
      li1: '<strong>Load</strong>를 눌러 TSV 파일을 엽니다. 각 줄은 “단어[TAB]뜻” 형식이어야 합니다.',
      li2: '단어는 자동으로 전환됩니다. 창 위에 마우스를 올리면 타이머가 일시정지됩니다.',
      li3: '<strong>&lt;</strong>, <strong>&gt;</strong> 화살표로 수동 탐색을 할 수 있습니다.',
      li4: '<strong>Learned</strong>를 체크하면 현재 단어가 세션에서 제외됩니다. 설정에서 해제하지 않는 한 다시 나오지 않습니다.',
      li5: '<strong>Settings</strong>에서 전환 속도, 글꼴, 외운 단어 목록 관리를 할 수 있습니다.',
      supH2: '개발자 후원',
      supP: '앱이 유용했다면 개발을 응원해 주세요!',
      paypal: 'PayPal로 후원',
      patreon: 'Patreon 후원하기',
      bmac: 'Buy Me a Coffee',
      langLabel: '언어',

      krTitle: '한국에서 응원하기',
      krText: '커피 한 잔(₩5,000)으로 개발을 응원해 주세요 ☕️',
      kakaoCaption: '카카오페이 송금 QR',
      tossCaption: '토스 송금 QR'
    }
  };

  function applyTexts() {
    const t = dict[lang];
    document.title = t.title;

    const h1 = document.querySelector('.header h1');
    const author = document.querySelector('.header .author');

    const sections = Array.from(document.querySelectorAll('.section'));
    const aboutSec = sections[0];
    const howSec   = sections[1];
    const supSec   = document.querySelector('.support-section');

    if (h1) h1.textContent = t.appName;
    if (author) author.textContent = t.author;

    if (aboutSec) {
      const aboutH2 = aboutSec.querySelector('h2');
      const aboutP  = aboutSec.querySelector('p');
      if (aboutH2) aboutH2.textContent = t.aboutH2;
      if (aboutP)  aboutP.innerHTML   = t.aboutP;
    }

    if (howSec) {
      const howH2 = howSec.querySelector('h2');
      const list  = howSec.querySelector('ol');
      if (howH2) howH2.textContent = t.howH2;
      if (list) {
        list.innerHTML = `
          <li>${t.li1}</li>
          <li>${t.li2}</li>
          <li>${t.li3}</li>
          <li>${t.li4}</li>
          <li>${t.li5}</li>
        `;
      }
    }

    if (supSec) {
      const supH2 = supSec.querySelector('h2');
      const supP  = supSec.querySelector('p');
      if (supH2) supH2.textContent = t.supH2;
      if (supP)  supP.textContent = t.supP;

      // 버튼 라벨 (PayPal / Patreon / BMC)
      const paypalBtn  = document.getElementById('paypal-btn');
      const patreonBtn = document.getElementById('patreon-btn');
      const bmacBtn    = ensureBmacButton(); // 없으면 생성
      if (paypalBtn)  paypalBtn.textContent  = t.paypal;
      if (patreonBtn) patreonBtn.textContent = t.patreon;
      if (bmacBtn)    bmacBtn.textContent    = t.bmac;
    }

    const label = document.querySelector('.lang-switch label');
    if (label) label.textContent = t.langLabel;

    // KR 전용 블록 라벨들
    const krTitle = document.querySelector('#kr-support h3');
    const krText  = document.querySelector('#kr-support p');
    const kakaoCap = document.querySelector('#kr-support .qr-box .kakao-cap');
    const tossCap  = document.querySelector('#kr-support .qr-box .toss-cap');

    if (krTitle) krTitle.textContent = t.krTitle;
    if (krText)  krText.textContent  = t.krText;
    if (kakaoCap) kakaoCap.textContent = t.kakaoCaption;
    if (tossCap)  tossCap.textContent  = t.tossCaption;
  }

  // 초기 값/적용
  if (langSelect) langSelect.value = (lang === 'ko' ? 'ko' : 'en');
  ensureSupportUI();   // BMC 버튼 + KR 블록(없으면 생성)
  applyTexts();
  applyKRBlockVisibility();

  // 언어 변경
  langSelect?.addEventListener('change', () => {
    lang = langSelect.value;
    applyTexts();
    applyKRBlockVisibility();
    ipcRenderer.send('set-language', lang);
  });

  // 외부 링크
  const paypalBtn = document.getElementById('paypal-btn');
  const patreonBtn = document.getElementById('patreon-btn');
  paypalBtn?.addEventListener('click', () => ipcRenderer.send('open-external-link', 'https://www.paypal.com/'));
  patreonBtn?.addEventListener('click', () => ipcRenderer.send('open-external-link', 'https://www.patreon.com/'));

  // ====== 유틸/생성 ======
  function ensureBmacButton() {
    const container = document.querySelector('.support-section .support-buttons');
    if (!container) return null;
    let btn = document.getElementById('bmac-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'bmac-btn';
      btn.className = 'bmac-button';
      container.appendChild(btn);
      btn.addEventListener('click', () => {
        ipcRenderer.send('open-external-link', 'https://buymeacoffee.com/whiw');
      });
    }
    return btn;
  }

  function ensureSupportUI() {
    // BMC 버튼 보장
    ensureBmacButton();

    // 한국 전용 블록 없으면 만들기
    let kr = document.getElementById('kr-support');
    if (!kr) {
      const supSec = document.querySelector('.support-section');
      if (!supSec) return;
      kr = document.createElement('div');
      kr.id = 'kr-support';
      kr.className = 'kr-support';
      kr.style.display = 'none';
      kr.innerHTML = `
        <hr>
        <h3></h3>
        <p></p>
        <div class="kr-methods" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
          <div class="qr-box" style="text-align:center;">
            <img id="kakaopay-qr" alt="KakaoPay QR" style="width:140px;height:140px;border-radius:8px;background:#222;" />
            <div class="qr-caption kakao-cap" style="font-size:12px;color:#aaa;margin-top:6px;"></div>
          </div>
          <div class="qr-box" style="text-align:center;">
            <img id="toss-qr" alt="Toss QR" style="width:140px;height:140px;border-radius:8px;background:#222;" />
            <div class="qr-caption toss-cap" style="font-size:12px;color:#aaa;margin-top:6px;"></div>
          </div>
        </div>
      `;
      supSec.appendChild(kr);
    }
  }

  function resolveFirstExisting(...relativeCandidates) {
    const candidates = [];
    for (const rel of relativeCandidates) {
      if (!rel) continue;
      // 빌드(리소스 루트)
      if (process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, rel));
        candidates.push(path.join(process.resourcesPath, 'assets', rel));
      }
      // 개발 경로
      candidates.push(path.join(__dirname, rel));
      candidates.push(path.join(__dirname, 'assets', rel));
    }
    for (const p of candidates) {
      try { if (fs.existsSync(p)) return p; } catch {}
    }
    return null;
  }

  function applyKRBlockVisibility() {
    const kr = document.getElementById('kr-support');
    if (!kr) return;
    const isKO = (lang === 'ko');
    kr.style.display = isKO ? 'block' : 'none';
    if (!isKO) return;

    const kakaoImg = document.getElementById('kakaopay-qr');
    const tossImg  = document.getElementById('toss-qr');

    const kakaoPath = resolveFirstExisting('kakaopay_qr.png');
    const tossPath  = resolveFirstExisting('toss_qr.jpg', 'toss_qr.png');

    if (kakaoImg && kakaoPath) kakaoImg.src = `file://${kakaoPath.replace(/\\/g,'/')}`;
    if (tossImg && tossPath)   tossImg.src  = `file://${tossPath.replace(/\\/g,'/')}`;
  }
});