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
}
