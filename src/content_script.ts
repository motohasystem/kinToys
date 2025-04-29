import { Names } from "./lib/Names";
import { SubtableImporter } from "./lib/subtable_importer";
// import { Utils } from "./utils";
import { TablePicker } from "./lib/table_picker";
import { Options } from "./options";

(() => {
    const CONST = Names.Ids
    const Messages = Names.Messages


    let lastUrl = location.href;

    // URLとDOMを監視する
    const observer = new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            console.log('URL変わった: ', currentUrl);
            lastUrl = currentUrl;
            checkEditPage();
        }
    });

    observer.observe(document, { subtree: true, childList: true });

    // 最初にもチェックする
    checkEditPage();

    function checkEditPage() {
        if (location.href.match(/\/k\/\d+\/(edit|show)/)) {
            console.log('編集画面っぽいURL検知！');

            // DOMの準備ができるのを待つ、サブテーブルの親要素が持つクラスを監視する
            const subtable_class = Names.Classes.query_selector_class_subtable; // Utils.Classes.query_selector_class_subtable の定義を使いたいが、現状は使えない
            waitForElement(subtable_class, (_element: Element) => {
                console.log('Subtable dom detected.');
                console.log({ url: location.href });

                if (isEditOrCreatePage()) {
                    const importer = new SubtableImporter()
                    importer.initPaste()

                }
            });
        }
    }

    function isEditOrCreatePage() {
        if (location.href.match(/\/k\/\d+\/(edit)/)) {
            console.log("URLのmodeパラメータがeditまたはshowなので、編集画面と判断します。");
            return true
        }

        // urlのうち、#以降を取得して、&で区切り、name=valueという辞書を取り出す
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const paramsDict: { [key: string]: string } = {};
        hashParams.forEach((value, key) => {
            paramsDict[key] = value;
        });
        console.log('Hash parameters:', paramsDict);

        // paramsDictのmode == "edit" であれば編集画面と判断
        if (paramsDict['mode'] === 'edit') {
            return true
        }
        console.warn("URLのmodeパラメータがeditではないので、編集画面ではないと判断します。");
        return false;
    }

    function waitForElement(selector: string, callback: (element: Element) => void) {
        const el = document.querySelector(selector);
        if (el) {
            callback(el);
            return;
        }
        const observer = new MutationObserver((_mutations, obs) => {
            const el = document.querySelector(selector);
            if (el) {
                obs.disconnect();
                callback(el);
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    }



    chrome.storage.sync.get(null, (options) => {
        console.log({ 'chrome.storage.sync.get': options });

        // 埋め込みリクエストの受信を先に登録
        window.addEventListener("message", (event) => {
            if (event.source !== window) return;
            if (event.data.type !== Messages.requestPopupOptions) return;
            // const embedded = event.data.data;

            window.postMessage({
                type: Messages.loadPopupOptions, data: options
            }, "*")
        });

        insertScript("./embedding_script.js");
        insertStyleSheet("./embedding.css");

        console.log('scripts inserted')
    });

    // ポップアップ側でオプションを変更したイベントを受け取ってembedの動作を変更する
    chrome.storage.onChanged.addListener((changes, areaName) => {
        console.log({ changes, areaName });
        if (areaName === "sync") {
            let radio_csv_tsv = null;
            let radio_data_template = null;
            let radio_cell_record = null;
            let checkbox_on_off = null;

            for (const key in changes) {
                const change = changes[key];
                console.log({ change });
                if (key === CONST.id_radio_cell_record) {
                    console.log("セル/行/レコードコピーの範囲が変更されました");
                    radio_cell_record = change.newValue
                }
                else if (key === CONST.id_radio_csv_tsv) {
                    console.log("csv/tsvの選択が変更されました");
                    radio_csv_tsv = change.newValue
                }
                else if (key === CONST.id_radio_data_template) {
                    console.log("データ/テンプレートの選択が変更されました");
                    radio_data_template = change.newValue
                }
                else if (key === CONST.id_checkbox_on_off) {
                    console.log("有効/無効のチェックが変更されました");
                    checkbox_on_off = change.newValue
                }
                else if (key === CONST.id_enable_break_multiline) {
                    console.log("改行表示のチェックが変更されました");
                    window.postMessage({
                        type: Messages.changeBreaklineOption, data: change.newValue
                    })
                    return
                }
            }

            // embedding_scripts.jsにメッセージを送る
            window.postMessage({
                type: Messages.changePopupOptions, data: {
                    radio_csv_tsv,
                    radio_data_template,
                    radio_cell_record,
                    checkbox_on_off
                }
            }, "*")
        }
    });

    // ポップアップの「クリップボードにコピーする」ボタンのメッセージを受信した処理
    console.log('content_script.ts')
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log(`${request.name} メッセージを受信しました。`, request)
        console.log({ sender })

        // テーブルデータを取得してCSV化する
        if (request.name === CONST.table_copy_button_clicked) {
            console.log('テーブルデータを取得してCSV化する')
            const mode = request.mode;
            const picker = new TablePicker(mode)
            const tableData = picker.getTableData();
            console.log({ tableData });
            sendResponse({ action: CONST.table_copy_button_clicked, data: tableData });
        }
        // kintoneレコードを取得してテンプレートに埋め込む
        else if (request.name === CONST.template_copy_button_clicked) {
            console.log('kintoneレコードを取得してテンプレートに埋め込む')
            const template = request.template
            const alignment = request.alignment
            console.log({ template })
            console.log({ alignment })

            // const embedder = new TemplateEmbedder(template)
            // 

            // 埋め込みリクエストの受信を先に登録
            window.addEventListener("message", (event) => {
                if (event.source !== window) return;
                if (event.data.type !== "kintoneRecordInfoEmbedded") return;
                const embedded = event.data.data;
                sendResponse({ action: CONST.template_copy_button_clicked, data: embedded, alignment: alignment });
            });

            // 埋め込みリクエストを embedding_scripts.ts に送信する
            window.postMessage({ type: CONST.template_copy_button_clicked, data: template, alignment: alignment }, "*")
        }
        else if (request.name === Messages.changeBreaklineOption) {
            // ここで改行表示メッセージを受け取る
            // // 改行表示設定を変更する
            const key_breakline = CONST.id_enable_break_multiline
            chrome.storage.sync.get(key_breakline, (options: Options) => {
                if (chrome.runtime.lastError) {
                    console.error('Error retrieving options:', chrome.runtime.lastError);
                    return;
                }
                console.log({ options });
                options[key_breakline] = options[key_breakline] == "true" ? "false" : "true";
                // options[key_breakline] = "true";
                console.log({ options });
                // オプションを保存
                chrome.storage.sync.set({ [key_breakline]: options[key_breakline] }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving options:', chrome.runtime.lastError);
                        return;
                    }
                    console.log('Toggle Newline: ', options[key_breakline]);
                    sendResponse({ action: CONST.id_enable_break_multiline });
                    // リロードする
                    location.reload();
                });
            });

        }
        else {
            console.warn("未知のメッセージを受信しました", request)
        }

        return true
    });

    function insertScript(file: string) {
        const url = (window as any).chrome.runtime.getURL(file);

        const $$script = document.createElement("script");
        $$script.src = url;
        // $$script.type = "text/javascript";
        $$script.type = "module";
        document.body.appendChild($$script);
    }

    function insertStyleSheet(file: string) {
        const url = (window as any).chrome.runtime.getURL(file);

        const $$style = document.createElement("link");
        $$style.href = url;
        $$style.rel = "stylesheet";
        document.body.appendChild($$style);
    }

})();