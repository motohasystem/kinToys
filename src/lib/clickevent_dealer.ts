import { Utils } from "../utils";
import { TemplateEmbedder } from "./template_embedder";

// 詳細画面のフィールド値コピーで対象外にするフィールドタイプ（値が無い/別扱い）
// link・file はクリック遷移やダウンロードを優先するため除外（今回のスコープ A+B+E）
const DETAIL_EXCLUDE_TYPES = new Set(["label", "hr", "spacer", "file", "link", "reference_table", "subtable"]);
// 複数値フィールド（各値を区切って結合する必要がある）
const DETAIL_MULTI_VALUE_TYPES = new Set(["check_box", "multiple_select", "user_select", "organization_select", "group_select"]);
// 詳細画面のフィールドタイプをラッパのクラス名から判定する（例: control-single_line_text-field-gaia → single_line_text）
const DETAIL_FIELD_TYPE_RE = /control-([a-z_]+)-field-gaia/;

// 画面内のDOMにクリックイベントを配布するクラス
export class ClickEventDealer {
    copyTarget: string;
    options: { [key: string]: string; } | undefined;
    // previousFunction: EventListener | undefined;
    prevInterval: number | undefined;
    prevTd: HTMLElement | undefined;

    radio_cell_record: "cell" | "row" | "record" | "link" = "record";
    radio_csv_tsv: "csv" | "tsv" = "csv";
    radio_data_template: "data" | "template" | "json" = "data";
    checkbox_on_off: "enabled" | "disabled" = "enabled";
    enable_break_multiline: boolean = false;

    embedder: TemplateEmbedder | undefined;
    previousFunction: ((event: HTMLElement) => void) | undefined;
    detailFieldClickHandler: ((event: MouseEvent) => void) | undefined;   // 詳細画面フィールド値コピーのリスナー

    clickTimer: number | null = null;

    // クリックイベントを配布する対象の要素を指定してインスタンスを生成
    constructor(copyTarget: "cell" | "record" | "template" = "record") {
        this.copyTarget = copyTarget;
    }

    // クリックイベントを配布する
    deal(options: { [key: string]: string; } | undefined = undefined) {
        console.log('deal')
        this.setOptions(options)
        // this.options = options

        this.dealClicknCopyFunction()   // クリックイベントの配布（一覧/詳細のテーブル）
        this.dealDetailFieldClick()     // 詳細画面のテーブル外フィールド値コピー
        this.dealBreakMultilineStyle()  // マルチラインのセルのスタイルを変更
    }

    setTemplateEmbedder(embedder: TemplateEmbedder) {
        this.embedder = embedder
    }

    setOptions(opt: { [key: string]: string; } | undefined) {
        if (opt == undefined) return;

        console.log({ setOptions: opt })

        if ('radio_cell_record' in opt && opt['radio_cell_record'] != null) {
            this.radio_cell_record = opt['radio_cell_record'] as "cell" | "row" | "record" | "link";
            this.copyTarget = this.radio_cell_record;
        }

        if ('radio_csv_tsv' in opt && opt['radio_csv_tsv'] != null) {
            this.radio_csv_tsv = opt['radio_csv_tsv'] as "csv" | "tsv";
        }

        if ('radio_data_template' in opt && opt['radio_data_template'] != null) {
            this.radio_data_template = opt['radio_data_template'] as "data" | "template" | "json";
        }

        // 機能有効化チェックボックスの状態を設定する
        if ('checkbox_on_off' in opt && opt['checkbox_on_off'] != null) {
            this.checkbox_on_off = opt['checkbox_on_off'] as "enabled" | "disabled";
        }

        // 複数行文字列の改行スタイルを有効化する
        if ('enable_break_multiline' in opt && opt['enable_break_multiline'] != null) {
            this.enable_break_multiline = opt['enable_break_multiline'] === "true";
        }

        console.log({ radio_cell_record: this.radio_cell_record, radio_csv_tsv: this.radio_csv_tsv, radio_data_template: this.radio_data_template })
    }

