import { Utils } from "./utils";

(() => {
    const CONST = Utils.CONST;
    let templateHistory: { [key: string]: string } = {};

    console.log("options.js");

    // input_template_name が空欄でなければ、textarea_fillin_template の値とセットでオプションとして保存する
    function makeTemplateHistory(): { [key: string]: string } {
        const input = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;
        const templateELement = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;

        if (input && templateELement) {
            const name = input.value;
            if (name !== undefined && name !== null && name !== "") {
                templateHistory[name] = templateELement.value;
            }
        }

        return templateHistory;
    }

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options: { [key: string]: string | {} }) => {
            console.log({ options });

            Utils.loadOption(options, Utils.CONST.id_fillin_template, null);
            Utils.loadOption(options, null, Utils.CONST.id_radio_csv_tsv);

            // テンプレート履歴を読み込む
            let templateHistory: { [key: string]: string } = options[Utils.CONST.key_template_history] as {};
            console.log({ templateHistory });
            if (templateHistory == undefined) {
                templateHistory = {}
            }

            const select = document.getElementById(CONST.id_select_template_history) as HTMLSelectElement;
            // 初期値を設定
            [Utils.CONST.key_default_option, Utils.CONST.key_export_options].forEach((key) => {
                const option = document.createElement("option");
                option.text = key;
                option.value = "";
                select.add(option);
            });

            // 読み込んだ履歴を反映
            if (select) {
                Object.keys(templateHistory).forEach((key) => {
                    const option = document.createElement("option");
                    option.text = key;
                    option.value = templateHistory[key];
                    select.add(option);
                });
            }

            // テンプレート履歴の選択イベント
            document
                .getElementById(CONST.id_select_template_history)
                ?.addEventListener("change", (_el: Event) => {
                    console.log({ _el })
                    const select = document.getElementById(CONST.id_select_template_history) as HTMLSelectElement;
                    const textarea = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;
                    const input = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;

                    const selected_value = select.value
                    const selected_label = select.options[select.selectedIndex].text

                    console.log({ select: select })
                    console.log({ templateHistory })

                    if (selected_label == Utils.CONST.key_export_options) {
                        // オプションをエクスポート
                        console.log("export options")
                        console.log({ options })
                        textarea.value = JSON.stringify(options, null, 2);
                        input.value = Utils.CONST.key_export_label;
                    }
                    else if (selected_value == "") {
                        input.value = "";
                        textarea.value = "";
                    }
                    else if (selected_value !== undefined && selected_value !== null) {
                        // input.valueに選択されたテンプレート名をセット
                        input.value = selected_label
                        textarea.value = selected_value;
                    }

                    // textarea.valueをクリップボードにコピー
                    // const text = textarea.value;
                    // if (text == "" && text === undefined) {
                    //     return
                    // }
                    // navigator.clipboard.writeText(text).then(() => {
                    //     console.log('Async: Copying to clipboard was successful!');
                    // }, (err) => {
                    //     console.error('Async: Could not copy text: ', err);
                    // });
                });

        });
    });

    document
        .getElementById("button_save_options")
        ?.addEventListener("click", (_el: Event) => {
            // 見出しのインプット要素
            const input = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;

            if (input.value == Utils.CONST.key_export_label) {
                // エクスポートラベルが選択されている場合は値をそのままoptionとして保存する
                const textarea = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;

                try {
                    const options = JSON.parse(textarea.value);
                    chrome.storage.sync.set(options);
                }
                catch (e) {
                    const msg = `オプションが保存できませんでした。[${e}]`
                    console.error(msg);
                    // エラーのアラートダイアログを表示
                    alert(msg);
                }
                return;
            }


            let options: { [key: string]: string | {} } = {};
            options = Utils.saveOption(options, CONST.id_fillin_template, null); // idを指定
            options = Utils.saveOption(options, null, CONST.id_radio_csv_tsv); // nameを指定

            const history = makeTemplateHistory()
            console.log({ history })
            options[Utils.CONST.key_template_history] = history;

            chrome.storage.sync.set(options);
            console.log({ options });
            alert('オプション設定を保存しました。')
        });


})();
