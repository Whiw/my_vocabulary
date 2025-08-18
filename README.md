My Vocabulary

A tiny, always-on-top overlay flashcard app for effortless vocabulary learning while you work or browse.

Download (Windows/macOS(working now) → Releases
Auto-updates when a new release is published.

✨ Features

Overlay window that stays on top of other apps (drag to move, resize freely)

Auto-cycling words on a timer (hover to pause; click to skip)

Mark as Learned to hide words you’ve mastered (persisted per user)

Keyboard shortcuts for quick navigation

Multi-language UI (EN/KR) in Settings & About

Built-in sample TSV and customizable font/color/timer

Lightweight: ships with its own Chromium & Node — no extra installs

⚠️ Note about full-screen games:
Some games use exclusive fullscreen (DirectX/OpenGL/Vulkan). In that mode, OS-level overlays can’t draw on top.
Switch the game to borderless windowed (fullscreen) to see the overlay.

📥 Installation

Download the latest installer from Releases.

Run the installer. The app will start on completion.

(Optional on first run) Go to Load and select your .tsv file.

ℹ️ On Windows, you may see a SmartScreen warning if the app is unsigned.
Choose “More info” → “Run anyway” to proceed. The app is open-source and doesn’t require extra runtimes.

🚀 How to Use
1) Load a TSV

Use Load to open a Tab-Separated Values file: word<TAB>meaning

One item per line

Example:

abate	reduce in amount or intensity
candid	straightforward and honest
sagacious	wise; having sound judgment

2) Learn flow

Words cycle automatically.

Hover the mouse over the window to pause the timer.

Use < and > buttons (or shortcuts) to navigate.

Check Learned to hide the current word. It’s saved to learned.json in your user data folder and won’t appear next time (until you unlearn it in Settings).

3) Customize

Open Settings to change:

Timer interval (seconds)

size

Word & meaning colors

Manage learned words (remove from the list to “unlearn”)

4) Minimal mode

Click Hide to show only the word/meaning and a Show button.
Click Show to bring the full UI back.


🔄 Auto-Update

The app checks GitHub Releases for updates on launch.
A new release with the proper artifacts (Setup.exe/.dmg + latest*.yml + *.blockmap) will be downloaded and applied automatically.

🌐 Language (EN/KR)

Settings and About support English and Korean.

The app auto-selects based on system language but you can change it anytime.

About → How to Use (EN):

Click Load to open a TSV file (word<TAB>meaning per line).

Words cycle automatically. Hover the mouse over the window to pause the timer.

Use < and > to navigate manually.

Check Learned to remove a word from the current session. It won’t appear again unless you unlearn it in Settings.

Open Settings to change the timer, fonts, and manage your learned list.

About → 사용 방법 (KR):

Load를 눌러 TSV 파일을 엽니다. 각 줄은 단어<TAB>뜻 형식입니다.

단어는 자동 전환됩니다. 창 위에 마우스를 올리면 타이머가 일시정지됩니다.

<, > 버튼으로 수동 탐색을 할 수 있습니다.

Learned를 체크하면 현재 단어가 세션에서 제외됩니다. 설정에서 해제하지 않는 한 다시 나오지 않습니다.

Settings에서 전환 속도, 글꼴, 색상, 외운 단어 목록을 관리할 수 있습니다.

❤️ Support the Developer

If this app helps you, consider supporting its development!

PayPal: [opens in About](https://paypal.me/whiw215)

Patreon: [opens in About](https://www.patreon.com/c/Whiw)

Buy Me a Coffee: https://buymeacoffee.com/whiw


📂 Files & Persistence

words.tsv / sample_en_ko.tsv: shipped in resources for easy starting

learned.json: saved to the user data folder (persists across sessions)

settings.json: saved to the user data folder (language, styles, timer)

lastFilePath: remembers your last opened TSV and auto-loads it on next launch (configurable)

🛠 Build (for Developers)

Prereqs: Node.js & npm

# dev
npm install
npm start

# build (electron-builder)
npm run build

🔒 Privacy

No tracking, no network calls except:

Auto-update checks GitHub Releases (if enabled).

Support buttons open external links (PayPal/Patreon/BuyMeACoffee).

Your TSV and learned list stay on your machine.

❓ FAQ

Q. Overlay doesn’t show over some full-screen games.
A. Those games use exclusive fullscreen. Switch the game to borderless windowed to allow OS overlays on top.

Q. Windows shows “unknown publisher”.
A. The app may be unsigned initially. You can still run it via “More info → Run anyway”. We may add code-signing when adoption grows.

📄 License

ISC © whiw

🙌 Credits

Built with Electron

Inspired by spaced repetition & overlay productivity tools

Community feedback welcome—issues & PRs appreciated!

Feeback or contact email : youngou330@gmail.com
