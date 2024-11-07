// import { TablePicker } from "./lib/table_picker";


(() => {
    const CONTEXT_MENU = {
        copy_simple_url: "copySimpleUrl"
    }


    let connection: chrome.runtime.Port | null = null;

    chrome.runtime.onInstalled.addListener(() => {
        console.log('拡張がインストールされました');

        // 
        chrome.contextMenus.create({
            id: "copySimpleUrl",
            title: "Copy Simple URL",
            contexts: ["action"]
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            console.log(`contextMenus.onClicked: ${info}`);
            if (info.menuItemId === CONTEXT_MENU.copy_simple_url) {
                // シンプルURLのコピー
                if (tab != undefined && tab.id != undefined) {
                    // ブラウザのアドレスバーのURLをクリップボードにコピーする
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            let simplified = window.location.href;

                            // 1つ目のURL: 先頭からrecord=43までを残す
                            simplified = simplified.replace(/(#record=\d+).*/, '$1');

                            // 2つ目のURL: ?view=\d までを残す。q&が入る場合を考慮する。
                            simplified = simplified.replace(/\?q?&?(view=\d+).*/, '?$1');

                            navigator.clipboard.writeText(simplified).then(() => {
                                console.log('URLをクリップボードにコピーしました');
                            }).catch(err => {
                                console.error('クリップボードへのコピーに失敗しました:', err);
                            });
                        }
                    });
                }
            }
        });
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

        return true;
    });


})();