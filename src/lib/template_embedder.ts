// kintoneのフィールドコードをプレースホルダとして埋め込んだテンプレートにデータを埋め込む
export class TemplateEmbedder {
    template: string;

    constructor(template: string) {
        this.template = template;
    }

    embed(template: string, record: { [key: string]: { value: string } }) {
        let filledTemplate = template;
        for (const key in record) {
            const value = record[key].value;
            filledTemplate = filledTemplate.replace(`%${key}%`, value);
        }
        return filledTemplate;
    }

    // kintoneレコードをcsvまたはtsvの形に整形する
    alignment(record: { [key: string]: { value: string } }, mode: 'tsv' | 'csv' = 'csv') {
        let result = "";
        if (mode == 'csv') {
            for (const key in record) {
                const value = record[key].value;
                result += value + ",";
            }
            result = result.slice(0, -1);
        }
        else if (mode == 'tsv') {
            for (const key in record) {
                const value = record[key].value;
                result += value + "\t";
            }
            result = result.slice(0, -1);
        }
        return result;
    }
}
