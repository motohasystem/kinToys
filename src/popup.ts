import Utils from "./utils";

(() => {
    const Const = Utils.CONST;
    let delimiter = 'csv'

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        chrome.storage.session.get(null, (options) => {
            console.log({ options });

            delimiter = options[Const.id_radio_csv_tsv];

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
            elm.addEventListener("change", (_el) => {
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

    // テーブルコピーボタンの動作
    const tableCopyButton = document.getElementById("button_table_copy");
    if (tableCopyButton) {
        tableCopyButton.addEventListener("click", () => {
            // コンテントスクリプトにテーブルデータ取得メッセージを送る
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (tab == undefined || tab.id == undefined) {
                    return;
                }
                chrome.tabs.sendMessage(tab.id, { name: "tableCopyButtonClicked", mode: delimiter }, (response) => {
                    console.log("コンテントスクリプトからの応答", response);
                    const textarea = document.getElementById(Const.id_popup_preview) as HTMLTextAreaElement;
                    if (response == undefined) {
                        textarea.value = "テーブル要素が見つかりませんでした。"
                    }
                    else {
                        textarea.value = response.data;
                        Utils.copyToClipboard(response.data)
                    }
                })
            });

        });
    }

    // テーブルデータ取得メッセージの受信
    port.onMessage.addListener((response) => {
        console.log({ response })
        if (response.action === "tableCopyButtonClicked") {
            console.log("バックグラウンドスクリプトからの応答", response);
            return true;
        }
        return false;
    });



    // テンプレートコピーボタンの動作
    const templateCopyButton = document.getElementById("button_template_copy");
    if (templateCopyButton) {
        // chrome.storage.sync.get(null, (options) => {
        //     const template = options[Const.id_fillin_template];
        //     // kintone apiを呼び出して現在表示しているレコードのデータを取得
        //     const record = kintone.app.record.get();
        //     console.log({ record });
        //     // テンプレートにデータを埋め込む
        //     const filledTemplate = Utils.fillTemplate(template, record);
        //     console.log({ filledTemplate });
        // });
    }

    const saveButton = document.getElementById("popup_button_run");
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            chrome.runtime
                .sendMessage({
                    name: "popup_button_run",
                    message: "popup_button_runがクリックされましたaaa",
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
