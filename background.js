/*
This is the service worker (or background script) for the extension
*/


console.log('background_script: running');

chrome.runtime.onInstalled.addListener(() => {
    console.log('webbu chrome ext: on installed');
});


function keyDownListener(e) {
    if (e.ctrlKey && e.key === '1') {
        console.log('shortcut pressed');
    }
}


// gets triggered when a tab finishes loading a page
chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete' && tab.active) {

    var currentUrl = tab.url;
    console.log('loaded tab: ' + currentUrl);
  }
});


function execute_skill(skill_name) {
    console.log('execute_skill: ' + skill_name);
    chrome.storage.local.set({ 'lastSkill': skill_name });

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
        console.log('execute_skill: tabs query: ');
        console.log(tabs);

        if (tabs.length < 1) {
            console.log('execute_skill: no active tab');
            chrome.runtime.sendMessage({ error_msg: 'No active tab' });
            return;
        }

        console.log('execute_skill: got tabs url: ' + tabs[0].url); 
        chrome.storage.local.set({ currentUrl: tabs[0].url });

        // trigger content script by its file
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content_script.js'],
        });
    });
}


chrome.commands.onCommand.addListener((skill_name) => {
    // gets triggered with the shortcut listed in the manifest
    // executed in the extension's context
    console.log("skill_triggered: " + skill_name);
    execute_skill(skill_name);

    // notify the extension that a skill was triggered
    // in order to a) make highlight the skill in the UI
    // b) record it for stats in the backend
    chrome.runtime.sendMessage({ skill_triggered: skill_name });
});


chrome.action.onClicked.addListener((tab) => {
    // makes the shortcuts from manifest.json appear in chrome://extensions/shortcuts
    console.log('chrome.action.onClicked: ' + tab);
});


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // a skill was clicked via the UI, which sends this msg (from popup.js to the service worker - background.js),
    // so we should trigger the skill and the required action will
    // be executed by an injected content script
    console.log('message_received: msg:');
    console.log(message);
    if ('skill_clicked' in message) {
        execute_skill(message['skill_clicked']);
    }

});

