// kintoneのフィールドコードをプレースホルダとして埋め込んだテンプレートにデータを埋め込む
export class TemplateEmbedder {
    template: string;

    constructor(template: string) {
        this.template = template;
    }

    embed(record: { [key: string]: { value: string } }, template: string | undefined = undefined) {
        if (template == undefined) {
            template = this.template;
        }

        console.log({ template })
        let filledTemplate = template;
        for (const key in record) {
            const value = record[key].value;
            console.log({ key, value })
            filledTemplate = filledTemplate.replace(`%${key}%`, value);
        }
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
