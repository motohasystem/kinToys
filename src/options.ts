import Utils from "./utils";

(() => {
    const CONST = Utils.CONST;
    console.log("options.js");

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options: { [key: string]: string }) => {
            console.log({ options });

            Utils.loadOption(options, Utils.CONST.id_fillin_template, null);
            Utils.loadOption(options, null, Utils.CONST.id_radio_csv_tsv);
        });
    });

    document
        .getElementById("button_save_options")
        ?.addEventListener("click", (_el: Event) => {
            let options: { [key: string]: string } = {};
            options = Utils.saveOption(options, CONST.id_fillin_template, null); // idを指定
            options = Utils.saveOption(options, null, CONST.id_radio_csv_tsv); // nameを指定
            chrome.storage.sync.set(options);
            console.log({ options });
        });
})();
