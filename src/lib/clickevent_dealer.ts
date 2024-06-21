import { TemplateEmbedder } from "./template_embedder";

// 画面内のDOMにクリックイベントを配布するクラス
export class ClickEventDealer {
    copyTarget: string;
    options: { [key: string]: string; } | undefined;
    previousFunction: ((this: HTMLTableCellElement, ev: MouseEvent) => any) | undefined;

    radio_cell_record: "cell" | "row" | "record" = "record";
    radio_csv_tsv: "csv" | "tsv" = "csv";
    radio_data_template: "data" | "template" = "data";
    embedder: TemplateEmbedder | undefined;

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
            this.radio_cell_record = opt['radio_cell_record'] as "cell" | "row" | "record";
            this.copyTarget = this.radio_cell_record;
        }

        if ('radio_csv_tsv' in opt && opt['radio_csv_tsv'] != null) {
            this.radio_csv_tsv = opt['radio_csv_tsv'] as "csv" | "tsv";
        }

        if ('radio_data_template' in opt && opt['radio_data_template'] != null) {
            this.radio_data_template = opt['radio_data_template'] as "data" | "template";
        }

        console.log({ radio_cell_record: this.radio_cell_record, radio_csv_tsv: this.radio_csv_tsv, radio_data_template: this.radio_data_template })
    }

    // すべてのtdセルにクリックするとコピーする機能を追加する
    dealClicknCopyFunction = () => {
        if (this.copyTarget == null) {
            return;
        }

        // すべてのtdセルを取得
        const tdList = document.querySelectorAll("td");
        console.log({ prev: this.previousFunction })

        tdList.forEach((td) => {
            if (this.previousFunction !== undefined) {
                td.removeEventListener("click", this.previousFunction)
            }
        });

        const copyClickTarget = ((target: string) => {

            if (target == "cell") {
                return this._copyClickedCell;
            } else if (target == "row") {
                return this._copyClickedRow.bind(this);
            } else if (target == "record") {
                return this._copyClickedRecord;
            }

            throw new Error(`Invalid argument: ${target}`);

        })(this.copyTarget)

        // すべてのtdセルにクリックするとコピーする機能を追加する
        tdList.forEach((td) => {
            // クリップボードを空にしないため、テキストが空欄のセルは対象外
            if (td.textContent === "") return;
            td.addEventListener("click", copyClickTarget);
        });
        this.previousFunction = copyClickTarget
        console.log({ prev: this.previousFunction })

    }

    _copyClickedCell = (event: Event) => {
        const td = event.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const text = td.textContent;
        if (text === null) return;
        navigator.clipboard
            .writeText(text)
            .then(() => {
                // 背景セルを一瞬緑色にする
                td.style.backgroundColor = "lightgreen";

                setTimeout(() => {
                    td.style.backgroundColor = "";
                }, 1000);
                console.log(`Copied! [${text}]`);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    }

    // クリックしたtdセルの行の一覧画面上のデータをコピーする
    _copyClickedRow(event: Event) {
        console.log({ 'this.radio_csv_tsv': this.radio_csv_tsv })
        const delimiter = this.radio_csv_tsv == "csv" ? "," : "\t";

        const td = event.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const tr = td.parentElement;
        if (tr === null) return;
        const text = Array.from(tr.children)
            .filter((_td, index) => index !== 0 && index !== tr.children.length - 1)    // 先頭のレコードアイコンと、末尾の編集・削除アイコンを除く
            .map((td) => td.textContent)
            .join(delimiter);
        navigator.clipboard
            .writeText(text)
            .then(() => {
                // 背景セルを一瞬緑色にする
                // tr.style.backgroundColor = "lightgreen";
                // trの子のtdの背景色を変える
                const length = tr.children.length;
                Array.from(tr.children).forEach((td, index) => {
                    if (index !== 0 && index !== length - 1) {
                        (td as HTMLTableCellElement).style.backgroundColor = "lightgreen";
                    }
                });

                setTimeout(() => {
                    Array.from(tr.children).forEach((td, index) => {
                        if (index !== 0 && index !== length - 1) {
                            (td as HTMLTableCellElement).style.backgroundColor = "";
                        }
                    });
                }, 1000);
                console.log(`Copied! [${text}]`);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    }

    // クリックしたtdセルに対応するレコードをテンプレートまたはデータでコピーする
    _copyClickedRecord = (event: Event) => {
        console.log({ event })
        const td = event.currentTarget as HTMLTableCellElement;
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
                }

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
}