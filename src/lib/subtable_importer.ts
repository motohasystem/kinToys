import { Utils } from "../utils";

export class SubtableImporter {
    static readonly id_copy_button = "copy-button"; // ID for the copy button

    constructor() {
        // Initialize any properties or state here
    }

    // ボタンに吹き出しを表示する
    showButtonTooltip(id_button: string, message: string) {
        const button = document.getElementById(id_button) as HTMLButtonElement;
        if (!button) return; // ボタンが見つからない場合は終了

        const tooltip = document.createElement("div");
        tooltip.textContent = message;
        tooltip.style.position = "absolute";
        tooltip.style.backgroundColor = "#0a0";
        tooltip.style.color = "#fff";
        tooltip.style.padding = "5px 10px";
        tooltip.style.borderRadius = "5px";
        tooltip.style.fontSize = "12px";
        tooltip.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
        tooltip.style.whiteSpace = "nowrap";
        tooltip.style.zIndex = "1000";
        tooltip.style.transform = "translate(-50%, -100%)";
        tooltip.style.left = "50%";
        tooltip.style.top = "-10px";

        // Add a small triangle (the "horn") to the tooltip
        const triangle = document.createElement("div");
        triangle.style.position = "absolute";
        triangle.style.width = "0";
        triangle.style.height = "0";
        triangle.style.borderLeft = "5px solid transparent";
        triangle.style.borderRight = "5px solid transparent";
        triangle.style.borderTop = "5px solid #0a0";
        triangle.style.top = "100%";
        triangle.style.left = "50%";
        triangle.style.transform = "translateX(-50%)";
        triangle.style.backgroundColor = "transparent";


        tooltip.appendChild(triangle);

        button.style.position = "relative";
        button.appendChild(tooltip);

        setTimeout(() => {
            button.removeChild(tooltip);
        }, 2000);
    }

    // ボタンにクリップボードの中身を表示するツールチップ吹き出しを表示する
    showClipboardTooltip(button: HTMLElement, text: string) {
        if (!button) return; // ボタンが見つからない場合は終了
        const tooltip = document.createElement("div");
        if (this.isCsvOrTsv(text)) {
            tooltip.textContent = text
            tooltip.style.width = "400px"; // Set a fixed width for the tooltip
            tooltip.style.fontSize = "12px";
        }
        else {
            tooltip.textContent = "🤔";
            tooltip.style.fontSize = "24px";
        }

        tooltip.style.position = "absolute";
        tooltip.style.backgroundColor = "#0a0";
        tooltip.style.color = "#fff";
        tooltip.style.padding = "5px 10px";
        tooltip.style.borderRadius = "5px";
        tooltip.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
        tooltip.style.whiteSpace = "pre-wrap"; // Preserve line breaks
        tooltip.style.overflow = "hidden"; // Hide overflowed content
        tooltip.style.textOverflow = "ellipsis"; // Add ellipsis for overflowed text
        tooltip.style.textAlign = "left"; // Align text to the left
        tooltip.style.zIndex = "1000";
        tooltip.style.transform = "translate(-50%, -100%)";
        tooltip.style.left = "50%";
        tooltip.style.top = "-10px";

        // Add a small triangle (the "horn") to the tooltip
        const triangle = document.createElement("div");
        triangle.style.position = "absolute";
        triangle.style.width = "0";
        triangle.style.height = "0";
        triangle.style.borderLeft = "5px solid transparent";
        triangle.style.borderRight = "5px solid transparent";
        triangle.style.borderTop = "5px solid #0a0";
        triangle.style.top = "100%";
        triangle.style.left = "50%";
        triangle.style.transform = "translateX(-50%)";
        triangle.style.backgroundColor = "transparent";

        button.appendChild(tooltip);
    };

    // テキストの内容がcsv形式かtsv形式かを判定する
    isCsvOrTsv(text: string): boolean {
        const lines = text.split("\n");

        if (lines.length === 0) return false; // No lines in the text

        const firstLine = lines[0];
        const delimiter = firstLine.includes(",") ? "," : "\t"; // Determine the delimiter

        for (const line of lines) {
            if (line.trim() === "") continue; // 空行をスキップ
            if (!line.includes(delimiter)) return false; // If a line doesn't contain the delimiter, it's not CSV or TSV
        }

        return true; // All lines contain the same delimiter
    }

