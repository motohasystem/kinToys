
import { TablePicker } from "./lib/table_picker";
// import { TemplateEmbedder } from "./lib/template_embedder";
// import { Utils } from "./utils";

(() => {
    // const CONST = Utils.CONST
    // 通らないので一旦直接置く
    const CONST = {
        id_fillin_template: "textarea_fillin_template",
        id_radio_csv_tsv: "radio_csv_tsv",
        id_radio_cell_record: "radio_cell_record",
        id_radio_data_template: "radio_data_template",
        id_popup_preview: "textarea_clipboard_preview", // ポップアップのプレビュー領域

        table_copy_button_clicked: "tableCopyButtonClicked",    // テーブル抽出ボタン
        template_copy_button_clicked: "templateCopyButtonClicked",    // テンプレートコピーボタン
    };

    // tableCopyButtonClickedメッセージを受信したら、テーブルデータを取得してCSV化する
    console.log('content_script.ts')
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log(`${request.name}メッセージを受信しました。`, request)
        console.log({ sender })

        // テーブルデータを取得してCSV化する
        if (request.name === CONST.table_copy_button_clicked) {
            const mode = request.mode;
            const picker = new TablePicker(mode)
            const tableData = picker.getTableData();
            console.log({ tableData });
            sendResponse({ action: CONST.table_copy_button_clicked, data: tableData });
        }
        // kintoneレコードを取得してテンプレートに埋め込む
        else if (request.name === CONST.template_copy_button_clicked) {
            const template = request.template
            console.log({ template })
            // const embedder = new TemplateEmbedder(template)

            // 埋め込みリクエストの受信を先に登録
            window.addEventListener("message", (event) => {
                if (event.source !== window) return;
                if (event.data.type !== "kintoneRecordInfoEmbedded") return;
                const embedded = event.data.data;
                sendResponse({ action: CONST.template_copy_button_clicked, data: embedded });
            });

            // 埋め込みリクエストを embedding_scripts.ts に送信する
            window.postMessage({ type: CONST.template_copy_button_clicked, data: template }, "*")
        }

        return true
    });



    function insertScript(file: string) {
        const url = (window as any).chrome.runtime.getURL(file);

        const $$script = document.createElement("script");
        $$script.src = url;
        $$script.type = "text/javascript";
        document.body.appendChild($$script);
    }

    function insertStyleSheet(file: string) {
        const url = (window as any).chrome.runtime.getURL(file);

        const $$style = document.createElement("link");
        $$style.href = url;
        $$style.rel = "stylesheet";
        document.body.appendChild($$style);
    }

    insertScript("./embedding_script.js");
    insertStyleSheet("./embedding.css");

})();