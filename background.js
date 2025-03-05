// Background script for handling extension events
chrome.runtime.onInstalled.addListener(() => {
    console.log('Vosk Voice Recognition extension installed');
});
