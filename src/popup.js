(() => {
    // popup.js
    console.log("popup.js");

    const saveButton = document.getElementById("popup_button_run");
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            alert("ボタンがクリックされました");
            const port = chrome.runtime.connect({ name: "popup" });
            // ポップアップが閉じられたときの処理はバックグラウンドスクリプトで行われる
            console.log({ port });
        });
    }
})();
