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

        updateButtonLabel();

        // 保存された値を読み込む
        // 旧バージョンで sync に保存されたテンプレートを local へ移行してから、両者をマージして読む
        await Utils.migrateTemplatesToLocal();
        const options = await Utils.getAllOptions() as Options;
        {
            console.log({ options });

            Utils.loadOption(options, Ids.id_fillin_template, null);
            Utils.loadOption(options, null, Ids.id_radio_csv_tsv);

            // テンプレート名称を読み込む
            const input_template_name = document.getElementById(Ids.id_input_template_name) as HTMLInputElement;
            if (input_template_name) {
                input_template_name.value = options[Ids.id_input_template_name] as string;
            }

            // テンプレート履歴を読み込み、ドロップダウンと管理リストを描画
            if (options[CONST.key_template_history] == undefined) {
                options[CONST.key_template_history] = {};
            }
            renderTemplateUI(options);

            // テンプレート管理パネルの開閉状態を localStorage に記憶（保存時のリロードでも維持）
            const tmDetails = document.getElementById("template_manager_details") as HTMLDetailsElement | null;
            if (tmDetails) {
                const stored = localStorage.getItem("kintoys_template_manager_open");
                if (stored !== null) {
                    tmDetails.open = stored === "true";
                }
                tmDetails.addEventListener("toggle", () => {
                    localStorage.setItem("kintoys_template_manager_open", String(tmDetails.open));
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

            // インポートボタンのクリックイベント
            document
                .getElementById("button_import_options")
                ?.addEventListener("click", importOptionsFromFile);

            // ファイル選択イベント
            document
                .getElementById("input_import_file")
                ?.addEventListener("change", handleFileImport);

        }
    });

    // ファイル選択ダイアログを開く
    function importOptionsFromFile() {
        const fileInput = document.getElementById("input_import_file") as HTMLInputElement;
        fileInput.click();
    }

    // ファイルインポート処理
    function handleFileImport(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const options = JSON.parse(content);
                // テンプレートは local、その他は sync に振り分けて保存
                Utils.setOptions(options)
                    .then(() => {
                        alert(t("options_alert_import_success"));
                        location.reload();
                    })
                    .catch((err) => {
                        alert(t("options_alert_import_failed", { error: String(err) }));
                    });
            } catch (err) {
                alert(t("options_alert_import_failed", { error: String(err) }));
            }
        };
        reader.onerror = () => {
            alert(t("options_alert_import_failed", { error: "File read error" }));
        };
        reader.readAsText(file);

        // Reset input to allow re-importing same file
        input.value = "";
    }

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
    async function saveTemplate(options: Options) {
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
                await Utils.setOptions(options);
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

            // オプションを保存（テンプレートは local、その他は sync に振り分け）
            try {
                await Utils.setOptions(options);
                console.log({ options });
                alert(t("options_alert_saved"))
                // リロード
                location.reload();
            }
            catch (e) {
                const msg = t("options_alert_save_failed", { error: String(e) })
                console.error(msg);
                alert(msg);
            }
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

    // テンプレート履歴のドロップダウンと管理リストを再描画する
    function renderTemplateUI(options: Options) {
        const templateHistory = (options[CONST.key_template_history] as { [key: string]: string }) ?? {};

        // 履歴ドロップダウンを再構築
        const select = document.getElementById(Ids.id_select_template_history) as HTMLSelectElement;
        if (select) {
            select.innerHTML = "";
            [CONST.key_default_option, CONST.key_export_options].forEach((key) => {
                const option = document.createElement("option");
                option.text = key;
                option.value = "";
                select.add(option);
            });
            Object.keys(templateHistory).forEach((name) => {
                const option = document.createElement("option");
                option.text = name;
                option.value = templateHistory[name];
                select.add(option);
            });
        }

        // 管理リストを再構築
        renderTemplateManager(options);
    }

    // テンプレート管理リスト（並べ替え・個別削除）を描画する
    function renderTemplateManager(options: Options) {
        const list = document.getElementById("template_manager_list") as HTMLUListElement | null;
        if (!list) return;

        const templateHistory = (options[CONST.key_template_history] as { [key: string]: string }) ?? {};
        const names = Object.keys(templateHistory);

        list.innerHTML = "";

        if (names.length === 0) {
            const empty = document.createElement("li");
            empty.className = "template-manager-empty";
            empty.textContent = t("options_template_manager_empty");
            list.appendChild(empty);
            return;
        }

        names.forEach((name, index) => {
            const li = document.createElement("li");
            li.className = "template-manager-item";

            // 名前をクリックするとエディタに読み込む
            const nameSpan = document.createElement("span");
            nameSpan.className = "template-manager-name";
            nameSpan.textContent = name;
            nameSpan.title = name;
            nameSpan.addEventListener("click", () => loadTemplateIntoEditor(name, templateHistory[name]));
            li.appendChild(nameSpan);

            const actions = document.createElement("div");
            actions.className = "template-manager-actions";

            const upBtn = document.createElement("button");
            upBtn.type = "button";
            upBtn.className = "tm-btn tm-up";
            upBtn.textContent = "↑";
            upBtn.title = t("options_template_manager_up");
            upBtn.disabled = index === 0;
            upBtn.addEventListener("click", () => moveTemplate(options, name, -1));
            actions.appendChild(upBtn);

            const downBtn = document.createElement("button");
            downBtn.type = "button";
            downBtn.className = "tm-btn tm-down";
            downBtn.textContent = "↓";
            downBtn.title = t("options_template_manager_down");
            downBtn.disabled = index === names.length - 1;
            downBtn.addEventListener("click", () => moveTemplate(options, name, 1));
            actions.appendChild(downBtn);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "tm-btn tm-delete";
            delBtn.textContent = "🗑";
            delBtn.title = t("options_template_manager_delete");
            delBtn.addEventListener("click", () => deleteTemplate(options, name));
            actions.appendChild(delBtn);

            li.appendChild(actions);
            list.appendChild(li);
        });
    }

    // テンプレートをエディタ（名前欄・本文欄）に読み込む
    function loadTemplateIntoEditor(name: string, body: string) {
        const input = document.getElementById(Ids.id_input_template_name) as HTMLInputElement;
        const textarea = document.getElementById(Ids.id_fillin_template) as HTMLTextAreaElement;
        if (input) input.value = name;
        if (textarea) textarea.value = body;
        updateButtonLabel(name);
    }

    // テンプレートの表示順を1つ上／下へ移動する（direction: -1=上, 1=下）
    async function moveTemplate(options: Options, name: string, direction: -1 | 1) {
        const templateHistory = (options[CONST.key_template_history] as { [key: string]: string }) ?? {};
        const names = Object.keys(templateHistory);
        const index = names.indexOf(name);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= names.length) {
            return;
        }

        // 順序を入れ替えてオブジェクトを再構築（挿入順がそのまま表示順になる）
        [names[index], names[target]] = [names[target], names[index]];
        const reordered: { [key: string]: string } = {};
        names.forEach((key) => { reordered[key] = templateHistory[key]; });
        options[CONST.key_template_history] = reordered;

        await persistTemplateHistory(options);
        renderTemplateUI(options);
    }

    // テンプレートを個別に削除する
    async function deleteTemplate(options: Options, name: string) {
        if (!confirm(t("options_template_manager_delete_confirm", { name }))) {
            return;
        }

        const templateHistory = (options[CONST.key_template_history] as { [key: string]: string }) ?? {};
        delete templateHistory[name];
        options[CONST.key_template_history] = templateHistory;

        await persistTemplateHistory(options);
        renderTemplateUI(options);
    }

    // テンプレート履歴（local）だけを保存する
    async function persistTemplateHistory(options: Options) {
        try {
            await Utils.setOptions({ [CONST.key_template_history]: options[CONST.key_template_history] });
        } catch (e) {
            const msg = t("options_alert_save_failed", { error: String(e) });
            console.error(msg);
            alert(msg);
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

        // ダウンロードボタンは折りたたみ式のテンプレート管理内にあるため、パネルを開いて見えるようにする
        const tmDetails = document.getElementById("template_manager_details") as HTMLDetailsElement | null;
        if (tmDetails && !tmDetails.open) {
            tmDetails.open = true;
        }
    }

})();

