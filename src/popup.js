(() => {
    // popup.js
    console.log("popup.js");
    const port = chrome.runtime.connect({ name: "popup" });

    const saveButton = document.getElementById("popup_button_run");
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            chrome.runtime
                .sendMessage({
                    name: "popup_button_run",
                    message: "popup_button_runがクリックされました",
                })
                .catch((error) => {
                    console.error("エラーが発生しました", error);
                });

            // alert("ボタンがクリックされました");
            // ポップアップが閉じられたときの処理はバックグラウンドスクリプトで行われる?
            console.log({ port });

            port.postMessage({ action: "saveButtonClicked" });

            port.onMessage.addListener((response) => {
                console.log("バックグラウンドスクリプトからの応答", response);
                return true;
            });

            port.onDisconnect.addListener((port) => {
                console.log("ポートが切断されました", port);
                return true;
            });

            return true;
        });
    }
})();
