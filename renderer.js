const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// DOM Elements
const wordEl = document.getElementById('word');
const meaningEl = document.getElementById('meaning');
const learnedCheckbox = document.getElementById('learned-checkbox');
const loadButton = document.getElementById('load-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const modeButton = document.getElementById('mode-button');
const editButton = document.getElementById('edit-button');
const settingsButton = document.getElementById('settings-button');
const helpButton = document.getElementById('help-button');

const learnedWordsPath = path.join(__dirname, 'learned.json');

// State
let words = [];
let learnedWords = new Set();
let currentFilePath = null;
let currentIndex = 0;
let timer = null;
let settings = {};

// --- SETTINGS ---
async function applySettings(newSettings) {
    settings = newSettings;
    document.body.style.setProperty('--font-family', settings.fontFamily);
    document.body.style.setProperty('--font-size', `${settings.fontSize}px`);
    document.body.style.setProperty('--word-color', settings.wordColor);
    document.body.style.setProperty('--font-color', settings.fontColor);
    resetTimer(); // Timer interval might have changed
}

// --- DATA HANDLING ---
function loadLearnedWords() {
    try {
        if (fs.existsSync(learnedWordsPath)) {
            learnedWords = new Set(JSON.parse(fs.readFileSync(learnedWordsPath, 'utf-8')));
        }
    } catch (error) {
        console.error('Error loading learned words:', error);
    }
}

function saveLearnedWords() {
    try {
        fs.writeFileSync(learnedWordsPath, JSON.stringify(Array.from(learnedWords), null, 2));
    } catch (error) {
        console.error('Error saving learned words:', error);
    }
}

// --- UI & WORD DISPLAY ---
function displayWord() {
    if (words.length === 0) {
        wordEl.textContent = 'All Done!';
        meaningEl.textContent = 'Load a new file or restart.';
        clearInterval(timer);
        return;
    }
    const current = words[currentIndex];
    wordEl.textContent = current.word;
    meaningEl.textContent = current.meaning;
    learnedCheckbox.checked = false;
}

function resetTimer() {
    clearInterval(timer);
    if (words.length > 0 && settings.timerSeconds > 0) {
        timer = setInterval(showNextWord, settings.timerSeconds * 1000);
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
    // Handle both Windows (\r\n) and Unix (\n) line endings
    const allWords = fileContent.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '').map(line => {
        const [word, meaning] = line.split('\t');
        return { word, meaning };
    });

    loadLearnedWords(); // Load the latest learned words
    words = allWords.filter(w => w.word && !learnedWords.has(w.word));
    
    editButton.disabled = false;
    if (words.length > 0) {
        currentIndex = 0;
        displayWord();
        resetTimer();
    } else {
        wordEl.textContent = 'All learned!';
        meaningEl.textContent = 'Every word in this file is learned.';
        clearInterval(timer);
    }
}

// --- EVENT LISTENERS ---
loadButton.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('dialog:openFile');
    if (!result || !result.filePath) return;

    currentFilePath = result.filePath;
    loadAndFilterWords(result.content);
});

learnedCheckbox.addEventListener('change', () => {
    if (learnedCheckbox.checked && words.length > 0) {
        const learnedWord = words[currentIndex].word;
        learnedWords.add(learnedWord);
        saveLearnedWords();

        words.splice(currentIndex, 1);
        if (currentIndex >= words.length) {
            currentIndex = 0;
        }
        
        displayWord();
        resetTimer();
    }
});

prevButton.addEventListener('click', showPrevWord);
nextButton.addEventListener('click', showNextWord);

modeButton.addEventListener('click', () => {
    const isHidden = document.body.classList.toggle('ui-hidden');
    modeButton.textContent = isHidden ? 'Show' : 'Hide';
});

editButton.addEventListener('click', () => {
    if (currentFilePath) {
        ipcRenderer.send('edit-file', currentFilePath);
    }
});

settingsButton.addEventListener('click', () => {
    ipcRenderer.send('open-settings-window');
});

helpButton.addEventListener('click', () => {
    ipcRenderer.send('open-about-window');
});

ipcRenderer.on('settings-updated', (event, newSettings) => {
    applySettings(newSettings);
});

ipcRenderer.on('reload-words', () => {
    if (currentFilePath) {
        const fileContent = fs.readFileSync(currentFilePath, 'utf-8');
        loadAndFilterWords(fileContent);
    }
});

// --- INITIALIZATION ---
async function initialize() {
    loadLearnedWords();
    const initialSettings = await ipcRenderer.invoke('get-settings');
    applySettings(initialSettings);
}

initialize();
