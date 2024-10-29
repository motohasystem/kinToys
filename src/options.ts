import { Utils } from "./utils";

type Options = { [key: string]: string | {} };

(() => {
    const CONST = Utils.CONST;
    let templateHistory: { [key: string]: string } = {};

    console.log("options.js");
    updateButtonLabel()


    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options: Options) => {
            update_message()
            console.log({ options });

            Utils.loadOption(options, Utils.CONST.id_fillin_template, null);
            Utils.loadOption(options, null, Utils.CONST.id_radio_csv_tsv);

            // テンプレート名称を読み込む
            const input_template_name = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;
            if (input_template_name) {
                input_template_name.value = options[Utils.CONST.id_input_template_name] as string;
            }

            // テンプレート履歴を読み込む
            let templateHistory: { [key: string]: string } = options[Utils.CONST.key_template_history] as { [key: string]: string };
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
                ?.addEventListener("change", () => {
                    return changeTemplateDropdown(options);
                });

            // 保存ボタンのクリックイベント
            document
                .getElementById("button_save_options")
                ?.addEventListener("click", () => {
                    return saveTemplate(options);
                });

        });
    });

    // ボタンラベルの書き換え
    function updateButtonLabel(label: string | undefined = undefined) {
        const btn_save = document.getElementById("button_save_options") as HTMLButtonElement;
        if (btn_save) {
            let innerText
            if (label == Utils.CONST.key_default_option || label == undefined) {
                innerText = Utils.CONST.label_default_button;
            }
            else {
                innerText = Utils.CONST.label_import_button;
            }
            btn_save.innerText = innerText
        }

        const btn_export = document.getElementById("button_export_options") as HTMLButtonElement;
        if (btn_export) {
            btn_export.innerText = Utils.CONST.label_export_button;
        }
    }

    // input_template_name が空欄でなければ、textarea_fillin_template の値とセットでオプションとして保存する
    function makeHistory(): { [key: string]: string } {
        const el_input = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;
        const el_template = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;

        if (el_input && el_template) {
            const name = el_input.value;
            console.log({ name })
            if (name !== undefined && name !== null && name !== "") {
                return {
                    [name]: el_template.value
                }
            }
        }

        return {};
    }

    // 保存ボタンのクリックイベント
    function saveTemplate(options: Options) {
        console.log('clicked save button')
        // 見出しのインプット要素
        const template_name = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;

        if (template_name.value === "") {
            alert('テンプレート名を入力してから保存ボタンを押してください。')
            return;
        }
        else if (template_name.value == Utils.CONST.key_export_label) {
            // エクスポートラベルが選択されている場合は値をそのままoptionとして保存する
            const textarea = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;

            try {
                const options = JSON.parse(textarea.value);
                chrome.storage.sync.set(options);
                alert('JSONをオプション設定として読み込みました。')
            }
            catch (e) {
                const msg = `オプションが保存できませんでした。[${e}]`
                console.error(msg);
                // エラーのアラートダイアログを表示
                alert(msg);
            }
            return;
        }
        else {
            // オプションを保存する
            console.log({ options })
            options = Utils.saveOption(options, CONST.id_fillin_template, null); // idを指定
            options = Utils.saveOption(options, null, CONST.id_radio_csv_tsv); // nameを指定

            // テンプレート名称を保存
            options[CONST.id_input_template_name] = template_name.value;

            // テンプレート履歴を保存
            let templateHistory = options[Utils.CONST.key_template_history] as { [key: string]: string };
            const history = makeHistory();
            console.log({ history })
            console.log({ templateHistory })
            templateHistory = { ...templateHistory, ...history };
            options[Utils.CONST.key_template_history] = templateHistory;
            console.log({ options })

            chrome.storage.sync.set(options);
            console.log({ options });
            alert('オプション設定を保存しました。')
            // リロード
            location.reload();
        }
    }


    // テンプレート履歴の選択イベント
    function changeTemplateDropdown(options: Options) {
        disable_export_button();
        console.log({ options })

        const select = document.getElementById(CONST.id_select_template_history) as HTMLSelectElement;
        const textarea = document.getElementById(CONST.id_fillin_template) as HTMLTextAreaElement;
        const input = document.getElementById(CONST.id_input_template_name) as HTMLInputElement;

        const selected_value = select.value
        const selected_label = select.options[select.selectedIndex].text

        console.log({ select: select })
        console.log({ templateHistory })

        update_message(selected_label)
        updateButtonLabel(selected_label)
        if (selected_label == Utils.CONST.key_export_options) {
            // オプションをエクスポート
            console.log("export options")
            console.log({ options })
            textarea.value = JSON.stringify(options, null, 2);
            input.value = Utils.CONST.key_export_label;
            enable_export_button(options);
        }
        else if (selected_label === Utils.CONST.key_default_option) {
            input.value = "";
            textarea.value = options.textarea_fillin_template as string;
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

    }

    function disable_export_button() {
        const btn_export = document.getElementById("button_export_options")
        if (btn_export) {
            btn_export.style.display = "none";
        }
    }

    function enable_export_button(options: Options) {
        // exportボタンをクリックすると現在の全オプションをjsonファイルにエクスポートする
        const export_function = (options: Options) => {
            // options.json としてダウンロードする
            const str_options = JSON.stringify(options, null, 2);
            const blob = new Blob([str_options], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            document.body.appendChild(a);
            a.download = "options.json";
            a.href = url;
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }
        const btn_export = document.getElementById("button_export_options")
        if (btn_export) {
            btn_export.addEventListener("click", export_function.bind(null, options));
            btn_export.style.display = "block";
        }
    }

    function update_message(selected_label: string | undefined = undefined) {
        let msg = Utils.MSG.msg_default;
        switch (selected_label) {
            case Utils.CONST.key_export_options:
                msg = Utils.MSG.msg_export_options;
                break;
            default:
                break;
        }

        const node_message = document.getElementById("message")
        if (node_message) {
            node_message.innerText = msg;
        }
    }
})();
