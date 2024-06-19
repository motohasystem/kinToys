import { TablePicker } from "./lib/table_picker";

(() => {

    // tableCopyButtonClickedメッセージを受信したら、テーブルデータを取得してCSV化する
    console.log('content_script.ts')
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log({ sender })
        if (request.name === "tableCopyButtonClicked") {
            console.log("tableCopyButtonClickedメッセージを受信しました", request);
            // テーブルデータを取得してCSV化する
            const picker = new TablePicker('csv')
            const tableData = picker.getTableData();
            console.log({ tableData });
            sendResponse({ action: "tableCopyButtonClicked", data: tableData });
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