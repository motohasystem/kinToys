/**
 * 新しいフィールド設定ダイアログ（React / kintone-ui-component ベース）用のコピー/ペースト。
 *
 * kintone 本体の刷新で設定ダイアログが Closure/gaia から React に置き換わり、
 * 旧 setting_dialog_dupulicator.ts のセレクタ（ocean-ui-dialog / *-text id / goog系）が全滅した。
 * 新DOMはハッシュclass（sc-xxx / _xxx_hash）が不安定なので、以下の安定した目印を軸にする:
 *   - role="dialog" + 内部に data-testid="fieldCodeInput"（フィールド設定ダイアログの目印）
 *   - data-testid（charLimitMin/Max, fieldCodeInput, ヘッダタイトル等）
 *   - チェックボックスの name 属性（noLabel / autoCalculationEnabled / required 等）
 *   - ラベルのテキスト（「フィールド名」「初期値」…）＋ for/id 紐付け
 *
 * React 管理の input へ値を入れるときは、value の native setter を使ってから input/change を発火する。
 */

import { Utils } from "../utils";

const COPY_ICON_ID = "copy_button";
const PASTE_ICON_ID = "paste_button";

interface FieldDialogJson {
    fieldname?: string;
    fieldcode?: string;       // 読み取りのみ（書き込みは編集ボタン経由のため未対応）
    hideFieldName?: boolean;
    hasExpression?: boolean;
    requiredField?: boolean;
    uniqueCheck?: boolean;
    min?: string;             // 文字数/数値の最小
    max?: string;             // 文字数/数値の最大
    defaultValue?: string;    // 初期値（テキスト系）

    // 数値
    digit?: boolean;          // 桁区切りを表示する
    displayScale?: string;    // 小数点以下の表示桁数
    unit?: string;            // 単位記号
    unitPosition?: string;    // 単位位置（"BEFORE" / "AFTER"）

    // リンク
    protocol?: string;        // 入力値の種類（"WEB" / "CALL" / "MAIL"）

    // 日付/時刻/日時
    dateDefault?: { current: boolean; values: string[] };  // 初期値（登録時の日時にする + 手動値）

    // リッチエディター
    defaultValueHtml?: string;    // 初期値（contenteditable の innerHTML）

    // ユーザー/組織/グループ選択
    hasSelect?: boolean;          // 選択肢を指定する（初期値エンティティはピッカーのため非対応）

    // 添付ファイル
    thumbnailSize?: string;       // サムネイルの大きさ（例: "150x150"）

    // 選択肢系（ドロップダウン/ラジオ/チェック/複数選択）
    selections?: string[];        // 項目と順番（選択肢名）
    align?: string;               // 並び（"horizontal" / "vertical"）
    defaultSelections?: string[]; // 初期値（選択されている選択肢）

    // 関連レコード一覧
    referenceTable?: ReferenceTableJson;

    // ルックアップ
    lookup?: LookupJson;
}

interface ReferenceTableJson {
    relatedApp?: string;          // 参照するアプリ（表示名。設定はピッカーのため自動適用しない）
    condition?: { field: string; relatedField: string };  // 表示するレコードの条件
    displayFields?: string[];     // 表示するフィールド
    sort?: Array<{ field: string; order: string }>;       // レコードのソート（複数可）
    maxRecords?: string;          // 一度に表示する最大レコード数
    // さらに絞り込む条件（filterCond）は複雑なため現時点では対象外
}

interface LookupJson {
    relatedApp?: string;          // 関連付けるアプリ（表示名。保存後ロック／新規はピッカーのため自動適用しない）
    keyField?: string;            // コピー元のフィールド（保存後ロック。新規のみ設定可能）
    recordSearchType?: boolean;   // レコード取得時の検索方式
    fieldMappings?: Array<{ field: string; relatedField: string }>;  // ほかのフィールドのコピー（コピー先 ← コピー元）
    displayFields?: string[];     // コピー元のレコードの選択時に表示するフィールド
    sort?: Array<{ field: string; order: string }>;       // ソートの初期設定
}

export class FieldSettingDuplicator {

    // コピー時に整形JSONにするか（オプションで切替。未設定時は整形ON）
    prettyJson: boolean = true;

    setOptions(options: { [key: string]: any } | undefined) {
        if (options == null) return;
        const key = Utils.Ids.id_field_setting_copy_pretty;
        if (key in options && options[key] != null) {
            this.prettyJson = options[key] !== "false";
        }
    }