    // すべてのtdセルにクリックするとコピーする機能を追加する
    dealClicknCopyFunction = () => {
        if (this.copyTarget == null) {
            return;
        }

        // クリックイベントは document.body に委譲する。
        // 初期表示後に非同期でレンダリングされるテーブル（関連レコード一覧など）にも、
        // 再バインドなしで対応できる（テーブルが存在するタイミングに依存しない）。
        const container = document.body;
        if (!container) return;

        // すでに登録済みのリスナーがあれば外す
        if (this.previousFunction !== undefined) {
            container.removeEventListener("click", this.previousFunction as unknown as EventListener);
            this.previousFunction = undefined;
        }

        // 機能オンオフチェックボックスがオフの場合はクリックイベントを配布せずに終了する
        if (this.checkbox_on_off == "disabled") {
            return;
        }

        const copyClickTarget = ((target: string) => {
            if (target == "cell") {
                return this._copyClickedCell;
            } else if (target == "row") {
                return this._copyClickedRow.bind(this);
            } else if (target == "record") {
                return this._copyClickedRecord;
            } else if (target == "link") {
                return this._copyClickedRecordLink;
            }
            throw new Error(`Invalid argument: ${target}`);
        })(this.copyTarget);

        // クリックイベントを定義する
        const clicknCopyEvent = (event: any) => {
            // console.log(JSON.stringify(event))
            let target = event.target as HTMLElement | null;
            // console.log({ target })
            if (target == null) return;

            // body への委譲のため、テーブル外のクリックは対象外とする
            if (target.closest("table") == null) return;

            // カーソル形状を取得する
            var computedStyle = window.getComputedStyle(target);
            var cursorStyle = computedStyle.getPropertyValue('cursor');


            // クリックされた要素を含むTRノードを取得し、編集モードかどうかを判定する。編集モードであればコピーの処理を行わない
            if (target && target.tagName.toLowerCase() !== "tr") {
                let target_tr: HTMLElement | null = null;
                let parent = target.parentElement;
                if (parent?.tagName.toLowerCase() === "tr") {
                    if (parent !== null && parent.nextElementSibling && parent.nextElementSibling.classList.contains("recordlist-row-gaia__contextbar")) {
                        console.log("編集モードを検出しました。")
                        return;
                    }
                }

                while (parent && parent.tagName.toLowerCase() !== "tr") {
                    parent = parent.parentElement;
                    if (parent?.tagName.toLowerCase() === "tr") {
                        target_tr = parent;
                        if (target_tr !== null && target_tr.nextElementSibling && target_tr.nextElementSibling.classList.contains("recordlist-row-gaia__contextbar")) {
                            console.log("編集モードを検出しました。")
                            return;
                        }
                    }
                    else if (parent?.tagName.toLowerCase() === "tbody") {
                        target_tr = null;
                        break;
                    }
                }
            }

            // クリックされた要素から親要素に遡る
            while (target) {

                // tdタグが見つかった場合
                if (target.tagName.toLowerCase() === "td") {

                    console.log('クリック時のカーソル形状:', cursorStyle);

                    // kintoneの一覧画面上のダブルクリックと共存させる
                    if (this.clickTimer === null) {
                        const click_target = target as HTMLElement;
                        this.clickTimer = setTimeout(() => {
                            // シングルクリックの処理
                            console.log('シングルクリック');
                            if (click_target.textContent !== "" || this.copyTarget !== "cell") {
                                // カーソルがpointerのときはリンクをクリックしていると推測されるため、コピーしない
                                if (cursorStyle !== "pointer") {
                                    copyClickTarget(click_target);
                                }
                            }

                            this.clickTimer = null;
                        }, 300);
                    } else {
                        clearTimeout(this.clickTimer);
                        this.clickTimer = null;
                        console.log('ダブルクリック');
                    }

                    break;
                }
                target = target.parentElement;
            }

        };

        container.addEventListener("click", clicknCopyEvent);
        this.previousFunction = clicknCopyEvent;
        console.log({ prev: this.previousFunction });
    }

    // 詳細画面で、テーブル外のフィールドをクリックしたら値をそのままコピーする
    dealDetailFieldClick = () => {
        const container = document.body;

        // すでに登録済みのリスナーがあれば外す（再バインドのため）
        if (this.detailFieldClickHandler) {
            container.removeEventListener("click", this.detailFieldClickHandler);
            this.detailFieldClickHandler = undefined;
        }

        // 詳細画面以外、または機能オフのときは登録しない
        if (Utils.whereAmI(location.href) !== Utils.PageCategory.detail) return;
        if (this.checkbox_on_off === "disabled") return;

        const handler = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target == null) return;

