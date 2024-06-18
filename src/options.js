import Utils from "./utils.js";

(() => {
    const CONST = Utils.CONST;

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options) => {
            // const textarea = document.getElementById(CONST.id_fillin_template);
            // const stored = options[CONST.id_fillin_template];
            // textarea.value = stored == undefined ? "" : stored;
            console.log({ options });

            Utils.loadOption(options, Utils.CONST.id_fillin_template);
            Utils.loadOption(options, null, Utils.CONST.id_radio_csv_tsv);
        });
    });

    document
        .getElementById("button_save_options")
        .addEventListener("click", (el) => {
            let options = {};
            options = Utils.saveOption(options, CONST.id_fillin_template, null); // idを指定
            options = Utils.saveOption(options, null, CONST.id_radio_csv_tsv); // nameを指定
            chrome.storage.sync.set(options);
            console.log({ options });
        });
})();
