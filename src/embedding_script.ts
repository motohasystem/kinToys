import { ClickEventDealer } from "./lib/clickevent_dealer";
import { TemplateEmbedder } from "./lib/template_embedder";
import { Utils } from "./utils";

(() => {
    // 各所のDOMにクリックイベントを配布する
    const eventDealer = new ClickEventDealer()
    const embedder = new TemplateEmbedder("")
    eventDealer.setTemplateEmbedder(embedder)

    // kintone.events.on とは別のタイミングで実行しておく必要がある
    window.postMessage({ type: "requestPopupOptions" }, "*")

    // kintoneの一覧画面表示のタイミングで実行する
    kintone.events.on("app.record.index.show", function (_event) {
        // レコード一覧の表示が完了したら、セルにクリックしてコピーする機能を追加する
        // eventDealer.deal();
        window.postMessage({ type: "requestPopupOptions" }, "*")
    });

    window.addEventListener("message", (event) => {
        console.log({ event })
        // メッセージが正しいかチェック
        if (event.source !== window) return;


        // kintoneレコード情報の埋め込みリクエストを受信した
        if (event.data.type === Utils.CONST.template_copy_button_clicked) {
            // テンプレートに対してプレースホルダを置換する
            const template = event.data.data;
            const embedder = new TemplateEmbedder(template);
            const alignment = event.data.alignment  // データの形状(csv, tsv またはテンプレート)

            const record = kintone.app.record.get()
            console.log({ record })
            let response = ""
            if (record != null) {
                if (alignment == 'csv' || alignment == 'tsv') {
                    response = embedder.alignment(record.record, alignment)
                } else if (alignment == 'template') {
                    response = embedder.embed(record.record, template)
                }
                else {
                    throw new Error(`Invalid shape: ${alignment}`)
                }
            }
            console.log({ response })
            window.postMessage({ type: "kintoneRecordInfoEmbedded", data: response }, "*")
        }
        else if (event.data.type === "changePopupOptions" || event.data.type === "loadPopupOptions") {
            console.log(`window message event: ${event.data.type}`)

            const options = event.data.data;
            console.log({ changePopupOptions: options })
            eventDealer.deal(options)

            const template = options.textarea_fillin_template
            if (template != null) {
                const embedder = new TemplateEmbedder(template)
                console.log({ 'set template by message': template })
                eventDealer.setTemplateEmbedder(embedder)
            }
        }

    });

    //
    // ここから下はプラグイン画面用のスクリプト
    //

    function insertScriptButtons() {
        // 一覧画面

        // プラグイン設定画面
        if (
            isMatchURL(
                // prettier-ignore
                "^https:\/\/\.+\.cybozu\.com\/k\/admin\/app\/\\d+\/plugin\/config\\?pluginId=.*$"
            )
        ) {
            // エクスポートボタンの設置
            const export_button = make_export_button("⇩ download");
            document.body.appendChild(export_button);

            // インポートボタンの設置
            const import_button = make_import_button("⇧ upload");
            if (import_button) {
                document.body.appendChild(import_button);
            }
        }
    }

    // 現在のURLが渡した正規表現とマッチするかどうかを返す
    function isMatchURL(regex: string) {
        // prettier-ignore
        return new RegExp(regex).test(location.href);
    }



    function make_export_button(textContent: string) {
        const button = document.createElement("button");
        button.textContent = textContent;
        button.className = "custom-export-label";
        button.onclick = function () {
            const url = location.href;
            if (url === null) return;
            const matches = url.match(/pluginId=([a-zA-Z0-9]+)/);
            if (!matches) {
                console.error("pluginId not found.");
                return;
            }
            const pluginId = matches[1];
            export_settings(pluginId);
        };
        return button;
    }

    function export_settings(pluginId: string) {
        // Kintoneプラグインの設定を取得
        console.info(`export setting plugin-id: ${pluginId}`);
        const config = kintone.plugin.app.getConfig(pluginId);

        // 取得した設定をJSON形式でBlobオブジェクトに変換
        const blob = new Blob([JSON.stringify(config, null, 2)], {
            type: "application/json",
        });

        // BlobオブジェクトからURLを生成
        const url = URL.createObjectURL(blob);

        // ダウンロード用のaタグを生成
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = pluginId + ".json";

        // aタグをDOMに追加してクリックイベントを発火
        document.body.appendChild(a);
        a.click();

        // 使用したURLオブジェクトを解放
        window.URL.revokeObjectURL(url);
    }

    function make_import_button(textContent: string) {
        // ファイル入力要素を探す
        var presettedFileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        // 既存のファイル入力要素があれば、それをクリック
        if (presettedFileInput) {
            presettedFileInput.click();
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "file-input-wrapper";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.id = "file-input";
        fileInput.accept = ".json";
        fileInput.style.display = "none";

        const label = document.createElement("label");
        label.htmlFor = "file-input";
        label.className = "custom-file-label";
        label.textContent = textContent;

        wrapper.appendChild(fileInput);
        wrapper.appendChild(label);

        // ファイルが選択されたときの処理
        fileInput.onchange = function (event: Event) {
            if (!event.target) return;

            // @ts-ignore
            var file = event.target.files[0];
            var reader = new FileReader();

            // ファイル読み込み完了時の処理
            reader.onload = function (event) {
                try {
                    if (!event.target) {
                        throw new Error("Event target is null");
                    }

                    const result = event.target.result;
                    if (typeof result !== 'string') {
                        throw new Error("Result is not a string");
                    }

                    // JSONとしてパース
                    const settings = JSON.parse(result);

                    // 設定を適用
                    if (settings) {
                        kintone.plugin.app.setConfig(settings);
                    } else {
                        console.error("Invalid settings format.");
                    }
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        console.error("Error parsing JSON: " + error.message);
                    } else {
                        console.error("Unknown error occurred.");
                    }
                }
            };

            // ファイルをテキストとして読み込む
            reader.readAsText(file);
        };

        return wrapper;
    }

    insertScriptButtons();


})();
