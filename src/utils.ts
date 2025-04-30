export { }

export class Utils {
    static PageCategory = {
        index: "index",
        detail: "detail",
        edit: "edit",
        create: "create",
        report: "report",
        excluded: "excluded",
        customize: "customize",
        plugin_setting: "plugin_setting"
    }
    static Messages = {
        changeBreaklineOption: "changeBreaklineOption",
        changePopupOptions: "changePopupOptions",
        loadPopupOptions: "loadPopupOptions",
        requestPopupOptions: "requestPopupOptions"
    }

    static CONTEXT_MENU = {
        copy_simple_url: {
            id: "copySimpleUrl",
            label: "Copy Simple URL"
        },
        toggle_linebrake: {
            id: "toggleNewline",
            label: "Toggle LineBrake"
        }
    }

    static CONST = {
        // オプション画面
        label_default_button: 'save',   // 初期表示、 -- Select Template -- の場合のボタンラベル
        label_import_button: 'apply',
        label_export_button: 'download',
        key_template_history: "template_history",
        key_default_option: "-- Select Template --",
        key_export_options: "-- Export Settings --",
        key_export_label: "-- 保存用 --",


        // 有効無効チェックボックスのID
        // id_checkbox_on_off: "checkbox_on_off",
        class_control_parts_block: "control_parts", // コントロールパーツのブロックが持つクラス

        accent_color: "#F09200",    // アクセントカラー
        accent_color_dec: "240, 146, 0",    // アクセントカラー（10進数の組み合わせ）

        // 画像コピーの設定
        image_copy: false,  // 画像コピーを有効にするかどうか
        max_online_length: 70,   // 画像コピー時の改行文字数

        // 複数行文字列の改行設定
        class_multiline_text: "recordlist-multiple_line_text-gaia",   // 複数行文字列のクラス名
        class_singleline_text: "recordlist-single_line_text-gaia",   // 一行文字列のクラス名


        // コピペアイコンの表示URL
        url_enable_copy_button_re: "^https://.*\\.cybozu\\.com/k/admin/app/flow.*$",    // コピペボタンが表示されてよいURLの正規表現

        // APIトークンの表示画面URL
        url_api_token_re: "^https://.*\\.cybozu\\.com/k/admin/app/apitoken.*$"          // APIトークンの表示画面URLの正規表現

    }


    static MSG = {
        msg_default: `[${Utils.CONST.label_import_button}] テキストエリアのテンプレートを保存して使用します。`,
        msg_export_options: `[${Utils.CONST.label_import_button}] テキストエリアをオプション設定として読み込みます。/ [${Utils.CONST.label_export_button}] JSONとしてダウンロードします。`,

    }