            // テーブル内（サブテーブル/関連レコード一覧）のクリックはテーブル用ハンドラに任せる
            if (target.closest("table")) return;

            // フィールドの値コンテナを特定する
            const valueEl = target.closest(".control-value-gaia") as HTMLElement | null;
            if (valueEl == null) return;

            // リンク・ボタン等の操作要素は遷移/操作を優先し、コピー対象外とする
            if (target.closest("a, button, input, textarea, select")) return;
            if (window.getComputedStyle(target).cursor === "pointer") return;

            // フィールドラッパのクラス名から型を判定
            const wrapper = valueEl.closest(".control-gaia") as HTMLElement | null;
            const fieldType = this._detectDetailFieldType(wrapper);

            // 値の無い型・別扱いの型は対象外
            if (fieldType && DETAIL_EXCLUDE_TYPES.has(fieldType)) return;

            const text = this._extractDetailFieldValue(valueEl, fieldType);
            if (text == null || text === "") return;

            navigator.clipboard.writeText(text)
                .then(() => {
                    this._flashElement(valueEl);
                    console.log(`Copied field value! [${text}]`);
                })
                .catch((err) => {
                    console.error("Failed to copy: ", err);
                });
        };

        container.addEventListener("click", handler);
        this.detailFieldClickHandler = handler;
    }

    // フィールドラッパのクラス名（control-<type>-field-gaia）から型名を取り出す
    _detectDetailFieldType(wrapper: HTMLElement | null): string | undefined {
        if (wrapper == null) return undefined;
        const matched = wrapper.className.match(DETAIL_FIELD_TYPE_RE);
        return matched ? matched[1] : undefined;
    }

    // フィールドの値コンテナから、型に応じて文字列値を取り出す（DOMのtextContentベース）
    _extractDetailFieldValue(valueEl: HTMLElement, fieldType: string | undefined): string {
        // 複数値フィールドは各値要素を区切って結合する
        if (fieldType && DETAIL_MULTI_VALUE_TYPES.has(fieldType)) {
            const items = Array.from(valueEl.children)
                .map((el) => (el.textContent ?? "").trim())
                .filter((t) => t !== "");
            if (items.length > 0) {
                return items.join(", ");
            }
        }
        // 単一値・複数行・リッチテキスト等は textContent をそのまま（改行は保持）
        return (valueEl.textContent ?? "").trim();
    }

    // コピー時に要素の背景をアクセントカラーにして、フィールド本来の背景色へフェードさせる。
    // 詳細画面のフィールドは白以外の背景色を持つため、透明へフェードすると本来の色との差でちぐはぐに見える。
    // そこで実際に見えている背景色（透明なら親を遡って取得）を終端色として補間する。
    _flashElement = (el: HTMLElement) => {
        const originalInline = el.style.backgroundColor;
        const [ar, ag, ab] = Utils.CONST.accent_color_dec.split(",").map((n) => parseInt(n.trim(), 10));
        const base = this._effectiveBackgroundColor(el);

        let t = 0; // 0 = アクセントカラー, 1 = 本来の背景色
        el.style.backgroundColor = `rgb(${ar}, ${ag}, ${ab})`;
        const timer = setInterval(() => {
            t += 0.1;
            if (t >= 1) {
                clearInterval(timer);
                el.style.backgroundColor = originalInline; // インライン指定を戻し、CSS本来の背景へ復帰
            } else {
                const r = Math.round(ar + (base.r - ar) * t);
                const g = Math.round(ag + (base.g - ag) * t);
                const b = Math.round(ab + (base.b - ab) * t);
                el.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
        }, 50);
    }

    // 要素に実際に見えている背景色を返す。透明な場合は親を遡り、見つからなければ白を返す。
    _effectiveBackgroundColor(el: HTMLElement | null): { r: number; g: number; b: number } {
        let node: HTMLElement | null = el;
        while (node) {
            const parsed = this._parseRgb(window.getComputedStyle(node).backgroundColor);
            if (parsed && parsed.a > 0) {
                return { r: parsed.r, g: parsed.g, b: parsed.b };
            }
            node = node.parentElement;
        }
        return { r: 255, g: 255, b: 255 };
    }

    // "rgb(r, g, b)" / "rgba(r, g, b, a)" 形式の文字列をパースする
    _parseRgb(color: string): { r: number; g: number; b: number; a: number } | null {
        const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
        if (!m) return null;
        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    }

    _copyClickedCell = (td: HTMLElement) => {
        // const td = event.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const text = td.textContent;
        if (text === null) return;
        navigator.clipboard
            .writeText(text)
            .then(() => {
                // 背景セルを一瞬緑色にする
                td.style.backgroundColor = Utils.CONST.accent_color;

                // すでにインターバルタイマーがセットされていれば削除する
                if (this.prevInterval !== undefined) {
                    clearInterval(this.prevInterval);
                    this.prevInterval = undefined;
                }

                if (this.prevTd !== undefined) {
                    this.prevTd.style.backgroundColor = "";
                    this.prevTd = undefined;
                }

                // 背景色をフェードアウトで消していく
                let opacity = 1;
                this.prevTd = td;
                this.prevInterval = setInterval(() => {
                    if (opacity <= 0) {
                        clearInterval(this.prevInterval);
                        this.prevInterval = undefined;
                        td.style.backgroundColor = "";
                    } else {
                        opacity -= 0.1;
                        td.style.backgroundColor = `rgba(${Utils.CONST.accent_color_dec}, ${opacity})`;
                    }
                }, 100);
                console.log(`Copied! [${text}]`);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    }

    // クリックしたtdセルの行の一覧画面上のデータをコピーする
    _copyClickedRow(td: HTMLElement) {
        console.log({ 'this.radio_csv_tsv': this.radio_csv_tsv })
        const delimiter = this.radio_csv_tsv == "csv" ? "," : "\t";

        // const td = td.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const tr = td.parentElement;
        if (tr === null) return;

        // 現在のページ種類
        const currentPage = Utils.whereAmI(location.href);

        const isCopyTarget = (tr: HTMLElement, index: number) => {
            switch (currentPage) {
                case Utils.PageCategory.report:
                    return index !== tr.children.length - 1
                default:
                    return index !== 0 && index !== tr.children.length - 1
            }
        }

        const text = Array.from(tr.children)
            .filter((_td, index) => isCopyTarget(tr, index))    // 先頭のレコードアイコンと、末尾の編集・削除アイコンを除く
            .map((td) => Utils.quote(td.textContent))
            .join(delimiter);
        navigator.clipboard
            .writeText(text)
            .then(() => {
                // 背景セルを一瞬緑色にする
                // tr.style.backgroundColor = "lightgreen";
                // trの子のtdの背景色を変える
                // const length = tr.children.length;
                Array.from(tr.children).forEach((td, index) => {
                    if (isCopyTarget(tr, index)) {
                        (td as HTMLTableCellElement).style.backgroundColor = Utils.CONST.accent_color;
                    }
                });

                // 背景色をフェードアウトで消していく
                Array.from(tr.children).forEach((td, index) => {
                    if (isCopyTarget(tr, index)) {
                        let opacity = 1;
                        const fadeOut = setInterval(() => {
                            if (opacity <= 0) {
                                clearInterval(fadeOut);
                                (td as HTMLTableCellElement).style.backgroundColor = "";
                            } else {
                                opacity -= 0.1;
                                (td as HTMLTableCellElement).style.backgroundColor = `rgba(${Utils.CONST.accent_color_dec}, ${opacity})`;
                            }
                        }, 50);
                    }
                });
                console.log(`Copied! [${text}]`);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    }

    // クリックしたtdセルに対応するレコードをテンプレートまたはデータでコピーする
    _copyClickedRecord = (td: HTMLElement) => {
        console.log({ event: td })
        // const td = td.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const tr = td.parentElement as HTMLTableRowElement;
        if (tr === null) return;
        this._makeRecordTextFromTrElement(tr)
    }

    // TR要素からレコードテキストを生成する
    _makeRecordTextFromTrElement(tr: HTMLTableRowElement) {

        // 子のtd要素のうち先頭に含まれるanchorからhrefを取得する
        const anchor = tr.querySelector("td a");
        const href = anchor ? anchor.getAttribute("href") : "";

        // https://monosus-dev.cybozu.com/k/479/show#record=8&l.sort_0=f2178&l.order_0=asc&l.qs=1&l.view=2189&l.q&l.next=7&l.prev=0

        // hrefからrecord=\d+を取得する
        const recordId = href ? href.match(/record=(\d+)/) : null;

        // レコードIDが取得できなかった場合は空文字を返す
        if (recordId == null) {
            return "";
        }

        // アプリID
        const appid = kintone.app.getId()

        // アプリIDとレコードIDでkintone REST APIを呼び出してレコード情報を取得する
        kintone.api('/k/v1/record', 'GET', { app: appid, id: recordId[1] },
            (resp: any) => {
                console.log({ resp })
                if (resp.record == null) {
                    return "";
                }

                if (this.embedder == undefined) {
                    throw new Error("TemplateEmbedder is not set.")
                }

                // レコード情報を埋め込む
                const record = resp.record;
                let text = "";
                if (this.radio_data_template == "data") {
                    console.log({ 'this.radio_csv_tsv': this.radio_csv_tsv })
                    text = this.embedder.alignment(record, this.radio_csv_tsv);
                } else if (this.radio_data_template == "template") {
                    text = this.embedder.embed(record);
                } else if (this.radio_data_template == "json") {
                    text = JSON.stringify(record, null, 2);
                }
                console.log({ text })

                // クリップボードにコピーする
                navigator.clipboard
                    .writeText(text)
                    .then(() => {
                        // 背景セルを一瞬緑色のストライプにする
                        tr.classList.add("stripe-background")
                        setTimeout(() => {
                            // tr.style.backgroundColor = "";
                            tr.classList.remove("stripe-background")
                        }, 1000);

                        console.log(`Copied![${text}]`);
                    })
                    .catch((err) => {
                        console.error("Failed to copy: ", err);
                    });
            },
            (error: any) => {
                console.error({ 'kintone rest api error': error })
            }
        );
    }


    // クリックした行に対応するレコードのURLをコピーする
    _copyClickedRecordLink = (td: HTMLElement) => {
        console.log({ event: td })
        // const td = td.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const tr = td.parentElement as HTMLTableRowElement;
        if (tr === null) return;

        // 子のtd要素のうち先頭に含まれるanchorからhrefを取得する
        const anchor = tr.querySelector("td a");
        const href = anchor ? anchor.getAttribute("href") : "";

        // https://monosus-dev.cybozu.com/k/479/show#record=8&l.sort_0=f2178&l.order_0=asc&l.qs=1&l.view=2189&l.q&l.next=7&l.prev=0

        // hrefからrecord=\d+を取得する
        const recordId = href ? href.match(/record=(\d+)/) : null;

        // レコードIDが取得できなかった場合は空文字を返す
        if (recordId == null) {
            return "";
        }

        // アプリID
        const appid = kintone.app.getId()

        // https://monosus-dev.cybozu.com/k/479/show#record=8 を構築する
        const url = `https://${location.hostname}/k/${appid}/show#record=${recordId[1]}`
        console.log({ url })

        // クリップボードにコピーする
        navigator.clipboard
            .writeText(url)
            .then(() => {
                // 業の文字色を一瞬青色にしてアンダーラインをいれる
                tr.style.color = "blue";
                tr.style.textDecoration = "underline";

                // 1秒で元に戻す
                setTimeout(() => {
                    tr.style.color = "";
                    tr.style.textDecoration = "";
                }, 1000);


                console.log(`Copied![${url}]`);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });

    }

    // マルチラインのセルのスタイルを変更する
    dealBreakMultilineStyle() {
        console.log({ 'enable_break_multiline': this.enable_break_multiline })
        if (this.enable_break_multiline == false) return;

        // テーブルの行に対して、複数行文字列を改行して表示するスタイルを当てる
        const table = document.querySelector("table");
        if (!table) return;

        // テーブルのすべての行にスタイルを適用
        // class="recordlist-multiple_line_text-gaia" が付与されているセルの中にあるspan要素に対してスタイルを適用する
        const rows = table.querySelectorAll("tr");
        rows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            cells.forEach((cell) => {
                if (cell.classList.contains(Utils.CONST.class_multiline_text) || cell.classList.contains(Utils.CONST.class_singleline_text)) {
                    const span = cell.querySelector("span");
                    if (span) {
                        span.style.whiteSpace = "pre-line";
                    }
                }
            });
        });

    }
}