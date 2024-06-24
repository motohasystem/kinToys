export class Utils {
    static PageCategory = {
        index: "index",
        detail: "detail",
        report: "report",
        excluded: "excluded",
        customize: "customize",
    }

    static CONST = {
        id_fillin_template: "textarea_fillin_template",
        id_radio_csv_tsv: "radio_csv_tsv",
        id_radio_cell_record: "radio_cell_record",
        id_radio_data_template: "radio_data_template",
        id_popup_preview: "textarea_clipboard_preview", // ポップアップのプレビュー領域

        table_copy_button_clicked: "tableCopyButtonClicked",    // テーブル抽出ボタン
        template_copy_button_clicked: "templateCopyButtonClicked",    // テンプレートコピーボタン

        id_input_template_name: "input_template_name",
        id_select_template_history: "select_template_history",
        key_template_history: "template_history",

    }


    static loadOption(options: { [key: string]: string }, key: string | null, name: string | null) {
        key = key == undefined ? null : key;
        name = name == undefined ? null : name;

        // keyを指定してnameがundefinedの場合は通常のinput要素
        if (key != null && name == null) {
            const value = options[key];
            if (value == undefined) {
                return "";
            }

            const elm = document.getElementById(key) as HTMLInputElement
            if (elm != null) {
                elm.value = value;
            }
        }
        // keyを指定してnameがnullの場合はradioボタン
        else if (key == null && name != null) {
            const value = options[name];
            if (value == undefined) {
                return "";
            }

            const elm = document.getElementsByName(name) as NodeListOf<HTMLInputElement>;
            if (elm != null) {
                const radioElement = Array.from(elm).find((e) => e.value == value);
                if (radioElement) {
                    radioElement.checked = true;
                }
            }
        }
    }

    static saveOption(option: { [key: string]: string }, key: string | null, name: string | null) {
        if (option == undefined) {
            option = {};
        }

        key = key == undefined ? null : key;
        name = name == undefined ? null : name;

        // keyを指定してnameがundefinedの場合は通常のinput要素
        if (key != null && name == null) {
            const elm = document.getElementById(key) as HTMLInputElement;
            const value = elm.value;
            option[key] = value;
            return option;
        }

        // keyを指定してnameがnullの場合はradioボタン
        if (key == null && name != null) {
            const elm = document.getElementsByName(name);
            const checkedElement = Array.from(elm).find((e) => (e as HTMLInputElement).checked) as HTMLInputElement | undefined;
            if (checkedElement) {
                option[name] = checkedElement.value;
            }
            return option;
        }

        throw new Error(`Invalid argument: key: ${key} / name: ${name}`);
    }

    static fillTemplate(template: string, record: { [key: string]: { value: string } }) {
        let filledTemplate = template;
        for (const key in record) {
            const value = record[key].value;
            filledTemplate = filledTemplate.replace(`%${key}%`, value);
        }
        return filledTemplate;
    }

    static copyToClipboard(text: string) {
        // response.dataをクリップボードにコピーする
        navigator.clipboard.writeText(text)
            .then(() => {
                console.log('Text copied to clipboard');
            })
            .catch((error) => {
                console.error('Failed to copy text to clipboard', error);
            });
    }

    // 渡したURLが、kintoneの一覧画面なのか詳細画面なのか判定する
    static whereAmI(url: string) {
        const urlObj = new URL(url);

        // ホスト名が *.cybozu.com であるかどうか
        const body = urlObj.hostname;
        if (!body.endsWith(".cybozu.com")) {
            return this.PageCategory.excluded;   // 対象外のページ
        }

        // /k/admin/app/flow から始まっていればカスタマイズ画面
        if (urlObj.pathname.startsWith("/k/admin/app/flow")) {
            return this.PageCategory.customize;
        }

        // パスが /k/ で始まるかどうか
        const path = urlObj.pathname;
        if (!path.startsWith("/k/")) {
            return this.PageCategory.excluded;   // 対象外のページ
        }

        // パスが /k/{appId}/show であるかどうか
        if (path.endsWith("/show")) {
            return this.PageCategory.detail;
        }

        // パスが /k/{appId}/report であるかどうか
        if (path.endsWith("/report")) {
            return this.PageCategory.report;
        }

        // それ以外は一覧画面
        return this.PageCategory.index;
    }
}