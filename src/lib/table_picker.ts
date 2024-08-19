// import { Utils } from "../utils";

export class TablePicker {
    // private tableData: string[][] | undefined;
    outputMode: string;

    constructor(output: 'csv' | 'tsv' | 'json' = 'csv') {
        this.outputMode = output;
        // this.tableData = undefined;
    }


    // 現在表示しているHTMLの中にあるテーブルをピックアップして配列として取得する
    getTableData(): any[] {
        const tables = document.querySelectorAll('table');
        if (tables.length === 0) {
            return [];
        }

        const arrayedTables: string[] = Array.from(tables).map((table) => {
            return this.table_to_array(table)
        }).map((table) => {
            console.log({ mode: this.outputMode })

            // テーブル表示の内容をJSONで取得する
            if (this.outputMode === 'json') {
                return this.convertToJson(table)
            }

            // 2次元配列をテキストに変換する
            return this.convert(table, this.outputMode)
        });

        console.log({ arrayedTables })
        return arrayedTables
    }

    // 2次元配列をテキストに変換する
    convert(table: string[][], mode: string): string {
        if (table.length === 0) {
            return ''
        }

        const delimiter = mode === 'csv' ? ',' : '\t';
        const quote = (str: string) => `"${str}"`;

        const textvalue = table.map((row) => {
            return row.map(cell => quote(cell)).join(delimiter)
        }).join('\n')

        return textvalue
    }

    // テーブル表示の内容をJSONで取得する
    convertToJson(table: string[][]): string {
        console.log('convertToJson')
        if (table.length === 0) {
            return ''
        }

        const header = table[0]
        const body = table.slice(1)

        const json = body.map((row) => {
            const obj: { [key: string]: string } = {}
            row.forEach((value, index) => {
                obj[header[index]] = value
            })
            return obj
        })

        return JSON.stringify(json, null, 2)
    }


    // テーブルを配列に変換する
    table_to_array(table: HTMLTableElement): string[][] {

        const tableData: string[][] = [];

        // まずはヘッダ
        const headers = table.tHead
        console.log({ headers })
        if (headers) {
            const headerCols = headers.querySelectorAll("th");
            const headerRowData: string[] = [];

            headerCols.forEach(function (col, index) {
                // 最後の1列は無視する
                if (index === headerCols.length - 1) {
                    return
                }

                const text = col.textContent
                if (text) {
                    headerRowData.push(text);
                }
            });
            tableData.push(headerRowData);
        }

        // 続いて本体
        Array.from(table.rows).forEach(function (row) {
            const cols = row.querySelectorAll("td, th");
            const csvRow: string[] = [];

            cols.forEach(function (col, index) {
                // 最後の1列は無視する
                if (index === cols.length - 1) {
                    return
                }

                const text = col.textContent
                if (text) {
                    csvRow.push(text);
                }
            });

            tableData.push(csvRow);
        });

        // ヘッダ行のみの場合は空にする
        if (tableData.length < 2) {
            console.log('tableData is empty')
            return []
        }

        return tableData
    }

}
