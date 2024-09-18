import { Utils } from "../utils";
import { TemplateEmbedder } from "./template_embedder";

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

    embedder: TemplateEmbedder | undefined;
    previousFunction: ((event: HTMLElement) => void) | undefined;

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

        this.dealClicknCopyFunction()
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

        console.log({ radio_cell_record: this.radio_cell_record, radio_csv_tsv: this.radio_csv_tsv, radio_data_template: this.radio_data_template })
    }

    // すべてのtdセルにクリックするとコピーする機能を追加する
    dealClicknCopyFunction = () => {
        if (this.copyTarget == null) {
            return;
        }

        const table = document.querySelector("table");
        if (!table) return;

        // すでにイベントリスナーが設定されている場合は削除する
        if (this.previousFunction !== undefined) {
            table.removeEventListener("click", this.previousFunction as unknown as EventListener);
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

            // カーソル形状を取得する
            var computedStyle = window.getComputedStyle(target);
            var cursorStyle = computedStyle.getPropertyValue('cursor');

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
        table.addEventListener("click", clicknCopyEvent);

        this.previousFunction = clicknCopyEvent;
        console.log({ prev: this.previousFunction });
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
}