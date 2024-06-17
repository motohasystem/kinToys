(() => {
    let connection: chrome.runtime.Port | null = null;

    // background.js
    chrome.runtime.onConnect.addListener((port) => {
        connection = port;

        console.log({ name: port.name })

        if (port.name === 'popup') {
            console.log('popup connected.')

            // port.onMessage.addListener((msg) => {
            //     console.log("Received: ", msg);
            //     console.log({ msg })

            //     setTimeout(() => {
            //         port.postMessage("Hello, Popup.");
            //     }, 1000);

            //     return true;
            // });

            port.onDisconnect.addListener(() => {
                // alert('popup disconnected.') // エラーになる
                console.log("Popup closed");
            });
        }

        return true;
    });

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

    chrome.runtime.onInstalled.addListener(() => {
        console.log('拡張がインストールされました');
    });

})();