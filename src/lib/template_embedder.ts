// kintoneのフィールドコードをプレースホルダとして埋め込んだテンプレートにデータを埋め込む

export type Record = { [key: string]: { value: string } };

export class TemplateEmbedder {
    template: string;

    constructor(template: string) {
        this.template = template;
    }

    embedRecords(records: Record[], template: string | undefined = undefined) {
        if (template == undefined) {
            template = this.template;
        }

        const embeds = records.map((record) => {
            const embedded = this.embed(record, template);
            console.log({ embedded })
            return embedded
        });

        return embeds;
    }

    embed(record: Record, template: string | undefined = undefined) {
        if (template == undefined) {
            template = this.template;
        }
        console.log(`embed!: ${template} / ${record}`)

        let filledTemplate = template;
        for (const key in record) {
            let value = record[key].value;

            // valueが配列の場合、%PLACEHOLDER{ で始まり、}%でおわる複数行のテンプレートに対応する
            if (Array.isArray(value)) {
                filledTemplate = this.fillArrayTemplate(filledTemplate, key, value);
            }
            // valueが改行を含む場合は\nにエスケープする
            else if (typeof value === 'string') {
                value = value.replace(/\n/g, '\\n');

                // 通常は %PLACEHOLDER% という改行を含まないプレースホルダを置換する
                filledTemplate = filledTemplate.replace(`%${key}%`, value);
            }

            // console.log({ key, value })

        }

        console.log({ filledTemplate })
        return filledTemplate;
    }

    // %PLACEHOLDER{ で始まり、}%でおわる複数行のテンプレートに対応する
    fillArrayTemplate(template: string, key: string, subRows: { id: string, value: Record }[]) {
        console.log("--- fillArrayTemplate")
        const start = `%${key}{`;
        const end = `}%`;

        const startIndex = template.indexOf(start);
        const endIndex = template.indexOf(end, startIndex);

        if (startIndex == -1 || endIndex == -1) {
            return template;
        }

        const prefix = template.slice(0, startIndex);
        const suffix = template.slice(endIndex + end.length);
        const subtable_placeholder = template.slice(startIndex + start.length, endIndex);

        console.log({ subRows: subRows })
        const filledTemplate = subRows.map((subRow) => {
            console.log({ subRow })
            console.log({ value: subRow.value })
            const keys = Object.keys(subRow.value);
            return keys.reduce((table_template, key: string) => {
                console.log({ key })
                const cell_text = subRow.value[key].value
                return table_template.replace(`%${key}%`, cell_text)
            }, subtable_placeholder)
        }).join('');

        return prefix + filledTemplate + suffix;
    }

    // kintoneレコードをcsvまたはtsvの形に整形する
    alignment(record: { [key: string]: { value: string } }, mode: 'tsv' | 'csv' = 'csv') {
        const delimtier = mode == 'csv' ? ',' : '\t';

        // レコードのキーをカンマ区切りまたはタブ区切りにする
        const header = Object.keys(record).join(delimtier);


        // レコードの値をカンマ区切りまたはタブ区切りにする
        let row = [];
        for (const key in record) {
            const value = record[key].value;
            row.push(value);
        }

        const result = header + '\n' + row.join(delimtier);

        return result;
    }
}