    // サブテーブルへのペースト機能を初期化
    initPaste() {
        const C = Utils.Classes; // Constants for DOM node selection

        // .subtable-row-gaia クラスを持った
        // 要素を取得
        const subtableDivElements =
            document.querySelectorAll(C.query_selector_class_subtable) as NodeListOf<HTMLElement>;
        if (!subtableDivElements) return;

        subtableDivElements.forEach((subtableDiv) => {
            const pasteButton = this.addPasteButton(subtableDiv);
            if (pasteButton) {
                const self = this; // Capture the context of 'this'
                pasteButton.addEventListener("click", function () {
                    // クリップボードのデータを取得
                    window.navigator.clipboard
                        .readText()
                        .then((text) => {
                            if (self.isCsvOrTsv(text) === false) {
                                console.error("クリップボードの内容がCSVまたはTSV形式ではありません。");
                                return;
                            }
                            const pastedData = text;
                            const csvDict = self.csvToDict(pastedData);
                            self.addRowWithHeaders(subtableDiv, csvDict);
                        })
                        .catch((error) => {
                            console.error(
                                "Error reading clipboard data:",
                                error
                            );
                        });
                }.bind(this));

                // ホバーすると、ツールチップにクリップボードの中身を表示する
                pasteButton.addEventListener("mouseover", function () {
                    console.log("Mouse over paste button");
                    window.navigator.clipboard.readText().then((text) => {
                        self.showClipboardTooltip(pasteButton, text);
                    }).catch((_error) => {
                        console.error("フォーカスが外れているためクリップボードが読み込めません。");
                    });
                }.bind(this));

                // ホバーが外れたら、ツールチップを消す
                pasteButton.addEventListener("mouseout", function () {
                    console.log("Mouse out of paste button");
                    const tooltip = pasteButton.querySelector("div");
                    if (tooltip) {
                        pasteButton.removeChild(tooltip);
                    }
                }
                    .bind(this));

            } else {
                console.log("Paste button not found.");
            }
        });
    }


    // Convert CSV to a dictionary
    csvToDict(csv: string): { [key: string]: string }[] {
        const lines = csv.split("\n");
        const headers = lines[0].split(",");

        return lines.slice(1).map((line) => {
            if (line.trim() === "") return {}; // Skip empty lines
            const values = line.split(",");
            return headers.reduce((acc: { [key: string]: string }, header, index) => {
                if (header === undefined) return acc; // Skip if header is undefined
                const value = values[index];
                if (value === undefined) return acc; // Skip if value is undefined
                const cleanedValue = value.replace(/"/g, "").trim();
                const cleanedHeader = header.replace(/"/g, "").trim();
                acc[cleanedHeader || header] = cleanedValue;
                console.log("Header:", header, "Value:", cleanedValue); // Debug
                return acc;
            }, {});
        });
    }

    // Add a paste button to elements with the class 'subtable-row-label-gaia'
    addPasteButton(subtableDiv: HTMLElement): HTMLButtonElement | null {
        const table = subtableDiv.querySelector("table");
        if (!table) return null;

        const pasteButton = document.createElement("button");
        pasteButton.textContent = "⬇";
        table.parentNode?.appendChild(pasteButton);

        pasteButton.style.color = "white";
        pasteButton.style.position = "absolute";
        pasteButton.style.right = "0.5em";
        pasteButton.style.bottom = "-1em";
        pasteButton.style.backgroundColor = "#F09200";
        pasteButton.style.border = "1px solid white";
        pasteButton.style.padding = "5px";
        pasteButton.style.cursor = "pointer";
        pasteButton.style.fontSize = "16px";
        pasteButton.style.borderRadius = "5px";
        pasteButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
        pasteButton.style.transition = "background-color 0.3s, transform 0.3s";
        pasteButton.style.userSelect = "none";
        pasteButton.style.pointerEvents = "auto";

        const parent = table.parentNode as HTMLElement;
        parent.style.position = "relative";

        return pasteButton;
    }

    // Add a row with headers to elements with the class 'subtable-row-gaia'
    addRowWithHeaders(subtableRow: HTMLElement, contents: { [key: string]: string }[]): void {
        const C = Utils.Classes; // Constants for DOM node selection
        const headers = this.getHeaders(subtableRow);
        if (!headers) return;

        const table = subtableRow.querySelector("table");
        if (!table) return;

        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        contents.forEach((content) => {
            if (!content || Object.keys(content).length === 0) return; // Skip if content is empty
            const lastTd = tbody.querySelector("tr:last-child td:last-child");
            if (!lastTd) return;

            const addButton = lastTd.querySelector(C.query_selector_add_row_button) as HTMLElement;
            if (!addButton) return;

            addButton.click();

            const lastRow = tbody.querySelector("tr:last-child");
            if (!lastRow) return;

            const cells = lastRow.querySelectorAll("td");
            for (let index = 0; index < headers.length; index++) {
                const headerText = headers[index];
                console.log("Header Text:", headerText, index); // Debug
                const sampleValue = content[headerText];
                if (cells[index]) {
                    const input = cells[index].querySelector("input") as HTMLInputElement;
                    if (input) {
                        input.value = sampleValue || "";
                    }
                }
            }
        });
    }

    // Get headers from a subtable row
    getHeaders(subtableRow: HTMLElement): string[] | undefined {
        const table = subtableRow.querySelector("table");
        if (!table) return;

        const thead = table.querySelector("thead");
        if (!thead) return;

        const headers = Array.from(thead.querySelectorAll("th")).map((th) =>
            th.textContent?.trim() || ""
        );

        return headers;
    }
}