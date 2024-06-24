import { Utils } from "./utils";

(() => {
    const Const = Utils.CONST;
    let radioStatus: { [key: string]: any } = {};

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        console.log('DOMContentLoaded')
        chrome.storage.sync.get(null, (options) => {
            console.log({ options });
            radioStatus = options

            Utils.loadOption(options, null, Const.id_radio_csv_tsv);
            Utils.loadOption(options, null, Const.id_radio_data_template);
            Utils.loadOption(options, null, Const.id_radio_cell_record);
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
                console.log({ el })
                let options = {};
                options = Utils.saveOption(options, null, name);
                chrome.storage.sync.set(options);
                console.log({ options });
                if (el.target) {
                    // @ts-ignore
                    radioStatus[name] = el.target.value
                }
            });
        });
    });

    // popup.js
    console.log("popup.js");
    const port = chrome.runtime.connect({ name: "popup" });

    // テーブル抽出ボタンの動作
    const tableCopyButton = document.getElementById("button_table_copy");
    if (tableCopyButton) {
        tableCopyButton.addEventListener("click", contentAbstractionButtonClicked);
    }

    // テーブルデータ取得メッセージの受信
    port.onMessage.addListener((response) => {
        console.log({ response })
        if (response.action === Const.table_copy_button_clicked) {
            console.log("バックグラウンドスクリプトからの応答", response);
            return true;
        }
        return false;
    });


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


    // コンテンツ抽出ボタンの動作
    function contentAbstractionButtonClicked() {
        console.log("contentAbsctactionButtonClicked");

        // アクティブタグを取得する
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab == undefined || tab.id == undefined || tab.url == undefined) {
                return;
            }
            const delimiter = radioStatus[Const.id_radio_csv_tsv]

            // 一覧画面または集計画面の判定
            const pageCategory = Utils.whereAmI(tab.url)
            if (pageCategory === Utils.PageCategory.index || pageCategory === Utils.PageCategory.report) {

                // コンテントスクリプト content_script.ts にテーブルデータ取得メッセージを送る
                chrome.tabs.sendMessage(tab.id, { name: Const.table_copy_button_clicked, mode: delimiter }, (response) => {
                    const textarea = document.getElementById(Const.id_popup_preview) as HTMLTextAreaElement;
                    if (response == undefined) {
                        textarea.value = "無効なURLが検出されました。\nkintoneの画面で実行してください。"
                    }
                    else if (response == undefined || response.data == "") {
                        textarea.value = "テーブル要素が見つかりませんでした。\n一覧画面、または集計画面で実行してください。"
                    }
                    else {
                        textarea.value = response.data;
                        Utils.copyToClipboard(response.data)
                    }
                })
            }
            // 詳細画面の判定
            else if (pageCategory === Utils.PageCategory.detail) {
                const tab_id = tab.id
                chrome.storage.sync.get(null, (options: { [key: string]: string }) => {
                    console.log({ options });

                    const csv_or_tsv = radioStatus[Const.id_radio_csv_tsv] == undefined ? options[Const.id_radio_csv_tsv] : radioStatus[Const.id_radio_csv_tsv]
                    const data_or_template = radioStatus[Const.id_radio_data_template]  // template , data(csv/tsv), json

                    // template / csv / tsv / json のいずれかを返す
                    const alignment = ((d_or_t) => {
                        if (d_or_t === 'template') {
                            return 'template'
                        }
                        else if (d_or_t === 'data') {
                            return csv_or_tsv
                        }
                        else {
                            return 'json'
                        }
                    })(data_or_template)
                    const template = options[Const.id_fillin_template]
                    console.log({ template })

                    // コンテントスクリプト content_script.ts にレコードデータ取得メッセージを送る
                    chrome.tabs.sendMessage(tab_id, { name: Const.template_copy_button_clicked, template: template, alignment: alignment }, (response) => {
                        const textarea = document.getElementById(Const.id_popup_preview) as HTMLTextAreaElement;
                        if (response == undefined) {
                            textarea.value = "無効なURLが検出されました。\nkintoneの画面で実行してください。"
                        }
                        else if (response.action === Const.template_copy_button_clicked && response.data == "") {
                            textarea.value = "レコードが見つかりませんでした。\nレコード詳細画面で実行してください。"
                        }
                        else {
                            textarea.value = response.data;
                            Utils.copyToClipboard(response.data)
                        }
                    });
                });

            }
            // ひとまずカスタマイズ画面は対象外とします。あとでフィールド設定JSONを取得するようにしたい。
            else if (pageCategory === Utils.PageCategory.customize) {
                const textarea = document.getElementById(Const.id_popup_preview) as HTMLTextAreaElement;
                textarea.value = "カスタマイズ画面では実行できません。"
            }
            else {
                const msg = `未実装の画面が検出されました。(${pageCategory})`
                console.error(msg);
                throw new Error(msg)
            }
        });

    }
})();
