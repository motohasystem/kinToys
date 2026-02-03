import { I18n, I18nMessages } from "./i18n";
import { Utils } from "./utils";
// import { Names } from "./lib/Names";

(() => {
    const { Ids, Labels, Events } = Utils;
    let radioStatus: { [key: string]: any } = {};
    let i18nMessages: I18nMessages = {};
    const t = (key: string, params?: Record<string, string>) => I18n.t(i18nMessages, key, params);

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", async function () {
        console.log('DOMContentLoaded')

        const storedLang = await I18n.getStoredLanguage();
        const { lang, messages } = await I18n.loadMessages(storedLang);
        i18nMessages = messages;
        document.documentElement.lang = lang;
        I18n.applyToDom(messages);

        Utils.Labels.label_table_copy_button = t("popup_button_copy");
        Utils.Labels.label_template_imagecopy_button = t("popup_button_copy_image");

        // span_version ノードを取得してバージョン番号を設定
        const spanVersion = document.getElementById('span_version') as HTMLSpanElement
        if (spanVersion) {
            const manifest = chrome.runtime.getManifest();
            spanVersion.textContent = manifest.version;
        }

        chrome.storage.sync.get(null, (options) => {
            console.log({ options });
            radioStatus = options

            Utils.loadOption(options, null, Ids.id_radio_csv_tsv);
            Utils.loadOption(options, null, Ids.id_radio_data_template);
            Utils.loadOption(options, null, Ids.id_radio_cell_record);
            Utils.loadOption(options, null, Ids.id_checkbox_on_off);

            // 適用中のテンプレート名を表示
            const applied_template = options[Ids.id_input_template_name] as string
            console.log({ applied_template })
            const el_applied_template = document.getElementById(Ids.id_applied_template) as HTMLInputElement;
            if (el_applied_template) {
                el_applied_template.textContent = t("popup_applied_template", { name: applied_template ?? "" });
            }
        });

        // テーブル抽出ボタンの動作
        const tableCopyButton = document.getElementById("button_table_copy") as HTMLButtonElement
        if (tableCopyButton) {
            // イメージコピー機能の設定を取得
            chrome.storage.sync.get(null, (options) => {
                const flag_imagecopy = options[Ids.id_checkbox_imagecopy_button] === "true" ? true : false;

                tableCopyButton.addEventListener("click", contentAbstractionButtonClicked.bind(null, flag_imagecopy));
                // ラベルを label_table_copy_button に変更
                if (flag_imagecopy) {
                    tableCopyButton.value = Labels.label_template_imagecopy_button;
                }
                else {
                    tableCopyButton.value = Labels.label_table_copy_button;
                }
            });
        }

        // 機能の有効無効チェックボックスの動作
        const enableCheckbox = document.getElementById(Ids.id_checkbox_on_off) as HTMLInputElement;
        if (enableCheckbox) {
            enableCheckbox.addEventListener("change", (event) => {
                const checked = (event.target as HTMLInputElement).checked;
                console.log({ checked });
                Utils.changeEnadbleDisableCheckbox(checked)
            });
        }
    });

    // ラジオボタンの編集イベントにあわせてオプションを保存
    [
        Ids.id_radio_csv_tsv,
        Ids.id_radio_cell_record,
        Ids.id_radio_data_template,
        Ids.id_checkbox_on_off
    ].forEach((name) => {
        Array.from(document.getElementsByName(name)).forEach((elm) => {
            elm.addEventListener("change", (el) => {
                console.log({ el })
                let options: { [key: string]: string } | {} = {};
                options = Utils.saveOption(options, null, name);

                if (name === Ids.id_checkbox_on_off) {
                    // 機能オンオフチェックボックスの場合
                    const optionsTyped = options as { [key: string]: string };
                    const checked = optionsTyped['checkbox_on_off'] == 'enabled' ? 'enabled' : 'disabled';
                    radioStatus[name] = checked;
                    options = { [name]: checked }
                }

                chrome.storage.sync.set(options);
                console.log({ options });

                if (el.target) {
                    // @ts-ignore
                    radioStatus[name] = el.target.value
                }
                console.log({ radioStatus })
            });
        });
    });

    // popup.js
    console.log("popup.js");
    const port = chrome.runtime.connect({ name: "popup" });

    // テーブルデータ取得メッセージの受信
    port.onMessage.addListener((response) => {
        console.log({ response })
        if (response.action === Events.table_copy_button_clicked) {
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


    // コンテンツ抽出ボタンの動作 / グラブコピー
    // flag_imagecopy: 詳細画面のテンプレートコピーを画像コピーにする
    function contentAbstractionButtonClicked(flag_imagecopy: boolean = false) {
        console.log("contentAbsctactionButtonClicked");

        // アクティブタグを取得する
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab == undefined || tab.id == undefined || tab.url == undefined) {
                return;
            }
            const delimiter = ((style: 'csv' | 'tsv' | 'json') => {
                if (radioStatus[Ids.id_radio_data_template] == 'json') {
                    return 'json'
                }
                return style
            })(radioStatus[Ids.id_radio_csv_tsv])

            // 一覧画面または集計画面の判定
            const pageCategory = Utils.whereAmI(tab.url)
            if (pageCategory === Utils.PageCategory.index && radioStatus[Ids.id_radio_data_template] === 'template') {
                // 一覧画面かつテンプレート形式コピーの場合
                const tab_id = tab.id
                chrome.storage.sync.get(null, (options: { [key: string]: string }) => {
                    console.log({ options });
                    const template = options[Ids.id_fillin_template]

                    // コンテントスクリプト content_script.ts にテーブルデータ取得メッセージを送る
                    chrome.tabs.sendMessage(tab_id, { name: Events.template_copy_button_clicked, template: template, alignment: 'template' }, (response) => {
                        // console.log({ response })
                        const textarea = document.getElementById(Ids.id_popup_preview) as HTMLTextAreaElement;
                        if (response == undefined) {
                            textarea.value = t("popup_error_invalid_url")
                        }
                        else if (response.action === Events.template_copy_button_clicked && response.data == "") {
                            textarea.value = t("popup_error_no_record_index")
                        }
                        else {
                            textarea.value = response.data;
                            Utils.copyToClipboard(response.data)
                        }
                    })
                })

            } else if (pageCategory === Utils.PageCategory.index || pageCategory === Utils.PageCategory.report) {

                // コンテントスクリプト content_script.ts にテーブルデータ取得メッセージを送る
                console.log({ mode: delimiter })

                // 一覧画面でテンプレート以外、または集計画面の場合
                chrome.tabs.sendMessage(tab.id, { name: Events.table_copy_button_clicked, mode: delimiter }, (response) => {
                    const textarea = document.getElementById(Ids.id_popup_preview) as HTMLTextAreaElement;
                    if (response == undefined) {
                        textarea.value = t("popup_error_invalid_url")
                    }
                    else if (response == undefined || response.data == "") {
                        textarea.value = t("popup_error_no_table")
                    }
                    else {
                        // 一覧画面から取得した場合、ヘッダ行の先頭に空のセルを追加する
                        if (pageCategory === Utils.PageCategory.index) {
                            const delimiter_char = delimiter === 'csv' ? ',' : '\t'
                            const data = response.data[0];
                            const header = data.split('\n')[0];
                            const headerArray = header.split(delimiter_char);
                            headerArray.unshift('""');
                            const newHeader = headerArray.join(delimiter_char);
                            const newData = data.replace(header, newHeader);
                            textarea.value = newData;
                            Utils.copyToClipboard(newData);
                        }
                        // 集計画面から取得した場合、ヘッダ行の先頭に空のセルを追加しない
                        else {
                            textarea.value = response.data
                            Utils.copyToClipboard(response.data)
                        }
                    }
                })
            }
            // 詳細画面の判定
            else if (pageCategory === Utils.PageCategory.detail) {
                const tab_id = tab.id
                chrome.storage.sync.get(null, (options: { [key: string]: string }) => {
                    console.log({ options });

                    const csv_or_tsv = radioStatus[Ids.id_radio_csv_tsv] == undefined ? options[Ids.id_radio_csv_tsv] : radioStatus[Ids.id_radio_csv_tsv]
                    const data_or_template = radioStatus[Ids.id_radio_data_template]  // template , data(csv/tsv), json

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
                    const template = options[Ids.id_fillin_template]
                    console.log({ template })

                    // コンテントスクリプト content_script.ts にレコードデータ取得メッセージを送る
                    chrome.tabs.sendMessage(tab_id, { name: Events.template_copy_button_clicked, template: template, alignment: alignment }, (response) => {
                        const textarea = document.getElementById(Ids.id_popup_preview) as HTMLTextAreaElement;
                        if (response == undefined) {
                            textarea.value = t("popup_error_invalid_url")
                        }
                        else if (response.action === Events.template_copy_button_clicked && response.data == "") {
                            textarea.value = t("popup_error_no_record_detail")
                        }
                        else {
                            textarea.value = response.data;
                            Utils.copyToClipboard(response.data, flag_imagecopy)
                        }
                    });
                });

            }
            // ひとまずカスタマイズ画面は対象外とします。あとでフィールド設定JSONを取得するようにしたい。
            else if (pageCategory === Utils.PageCategory.customize) {
                const textarea = document.getElementById(Ids.id_popup_preview) as HTMLTextAreaElement;
                textarea.value = t("popup_error_customize_not_supported")
            }
            else {
                const msg = t("popup_error_unsupported_page", { category: pageCategory, url: tab.url })
                console.error(msg);
                const textarea = document.getElementById(Ids.id_popup_preview) as HTMLTextAreaElement;
                textarea.value = msg
            }
        });
    }



})();

