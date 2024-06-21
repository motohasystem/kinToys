// 画面内のDOMにクリックイベントを配布するクラス
export class ClickEventDealer {
    copyTarget: string;
    options: { [key: string]: string; } | undefined;
    previousFunction: ((this: HTMLTableCellElement, ev: MouseEvent) => any) | undefined;

    radio_cell_record: "cell" | "row" | "record" = "record";
    radio_csv_tsv: "csv" | "tsv" = "csv";
    radio_data_template: "data" | "template" = "data";

    // クリックイベントを配布する対象の要素を指定してインスタンスを生成
    constructor(copyTarget: "cell" | "record" | "template" = "record") {
        this.copyTarget = copyTarget;
    }

    // クリックイベントを配布する
    deal(options: { [key: string]: string; } | undefined = undefined) {
        console.log('deal')
        this.setOptions(options)
        this.options = options

        this.dealClicknCopyFunction()
    }

    setOptions(opt: { [key: string]: string; } | undefined) {
        if (opt == undefined) return;

        if ('radio_cell_record' in opt) {
            this.radio_cell_record = opt['radio_cell_record'] as "cell" | "row" | "record";
            this.copyTarget = this.radio_cell_record;
        }

        if ('radio_csv_tsv' in opt) {
            this.radio_csv_tsv = opt['radio_csv_tsv'] as "csv" | "tsv";
        }

        if ('radio_data_template' in opt) {
            this.radio_data_template = opt['radio_data_template'] as "data" | "template";
        }

    }

    // すべてのtdセルにクリックするとコピーする機能を追加する
    dealClicknCopyFunction() {
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
                return this._copyClickedRecord;
            } else if (target == "record") {
                return this._copyClickedTemplate;
            }

            throw new Error(`Invalid argument: ${target}`);

        })(this.copyTarget)

        // すべてのtdセルにクリックするとコピーする機能を追加する
        tdList.forEach((td) => {
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

    // クリックしたtdセルの行をコピーする
    _copyClickedRecord(event: Event) {
        const td = event.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const tr = td.parentElement;
        if (tr === null) return;
        const text = Array.from(tr.children)
            .map((td) => td.textContent)
            .join("\t");
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
    _copyClickedTemplate(event: Event) {
        const td = event.currentTarget as HTMLTableCellElement;
        // クリップボードにコピーする
        const tr = td.parentElement;
        if (tr === null) return;
        const text = Array.from(tr.children)
            .map((td) => td.textContent)
            .join("\t");
        navigator.clipboard
            .writeText(text)
            .then(() => {
                // 背景セルを一瞬緑色のストライプにする
                tr.classList.add("stripe-background")

                setTimeout(() => {
                    // tr.style.backgroundColor = "";
                    tr.classList.remove("stripe-background")
                }, 1000);
                console.log(`Copied! [${text}]`);
            })
            .catch((err) => {
                console.error("Failed to copy: ", err);
            });
    }


}


