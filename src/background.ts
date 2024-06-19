// import { TablePicker } from "./lib/table_picker";

(() => {
    let connection: chrome.runtime.Port | null = null;

    chrome.runtime.onInstalled.addListener(() => {
        console.log('拡張がインストールされました');
    });

    // 接続成立時
    chrome.runtime.onConnect.addListener((port) => {
        connection = port;

        console.log({ name: port.name })

        if (port.name === 'popup') {
            console.log('popup connected.')

            port.onDisconnect.addListener(() => {
                console.log("Popup closed");
            });
        }

        return true;
    });

    // メッセージ受信時
    chrome.runtime.onMessage.addListener((message) => {
        console.log({ port: message })
        console.log({ name: message.name })

        if (message.name === 'popup_button_run') {
            console.log('popup onMessage connected.')

            console.log("Received: ", message.message);

            setTimeout(() => {
                if (connection) {
                    connection.postMessage("Hello, onMessage.");
                }
            }, 1000);

        }

        // if (message.name === "tableCopyButtonClicked") {
        //     console.log("tableCopyButtonClickedメッセージを受信しました", message);
        //     // テーブルデータを取得してCSV化する
        //     // const picker = new TablePicker('csv')
        //     const tableData = {} //picker.getTableData();
        //     console.log({ tableData });
        //     // sendResponse({ action: "tableCopyButtonClicked", data: tableData });


        //     setTimeout(() => {
        //         if (connection) {
        //             connection.postMessage(tableData);
        //         }
        //     }, 1000);
        // }

        return true;
    });


})();