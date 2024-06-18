import Utils from "./utils.js";

(() => {
    const Const = Utils.CONST;

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        chrome.storage.session.get(null, (options) => {
            console.log({ options });

            Utils.loadOption(options, null, Const.id_radio_csv_tsv);
            Utils.loadOption(options, null, Const.id_radio_cell_record);
            Utils.loadOption(options, null, Const.id_radio_data_template);
        });
    });

    // ラジオボタンの編集イベントにあわせてオプションを保存
    [
        Const.id_radio_csv_tsv,
        Const.id_radio_cell_record,
        Const.id_radio_data_template,
    ].forEach((name) => {
        Array.from(document.getElementsByName(name)).forEach((elm) => {
            elm.addEventListener("change", (el) => {
                let options = {};
                options = Utils.saveOption(options, null, name);
                chrome.storage.session.set(options);
                console.log({ options });
            });
        });
    });

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