    // 設定ダイアログの表示を監視し、コピペアイコンを差し込む
    watchDialogSpawn() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type !== "childList") return;
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    const dlg = this._findDialogIn(node as HTMLElement);
                    if (dlg) this.addCopyPasteIcon(dlg);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const existing = this._findDialogIn(document.body);
        if (existing) this.addCopyPasteIcon(existing);
    }

    // 追加ノード自身/子孫からフィールド設定ダイアログ（role=dialog かつ fieldCodeInput を含む）を探す
    _findDialogIn(root: HTMLElement): HTMLElement | null {
        const candidates: Element[] = [];
        if (root.matches && root.matches('[role="dialog"]')) candidates.push(root);
        if (root.querySelectorAll) {
            root.querySelectorAll('[role="dialog"]').forEach((d) => candidates.push(d));
        }
        for (const d of candidates) {
            if (d.querySelector('[data-testid="fieldCodeInput"]')) {
                return d as HTMLElement;
            }
        }
        return null;
    }

    // 現在開いている設定ダイアログ
    _currentDialog(): HTMLElement | null {
        return this._findDialogIn(document.body);
    }

    // ダイアログのヘッダに ⬆️/⬇️ を差し込む
    addCopyPasteIcon(dlg: HTMLElement) {
        if (dlg.querySelector(`#${COPY_ICON_ID}`) || dlg.querySelector(`#${PASTE_ICON_ID}`)) {
            return;   // 増殖回避
        }
        const title = dlg.querySelector('[data-testid="shared-Dialog-DialogHeader-title"]') as HTMLElement | null;
        const header = title ? title.parentElement : null;
        if (title == null || header == null) return;

        const makeIcon = (id: string, label: string, handler: (e: MouseEvent) => void) => {
            const icon = document.createElement("span");
            icon.id = id;
            icon.textContent = label;
            icon.style.cursor = "pointer";
            icon.style.display = "inline-block";
            icon.style.verticalAlign = "middle";
            icon.style.marginLeft = "8px";
            icon.style.fontSize = "20px";
            icon.style.fontWeight = "normal";
            icon.style.userSelect = "none";
            icon.onclick = handler;
            return icon;
        };

        const copyIcon = makeIcon(COPY_ICON_ID, "⬆️", (event) => {
            try {
                this.copy(event);
                this.showTooltip(event, "copy!");
            } catch (error) {
                console.error("フィールド設定のコピーに失敗しました:", error);
                this.showTooltip(event, "copy failed!");
            }
        });
        const pasteIcon = makeIcon(PASTE_ICON_ID, "⬇️", (event) => this.paste(event));

        // タイトル（h2）の末尾に差し込み、タイトルテキストの横に並べる。
        title.appendChild(copyIcon);
        title.appendChild(pasteIcon);
    }

    showTooltip(event: MouseEvent, message: string) {
        const tooltip = document.createElement("span");
        tooltip.textContent = message;
        tooltip.style.position = "fixed";
        tooltip.style.backgroundColor = "black";
        tooltip.style.color = "white";
        tooltip.style.padding = "5px";
        tooltip.style.borderRadius = "5px";
        tooltip.style.top = `${event.clientY + 10}px`;
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.zIndex = "100000";
        document.body.appendChild(tooltip);
        setTimeout(() => { document.body.removeChild(tooltip); }, 2000);
    }

    copy(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        const info = this.getDialogJson();
        window.focus();
        const json = this.prettyJson ? JSON.stringify(info, null, 2) : JSON.stringify(info);
        navigator.clipboard.writeText(json);
    }

    paste(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        navigator.clipboard.readText().then((text) => {
            const sanitizedText = text.replace(/\r\n|\r|\n/g, "");
            let jsonData: FieldDialogJson;
            try {
                jsonData = JSON.parse(sanitizedText);
            } catch (e) {
                console.error("Invalid JSON data in clipboard:", e);
                this.showTooltip(event, "Not a JSON!");
                return;
            }
            try {
                this.setDialogJson(jsonData);
                this.showTooltip(event, "paste!");
            } catch (e) {
                console.error("フィールド設定のペーストに失敗しました:", e);
                this.showTooltip(event, "paste failed!");
            }
        });
    }

    // ===== 読み取り =====

    getDialogJson(): FieldDialogJson {
        const dlg = this._currentDialog();
        if (dlg == null) return {};
        const json: FieldDialogJson = {};

        const put = <K extends keyof FieldDialogJson>(key: K, value: FieldDialogJson[K] | null) => {
            if (value !== null && value !== undefined) json[key] = value;
        };

        put("fieldname", this._readLabelInput(dlg, "フィールド名"));
        put("fieldcode", this._readFieldCode(dlg));
        put("hideFieldName", this._readCheckbox(dlg, "フィールド名を表示しない"));
        put("hasExpression", this._readCheckbox(dlg, "自動計算する"));
        put("requiredField", this._readCheckbox(dlg, "必須項目にする"));
        put("uniqueCheck", this._readCheckbox(dlg, "値の重複を禁止する"));
        put("min", this._readTestidInput(dlg, "charLimitMin"));
        put("max", this._readTestidInput(dlg, "charLimitMax"));
        put("defaultValue", this._readLabelInput(dlg, "初期値"));

        // 数値
        put("digit", this._readCheckbox(dlg, "桁区切りを表示する"));
        put("displayScale", this._readLabelInput(dlg, "小数点以下の表示桁数"));
        const unitEl = this._unitInput(dlg);
        if (unitEl) put("unit", unitEl.value);
        put("unitPosition", this._readRadioByName(dlg, "unitPosition"));

        // リンク
        put("protocol", this._readRadioInFieldset(dlg, "入力値の種類"));

        // 日付/時刻/日時の初期値
        const dateDef = this._readDateDefault(dlg);
        if (dateDef) json.dateDefault = dateDef;

        // リッチエディターの初期値（HTML）
        const rich = this._richEditor(dlg);
        if (rich) put("defaultValueHtml", rich.innerHTML);

        // ユーザー/組織/グループ選択の「選択肢を指定する」
        put("hasSelect", this._readCheckboxByName(dlg, "hasSelect"));

        // 添付ファイルのサムネイルの大きさ
        put("thumbnailSize", this._dropdownText(this._thumbnailContainer(dlg)));

        // 選択肢系
        const sels = this._readSelections(dlg);
        if (sels.length > 0) json.selections = sels;
        put("align", this._readAlign(dlg));
        const defs = this._readDefaultSelections(dlg);
        if (defs.length > 0) json.defaultSelections = defs;

        // 関連レコード一覧
        if (this._isReferenceTableDialog(dlg)) {
            json.referenceTable = this._readReferenceTable(dlg);
        }

        // ルックアップ
        if (this._isLookupDialog(dlg)) {
            json.lookup = this._readLookup(dlg);
        }

        return json;
    }

    // ===== 関連レコード一覧 =====

    // 関連レコード固有の目印（表示するレコードの条件）で判定する。
    // fieldAppSelect は新規ルックアップにも存在するため使わない。
    _isReferenceTableDialog(dlg: HTMLElement): boolean {
        return dlg.querySelector('[data-testid="filterCondition-input"]') != null;
    }

    // フィールド選択ボタン（sc-kBzkbR gTpngA。aria-expanded を持つ）の表示テキストを読む
    _fieldSelectText(scope: Element | null): string {
        if (scope == null) return "";
        const btn = scope.querySelector('button[aria-expanded]');
        return btn ? (btn.textContent ?? "").trim() : "";
    }

    // ドロップダウン（shared-forms-Dropdown）の選択ラベルを読む
    _dropdownText(scope: Element | null): string {
        if (scope == null) return "";
        const label = scope.querySelector('[data-testid="shared-forms-Dropdown-DropdownButton-selectedLabel"]');
        return label ? (label.textContent ?? "").trim() : "";
    }

    _readReferenceTable(dlg: HTMLElement): ReferenceTableJson {
        const relatedApp = this._fieldSelectText(dlg.querySelector('[data-testid="fieldAppSelect"]'));
        const condField = this._fieldSelectText(dlg.querySelector('[data-testid="filterCondition-input"]'));
        const condRelated = this._fieldSelectText(dlg.querySelector('[data-testid="filterCondition-master"]'));

        const displayFields = Array.from(dlg.querySelectorAll('[data-testid="displayFields"] li'))
            .map((li) => this._fieldSelectText(li))
            .filter((t) => t !== "");

        const sort = Array.from(dlg.querySelectorAll('[data-testid="fieldSettingDialog-order"] li'))
            .map((li) => ({
                field: this._fieldSelectText(li.querySelector('[data-testid="fieldSettingDialog-order-name"]')),
                order: this._dropdownText(li.querySelector('[data-testid="fieldSettingDialog-order-op"]'))
            }))
            .filter((s) => s.field !== "");

        const maxRecords = this._dropdownText(dlg.querySelector('[data-testid="MaxVisibleRecordSelect"]'));

        return {
            relatedApp,
            condition: { field: condField, relatedField: condRelated },
            displayFields,
            sort,
            maxRecords
        };
    }

    // フィールド選択ボタン/ドロップダウンボタンを開き、ポップアップ（role=listbox の role=option）から
    // テキストが value の項目をクリックして確定する。両ウィジェットとも role=option ベースで共通。
    async _pickFromListboxButton(button: Element | null, value: string) {
        if (button == null || !value) return;
        if ((button.textContent ?? "").trim() === value) return;   // 既に一致

        if (button.getAttribute("aria-expanded") !== "true") {
            (button as HTMLElement).click();
        }

        // ポップアップの該当 option が現れるまで待つ（portal描画の遅延に耐える）
        let opt: HTMLElement | undefined;
        let waited = 0;
        while (!opt && waited < 800) {
            await this._wait(80);
            waited += 80;
            opt = Array.from(document.querySelectorAll('[role="option"]')).find((o) => {
                if ((o as HTMLElement).offsetParent === null) return false;
                const label = o.querySelector('[class*="__label"]');
                const text = (label ? label.textContent : o.textContent) ?? "";
                return text.trim() === value;
            }) as HTMLElement | undefined;
        }

        if (opt) {
            opt.click();
            await this._wait(80);
        } else {
            if (button.getAttribute("aria-expanded") === "true") (button as HTMLElement).click();   // 閉じる
            console.warn(`[kinToys] 候補が見つかりませんでした: "${value}"`);
        }
    }

    // 動的リスト（表示するフィールド/ソート等）の行数を、末尾行の追加/削除ボタンで target に合わせる
    async _adjustDynamicRows(dlg: HTMLElement, listSel: string, target: number) {
        const count = () => dlg.querySelectorAll(listSel).length;
        const clickAndWait = async (btn: HTMLElement | null, from: number): Promise<boolean> => {
            if (btn == null) return false;
            btn.click();
            let w = 0;
            while (count() === from && w < 600) { await this._wait(50); w += 50; }
            return count() !== from;
        };
        let guard = 0;
        while (count() < target && guard++ < 100) {
            const rows = dlg.querySelectorAll(listSel);
            const last = rows[rows.length - 1];
            const add = last ? (last.querySelector('button[title="追加する"]') as HTMLElement | null) : null;
            if (!(await clickAndWait(add, count()))) break;
        }
        guard = 0;
        while (count() > target && count() > 1 && guard++ < 100) {
            const rows = dlg.querySelectorAll(listSel);
            const last = rows[rows.length - 1];
            const rm = last ? (last.querySelector('button[title="削除する"]') as HTMLElement | null) : null;
            if (!(await clickAndWait(rm, count()))) break;
        }
    }

    // 関連レコード設定を書き込む。参照するアプリはピッカー方式のため自動設定しない。
    // 未選択（「アプリを選択してください」）だと参照先フィールドの候補が無く何も確定できないため、
    // アラートで選択を促して中断する。選択済みだが JSON と異なる場合は警告のみで続行する。
    async _writeReferenceTable(dlg: HTMLElement, data: ReferenceTableJson) {
        const curApp = this._fieldSelectText(dlg.querySelector('[data-testid="fieldAppSelect"]'));
        const appUnselected = curApp === "" || /選択してください/.test(curApp) || /アプリを選択/.test(curApp);
        if (appUnselected) {
            const expected = data.relatedApp ? `参照するアプリ「${data.relatedApp}」` : "参照するアプリ";
            window.alert(`${expected}が選択されていません。\n先に「参照するアプリ」を選択してから、もう一度ペーストしてください。`);
            return;
        }
        if (data.relatedApp && curApp !== data.relatedApp) {
            console.warn(`[kinToys] 参照するアプリが異なります（現在:"${curApp}" / JSON:"${data.relatedApp}"）。別アプリとして続行します。`);
        }

        // 表示するレコードの条件
        if (data.condition) {
            await this._pickFromListboxButton(dlg.querySelector('[data-testid="filterCondition-input"] button[aria-expanded]'), data.condition.field);
            await this._pickFromListboxButton(dlg.querySelector('[data-testid="filterCondition-master"] button[aria-expanded]'), data.condition.relatedField);
        }

        // 表示するフィールド
        if (data.displayFields && data.displayFields.length > 0) {
            await this._adjustDynamicRows(dlg, '[data-testid="displayFields"] li', data.displayFields.length);
            const rows = dlg.querySelectorAll('[data-testid="displayFields"] li');
            for (let i = 0; i < data.displayFields.length; i++) {
                const row = rows[i];
                if (row == null) continue;
                await this._pickFromListboxButton(row.querySelector('button[aria-expanded]'), data.displayFields[i]);
            }
        }

        // レコードのソート（フィールド + 昇順/降順）
        if (data.sort && data.sort.length > 0) {
            await this._adjustDynamicRows(dlg, '[data-testid="fieldSettingDialog-order"] li', data.sort.length);
            const rows = dlg.querySelectorAll('[data-testid="fieldSettingDialog-order"] li');
            for (let i = 0; i < data.sort.length; i++) {
                const row = rows[i];
                if (row == null) continue;
                await this._pickFromListboxButton(row.querySelector('[data-testid="fieldSettingDialog-order-name"] button[aria-expanded]'), data.sort[i].field);
                await this._pickFromListboxButton(row.querySelector('[data-testid="fieldSettingDialog-order-op"] [data-testid="shared-forms-Dropdown-DropdownButton"]'), data.sort[i].order);
            }
        }

        // 一度に表示する最大レコード数
        if (data.maxRecords) {
            await this._pickFromListboxButton(dlg.querySelector('[data-testid="MaxVisibleRecordSelect"] [data-testid="shared-forms-Dropdown-DropdownButton"]'), data.maxRecords);
        }
    }

    // ===== ルックアップ =====

    // ルックアップ固有の目印（コピー元のフィールド）で判定する。
    _isLookupDialog(dlg: HTMLElement): boolean {
        return dlg.querySelector('[data-testid="fieldFieldSelect"]') != null
            || dlg.querySelector('[data-testid="fieldMapping"]') != null
            || dlg.querySelector('[data-testid="lookupFieldAppSelect"]') != null;
    }

    // 関連付けるアプリのコンテナを返す。保存済み=lookupFieldAppSelect(リンク) / 新規=fieldAppSelect(ボタン)。
    _lookupAppContainer(dlg: HTMLElement): Element | null {
        return dlg.querySelector('[data-testid="lookupFieldAppSelect"]')
            || dlg.querySelector('[data-testid="fieldAppSelect"]');
    }

    // 関連付けるアプリ名を読む。保存済みはリンク、新規はフィールド選択ボタン。
    _lookupRelatedApp(dlg: HTMLElement): string {
        const cont = this._lookupAppContainer(dlg);
        if (cont == null) return "";
        const link = cont.querySelector("a");
        if (link) return (link.textContent ?? "").trim();
        return this._fieldSelectText(cont);
    }

    // コピー元のフィールド（キー）を読む。保存済みは静的テキスト、新規はフィールド選択ボタン。
    _lookupKeyField(dlg: HTMLElement): string {
        const cont = dlg.querySelector('[data-testid="fieldFieldSelect"]');
        if (cont == null) return "";
        const locked = cont.querySelector('[class*="selectedField"]');
        if (locked) return (locked.textContent ?? "").trim();
        return this._fieldSelectText(cont);
    }

    _readLookup(dlg: HTMLElement): LookupJson {
        const recordSearchTypeCb = dlg.querySelector('input[name="recordSearchType"]') as HTMLInputElement | null;

        const fieldMappings = Array.from(dlg.querySelectorAll('[data-testid="fieldMapping"] li'))
            .map((li) => ({
                field: this._fieldSelectText(li.querySelector('[data-testid="fieldMapping-targetField"]')),
                relatedField: this._fieldSelectText(li.querySelector('[data-testid="fieldMapping-sourceField"]'))
            }))
            .filter((m) => m.field !== "" || m.relatedField !== "");

        const displayFields = Array.from(dlg.querySelectorAll('[data-testid="displayFields"] li'))
            .map((li) => this._fieldSelectText(li))
            .filter((t) => t !== "");

        const sort = Array.from(dlg.querySelectorAll('[data-testid="fieldSettingDialog-order"] li'))
            .map((li) => ({
                field: this._fieldSelectText(li.querySelector('[data-testid="fieldSettingDialog-order-name"]')),
                order: this._dropdownText(li.querySelector('[data-testid="fieldSettingDialog-order-op"]'))
            }))
            .filter((s) => s.field !== "");

        return {
            relatedApp: this._lookupRelatedApp(dlg),
            keyField: this._lookupKeyField(dlg),
            recordSearchType: recordSearchTypeCb ? recordSearchTypeCb.checked : undefined,
            fieldMappings,
            displayFields,
            sort
        };
    }

    // ルックアップ設定を書き込む。関連付けるアプリ／キーは保存後ロックのため、編集可能な項目のみ反映する。
    async _writeLookup(dlg: HTMLElement, data: LookupJson) {
        // 関連付けるアプリ: 新規（ボタンあり）で未選択ならアラートして中断。保存済み（リンク）はスキップ。
        const appCont = this._lookupAppContainer(dlg);
        const appButton = appCont ? appCont.querySelector('button[aria-expanded]') : null;
        if (appButton) {
            const cur = this._fieldSelectText(appCont);
            const unsel = cur === "" || /選択してください/.test(cur) || /アプリを選択/.test(cur);
            if (unsel) {
                const expected = data.relatedApp ? `関連付けるアプリ「${data.relatedApp}」` : "関連付けるアプリ";
                window.alert(`${expected}が選択されていません。\n先に「関連付けるアプリ」を選択してから、もう一度ペーストしてください。`);
                return;
            }
        }

        // コピー元のフィールド（キー）: 新規（ボタンあり）のみ設定可能
        if (data.keyField) {
            const keyCont = dlg.querySelector('[data-testid="fieldFieldSelect"]');
            const keyBtn = keyCont ? keyCont.querySelector('button[aria-expanded]') : null;
            if (keyBtn) await this._pickFromListboxButton(keyBtn, data.keyField);
        }

        // レコード取得時の検索方式
        if (data.recordSearchType != null) {
            const cb = dlg.querySelector('input[name="recordSearchType"]') as HTMLInputElement | null;
            if (cb && cb.checked !== data.recordSearchType) cb.click();
        }

        // ほかのフィールドのコピー（コピー先 + コピー元）
        if (data.fieldMappings && data.fieldMappings.length > 0) {
            await this._adjustDynamicRows(dlg, '[data-testid="fieldMapping"] li', data.fieldMappings.length);
            const rows = dlg.querySelectorAll('[data-testid="fieldMapping"] li');
            for (let i = 0; i < data.fieldMappings.length; i++) {
                const row = rows[i];
                if (row == null) continue;
                await this._pickFromListboxButton(row.querySelector('[data-testid="fieldMapping-targetField"] button[aria-expanded]'), data.fieldMappings[i].field);
                await this._pickFromListboxButton(row.querySelector('[data-testid="fieldMapping-sourceField"] button[aria-expanded]'), data.fieldMappings[i].relatedField);
            }
        }

        // 表示するフィールド
        if (data.displayFields && data.displayFields.length > 0) {
            await this._adjustDynamicRows(dlg, '[data-testid="displayFields"] li', data.displayFields.length);
            const rows = dlg.querySelectorAll('[data-testid="displayFields"] li');
            for (let i = 0; i < data.displayFields.length; i++) {
                const row = rows[i];
                if (row == null) continue;
                await this._pickFromListboxButton(row.querySelector('button[aria-expanded]'), data.displayFields[i]);
            }
        }

        // ソート
        if (data.sort && data.sort.length > 0) {
            await this._adjustDynamicRows(dlg, '[data-testid="fieldSettingDialog-order"] li', data.sort.length);
            const rows = dlg.querySelectorAll('[data-testid="fieldSettingDialog-order"] li');
            for (let i = 0; i < data.sort.length; i++) {
                const row = rows[i];
                if (row == null) continue;
                await this._pickFromListboxButton(row.querySelector('[data-testid="fieldSettingDialog-order-name"] button[aria-expanded]'), data.sort[i].field);
                await this._pickFromListboxButton(row.querySelector('[data-testid="fieldSettingDialog-order-op"] [data-testid="shared-forms-Dropdown-DropdownButton"]'), data.sort[i].order);
            }
        }
    }

    // ===== 書き込み =====

    setDialogJson(data: FieldDialogJson) {
        const dlg = this._currentDialog();
        if (dlg == null) return;

        if (data.fieldname != null) this._writeLabelInput(dlg, "フィールド名", data.fieldname);
        if (data.hideFieldName != null) this._writeCheckbox(dlg, "フィールド名を表示しない", data.hideFieldName);
        if (data.hasExpression != null) this._writeCheckbox(dlg, "自動計算する", data.hasExpression);
        if (data.requiredField != null) this._writeCheckbox(dlg, "必須項目にする", data.requiredField);
        if (data.uniqueCheck != null) this._writeCheckbox(dlg, "値の重複を禁止する", data.uniqueCheck);
        if (data.min != null) this._writeTestidInput(dlg, "charLimitMin", data.min);
        if (data.max != null) this._writeTestidInput(dlg, "charLimitMax", data.max);
        if (data.defaultValue != null) this._writeLabelInput(dlg, "初期値", data.defaultValue);
        if (data.fieldcode != null) this._writeFieldCode(dlg, data.fieldcode);
        if (data.align != null) this._writeAlign(dlg, data.align);

        // 数値
        if (data.digit != null) this._writeCheckbox(dlg, "桁区切りを表示する", data.digit);
        if (data.displayScale != null) this._writeLabelInput(dlg, "小数点以下の表示桁数", data.displayScale);
        if (data.unit != null) { const el = this._unitInput(dlg); if (el) this._setReactInput(el, data.unit); }
        if (data.unitPosition != null) this._writeRadioByName(dlg, "unitPosition", data.unitPosition);
        // リンク
        if (data.protocol != null) this._writeRadioInFieldset(dlg, "入力値の種類", data.protocol);
        // 日付/時刻/日時
        if (data.dateDefault != null) this._writeDateDefault(dlg, data.dateDefault);
        // リッチエディター
        if (data.defaultValueHtml != null) this._writeRichEditor(dlg, data.defaultValueHtml);
        // ユーザー/組織/グループ選択
        if (data.hasSelect != null) this._writeCheckboxByName(dlg, "hasSelect", data.hasSelect);
        // 添付ファイル（サムネイルサイズ、非同期）
        if (data.thumbnailSize != null) {
            const btn = this._thumbnailContainer(dlg)?.querySelector('[data-testid="shared-forms-Dropdown-DropdownButton"]') ?? null;
            if (btn) this._pickFromListboxButton(btn, data.thumbnailSize).catch((e) => console.error("[kinToys] サムネイルサイズの反映に失敗:", e));
        }

        // 選択肢 → 初期値 の順に非同期で反映する（初期値は選択肢が揃ってから設定する）
        if (data.selections || data.defaultSelections) {
            (async () => {
                if (data.selections) await this._writeSelections(dlg, data.selections);
                if (data.defaultSelections) await this._writeDefaultSelections(dlg, data.defaultSelections);
            })().catch((e) => console.error("[kinToys] 選択肢/初期値の反映に失敗しました:", e));
        }

        // 関連レコード一覧（非同期。ポップアップ操作の待ちを含む）
        if (data.referenceTable && this._isReferenceTableDialog(dlg)) {
            this._writeReferenceTable(dlg, data.referenceTable)
                .catch((e) => console.error("[kinToys] 関連レコード設定の反映に失敗しました:", e));
        }

        // ルックアップ（非同期）
        if (data.lookup && this._isLookupDialog(dlg)) {
            this._writeLookup(dlg, data.lookup)
                .catch((e) => console.error("[kinToys] ルックアップ設定の反映に失敗しました:", e));
        }
    }

    // ===== ヘルパー =====

    // ラベルテキスト一致の label に for で紐づく input を返す
    _labelInput(dlg: HTMLElement, text: string): HTMLInputElement | HTMLTextAreaElement | null {
        const labels = Array.from(dlg.querySelectorAll("label"));
        for (const l of labels) {
            if ((l.textContent ?? "").trim() === text) {
                const id = l.getAttribute("for");
                if (id) {
                    const el = dlg.querySelector(`#${CSS.escape(id)}`);
                    if (el) return el as HTMLInputElement | HTMLTextAreaElement;
                }
            }
        }
        return null;
    }

    _readLabelInput(dlg: HTMLElement, text: string): string | null {
        const el = this._labelInput(dlg, text);
        return el ? el.value : null;
    }

    _writeLabelInput(dlg: HTMLElement, text: string, value: string) {
        const el = this._labelInput(dlg, text);
        if (el) this._setReactInput(el, value);
    }

    // data-testid の要素内の input を返す（charLimitMin/Max 等）
    _testidInput(dlg: HTMLElement, testid: string): HTMLInputElement | null {
        return dlg.querySelector(`[data-testid="${testid}"] input`) as HTMLInputElement | null;
    }

    _readTestidInput(dlg: HTMLElement, testid: string): string | null {
        const el = this._testidInput(dlg, testid);
        return el ? el.value : null;
    }

    _writeTestidInput(dlg: HTMLElement, testid: string, value: string) {
        const el = this._testidInput(dlg, testid);
        if (el) this._setReactInput(el, value);
    }

    // ラベルテキストで（囲っている label の）チェックボックスを返す。
    // required と unique は name が同じ場合があるため、name ではなくラベルテキストで特定する。
    _labelCheckbox(dlg: HTMLElement, text: string): HTMLInputElement | null {
        const boxes = Array.from(dlg.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
        for (const cb of boxes) {
            const label = cb.closest("label");
            if (label && (label.textContent ?? "").trim() === text) return cb;
        }
        return null;
    }

    _readCheckbox(dlg: HTMLElement, text: string): boolean | null {
        const cb = this._labelCheckbox(dlg, text);
        return cb ? cb.checked : null;
    }

    _writeCheckbox(dlg: HTMLElement, text: string, checked: boolean) {
        const cb = this._labelCheckbox(dlg, text);
        if (cb && cb.checked !== checked) {
            cb.click();   // React管理のためクリックで onChange を発火して切り替える
        }
    }

    // フィールドコードの表示テキストを読む
    _readFieldCode(dlg: HTMLElement): string | null {
        const view = dlg.querySelector('[data-testid="fieldCodeInput"] [class*="FieldCodeView-text"]');
        if (view) return (view.textContent ?? "").trim();
        // 編集モードの input にフォールバック
        const input = dlg.querySelector('[data-testid="fieldCodeInput"] input') as HTMLInputElement | null;
        return input ? input.value : null;
    }

    // フィールドコードを書き込む（best-effort）。
    // 表示モードでは input が無いため、編集ボタンを押して入力欄を出してから値をセットする。
    // （フィールドコードは一意制約があるため、別フィールドへのペーストでは反映されない場合がある）
    _writeFieldCode(dlg: HTMLElement, code: string) {
        const fc = dlg.querySelector('[data-testid="fieldCodeInput"]');
        if (fc == null) return;

        const setInput = () => {
            const inp = fc.querySelector("input") as HTMLInputElement | null;
            if (inp) {
                this._setReactInput(inp, code);
                inp.dispatchEvent(new Event("blur", { bubbles: true }));
                return true;
            }
            return false;
        };

        // すでに入力欄があればそのまま。無ければ編集ボタンを押して出す。
        if (fc.querySelector("input")) {
            setInput();
            return;
        }
        const editBtn = (fc.querySelector('button[title="フィールドコードを編集"]')
            || fc.querySelector("button")) as HTMLElement | null;
        if (editBtn) {
            editBtn.click();
            // 入力欄の表示を待ってからセットする
            setTimeout(setInput, 120);
        }
    }

    // 単位記号（fieldset「単位記号」内の text input）
    _unitInput(dlg: HTMLElement): HTMLInputElement | null {
        const legend = Array.from(dlg.querySelectorAll("legend")).find((l) => (l.textContent ?? "").trim() === "単位記号");
        const fs = legend ? legend.closest("fieldset") : null;
        return fs ? (fs.querySelector('input[type="text"]') as HTMLInputElement | null) : null;
    }

    // name 指定のラジオを読む/書く
    _readRadioByName(dlg: HTMLElement, name: string): string | null {
        const radios = Array.from(dlg.querySelectorAll(`input[type="radio"][name="${name}"]`)) as HTMLInputElement[];
        const checked = radios.find((r) => r.checked);
        return checked ? checked.value : null;
    }
    _writeRadioByName(dlg: HTMLElement, name: string, value: string) {
        const target = (Array.from(dlg.querySelectorAll(`input[type="radio"][name="${name}"]`)) as HTMLInputElement[]).find((r) => r.value === value);
        if (target && !target.checked) target.click();
    }

    // fieldset の legend テキストで特定したラジオ群を読む/書く（name が特殊な場合用）
    _radioFieldset(dlg: HTMLElement, legendText: string): HTMLElement | null {
        const legend = Array.from(dlg.querySelectorAll("legend")).find((l) => (l.textContent ?? "").includes(legendText));
        return legend ? (legend.closest("fieldset") as HTMLElement | null) : null;
    }
    _readRadioInFieldset(dlg: HTMLElement, legendText: string): string | null {
        const fs = this._radioFieldset(dlg, legendText);
        if (fs == null) return null;
        const checked = (Array.from(fs.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]).find((r) => r.checked);
        return checked ? checked.value : null;
    }
    _writeRadioInFieldset(dlg: HTMLElement, legendText: string, value: string) {
        const fs = this._radioFieldset(dlg, legendText);
        if (fs == null) return;
        const target = (Array.from(fs.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]).find((r) => r.value === value);
        if (target && !target.checked) target.click();
    }

    // 日付/時刻/日時の初期値。fieldset（legend「初期値」）内のチェック（登録時の日時にする）＋手動値input。
    // テキスト系の 初期値（label[for]+input）とは別物なので、legend の fieldset がある場合のみ対象。
    _dateInitFieldset(dlg: HTMLElement): HTMLElement | null {
        const legend = Array.from(dlg.querySelectorAll("legend")).find((l) => (l.textContent ?? "").trim() === "初期値");
        return legend ? (legend.closest("fieldset") as HTMLElement | null) : null;
    }
    _readDateDefault(dlg: HTMLElement): { current: boolean; values: string[] } | null {
        const fs = this._dateInitFieldset(dlg);
        if (fs == null) return null;
        const cb = fs.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const inputs = Array.from(fs.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
        return { current: cb ? cb.checked : false, values: inputs.map((i) => i.value) };
    }
    _writeDateDefault(dlg: HTMLElement, data: { current: boolean; values: string[] }) {
        const fs = this._dateInitFieldset(dlg);
        if (fs == null) return;
        const cb = fs.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (cb && data.current != null && cb.checked !== data.current) cb.click();
        if (data.values) {
            const inputs = Array.from(fs.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
            inputs.forEach((inp, i) => { if (i < data.values.length) this._setReactInput(inp, data.values[i]); });
        }
    }

    // リッチエディターの contenteditable 要素
    _richEditor(dlg: HTMLElement): HTMLElement | null {
        return dlg.querySelector('[data-testid="editor"] [contenteditable="true"]') as HTMLElement | null;
    }
    _writeRichEditor(dlg: HTMLElement, html: string) {
        const el = this._richEditor(dlg);
        if (el == null) return;
        el.innerHTML = html;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("keyup", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
    }

    // name 指定のチェックボックスを読む/書く
    _readCheckboxByName(dlg: HTMLElement, name: string): boolean | null {
        const cb = dlg.querySelector(`input[type="checkbox"][name="${name}"]`) as HTMLInputElement | null;
        return cb ? cb.checked : null;
    }
    _writeCheckboxByName(dlg: HTMLElement, name: string, checked: boolean) {
        const cb = dlg.querySelector(`input[type="checkbox"][name="${name}"]`) as HTMLInputElement | null;
        if (cb && cb.checked !== checked) cb.click();
    }

    // 添付ファイルの「サムネイルの大きさ」ドロップダウンのコンテナ
    _thumbnailContainer(dlg: HTMLElement): Element | null {
        const label = Array.from(dlg.querySelectorAll("label")).find((l) => (l.textContent ?? "").includes("サムネイル"));
        return label ? label.closest('[class*="dialogFormControlContainer"]') : null;
    }

    // React 管理の input/textarea に値をセットする（native setter + input/change 発火）
    _setReactInput(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
        const proto = input instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) {
            desc.set.call(input, value);
        } else {
            input.value = value;
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    _wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ===== 選択肢系（ドロップダウン/ラジオ/チェック/複数選択） =====

    // 選択肢（項目と順番）を読む
    _readSelections(dlg: HTMLElement): string[] {
        return Array.from(dlg.querySelectorAll('input[aria-label="選択肢名"]'))
            .map((i) => (i as HTMLInputElement).value)
            .filter((v) => v !== "");
    }

    // 選択肢を書き込む。既存の選択肢は残し、コピー分のうち未存在のものだけを末尾に追加する（重複はスキップ）。
    async _writeSelections(dlg: HTMLElement, values: string[]) {
        if (!values || values.length === 0) return;

        // 既存（非空）＋ コピー分の新規、をマージした最終リストを作る
        const existing = this._readSelections(dlg);
        const merged = existing.slice();
        for (const v of values) {
            if (v !== "" && !merged.includes(v)) merged.push(v);
        }
        if (merged.length === 0) return;
        values = merged;

        const itemSel = '[class*="FieldOptions-options-item"]';
        const count = () => dlg.querySelectorAll(itemSel).length;

        // 行数が target になるまで、ボタンをクリックしては行数が変わるのを待つ（React再描画待ち）
        const clickAndWait = async (btn: HTMLElement | null, from: number): Promise<boolean> => {
            if (btn == null) return false;
            btn.click();
            let waited = 0;
            while (count() === from && waited < 600) {
                await this._wait(50);
                waited += 50;
            }
            return count() !== from;
        };

        // 追加
        let guard = 0;
        while (count() < values.length && guard++ < 100) {
            const rows = dlg.querySelectorAll(itemSel);
            const last = rows[rows.length - 1];
            const addBtn = last ? (last.querySelector('button[title="追加する"]') as HTMLElement | null) : null;
            if (!(await clickAndWait(addBtn, count()))) break;
        }
        // 削除（最低1行は残す）
        guard = 0;
        while (count() > values.length && count() > 1 && guard++ < 100) {
            const rows = dlg.querySelectorAll(itemSel);
            const last = rows[rows.length - 1];
            const rmBtn = last ? (last.querySelector('button[title="削除する"]') as HTMLElement | null) : null;
            if (!(await clickAndWait(rmBtn, count()))) break;
        }

        // 値をセット（行が確定してから再クエリ）
        const inputs = Array.from(dlg.querySelectorAll('input[aria-label="選択肢名"]')) as HTMLInputElement[];
        values.forEach((v, i) => { if (inputs[i]) this._setReactInput(inputs[i], v); });
    }

    // 並び（align ラジオ: horizontal/vertical）
    _readAlign(dlg: HTMLElement): string | null {
        const radios = Array.from(dlg.querySelectorAll('input[name="align"]')) as HTMLInputElement[];
        const checked = radios.find((r) => r.checked);
        return checked ? checked.value : null;
    }
    _writeAlign(dlg: HTMLElement, value: string) {
        const radios = Array.from(dlg.querySelectorAll('input[name="align"]')) as HTMLInputElement[];
        const target = radios.find((r) => r.value === value);
        if (target && !target.checked) target.click();
    }

    // 初期値（選択）を読む。複数選択はインラインlistbox、単一選択はドロップダウンボタン。
    _readDefaultSelections(dlg: HTMLElement): string[] {
        const listbox = dlg.querySelector('[role="listbox"]');
        if (listbox) {
            return Array.from(listbox.querySelectorAll('[role="option"]'))
                .filter((o) => o.getAttribute("aria-selected") === "true")
                .map((o) => (o.getAttribute("title") || o.textContent || "").trim())
                .filter((t) => t !== "");
        }
        // ドロップダウン/ラジオ（単一）: 初期値のドロップダウンボタン。
        // 選択肢を持つフィールド（項目と順番あり）のときだけ対象にする。
        // 添付ファイルのサムネイル等、別の DropdownButton を初期値と誤認しないため。
        const hasOptions = dlg.querySelector('input[aria-label="選択肢名"]') != null;
        if (hasOptions) {
            const ddLabel = dlg.querySelector('[data-testid="shared-forms-Dropdown-DropdownButton-selectedLabel"]');
            if (ddLabel) {
                const t = (ddLabel.textContent ?? "").trim();
                return t ? [t] : [];
            }
        }
        return [];
    }

    // 初期値（選択）を書き込む
    async _writeDefaultSelections(dlg: HTMLElement, values: string[]) {
        // 複数選択（インライン listbox）: 各項目を目的の状態にトグルする
        const listbox = dlg.querySelector('[role="listbox"]');
        if (listbox) {
            const desired = new Set(values);
            for (const opt of Array.from(listbox.querySelectorAll('[role="option"]'))) {
                const text = (opt.getAttribute("title") || opt.textContent || "").trim();
                if (text === "") continue;
                const sel = opt.getAttribute("aria-selected") === "true";
                if (sel !== desired.has(text)) {
                    (opt as HTMLElement).click();
                    await this._wait(30);
                }
            }
            return;
        }
        // 単一選択（ドロップダウンボタン）: 開いてポップアップの一致項目をクリックする
        const ddButton = dlg.querySelector('[data-testid="shared-forms-Dropdown-DropdownButton"]') as HTMLElement | null;
        if (ddButton) {
            const value = values[0];
            if (!value) return;
            const curLabel = dlg.querySelector('[data-testid="shared-forms-Dropdown-DropdownButton-selectedLabel"]');
            if (curLabel && (curLabel.textContent ?? "").trim() === value) return;   // 既に一致

            ddButton.click();
            await this._wait(150);
            const opt = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"]'))
                .find((o) => (o as HTMLElement).offsetParent !== null && (o.textContent ?? "").trim() === value) as HTMLElement | undefined;
            if (opt) {
                opt.click();
                await this._wait(50);
            } else {
                ddButton.click();   // 閉じる
                console.warn(`[kinToys] 初期値の候補が見つかりませんでした: "${value}"`);
            }
            return;
        }
    }
}
