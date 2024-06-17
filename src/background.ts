// background.js
chrome.runtime.onConnect.addListener((port) => {
    console.log("Popup opened");
    port.onDisconnect.addListener(() => {
        console.log("Popup closed");
    });
});
