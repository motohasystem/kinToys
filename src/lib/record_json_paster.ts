// 詳細画面でコピーしたレコードJSON（kintone.app.record.get().record 形式）を、
// 別アプリの追加/編集画面にペーストする。
// フィールドコードとフィールドタイプが一致するフィールドだけを書き換える。

type FieldValue = { type?: string; value: any; [key: string]: any };
type RecordData = { [code: string]: FieldValue };
type FieldProperty = { type: string; code: string; options?: { [label: string]: any }; lookup?: any; fields?: { [code: string]: FieldProperty } };
type FieldProperties = { [code: string]: FieldProperty };

export type PasteResult = {
    status: "ok" | "invalid_json" | "no_match" | "not_form_page";
    pasted: PasteField[];   // 貼り付けるフィールド
    skipped: PasteField[];  // コード/タイプ不一致などで貼り付けないフィールド
};

export type PasteField = { code: string; type: string };  // type は貼り付け元のフィールドタイプ

export class RecordJsonPaster {
    // kintone.app.record.set で値を書き込めない（または書き込むべきでない）フィールドタイプ
    static readonly UNSETTABLE_TYPES = new Set([
        "RECORD_NUMBER", "__ID__", "__REVISION__",
        "CREATOR", "CREATED_TIME", "MODIFIER", "UPDATED_TIME",
        "CALC", "STATUS", "STATUS_ASSIGNEE", "CATEGORY",
        "FILE",  // fileKey はアプリ間で再利用できない
        "REFERENCE_TABLE", "GROUP", "LABEL", "SPACER", "HR",
    ]);

    // 選択肢を持つフィールドタイプ（貼り付け先に存在しない選択肢は除外する）
    static readonly SINGLE_OPTION_TYPES = new Set(["DROP_DOWN", "RADIO_BUTTON"]);
    static readonly MULTI_OPTION_TYPES = new Set(["CHECK_BOX", "MULTI_SELECT"]);

    // 貼り付け対象・スキップ対象を洗い出す（画面は書き換えない）
    async preview(text: string): Promise<PasteResult> {
        const { result } = await this.prepare(text);
        return result;
    }

    // 貼り付け対象のフィールドを画面に反映する。excluded のフィールドコードは貼り付けない。
    async apply(text: string, excluded: string[] = []): Promise<PasteResult> {
        const { result, record } = await this.prepare(text);
        if (result.status !== "ok" || record == null) return result;

        for (const code of excluded) {
            delete record[code];
        }
        const pasted = result.pasted.filter((f) => !excluded.includes(f.code));
        if (pasted.length === 0) {
            return { ...result, status: "no_match", pasted };
        }
        kintone.app.record.set({ record } as any);
        return { ...result, pasted };
    }

    private async prepare(text: string): Promise<{ result: PasteResult; record?: RecordData }> {
        const source = this.parseRecordJson(text);
        if (source == null) {
            return { result: { status: "invalid_json", pasted: [], skipped: [] } };
        }

        const target = kintone.app.record.get() as { record: RecordData } | null;
        if (target == null) {
            return { result: { status: "not_form_page", pasted: [], skipped: [] } };
        }

        const properties = await this.fetchFieldProperties();
        const { record, pasted, skipped } = this.merge(source, target.record, properties);
        const status = pasted.length === 0 ? "no_match" : "ok";
        return { result: { status, pasted, skipped }, record };
    }

    // {code: {type, value}} 形式のレコードを取り出す。REST API の {record: {...}} 形式も受け付ける。
    private parseRecordJson(text: string): RecordData | null {
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            return null;
        }
        if (data && typeof data === "object" && data.record && typeof data.record === "object" && !("value" in data.record)) {
            data = data.record;
        }
        if (data == null || typeof data !== "object" || Array.isArray(data)) return null;

        const entries = Object.values(data);
        if (entries.length === 0) return null;
        const isRecord = entries.every((f: any) => f != null && typeof f === "object" && "value" in f);
        return isRecord ? data as RecordData : null;
    }

    // 貼り付け先アプリのフィールド設定（選択肢・ルックアップ判定に使う）
    private async fetchFieldProperties(): Promise<FieldProperties> {
        const url = kintone.api.url("/k/v1/app/form/fields.json", true);
        const resp = await kintone.api(url, "GET", { app: kintone.app.getId() }) as { properties: FieldProperties };
        return resp.properties;
    }

    private merge(source: RecordData, target: RecordData, properties: FieldProperties) {
        const record: RecordData = {};
        const pasted: PasteField[] = [];
        const skipped: PasteField[] = [];

        for (const code of Object.keys(source)) {
            const src = source[code];
            const dst = target[code];
            const prop = properties[code];
            if (dst == null || prop == null || src.type == null || src.type !== dst.type || RecordJsonPaster.UNSETTABLE_TYPES.has(src.type)) {
                skipped.push({ code, type: src.type ?? "" });
                continue;
            }

            let value: any;
            if (src.type === "SUBTABLE") {
                value = this.buildSubtableRows(src.value, dst.value, prop.fields ?? {});
            } else {
                value = this.adjustValue(src.type, src.value, prop);
                if (value === undefined) {
                    skipped.push({ code, type: src.type ?? "" });
                    continue;
                }
            }

            record[code] = { ...dst, value };
            // ルックアップは値を入れたうえで取得まで実行させる
            if (prop.lookup) {
                record[code].lookup = true;
            }
            pasted.push({ code, type: src.type });
        }

        return { record, pasted, skipped };
    }

    // 貼り付け先に合わせて値を調整する。貼り付けられない場合は undefined を返す。
    private adjustValue(type: string, value: any, prop: FieldProperty): any {
        const options = prop.options ? Object.keys(prop.options) : null;
        if (options && RecordJsonPaster.SINGLE_OPTION_TYPES.has(type)) {
            return options.includes(value) ? value : undefined;
        }
        if (options && RecordJsonPaster.MULTI_OPTION_TYPES.has(type)) {
            return Array.isArray(value) ? value.filter((v) => options.includes(v)) : undefined;
        }
        return value;
    }

    // サブテーブルの行を組み立てる。
    // 行の雛形には貼り付け先の先頭行を使い、コードとタイプが一致する列だけ貼り付け元の値で上書きする。
    private buildSubtableRows(srcRows: any[], dstRows: any[], innerProps: FieldProperties) {
        const template: RecordData = dstRows?.[0]?.value ?? {};
        if (!Array.isArray(srcRows)) return dstRows;

        return srcRows.map((row) => {
            const srcCells: RecordData = row?.value ?? {};
            const cells: RecordData = {};
            for (const code of Object.keys(template)) {
                const base = template[code];
                const src = srcCells[code];
                const prop = innerProps[code];
                let value = base.value;
                if (src && prop && src.type === base.type && base.type && !RecordJsonPaster.UNSETTABLE_TYPES.has(base.type)) {
                    const adjusted = this.adjustValue(base.type, src.value, prop);
                    if (adjusted !== undefined) value = adjusted;
                }
                cells[code] = { ...base, value };
                if (prop?.lookup && value !== base.value) {
                    cells[code].lookup = true;
                }
            }
            // 行IDは貼り付け元アプリのものなので引き継がない
            return { value: cells };
        });
    }
}
