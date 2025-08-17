const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// DOM Elements
const fontFamilyInput = document.getElementById('font-family-input');
const fontSizeInput = document.getElementById('font-size-input');
const wordColorInput = document.getElementById('word-color-input');
const fontColorInput = document.getElementById('font-color-input');
const timerInput = document.getElementById('timer-input');
const saveButton = document.getElementById('save-button');
const learnedListContainer = document.getElementById('learned-list-container');

const learnedWordsPath = path.join(__dirname, 'learned.json');

// Load existing settings and learned words when window opens
document.addEventListener('DOMContentLoaded', async () => {
    const settings = await ipcRenderer.invoke('get-settings');
    fontFamilyInput.value = settings.fontFamily;
    fontSizeInput.value = settings.fontSize;
    wordColorInput.value = settings.wordColor;
    fontColorInput.value = settings.fontColor;
    timerInput.value = settings.timerSeconds;

    loadLearnedWords();
});

function loadLearnedWords() {
    learnedListContainer.innerHTML = ''; // Clear current list
    try {
        if (fs.existsSync(learnedWordsPath)) {
            const learnedWords = new Set(JSON.parse(fs.readFileSync(learnedWordsPath, 'utf-8')));
            if (learnedWords.size === 0) {
                learnedListContainer.innerHTML = '<p>No words marked as learned yet.</p>';
                return;
            }
            learnedWords.forEach(word => {
                const item = document.createElement('div');
                item.className = 'learned-item';
                item.innerHTML = `<span>${word}</span><button class="remove-learned-btn" data-word="${word}">Remove</button>`;
                learnedListContainer.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Could not load or parse learned.json', error);
        learnedListContainer.innerHTML = '<p>Error loading learned words.</p>';
    }
}

// Handle removal of a learned word
learnedListContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-learned-btn')) {
        const wordToRemove = event.target.dataset.word;
        try {
            const learnedWords = new Set(JSON.parse(fs.readFileSync(learnedWordsPath, 'utf-8')));
            if (learnedWords.has(wordToRemove)) {
                learnedWords.delete(wordToRemove);
                fs.writeFileSync(learnedWordsPath, JSON.stringify(Array.from(learnedWords), null, 2));
                ipcRenderer.send('learned-words-updated'); // Notify main process
                loadLearnedWords(); // Refresh the list
            }
        } catch (error) {
            console.error('Failed to remove word:', error);
        }
    }
});

// Save all settings
saveButton.addEventListener('click', () => {
    const newSettings = {
        fontFamily: fontFamilyInput.value,
        fontSize: parseInt(fontSizeInput.value, 10),
        wordColor: wordColorInput.value,
        fontColor: fontColorInput.value,
        timerSeconds: parseInt(timerInput.value, 10),
    };
    ipcRenderer.send('save-settings', newSettings);
    window.close(); // Close settings window after saving
});
