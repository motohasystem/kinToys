// import { TablePicker } from "./lib/table_picker";

import { I18n } from "./i18n.js";
import { Utils } from "./utils.js";


(() => {
    const context = Utils.CONTEXT_MENU

    let connection: chrome.runtime.Port | null = null;

    chrome.runtime.onInstalled.addListener(() => {
        console.log('拡張がインストールされました');
        void (async () => {
            const storedLang = await I18n.getStoredLanguage();
            const { messages } = await I18n.loadMessages(storedLang);
            const copyLabel = messages["context_copy_simple_url"]?.message ?? context.copy_simple_url.label;
            const toggleLabel = messages["context_toggle_linebreak"]?.message ?? context.toggle_linebrake.label;

            // シンプルコピー機能のコンテキストメニューを追加
            chrome.contextMenus.create({
                id: context.copy_simple_url.id,
                title: copyLabel,
                contexts: ["action"]
            });

            // オプションの改行表示を切り替える
            chrome.contextMenus.create({
                id: context.toggle_linebrake.id,
                title: toggleLabel,
                contexts: ["action"]
            });
        })();
    });


    chrome.contextMenus.onClicked.addListener((info, tab) => {
        console.log(`contextMenus.onClicked: ${info}`);
        if (info.menuItemId === context.copy_simple_url.id) {
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

                        window.focus();
                        navigator.clipboard.writeText(simplified).then(() => {
                            console.log('URLをクリップボードにコピーしました');
                        }).catch(err => {
                            console.error('クリップボードへのコピーに失敗しました:', err);
                        });

                    }
                });
            }
            else {
                console.error('タブ情報が取得できませんでした');
            }
        }
        else if (info.menuItemId === context.toggle_linebrake.id) {
            console.log('Toggle BreakLineOption');

            // メッセージを送る
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id as number, { name: Utils.Messages.changeBreaklineOption }, (_response) => {
                        console.log('toggle_linebrake message sent.');
                        if (chrome.runtime.lastError) {
                            console.error('Error sending message:', chrome.runtime.lastError);
                            return;
                        }
                    });
                }
            });

        }
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

