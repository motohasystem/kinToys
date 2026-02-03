// import { Names } from "./lib/Names";
import { I18n, I18nMessages } from "./i18n";
import { Utils } from "./utils";

export type Options = { [key: string]: string | {} };

(() => {
    const CONST = Utils.CONST;
    const Ids = Utils.Ids;
    let templateHistory: { [key: string]: string } = {};
    let i18nMessages: I18nMessages = {};
    const t = (key: string, params?: Record<string, string>) => I18n.t(i18nMessages, key, params);

    console.log("options.js");

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", async function () {
        const storedLang = await I18n.getStoredLanguage();
        const { lang, messages } = await I18n.loadMessages(storedLang);
        i18nMessages = messages;
        document.documentElement.lang = lang;
        I18n.applyToDom(messages);

        const languageSelect = document.getElementById("select_language") as HTMLSelectElement | null;
        if (languageSelect) {
            languageSelect.value = lang;
            languageSelect.addEventListener("change", async () => {
                await I18n.setStoredLanguage(languageSelect.value);
                location.reload();
            });
        }

        CONST.label_default_button = t("options_button_save");
        CONST.label_import_button = t("options_button_apply");
        CONST.label_export_button = t("options_button_download");
        CONST.key_default_option = t("options_select_default_option");
        CONST.key_export_options = t("options_select_export_options");
        CONST.key_export_label = t("options_select_export_label");

        Utils.MSG.msg_default = t("options_message_default", {
            apply: CONST.label_import_button,
            download: CONST.label_export_button
        });
        Utils.MSG.msg_export_options = t("options_message_export", {
            apply: CONST.label_import_button,
            download: CONST.label_export_button
        });

        updateButtonLabel();

        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options: Options) => {
            update_message()
            console.log({ options });

            Utils.loadOption(options, Ids.id_fillin_template, null);
            Utils.loadOption(options, null, Ids.id_radio_csv_tsv);

            // テンプレート名称を読み込む
            const input_template_name = document.getElementById(Ids.id_input_template_name) as HTMLInputElement;
            if (input_template_name) {
                input_template_name.value = options[Ids.id_input_template_name] as string;
            }

            // テンプレート履歴を読み込む
            let templateHistory: { [key: string]: string } = options[CONST.key_template_history] as { [key: string]: string };
            console.log({ templateHistory });
            if (templateHistory == undefined) {
                templateHistory = {}
            }

            const select = document.getElementById(Ids.id_select_template_history) as HTMLSelectElement;
            // 初期値を設定
            [CONST.key_default_option, CONST.key_export_options].forEach((key) => {
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

            // イメージコピーボタンのオプションを読み込む
            const el_image_copy = document.getElementById(Ids.id_checkbox_imagecopy_button) as HTMLInputElement;
            if (el_image_copy) {
                el_image_copy.checked = options[Ids.id_checkbox_imagecopy_button] === "true" ? true : false;
            }

            // 複数行文字列の改行オプションを読み込む
            const el_break_ml = document.getElementById(Ids.id_enable_break_multiline) as HTMLInputElement;
            if (el_break_ml) {
                el_break_ml.checked = options[Ids.id_enable_break_multiline] === "true" ? true : false;
            }

            // サブテーブルのインポート機能を有効にするかどうかのオプションを読み込む
            const el_subtable = document.getElementById(Ids.id_enable_subtable_importer) as HTMLInputElement;
            if (el_subtable) {
                el_subtable.checked = options[Ids.id_enable_subtable_importer] === "true" ? true : false;
            }


            // テンプレート履歴の選択イベント
            document
                .getElementById(Ids.id_select_template_history)
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
        const el_input = document.getElementById(Ids.id_input_template_name) as HTMLInputElement;
        const el_template = document.getElementById(Ids.id_fillin_template) as HTMLTextAreaElement;

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
        const template_name = document.getElementById(Ids.id_input_template_name) as HTMLInputElement;

        if (template_name.value === "") {
            alert(t("options_alert_template_required"))
            return;
        }
        else if (template_name.value == Utils.CONST.key_export_label) {
            // エクスポートラベルが選択されている場合は値をそのままoptionとして保存する
            const textarea = document.getElementById(Ids.id_fillin_template) as HTMLTextAreaElement;

            try {
                const options = JSON.parse(textarea.value);
                chrome.storage.sync.set(options);
                alert(t("options_alert_import_success"))
            }
            catch (e) {
                const msg = t("options_alert_save_failed", { error: String(e) })
                console.error(msg);
                // エラーのアラートダイアログを表示
                alert(msg);
            }
            return;
        }
        else {
            // オプションを保存する
            console.log({ options })
            options = Utils.saveOption(options, Ids.id_fillin_template, null); // idを指定
            options = Utils.saveOption(options, null, Ids.id_radio_csv_tsv); // nameを指定

            // テンプレート名称を保存
            options[Ids.id_input_template_name] = template_name.value;

            // テンプレート履歴を保存
            let templateHistory = options[Utils.CONST.key_template_history] as { [key: string]: string };
            const history = makeHistory();
            console.log({ history })
            console.log({ templateHistory })
            templateHistory = { ...templateHistory, ...history };
            options[Utils.CONST.key_template_history] = templateHistory;
            console.log({ options })

            // イメージコピーボタンのオプションを保存
            const el_image_copy = document.getElementById(Ids.id_checkbox_imagecopy_button) as HTMLInputElement;
            options[Ids.id_checkbox_imagecopy_button] = el_image_copy.checked ? "true" : "false";

            // 複数行文字列の改行オプションを保存
            const el_break_ml = document.getElementById(Ids.id_enable_break_multiline) as HTMLInputElement;
            options[Ids.id_enable_break_multiline] = el_break_ml.checked ? "true" : "false";

            // サブテーブルのインポート機能を有効にするかどうかのオプションを保存
            const el_subtable = document.getElementById(Ids.id_enable_subtable_importer) as HTMLInputElement;
            options[Ids.id_enable_subtable_importer] = el_subtable.checked ? "true" : "false";

            // オプションを保存
            chrome.storage.sync.set(options);
            console.log({ options });
            alert(t("options_alert_saved"))
            // リロード
            location.reload();
        }
    }


    // テンプレート履歴の選択イベント
    function changeTemplateDropdown(options: Options) {
        disable_export_button();
        console.log({ options })

        const select = document.getElementById(Ids.id_select_template_history) as HTMLSelectElement;
        const textarea = document.getElementById(Ids.id_fillin_template) as HTMLTextAreaElement;
        const input = document.getElementById(Ids.id_input_template_name) as HTMLInputElement;

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

    // メッセージの更新
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

