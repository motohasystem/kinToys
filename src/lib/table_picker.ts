export class TablePicker {
    // private tableData: string[][] | undefined;
    outputMode: string;

    constructor(output: 'csv' | 'tsv' = 'csv') {
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

        const textvalue = table.map((row) => {
            return row.join(delimiter)
        }).join('\n')

        return textvalue
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