    /**
     * オプション設定を読み込み、指定されたキーまたは名前に対応する要素に値を設定します。
     * 
     * @param options - オプション設定のオブジェクト
     * @param key - 設定する要素のID（通常のinput要素の場合）
     * @param name - 設定する要素の名前（radioボタンの場合）
     */
    static loadOption(options: { [key: string]: string | {} }, key: string | null, name: string | null) {
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
                elm.value = value as string;
            }
        }
        // keyを指定してnameがnullの場合はradioボタン
        else if (key == null && name != null) {
            const value = options[name];
            if (value == undefined) {
                return "";
            }

            const elements = document.getElementsByName(name) as NodeListOf<HTMLInputElement>;
            console.log({ elements });
            if (elements != null) {
                // ラジオボタン要素の場合
                const radioElement = Array.from(elements).find((e) => e.value == value);
                console.log({ radioElement });
                if (radioElement) {
                    radioElement.checked = true;
                }

                // チェックボックス要素の場合
                const cbElement = Array.from(elements).find((e) => e.type == "checkbox") as HTMLInputElement;
                console.log({ cbElement });
                if (cbElement) {
                    options[name] == "enabled" ? cbElement.checked = true : cbElement.checked = false;
                    // cbElement.checked = cbElement.value == "enabled" ? true : false;
                    Utils.changeEnadbleDisableCheckbox(cbElement.checked);
                }

            }
        }
    }

    // 有効無効チェックボックスの動作
    // ここではポップアップ画面のコントロールパネルにグレーのレイヤーをかぶせて操作できないようにする
    static changeEnadbleDisableCheckbox(checked: boolean) {
        // class_control_parts_block クラスにグレーのレイヤーを被せるスタイルをもたせる
        const control_parts = document.getElementsByClassName(Utils.CONST.class_control_parts_block)
        Array.from(control_parts).forEach((elm) => {
            if (checked) {
                elm.classList.remove('controlpanel_disabled')
            } else {
                elm.classList.add('controlpanel_disabled')
            }
        });
    }

    /**
     * オプション設定を保存し、指定されたキーまたは名前に対応する要素の値をオプションオブジェクトに設定します。
     * 
     * @param option - 保存するオプション設定のオブジェクト
     * @param key - 設定する要素のID（通常のinput要素の場合）
     * @param name - 設定する要素の名前（radioボタンの場合）
     * @returns 更新されたオプション設定のオブジェクト
     * @throws 引数が無効な場合にエラーをスローします。
     */
    static saveOption(option: { [key: string]: string | {} }, key: string | null, name: string | null) {
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

    static copyToClipboard(text: string, imageCopy: boolean = Utils.CONST.image_copy) {

        if (imageCopy) {
            // 画像としてクリップボードにコピーする
            Utils.copyTextAsImageToClipboard(text);

        }
        else {
            // テキストとしてクリップボードにコピーする

            navigator.clipboard.writeText(text)
                .then(() => {
                    console.log('Text copied to clipboard');
                })
                .catch((error) => {
                    console.error('Failed to copy text to clipboard', error);
                });
        }
    }

    // HTML Canvasを使用して文字列を画像として描画し、クリップボードにコピーする関数
    static async copyTextAsImageToClipboard(text: string): Promise<void> {
        // 1. Canvasの作成とコンテキストの取得
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Canvas contextを取得できませんでした。');
        }

        // 2. 文字列を120文字で自動改行して行単位で分割
        const lines = text.split('\n').map(line => {
            // [\x00-\x7F]の範囲を1文字、それ以外を2文字としてカウントして、1行の最大文字数はmax_online_lengthとして改行する
            const maxOnlineLength = Utils.CONST.max_online_length;
            let lineLength = 0;
            let lineText = '';
            for (const char of line) {
                lineLength += char.match(/[\x00-\x7F]/) ? 1 : 2;
                if (lineLength > maxOnlineLength) {
                    lineText += '\n';
                    lineLength = 0
                }
                lineText += char;
            }
            return lineText;
        }).join('\n').split('\n');


        // const formattedText = text.replace(new RegExp(`(.{${Utils.CONST.max_online_length}})`, 'g'), '$1\n');
        // const lines = formattedText.split('\n');
        const lineHeight = 30;
        const padding = 20;

        // 3. Canvasのサイズ設定
        ctx.font = '20px Arial';
        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        canvas.width = maxLineWidth + padding * 2;
        canvas.height = lines.length * lineHeight + padding * 2;

        // 4. 背景の描画
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 5. 文字列の描画
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        lines.forEach((line, index) => {
            ctx.fillText(line, padding, padding + (index + 1) * lineHeight);
        });

        // 6. Canvasの内容をBlobに変換
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));

        if (!blob) {
            throw new Error('CanvasのBlobを作成できませんでした。');
        }

        // 7. Blobをクリップボードにコピー
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);
            console.log('画像がクリップボードにコピーされました。');
        } catch (error) {
            console.error('画像をクリップボードにコピーできませんでした: ', error);
        }

        // 8. 画像をダイアログで表示
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        img.style.width = '100%'; // 画像をダイアログの幅に合わせて縮小

        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.padding = '20px';
        dialog.style.backgroundColor = 'white';
        dialog.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        dialog.style.width = '80%'; // ダイアログの幅を設定
        dialog.appendChild(img);

        const closeButton = document.createElement('button');
        closeButton.textContent = '閉じる';
        closeButton.style.marginTop = '10px';
        closeButton.onclick = () => document.body.removeChild(dialog);
        dialog.appendChild(closeButton);

        // ダイアログをクリックすると閉じる
        dialog.onclick = () => document.body.removeChild(dialog);

        document.body.appendChild(dialog);
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

        // パスが /k/{appId}/edit であるかどうか
        if (path.endsWith("/edit")) {
            return this.PageCategory.edit;
        }

        const regex = new RegExp("\/k\/admin\/app\/\\d+\/plugin\/config");
        console.log({ regex });
        console.log({ path });
        if (path.match(regex)) {
            console.log("plugin setting page")
            return this.PageCategory.plugin_setting;   // プラグイン設定画面
        }

        // それ以外は一覧画面
        return this.PageCategory.index;
    }

    // 渡した文字列を二重引用符で囲む
    static quote(text: string | null) {
        return `"${text}"`;
    }
}
