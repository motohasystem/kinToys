import { Utils } from "./utils";

(() => {
    const CONST = Utils.CONST;
    let templateHistory: { [key: string]: string } = {};

    console.log("options.js");

    // input_template_name が空欄でなければ、textarea_fillin_template の値とセットでオプションとして保存する
    function makeTemplateHistory(): string {
        const input = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;
        const templateELement = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;

        if (input && templateELement) {
            const name = input.value;
            if (name !== undefined && name !== null && name !== "") {
                templateHistory[name] = templateELement.value;
            }
        }

        return JSON.stringify(templateHistory);
    }

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options: { [key: string]: string }) => {
            console.log({ options });

            Utils.loadOption(options, Utils.CONST.id_fillin_template, null);
            Utils.loadOption(options, null, Utils.CONST.id_radio_csv_tsv);

            // テンプレート履歴を読み込む
            const history = options[Utils.CONST.key_template_history];
            if (history != undefined) {
                templateHistory = JSON.parse(history);
                console.log({ templateHistory });

                const select = document.getElementById(CONST.id_select_template_history) as HTMLSelectElement;
                if (select) {
                    Object.keys(templateHistory).forEach((key) => {
                        const option = document.createElement("option");
                        option.text = key;
                        option.value = templateHistory[key];
                        select.add(option);
                    });
                }
            }

            // テンプレート履歴の選択イベント
            document
                .getElementById(CONST.id_select_template_history)
                ?.addEventListener("change", (_el: Event) => {
                    const select = document.getElementById(CONST.id_select_template_history) as HTMLSelectElement;
                    const input = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;

                    console.log({ select: select.value })
                    console.log({ templateHistory })

                    if (select.value !== undefined && select.value !== null) {
                        const template = select.value;
                        input.value = template;
                    }
                });

        });
    });

    document
        .getElementById("button_save_options")
        ?.addEventListener("click", (_el: Event) => {
            let options: { [key: string]: string } = {};
            options = Utils.saveOption(options, CONST.id_fillin_template, null); // idを指定
            options = Utils.saveOption(options, null, CONST.id_radio_csv_tsv); // nameを指定

            const history = makeTemplateHistory()
            console.log({ history })
            options[Utils.CONST.key_template_history] = history;

            chrome.storage.sync.set(options);
            console.log({ options });
        });


})();
