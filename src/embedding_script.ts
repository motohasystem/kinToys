import { ClickEventDealer } from "./lib/clickevent_dealer";
// import { Names } from "./lib/Names";
import { FieldSettingDuplicator } from "./lib/field_setting_duplicator";
import { FilterDialogDuplicator } from "./lib/filter_dialog_duplicator";
import { RecordJsonPaster } from "./lib/record_json_paster";
import { TemplateEmbedder } from "./lib/template_embedder";
// import { Options } from "./options";
import { Utils } from "./utils";

(() => {
    // 詳細画面で「表示どおりの文字列」に置き換えるフィールドタイプ（数値・計算）
    // これらは桁区切り・単位（前置/後置）・小数桁などの表示設定を持つため、
    // 生値ではなく getFieldElement で取得した表示文字列をテンプレートに差し込む。
    const DISPLAY_VALUE_TYPES = new Set(["NUMBER", "CALC"]);

    // 各所のDOMにクリックイベントを配布する
    const eventDealer = new ClickEventDealer()
    const embedder = new TemplateEmbedder("")
    eventDealer.setTemplateEmbedder(embedder)

    // フィールド設定ダイアログ（React刷新後の新DOM）の表示を監視する
    const duplicator = new FieldSettingDuplicator()
    duplicator.watchDialogSpawn()

    // 一覧画面の「絞り込む」ダイアログの表示を監視する
    const filterDuplicator = new FilterDialogDuplicator()
    filterDuplicator.watchDialogSpawn()

    // ポップアップから受け取ったレコードJSONを、追加/編集画面に貼り付ける
    const jsonPaster = new RecordJsonPaster()

    // kintone.events.on とは別のタイミングで実行しておく必要がある
    window.postMessage({ type: Utils.Messages.requestPopupOptions }, "*")

    window.addEventListener("message", (event) => {
        console.log({ event })
        // メッセージが正しいかチェック
        if (event.source !== window) return;
        console.log(`window message event: ${event.data.type}`)

        // kintoneレコード情報の埋め込みリクエストを受信した
        if (event.data.type === Utils.Events.template_copy_button_clicked) {
            // テンプレートに対してプレースホルダを置換する
            const template = event.data.data;
            const embedder = new TemplateEmbedder(template);
            const alignment = event.data.alignment  // データの形状(csv, tsv またはテンプレート)

            const pageCategory = Utils.whereAmI(location.href)
            if (pageCategory !== Utils.PageCategory.detail) {
                // 一覧画面では、表示している一覧のすべてのレコード情報をテンプレート化して返す
                const query = kintone.app.getQuery()
                const url = kintone.api.url('/k/v1/records.json')
                const params = {
                    app: kintone.app.getId(),
                    query: query
                }
                kintone.api(url, 'GET', params,
                    (resp) => {
                        console.log({ resp })
                        const records = resp.records
                        const response = embedder.embedRecords(records, template).join('\n')
                        console.log({ response })
                        window.postMessage({ type: "kintoneRecordInfoEmbedded", data: response }, "*")
                    },
                    (error) => {
                        console.error({ error })
                    }
                )
            }
            else {
                // 詳細画面で表示しているレコード単体情報を取得する
                const record = kintone.app.record.get()
                console.log({ record })
                let response = ""
                if (record != null) {
                    if (alignment == 'csv' || alignment == 'tsv') {
                        response = embedder.alignment(record.record, alignment)
                    } else if (alignment == 'template') {
                        // 詳細画面では、数値/計算フィールドを画面表示どおりの文字列（桁区切り・単位など）に置き換えて差し込む
                        const displayRecord = buildDetailDisplayRecord(record.record)
                        response = embedder.embed(displayRecord as any, template)
                    } else if (alignment == 'json') {
                        response = JSON.stringify(record.record, null, 2)
                    }
                    else {
                        throw new Error(`Invalid shape: ${alignment}`)
                    }
                }
                console.log({ response })
                window.postMessage({ type: "kintoneRecordInfoEmbedded", data: response }, "*")
            }
        }
        else if (event.data.type === Utils.Messages.changePopupOptions || event.data.type === Utils.Messages.loadPopupOptions) {
            // ポップアップオプションが変更された、またはポップアップオプションを読み込んだ
            const options = event.data.data;
            console.log({ changePopupOptions: options })
            eventDealer.deal(options)
            // フィールド設定コピーの整形JSONオプションを反映する
            duplicator.setOptions(options)

            const template = options.textarea_fillin_template
            if (template != null) {
                const embedder = new TemplateEmbedder(template)
                console.log({ 'set template by message': template })
                eventDealer.setTemplateEmbedder(embedder)
            }
        }
        else if (event.data.type === Utils.Events.record_json_paste_preview || event.data.type === Utils.Events.record_json_paste_apply) {
            // ポップアップで貼り付けたレコードJSONの対象確認／反映
            const text: string = event.data.data
            const requestId = event.data.requestId
            const task = event.data.type === Utils.Events.record_json_paste_apply ? jsonPaster.apply(text, event.data.excluded ?? []) : jsonPaster.preview(text)
            task.then((result) => {
                window.postMessage({ type: Utils.Events.record_json_paste_result, requestId, data: result }, "*")
            }).catch((error) => {
                console.error(error)
                const message = error instanceof Error ? error.message : JSON.stringify(error)
                window.postMessage({ type: Utils.Events.record_json_paste_result, requestId, error: message }, "*")
            })
        }
        else if (event.data.type === Utils.Messages.changeBreaklineOption) {
            // ブレークラインオプションが変更された
            console.log('Change Breakline Option')
            eventDealer.deal()

        }

    });

    // 一覧／集計テーブルの描画完了後にクリックイベントを再バインドする。
    // content_script は document_start で動作するため、初回の loadPopupOptions ハンドシェイクによる
    // deal() の時点ではまだ一覧テーブルが未描画で、クリックハンドラが張られないことがある（レース）。
    // kintone の一覧/集計表示イベントで deal() を呼び直し、確実にハンドラを再登録する。
    // deal() は引数なしのとき、直近に受け取ったオプション状態を保持したまま再バインドする。
    if (typeof kintone !== 'undefined' && kintone.events) {
        kintone.events.on(['app.record.index.show', 'app.report.show', 'app.record.detail.show'], (event: any) => {
            console.log('kintone list/report/detail shown: rebind click handlers')
            eventDealer.deal()
            return event
        })
    }

    //
    // ここから下はプラグイン画面用のスクリプト
    //


    // 詳細画面で、数値/計算フィールドの値を「画面表示どおりの文字列」に置き換えたレコードを作る。
    // getFieldElement で描画済みの表示テキスト（桁区切り・単位の前置/後置など）を取得する。
    // 取得できない場合や、サブテーブル等の配列値は生値のままにする。
    function buildDetailDisplayRecord(record: { [key: string]: { type?: string; value: any } }) {
        const displayRecord: { [key: string]: { type?: string; value: any } } = {};
        for (const code in record) {
            const field = record[code];
            if (field && !Array.isArray(field.value) && field.type && DISPLAY_VALUE_TYPES.has(field.type)) {
                let displayValue = field.value;
                try {
                    const el = kintone.app.record.getFieldElement(code);
                    const text = el && el.textContent != null ? el.textContent.trim() : "";
                    if (text !== "") {
                        displayValue = text;
                    }
                } catch (e) {
                    console.warn(`getFieldElement failed for ${code}`, e);
                }
                displayRecord[code] = { ...field, value: displayValue };
            } else {
                displayRecord[code] = field;
            }
        }
        return displayRecord;
    }

    const ID_PLUGIN_EXPORT_BUTTON = "kintoys-plugin-export-button";
    const ID_PLUGIN_IMPORT_BUTTON = "kintoys-plugin-import-button";

    // プラグイン設定画面ならエクスポート/インポートボタンを置き、それ以外の画面なら外す。
    // 何度呼んでもボタンは重複しない。
    function insertScriptButtons() {
        const here = Utils.whereAmI(location.href)
        console.log({ where: here })

        if (here != Utils.PageCategory.plugin_setting) {
            document.getElementById(ID_PLUGIN_EXPORT_BUTTON)?.remove();
            document.getElementById(ID_PLUGIN_IMPORT_BUTTON)?.remove();
            return;
        }

        // エクスポートボタンの設置
        if (!document.getElementById(ID_PLUGIN_EXPORT_BUTTON)) {
            const export_button = make_export_button("⇩ download");
            export_button.id = ID_PLUGIN_EXPORT_BUTTON;
            document.body.appendChild(export_button);
        }

        // インポートボタンの設置
        if (!document.getElementById(ID_PLUGIN_IMPORT_BUTTON)) {
            const import_button = make_import_button("⇧ upload");
            if (import_button) {
                import_button.id = ID_PLUGIN_IMPORT_BUTTON;
                document.body.appendChild(import_button);
            }
        }
    }

    // アプリ設定画面はページを再読み込みせずに画面遷移するため、
    // URLの変化を監視してプラグイン設定画面に入った/離れたタイミングでボタンを付け外しする
    function watchUrlForScriptButtons() {
        let lastHref = location.href;
        const onChange = () => {
            if (location.href === lastHref) return;
            lastHref = location.href;
            insertScriptButtons();
        };
        new MutationObserver(onChange).observe(document, { childList: true, subtree: true });
        window.addEventListener("popstate", onChange);
        window.addEventListener("hashchange", onChange);
    }

    // 現在のURLが渡した正規表現とマッチするかどうかを返す
    // function isMatchURL(regex: string) {
    //     // prettier-ignore
    //     return new RegExp(regex).test(location.href);
    // }



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
        a.download = make_export_filename(pluginId);

        // aタグをDOMに追加してクリックイベントを発火
        document.body.appendChild(a);
        a.click();

        // 使用したURLオブジェクトを解放
        window.URL.revokeObjectURL(url);
    }

    // エクスポートファイル名: {プラグインIDの先頭8文字}-{kintoneのサブドメイン}-{アプリID}.json
    // 例: https://example.cybozu.com/k/admin/app/123/plugin/config?pluginId=abcdefghijk... → abcdefgh-example-123.json
    function make_export_filename(pluginId: string) {
        const subdomain = location.hostname.split(".")[0];
        const appId = location.pathname.match(/\/admin\/app\/(\d+)\//)?.[1]
            ?? new URLSearchParams(location.search).get("app")
            ?? String(kintone.app.getId() ?? "unknown");
        return `${pluginId.substring(0, 8)}-${subdomain}-${appId}.json`;
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
    watchUrlForScriptButtons();



})();

