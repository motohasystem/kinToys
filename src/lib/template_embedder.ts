// kintoneのフィールドコードをプレースホルダとして埋め込んだテンプレートにデータを埋め込む
export class TemplateEmbedder {
    template: string;

    constructor(template: string) {
        this.template = template;
    }

    embedRecords(records: { [key: string]: { value: string } }[], template: string | undefined = undefined) {
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

    embed(record: { [key: string]: { value: string } }, template: string | undefined = undefined) {
        if (template == undefined) {
            template = this.template;
        }
        console.log(`embed!: ${template} / ${record}`)

        let filledTemplate = template;
        for (const key in record) {
            let value = record[key].value;
            // valueが改行を含む場合は\nにエスケープする
            if (typeof value === 'string') {
                value = value.replace(/\n/g, '\\n');
            }

            console.log({ key, value })
            filledTemplate = filledTemplate.replace(`%${key}%`, value);
        }

        console.log({ filledTemplate })
        return filledTemplate;
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
