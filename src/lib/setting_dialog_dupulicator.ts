/**
 * アプリ設定画面のダイアログ項目をコピーする機能を持ったユーティリティクラス
 */

import { Utils } from "../utils";
// import { Names } from "./Names";

interface DialogJson {
    fieldname?: string;
    fieldcode?: string;
    hideFieldName?: boolean;
    hasExpression?: boolean;
    requiredField?: boolean;
    uniqueCheck?: boolean;
    selections?: string[];

    // 初期値・文字数/数値範囲（プレーンな input）
    defaultValue?: string;  // 初期値（defaultValue-*-text）
    min?: string;           // 最小（文字数 or 数値の最小値）（min-*-text）
    max?: string;           // 最大（文字数 or 数値の最大値）（max-*-text）
    digit?: boolean;        // 桁区切りを表示する（数値。digit-*-checkbox）

    // 日付/時刻/日時の初期値
    defaultExpression?: boolean;  // 登録時の日時を初期値にする（defaultExpression-*-checkbox）
    defaultDateTime?: string[];   // 手動指定の初期値（日付/時刻）。日時型は [日付, 時刻] の2要素

    // ラジオ/チェックボックス/複数選択の項目の配置（並び）
    align?: string;               // align ラジオ: "horizontal" / "vertical"

    // リンクの入力値の種類
    protocol?: string;            // protocol ラジオ: "WEB" / "CALL" / "MAIL"

    // ユーザー/組織/グループ選択の複数選択許可
    hasSelect?: boolean;          // hasSelect-*-checkbox（複数選択を許可する）

    // 添付ファイルのサムネイルの大きさ（goog-menu-button の表示値。例: "150x150"）
    thumbnailSize?: string;

    // リッチエディターの初期値（HTML）
    defaultValueHtml?: string;    // contenteditable（…defaultValue-editor）の innerHTML

    // 初期値（選択系フィールドの初期選択）。ドロップダウンは単一、ラジオ/チェック/複数選択は複数になり得る
    defaultSelections?: string[];

    // 計算フィールドの設定
    expression?: string;    // 計算式
    showExpression?: boolean; // 計算式を表示するか
    decimalFormat?: string; // 書式
    displayScale?: string; // 小数点以下の表示桁数
    unit?: string; // 単位記号
    unitPosition?: "BEFORE" | "AFTER";   // 単位記号の位置

    // 関連レコード一覧（reference_table）の設定
    referenceTable?: ReferenceTableJson;

    // ルックアップ（lookup）の設定
    lookup?: LookupJson;
}

// 絞り込み条件（さらに絞り込む条件／絞り込みの初期設定）。関連レコード・ルックアップ共通。
interface FilterCondJson {
    conditions: Array<{
        field: string;          // 条件フィールド名
        operator: string;       // 演算子ラベル（例: "=（等しい）", "次のいずれかを含む"）
        value?: string;         // テキスト/日付の値
        values?: string[];      // ドロップダウン/チェック等（multipleselect）の選択値
        dateMode?: string;      // 日付の指定方法（例: "日付を指定", "今日"）
    }>;
    junction?: string;          // 複数条件の結合 "and" / "or"
}

// ルックアップ（lookup）フィールド固有の設定
interface LookupJson {
    relatedApp?: string;    // 関連付けるアプリ名（表示テキスト。設定はアプリ選択UIの制約上、自動適用しない）
    keyField?: string;      // コピー元のフィールド（キー）。保存済みはロックされ変更不可
    recordSearchType?: boolean; // レコード取得時の検索方式（recordSearchType-*-checkbox）
    fieldMappings?: Array<{ // ほかのフィールドのコピー（コピー先 ← コピー元 のペア）
        field: string;          // コピー先（自アプリ）のフィールド
        relatedField: string;   // コピー元（関連アプリ）のフィールド
    }>;
    displayFields?: string[];   // コピー元のレコードの選択時に表示するフィールド
    filterCond?: FilterCondJson; // 絞り込みの初期設定
    sort?: {                    // ソートの初期設定
        field: string;
        order: string;          // 「昇順」または「降順」
    };
}

// 関連レコード一覧（reference_table）フィールド固有の設定
interface ReferenceTableJson {
    relatedApp?: string;    // 参照するアプリ名（表示テキスト。設定はアプリ選択UIの制約上、自動適用しない）
    condition?: {           // 表示するレコードの条件（自アプリのフィールド = 参照先アプリのフィールド）
        field: string;          // 自アプリ側のフィールド
        relatedField: string;   // 参照先アプリ側のフィールド
    };
    displayFields?: string[];   // 表示するフィールド（上から順）
    filterCond?: FilterCondJson; // さらに絞り込む条件
    sort?: {                    // レコードのソート
        field: string;          // ソート対象フィールド
        order: string;          // 「昇順」または「降順」
    };
    maxRecords?: string;        // 一度に表示する最大レコード数（goog-menu-button の表示値。例: "10"）
}

export class SettingDialogDuplicator {

    // コピー時に整形JSON（インデント付き）にするか。オプションで切替。未設定時は整形ON。
    prettyJson: boolean = true;

    // ポップアップ/オプションの設定を受け取り、コピー整形の有無を反映する
    setOptions(options: { [key: string]: any } | undefined) {
        if (options == null) return;
        const key = Utils.Ids.id_field_setting_copy_pretty;
        if (key in options && options[key] != null) {
            // 未設定/"true" は整形、"false" のときだけ1行にする
            this.prettyJson = options[key] !== "false";
        }
    }

    // フィールド設定画面を開いているか判定する
    static isSettingDialogOpen() {
        // URLが Utils.CONST.url_enable_copy_button_re にマッチするか確認
        const url = location.href;
        const isSettingDialog = new RegExp(Utils.CONST.url_enable_copy_button_re).test(url);
        console.log("isSettingDialogOpen: ", isSettingDialog, url);
        return isSettingDialog;
    }

    // 設定画面のダイアログ表示を監視する
    watchDialogSpawn() {
        // フィールド設定画面でなければ何もせず終了
        if (!SettingDialogDuplicator.isSettingDialogOpen()) {
            // console.log("フィールド設定画面ではないので、何もしません。");
            return;
        }

        console.log("フィールド設定画面を監視します。");
        // ダイアログ表示を監視する
        const targetSelector = "ocean-ui-dialog";

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // console.log("mutation: ", mutation);
                // 子要素の追加を監視
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach((node) => {
                        if (
                            node.nodeType === 1 &&
                            // @ts-ignore
                            node.classList.contains(targetSelector)
                        ) {
                            console.log("target-node が追加された!", node);
                            this.addCopyPasteIcon();
                        }
                    });

                    mutation.removedNodes.forEach((node) => {
                        if (
                            node.nodeType === 1 &&
                            // @ts-ignore
                            node.classList.contains(targetSelector)
                        ) {
                            console.log("target-node が削除された!", node);
                        }
                    });
                }
            });
        });

        // 監視対象の親要素
        const targetNode = document.body; // 例: `document.body` を監視
        const config = { childList: true, subtree: true }; // 子要素の追加・削除を監視
        observer.observe(targetNode, config);
        observer.observe(targetNode, config);
    }

    // デバッグ用に、アイコンを作成する
    addCopyPasteIcon() {
        const { Ids, Labels } = Utils;

        // ダイアログの中にあるクローズボタンを取得する
        const closeButton = document.querySelector(".ocean-ui-dialog-title-close");

        // 増殖回避のため、ダイアログの中にあるコピペボタンを取得する
        const copyButton = document.getElementById(Ids.id_copy_button);
        const pasteButton = document.getElementById(Ids.id_paste_button);

        // コピペボタンが存在しない場合のみ、アイコンを追加する
        if (copyButton || pasteButton) {
            return;
        }

        if (closeButton && closeButton.parentNode) {
            const copyIcon = document.createElement("span");
            copyIcon.id = Ids.id_copy_button;
            copyIcon.textContent = Labels.icon_field_setting_copy;
            copyIcon.style.cursor = "pointer";
            copyIcon.onclick = (event) => {
                try {
                    this.copy(event);
                } catch (error) {
                    console.error("コピーに失敗しました:", error);
                    this.showTooltip(event, "copy failed!");
                    return;
                }
                this.showTooltip(event, "copy!");
            };
            closeButton.parentNode.insertBefore(copyIcon, closeButton);

            const pasteIcon = document.createElement("span");
            pasteIcon.id = Ids.id_paste_button;
            pasteIcon.textContent = Labels.icon_field_setting_paste;
            pasteIcon.style.cursor = "pointer";
            pasteIcon.onclick = (event) => {
                this.paste(event);
            };
            closeButton.parentNode.insertBefore(pasteIcon, closeButton);
        } else {
            console.log("Close button not found");
        }
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
        tooltip.style.zIndex = '100000';
        document.body.appendChild(tooltip);

        setTimeout(() => {
            document.body.removeChild(tooltip);
        }, 2000);
    }


    copy(event: MouseEvent) {
        event.preventDefault(); // クリック時のデフォルト動作を無効化
        event.stopPropagation(); // イベントのバブリングを防ぐ

        const info = SettingDialogDuplicator.getDialogJson();
        console.log({ info });
        // ドキュメントにフォーカスを設定する
        // クリップボードにダイアログ情報をコピーする。オプションに応じて整形JSON（2スペース）/1行を切り替える。
        // ペースト側は改行を除去してから JSON.parse するため、整形しても読み戻せる
        // （文字列値内の改行は "\n" にエスケープされるので影響しない）。
        window.focus();
        const json = this.prettyJson ? JSON.stringify(info, null, 2) : JSON.stringify(info);
        navigator.clipboard.writeText(json);
    }

    // ペーストボタンにイベントを追加する
    paste(event: MouseEvent) {
        event.preventDefault(); // クリック時のデフォルト動作を無効化
        event.stopPropagation(); // イベントのバブリングを防ぐ
        // クリップボードからダイアログ情報を取得する
        navigator.clipboard.readText().then((text) => {
            console.log({ text });
            const sanitizedText = text.replace(/\r\n|\r|\n/g, "");
            // ダイアログ情報をセットする
            let jsonData;
            try {
                jsonData = JSON.parse(sanitizedText);
            } catch (e) {
                console.error("Invalid JSON data in clipboard:", e);
                this.showTooltip(event, "Not a JSON!");
                throw new Error("Invalid JSON data");

            }
            SettingDialogDuplicator.setDialogJson(jsonData);
            this.showTooltip(event, "paste!");

        });
    }

    getDialogInfo() {
        return SettingDialogDuplicator.getDialogJson();
    }

    // ダイアログ情報をJSONで取得するためのstaticメソッド
    static getDialogJson() {
        const fn = this.fieldName();
        const fc = this.fieldCode();
        const hideFN = this.hideFieldName();
        const hasExp = this.hasExpression();
        const required = this.requiredField();
        const uniqueCheck = this.uniqueField();
        const expression = this.expression();

        // 順番に実装
        const showExpression = this.showExpression();
        const decimalFormat = this.decimalFormat();
        const displayScale = this.displayScale();
        const unit = this.unit();
        const unitPosition = this.unitPosition();

        // 初期値・文字数/数値範囲・桁区切り
        const defaultValue = this.defaultValue();
        const min = this.min();
        const max = this.max();
        const digit = this.digit();

        // 日付/時刻/日時の初期値
        const defaultExpression = this.defaultExpression();
        const defaultDateTime = this.defaultDateTime();

        // ラジオ/チェック/複数選択の項目の配置
        const align = this.align();

        // リンクの入力値の種類
        const protocol = this.protocol();

        // リッチエディターの初期値（HTML）
        const defaultValueHtml = this.defaultValueHtml();

        // ユーザー/組織/グループ選択の複数選択許可
        const hasSelect = this.hasSelect();

        // 添付ファイルのサムネイルの大きさ
        const thumbnailSize = this._readThumbnailSize();

        // 初期値（選択系フィールドの初期選択）
        const defaultSelections = this._readDefaultSelections();

        // 項目と順番を取得
        const selections = this.selections();
        console.log({ selections });

        // 関連レコード一覧の設定（対象ダイアログのときのみ。それ以外は undefined で JSON から除外される）
        const referenceTable = this.isReferenceTableDialog() ? this.readReferenceTable() : undefined;

        // ルックアップの設定（対象ダイアログのときのみ）
        const lookup = this.isLookupDialog() ? this.readLookup() : undefined;

        return {
            fieldname: fn,
            fieldcode: fc,
            hideFieldName: hideFN,
            hasExpression: hasExp,
            requiredField: required,
            uniqueCheck: uniqueCheck,
            selections: selections,
            expression: expression,
            showExpression: showExpression,
            decimalFormat: decimalFormat,
            displayScale: displayScale,
            unit: unit,
            unitPosition: unitPosition,
            defaultValue: defaultValue,
            min: min,
            max: max,
            digit: digit,
            defaultExpression: defaultExpression,
            defaultDateTime: defaultDateTime,
            align: align,
            protocol: protocol,
            defaultValueHtml: defaultValueHtml,
            hasSelect: hasSelect,
            thumbnailSize: thumbnailSize,
            defaultSelections: defaultSelections,
            referenceTable: referenceTable,
            lookup: lookup
        };
    }

    // ダイアログ情報をJSONでセットする
    static setDialogJson(dialogJson: DialogJson = {}) {
        this.fieldName(dialogJson.fieldname);
        this.fieldCode(dialogJson.fieldcode);
        this.hideFieldName(dialogJson.hideFieldName);
        this.hasExpression(dialogJson.hasExpression);
        this.requiredField(dialogJson.requiredField);
        this.uniqueField(dialogJson.uniqueCheck);
        this.selections(dialogJson.selections);
        this.expression(dialogJson.expression);
        // 順番に実装
        this.showExpression(dialogJson.showExpression);
        this.decimalFormat(dialogJson.decimalFormat);
        this.displayScale(dialogJson.displayScale);
        this.unit(dialogJson.unit);
        this.unitPosition(dialogJson.unitPosition);
        this.defaultValue(dialogJson.defaultValue);
        this.min(dialogJson.min);
        this.max(dialogJson.max);
        this.digit(dialogJson.digit);
        // 日付/時刻/日時: 先にチェック状態を設定してから手動初期値を入れる
        this.defaultExpression(dialogJson.defaultExpression);
        this.defaultDateTime(dialogJson.defaultDateTime);
        // ラジオ/チェック/複数選択の項目の配置
        this.align(dialogJson.align);
        // リンクの入力値の種類
        this.protocol(dialogJson.protocol);
        // リッチエディターの初期値（HTML）
        this.defaultValueHtml(dialogJson.defaultValueHtml);
        // ユーザー/組織/グループ選択の複数選択許可
        this.hasSelect(dialogJson.hasSelect);
        // 添付ファイルのサムネイルの大きさ（goog-menu-button のため非同期）
        if (dialogJson.thumbnailSize) {
            const thumbBtn = this._thumbnailButton();
            if (thumbBtn) {
                this._selectMenuButton(thumbBtn, dialogJson.thumbnailSize)
                    .catch((e) => console.error("[kinToys] サムネイルの大きさの設定に失敗しました:", e));
            }
        }
        // 初期値（選択）: 選択肢の反映後に非同期で設定する
        if (dialogJson.defaultSelections && dialogJson.defaultSelections.length > 0) {
            this._writeDefaultSelections(dialogJson.defaultSelections)
                .catch((e) => console.error("[kinToys] 初期値の設定に失敗しました:", e));
        }

        // 関連レコード一覧の設定（対象ダイアログかつJSONに情報がある場合のみ）
        // 非同期（メニュー操作の待ちを含む）だが setDialogJson 自体は同期のため、ここでは待たずに実行する。
        if (dialogJson.referenceTable && this.isReferenceTableDialog()) {
            this.writeReferenceTable(dialogJson.referenceTable)
                .catch((e) => console.error("[kinToys] 関連レコード設定のペーストに失敗しました:", e));
        }

        // ルックアップの設定（対象ダイアログかつJSONに情報がある場合のみ）
        if (dialogJson.lookup && this.isLookupDialog()) {
            this.writeLookup(dialogJson.lookup)
                .catch((e) => console.error("[kinToys] ルックアップ設定のペーストに失敗しました:", e));
        }
    }

    static selections(options: string[] = []) {

        if (options.length > 0) {
            /////// ペースト処理
            // const lines = options.join("\n");
            // selectionsの末尾のノードを取得し、そこのaddボタンをクリックしてinput要素のvalueにoptions[index]をセットする
            const selectionRows = document.getElementsByClassName("treeeditor-node-item-cybozu");

            for (let i = 0; i < options.length; i++) {
                const lastNode = selectionRows[selectionRows.length - 1];
                const addButton = lastNode.querySelector(".treeeditor-node-item-add-cybozu");

                if (addButton) {
                    addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                }

                // 新しく追加されたinput要素を取得して、valueにoptions[i]をセットする
                const selections = document.querySelectorAll('[id^="node-"][id$="-text"]') as NodeListOf<HTMLInputElement>;
                const newInput = selections[selections.length - 1];

                if (newInput) {
                    newInput.value = options[i];

                    // 初期値リストに反映するために編集イベントをキックする
                    newInput.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }

            return null;
        }
        else {
            //////// コピー処理
            // node-:*-text の要素を取得する
            let selections = document.querySelectorAll('[id^="node-"][id$="-text"]') as NodeListOf<HTMLInputElement>;

            return Array.from(selections).map(selection => selection.value);
        }
    }

    // フィールド名の情報を取得/記入する
    static fieldName(value: string | undefined = undefined) {
        const label = this.standardInputUtil("label", "text", value);
        console.log({ label });
        return label;

    }

    // フィールドコードを取得/記入する
    static fieldCode(value: string | undefined = undefined) {
        const fieldcode = document.querySelectorAll('[id$=".contentEl"]');

        let text = (fieldcode[0].querySelector(
            ".input-inlinetext-show-cybozu"
        ) as HTMLElement).textContent;

        if (value != undefined) {
            const oldValue = text;
            (fieldcode[0].querySelector(
                ".input-inlinetext-show-cybozu span"
            ) as HTMLElement).textContent = value;

            (fieldcode[0].querySelector(`[id^="varname-"][id$="-text"]`) as HTMLInputElement).value = value;

            return oldValue;
        }
        return text;
    }

    // チェックボックス: フィールド名を表示しない
    static hideFieldName(flag: boolean | null = null) {
        return this.standardCheckboxUtil("noLabel", "checkbox", flag);
    }

    // チェックボックス: 自動計算する（一行文字列)
    static hasExpression(flag: boolean | null = null) {
        return this.standardCheckboxUtil("hasExpression", "checkbox", flag, true);
    }

    // チェックボックス: 必須項目にする
    static requiredField(flag: boolean | null = null) {
        return this.standardCheckboxUtil("required", "checkbox", flag);
    }

    // チェックボックス: 値の重複を禁止する
    static uniqueField(flag: boolean | null = null) {
        return this.standardCheckboxUtil("unique", "checkbox", flag);
    }

    // 計算式の取得/記入
    static expression(value: string | undefined = undefined) {
        const expression = this.standardInputUtil("expression", "textarea", value);
        console.log({ expression });

        return expression;
    }

    // 計算式を表示しない（チェックボックス）
    static showExpression(flag: boolean | null = null) {
        return this.standardCheckboxUtil("hideExpression", "checkbox", flag);
    }

    // 書式の取得/記入
    static decimalFormat(value: string | undefined = undefined) {
        return this.standardRadioUtil("format", value);
    }

    // 小数点以下の表示桁数の取得/記入
    static displayScale(value: string | undefined = undefined) {
        return this.standardInputUtil("displayScale", "text", value);
    }

    // 単位記号の取得/記入
    static unit(value: string | undefined = undefined) {
        return this.standardInputUtil("unit", "text", value);
    }

    // 単位記号の位置（ラジオボタン）の取得/記入
    static unitPosition(value: "BEFORE" | "AFTER" | undefined = undefined) {
        return this.standardRadioUtil("unitPosition", value) as "BEFORE" | "AFTER" | null;
    }

    // 初期値の取得/記入。
    // 文字列(1行)/数値/リンク等は input（defaultValue-*-text）、複数行文字列は textarea（defaultValue-textarea）。
    static defaultValue(value: string | undefined = undefined) {
        const el = document.querySelector(
            '[id^="defaultValue-"][id$="-text"], [id^="defaultValue-"][id$="-textarea"]'
        ) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el == null) return null;

        if (value != null) {
            const oldValue = el.value;
            el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return oldValue;
        }
        return el.value;
    }

    // 最小（文字数 or 数値の最小値）の取得/記入（min-*-text）
    static min(value: string | undefined = undefined) {
        return this.standardInputUtil("min", "text", value);
    }

    // 最大（文字数 or 数値の最大値）の取得/記入（max-*-text）
    static max(value: string | undefined = undefined) {
        return this.standardInputUtil("max", "text", value);
    }

    // 桁区切りを表示する（数値。digit-*-checkbox）の取得/記入
    static digit(flag: boolean | null = null) {
        return this.standardCheckboxUtil("digit", "checkbox", flag);
    }

    // 登録時の日時を初期値にする（日付/時刻/日時。defaultExpression-*-checkbox）の取得/記入。
    // 状態を変えるときは click して依存UI（初期値入力の活性/非活性）のハンドラも走らせる。
    static defaultExpression(flag: boolean | null = null) {
        const cb = document.querySelector('[id^="defaultExpression-"][id$="-checkbox"]') as HTMLInputElement | null;
        if (cb == null) return null;
        const oldValue = cb.checked;
        if (flag == null) return oldValue;
        if (cb.checked !== flag) {
            cb.click();
        }
        return oldValue;
    }

    // 項目の配置/並び（ラジオ/チェック/複数選択。align ラジオ: horizontal/vertical）の取得/記入
    static align(value: string | undefined = undefined) {
        return this.standardRadioUtil("align", value);
    }

    // リンクの入力値の種類（protocol ラジオ: WEB/CALL/MAIL）の取得/記入
    static protocol(value: string | undefined = undefined) {
        return this.standardRadioUtil("protocol", value);
    }

    // ルックアップのレコード取得時の検索方式（recordSearchType-*-checkbox）の取得/記入
    static recordSearchType(flag: boolean | null = null) {
        return this.standardCheckboxUtil("recordSearchType", "checkbox", flag);
    }

    // ユーザー/組織/グループ選択の複数選択許可（hasSelect-*-checkbox）の取得/記入
    static hasSelect(flag: boolean | null = null) {
        return this.standardCheckboxUtil("hasSelect", "checkbox", flag);
    }

    // ラベルテキストに sub を含む formRow 内の goog-menu-button を返す（汎用）
    static _menuButtonByLabel(sub: string): HTMLElement | null {
        const rows = Array.from(document.querySelectorAll(".formRow-cybozu"));
        for (const row of rows) {
            const label = row.querySelector(".input-label-cybozu");
            if (label && (label.textContent ?? "").includes(sub)) {
                const btn = row.querySelector(".goog-menu-button");
                if (btn) return btn as HTMLElement;
            }
        }
        return null;
    }

    // 添付ファイルの「サムネイルの大きさ」の goog-menu-button を返す
    static _thumbnailButton(): HTMLElement | null {
        return this._menuButtonByLabel("サムネイル");
    }

    // サムネイルの大きさの現在値を読む
    static _readThumbnailSize(): string {
        const btn = this._thumbnailButton();
        if (btn == null) return "";
        const c = btn.querySelector(".goog-menu-button-caption");
        return c ? (c.textContent ?? "").trim() : "";
    }

    // リッチエディターの初期値（HTML）の取得/記入。contenteditable の innerHTML を扱う。
    static defaultValueHtml(value: string | undefined = undefined) {
        const el = document.querySelector('[id$="defaultValue-editor"]') as HTMLElement | null;
        if (el == null) return null;

        if (value != null) {
            const oldValue = el.innerHTML;
            el.innerHTML = value;
            // エディタに変更を認識させる
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("keyup", { bubbles: true }));
            el.dispatchEvent(new Event("blur", { bubbles: true }));
            return oldValue;
        }
        return el.innerHTML;
    }

    // 「初期値」ラベルの formRow を返す。初期値ウィジェット（goog-menu-button または multipleselect-cybozu）を
    // 含む row のみ対象とする。日付などの「初期値」row はどちらも持たないため null になり、自然に弾ける。
    static _defaultSelectionRow(): Element | null {
        const rows = Array.from(document.querySelectorAll(".formRow-cybozu"));
        for (const row of rows) {
            const label = row.querySelector(".input-label-cybozu");
            if (label && (label.textContent ?? "").trim() === "初期値") {
                if (row.querySelector(".goog-menu-button") || row.querySelector(".multipleselect-cybozu")) {
                    return row;
                }
            }
        }
        return null;
    }

    // Closure メニュー項目を選択/トグルする。
    // 項目が「ハイライト（active）」状態でないと mouseup で確定しないため、mouseover を先に発火する。
    static _activateMenuItem(el: HTMLElement) {
        el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    // goog-menu-button（goog.ui.Select）を開いて、テキストが value の項目を選んで確定する。
    // 開いた直後は操作を受け付けないため十分待ってから項目上で mouseup する（待ち不足だとフレーキー）。
    // 正しいメニューは aria-activedescendant（ハイライト項目ID）の親から特定する。検証付きで数回リトライ。
    static async _selectMenuButton(btn: HTMLElement, value: string): Promise<boolean> {
        if (!value) return false;
        const capText = () => {
            const c = btn.querySelector(".goog-menu-button-caption");
            return c ? (c.textContent ?? "").trim() : "";
        };
        if (capText() === value) return true;

        for (let attempt = 0; attempt < 4 && capText() !== value; attempt++) {
            // すでに開いていれば一旦閉じてクリーンな状態にする
            if (btn.getAttribute("aria-expanded") === "true") {
                btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                await this._wait(80);
            }

            // ボタンを押したまま開き、操作可能になるまで待つ
            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
            await this._wait(220);

            const ad = btn.getAttribute("aria-activedescendant");
            const active = ad ? document.getElementById(ad) : null;
            const menu = (active && active.closest(".goog-menu"))
                || Array.from(document.querySelectorAll(".goog-menu"))
                    .find((m) => (m as HTMLElement).offsetParent !== null && m.querySelector(".goog-menuitem"));
            const item = menu
                ? (Array.from(menu.querySelectorAll(".goog-menuitem"))
                    .find((it) => (it.textContent ?? "").trim() === value) as HTMLElement | undefined)
                : undefined;

            if (item) {
                const r = item.getBoundingClientRect();
                const opts = {
                    bubbles: true, cancelable: true, view: window,
                    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
                };
                item.dispatchEvent(new MouseEvent("mousemove", opts));
                item.dispatchEvent(new MouseEvent("mouseover", opts));
                item.dispatchEvent(new MouseEvent("mouseup", opts));
                await this._wait(120);
            } else {
                if (btn.getAttribute("aria-expanded") === "true") {
                    btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                    btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                }
                await this._wait(80);
            }
        }
        return capText() === value;
    }

    // multipleselect-cybozu の項目テキストを取得する（先頭のチェックボックス div を除いた表示名）
    static _optionItemText(item: Element): string {
        const content = item.querySelector(".goog-menuitem-content");
        return content ? (content.textContent ?? "").trim() : (item.textContent ?? "").trim();
    }

    // 初期値（選択）の現在値を読む。ドロップダウンは単一、ラジオ/チェック/複数選択は複数になり得る。
    static _readDefaultSelections(): string[] {
        const row = this._defaultSelectionRow();
        if (row == null) return [];

        // ドロップダウン（単一）: goog-menu-button のキャプション
        const btn = row.querySelector(".goog-menu-button");
        if (btn) {
            const caption = btn.querySelector(".goog-menu-button-caption");
            const text = caption ? (caption.textContent ?? "").trim() : "";
            return text === "" ? [] : [text];
        }

        // ラジオ/チェック/複数選択: multipleselect-cybozu の選択済み項目
        const container = row.querySelector(".multipleselect-cybozu");
        if (container) {
            return Array.from(container.querySelectorAll(".goog-menuitem"))
                .filter((it) => it.classList.contains("goog-option-selected") || it.getAttribute("aria-checked") === "true")
                .map((it) => this._optionItemText(it))
                .filter((t) => t !== "");
        }
        return [];
    }

    // 初期値（選択）を設定する。選択肢（項目と順番）が反映済みである前提のため selections の後に呼ぶ。
    static async _writeDefaultSelections(values: string[]) {
        const row = this._defaultSelectionRow();
        if (row == null) return;
        await this._wait(30);   // 選択肢の反映待ち

        // ドロップダウン（単一）: goog-menu-button
        const btn = row.querySelector(".goog-menu-button") as HTMLElement | null;
        if (btn) {
            const value = values[0];
            if (!value) return;
            const ok = await this._selectMenuButton(btn, value);
            if (!ok) {
                console.warn(`[kinToys] 初期値の設定に失敗しました（候補: "${value}"）`);
            }
            return;
        }

        // ラジオ/チェック/複数選択: multipleselect-cybozu の各項目を目的の選択状態にトグルする
        const container = row.querySelector(".multipleselect-cybozu");
        if (container) {
            const desired = new Set(values);
            const items = Array.from(container.querySelectorAll(".goog-menuitem"));
            for (const it of items) {
                const text = this._optionItemText(it);
                if (text === "") continue;
                const isSelected = it.classList.contains("goog-option-selected") || it.getAttribute("aria-checked") === "true";
                const shouldSelect = desired.has(text);
                if (isSelected !== shouldSelect) {
                    this._activateMenuItem(it as HTMLElement);
                    await this._wait(20);
                }
            }
        }
    }

    // 日付/時刻/日時の手動初期値の取得/記入。
    // 入力欄の id が不安定なため、defaultExpression チェックと同じ formRow 内の text input を順に扱う。
    // 日時型は [日付, 時刻] の2要素になる。
    static defaultDateTime(values: string[] | undefined = undefined): string[] | undefined {
        const cb = document.querySelector('[id^="defaultExpression-"][id$="-checkbox"]');
        const row = cb ? cb.closest(".formRow-cybozu") : null;
        if (row == null) return values === undefined ? [] : undefined;

        const inputs = Array.from(row.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
        if (values === undefined) {
            return inputs.map((inp) => inp.value);
        }

        inputs.forEach((inp, i) => {
            if (i < values.length) {
                inp.value = values[i];
                inp.dispatchEvent(new Event("input", { bubbles: true }));
                inp.dispatchEvent(new Event("change", { bubbles: true }));
                inp.dispatchEvent(new Event("blur", { bubbles: true }));
            }
        });
        return undefined;
    }

    // ラジオボタン共通の処理
    static standardRadioUtil(name: string, value: string | undefined = undefined) {
        const radios = document.getElementsByName(name) as NodeListOf<HTMLInputElement>;

        if (value != undefined) {
            // valueに一致するラジオボタンを選択する
            for (let i = 0; i < radios.length; i++) {
                if (radios[i].value === value) {
                    radios[i].checked = true;
                    return;
                }
            }
        }

        // value == undefined の場合、選択されているラジオボタンのvalueを返す
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
                return radios[i].value;
            }
        }
        return null;
    }


    static standardInputUtil(prefix: string | null, suffix: string | null, value: string | undefined = undefined) {
        const queryString = ((pref, suff) => {
            if (pref == null && suff != null) {
                return `[id$="- ${suff}"]`;
            }
            if (pref != null && suff == null) {
                return `[id^="${pref}-"]`;
            }
            if (pref != null && suff != null) {
                return `[id^="${pref}-"][id$="-${suff}"]`;
            }
            return ''
        })(prefix, suffix);

        const input = document.querySelectorAll(
            queryString
        ) as NodeListOf<HTMLInputElement>;
        if (input.length === 0) {
            return null;
        }
        let inputValue = input[0].value;

        if (value != null) {
            const oldValue = inputValue;
            input[0].value = value;
            return oldValue;
        }
        return inputValue;
    }



    // チェックボックス共通の処理
    static standardCheckboxUtil(prefix: string, suffix: string, flag: boolean | null, click: boolean = false) {
        const checkbox = document.querySelectorAll(
            `[id^="${prefix}-"][id$="-${suffix}"]`
        ) as NodeListOf<HTMLInputElement>;

        if (checkbox.length === 0) {
            return null;
        }

        const oldValue = checkbox[0].checked;

        if (flag == null) {
            return oldValue;
        }


        // クリックイベントを発火する
        if (flag == true && click == true) {
            checkbox[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }

        checkbox[0].checked = flag;

        return oldValue;
    }

    // ===== 関連レコード一覧（reference_table）向けの処理 =====

    // 開いているダイアログが関連レコード一覧の設定かどうかを判定する。
    // ダイアログのクラス名（部分一致）と、関連レコード固有のDOM要素の有無を組み合わせて判定する。
    static isReferenceTableDialog(): boolean {
        // 例: gaia-ui-formmaker-control-settingdialogargo-type-reference_table
        const byClass = document.querySelector('[class*="type-reference_table"]') != null;
        // 参照アプリ選択ボタン + 表示するフィールド欄があれば関連レコード設定とみなす
        const byParts = document.getElementById("appselect-button") != null
            && document.querySelector(".formRow-masterfields") != null;
        return byClass || byParts;
    }

    // 関連レコード設定を読み取ってJSONにする
    static readReferenceTable(): ReferenceTableJson {
        return {
            relatedApp: this._relatedAppName(),
            condition: this._readCondition(),
            displayFields: this._readDisplayFields(),
            filterCond: this._readFilterCond() ?? undefined,
            sort: this._readSort(),
            maxRecords: this._readMaxRecords()
        };
    }

    // 一度に表示する最大レコード数（goog-menu-button）の現在値を読む
    static _readMaxRecords(): string {
        const btn = this._menuButtonByLabel("最大レコード数");
        if (btn == null) return "";
        const c = btn.querySelector(".goog-menu-button-caption");
        return c ? (c.textContent ?? "").trim() : "";
    }

    // 絞り込み条件（.filter-conditions-gaia）の条件行だけを返す（結合ラジオ/罫線/クリアは除外）
    static _filterCondRows(cont: Element): Element[] {
        return Array.from(cont.querySelectorAll(":scope > .filter-item-gaia")).filter((r) =>
            !r.classList.contains("filter-op-gaia")
            && !r.classList.contains("filter-item-clearer-gaia")
            && !r.classList.contains("filter-border-gaia"));
    }

    // 条件行の演算子（filter-item-input-gaia 直下の select-cybozu にある argoui-select）のラベルを読む。
    // 日付の指定方法（filter-item-datetime-gaia 内）とは別なので直下に限定する。
    static _readConditionOperator(input: Element | null): string {
        if (input == null) return "";
        const label = input.querySelector(":scope > .select-cybozu .gaia-argoui-select-label");
        return label ? (label.textContent ?? "").trim() : "";
    }

    // 絞り込み条件を読み取る。条件が無ければ null。
    static _readFilterCond(): FilterCondJson | null {
        const cont = document.querySelector(".filter-conditions-gaia");
        if (cont == null) return null;

        const conditions: FilterCondJson["conditions"] = [];
        for (const row of this._filterCondRows(cont)) {
            const field = this._readCombobox(row.querySelector(".filter-item-field-gaia .gaia-ui-fieldselect-combobox"));
            if (field === "") continue;   // 未設定行は除外
            const input = row.querySelector(".filter-item-input-gaia");
            const cond: FilterCondJson["conditions"][number] = {
                field,
                operator: this._readConditionOperator(input)
            };

            const datetime = input ? input.querySelector(".filter-item-datetime-gaia") : null;
            const multi = input ? input.querySelector(".multipleselect-cybozu") : null;
            if (datetime) {
                const modeLabel = datetime.querySelector(".gaia-argoui-select-label");
                cond.dateMode = modeLabel ? (modeLabel.textContent ?? "").trim() : "";
                const dInput = input ? input.querySelector(".input-date-cybozu input") as HTMLInputElement | null : null;
                cond.value = dInput ? dInput.value : "";
            } else if (multi) {
                cond.values = Array.from(multi.querySelectorAll(".goog-menuitem"))
                    .filter((it) => it.classList.contains("goog-option-selected") || it.getAttribute("aria-checked") === "true")
                    .map((it) => this._optionItemText(it))
                    .filter((t) => t !== "");
            } else {
                const tInput = input ? input.querySelector('.input-text-outer-cybozu input, input[id^="value-"]') as HTMLInputElement | null : null;
                cond.value = tInput ? tInput.value : "";
            }
            conditions.push(cond);
        }
        if (conditions.length === 0) return null;

        const junctionEl = cont.querySelector('.filter-op-gaia input[type="radio"]:checked') as HTMLInputElement | null;
        return { conditions, junction: junctionEl ? junctionEl.value : undefined };
    }

    // 絞り込み条件を書き込む。行数を合わせてから、各行のフィールド→演算子→値の順に設定する。
    static async _writeFilterCond(data: FilterCondJson) {
        const cont = document.querySelector(".filter-conditions-gaia");
        if (cont == null || !data.conditions || data.conditions.length === 0) return;

        // 行数を合わせる（追加）
        let rows = this._filterCondRows(cont);
        let guard = 0;
        while (rows.length < data.conditions.length && guard++ < 50) {
            const last = rows[rows.length - 1];
            const addBtn = last ? last.querySelector(".filter-item-add-gaia") : null;
            if (addBtn == null) break;
            addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await this._wait(40);
            const next = this._filterCondRows(cont);
            if (next.length === rows.length) break;
            rows = next;
        }
        // 余分な行を削除
        guard = 0;
        while (rows.length > data.conditions.length && rows.length > 1 && guard++ < 50) {
            const last = rows[rows.length - 1];
            const removeBtn = last ? last.querySelector(".filter-item-remove-gaia") : null;
            if (removeBtn == null) break;
            removeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await this._wait(40);
            const next = this._filterCondRows(cont);
            if (next.length === rows.length) break;
            rows = next;
        }

        // 各行を設定
        rows = this._filterCondRows(cont);
        for (let i = 0; i < data.conditions.length; i++) {
            const row = rows[i];
            const c = data.conditions[i];
            if (row == null) continue;

            // フィールド（選択で値ウィジェットが切り替わる）
            await this._selectCombobox(row.querySelector(".filter-item-field-gaia .gaia-ui-fieldselect-combobox"), c.field);
            await this._wait(80);

            const input = row.querySelector(".filter-item-input-gaia");
            // 演算子
            if (c.operator && input) {
                await this._setArgoSelect(input.querySelector(":scope > .select-cybozu .gaia-argoui-select"), c.operator);
                await this._wait(60);
            }

            // 値（ウィジェットは型・演算子で変わるので、この時点のDOMで判定する）
            const datetime = input ? input.querySelector(".filter-item-datetime-gaia") : null;
            const multi = input ? input.querySelector(".multipleselect-cybozu") : null;
            if (datetime) {
                if (c.dateMode) {
                    await this._setArgoSelect(datetime.querySelector(".gaia-argoui-select"), c.dateMode);
                    await this._wait(40);
                }
                if (c.value) {
                    const dInput = input ? input.querySelector(".input-date-cybozu input") as HTMLInputElement | null : null;
                    if (dInput) {
                        dInput.value = c.value;
                        dInput.dispatchEvent(new Event("input", { bubbles: true }));
                        dInput.dispatchEvent(new Event("change", { bubbles: true }));
                        dInput.dispatchEvent(new Event("blur", { bubbles: true }));
                    }
                }
            } else if (multi && c.values) {
                const desired = new Set(c.values);
                for (const it of Array.from(multi.querySelectorAll(".goog-menuitem"))) {
                    const text = this._optionItemText(it);
                    if (text === "") continue;
                    const isSel = it.classList.contains("goog-option-selected") || it.getAttribute("aria-checked") === "true";
                    if (isSel !== desired.has(text)) {
                        this._activateMenuItem(it as HTMLElement);
                        await this._wait(20);
                    }
                }
            } else if (c.value != null && input) {
                const tInput = input.querySelector('.input-text-outer-cybozu input, input[id^="value-"]') as HTMLInputElement | null;
                if (tInput) {
                    tInput.value = c.value;
                    tInput.dispatchEvent(new Event("input", { bubbles: true }));
                    tInput.dispatchEvent(new Event("change", { bubbles: true }));
                    tInput.dispatchEvent(new Event("blur", { bubbles: true }));
                }
            }
        }

        // 複数条件の結合（and/or ラジオ）
        if (data.junction) {
            const radio = Array.from(cont.querySelectorAll('.filter-op-gaia input[type="radio"]'))
                .find((r) => (r as HTMLInputElement).value === data.junction) as HTMLInputElement | undefined;
            if (radio && !radio.checked) {
                radio.click();
            }
        }
    }

    // 関連レコード設定をダイアログに書き戻す（非同期。コンボボックスをメニューから確定するため待ちを挟む）
    // 参照するアプリ（appselect-button）はアプリ検索UIを開く必要があり自動化が難しいため、ここでは設定しない。
    // 参照先アプリのフィールドは「参照するアプリ」が選択済みでないと候補に存在しないため、
    // 未選択・不一致のときは警告だけ出して処理は続行する（一致するフィールドはスキップされるだけで例外にはしない）。
    static async writeReferenceTable(data: ReferenceTableJson) {
        // 参照するアプリが未選択だと参照先フィールドの候補が存在せず、何も確定できない。
        // その場合はアラートで選択を促し、ペースト処理を中断する。
        const currentApp = this._relatedAppName();
        if (currentApp === "") {
            const expected = data.relatedApp ? `参照するアプリ「${data.relatedApp}」` : "参照するアプリ";
            window.alert(`${expected}が選択されていません。\n先に「参照するアプリ」を選択してから、もう一度ペーストしてください。`);
            return;
        }
        // 選択済みだが JSON と異なるアプリの場合は、別アプリへのペーストとして続行する（警告のみ）。
        if (data.relatedApp && currentApp !== data.relatedApp) {
            console.warn(`[kinToys] 参照するアプリが異なります（現在: "${currentApp}" / JSON: "${data.relatedApp}"）。別アプリとして続行します。`);
        }
        if (data.condition) {
            await this._writeCondition(data.condition);
        }
        if (data.displayFields) {
            await this._writeDisplayFields(data.displayFields);
        }
        if (data.filterCond) {
            await this._writeFilterCond(data.filterCond);
        }
        if (data.sort) {
            await this._writeSort(data.sort);
        }
        if (data.maxRecords) {
            const btn = this._menuButtonByLabel("最大レコード数");
            if (btn) {
                await this._selectMenuButton(btn, data.maxRecords);
            }
        }
    }

    // 指定ミリ秒待つ（DOMの再描画・メニュー表示を待つため）
    static _wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // 参照するアプリ名（表示テキスト）を読む。
    // 未選択のときはボタンにプレースホルダー（例:「アプリを選択してください」）が表示されるため、
    // その場合は未選択とみなして "" を返す。
    static _relatedAppName(): string {
        const btn = document.getElementById("appselect-button");
        if (btn == null) return "";
        const text = (btn.textContent ?? "").trim();
        // プレースホルダー文言は選択済みのアプリ名ではないので未選択扱いにする
        if (text === "" || /選択してください/.test(text) || /アプリを選択/.test(text)) {
            return "";
        }
        return text;
    }

    // goog-combobox（フィールド選択）の入力欄から値を読む
    static _readCombobox(comboboxSpan: Element | null): string {
        if (comboboxSpan == null) return "";
        const input = comboboxSpan.querySelector("input") as HTMLInputElement | null;
        return input ? input.value : "";
    }

    // goog-combobox（フィールド選択）に値を確定する。
    // Closure製コンポーネントのため input.value を直接書いても確定せずクリアされる。
    // 実際のユーザー操作と同じく「ドロップダウンを開く → 一致する項目をクリック」で選択を確定させる。
    // 戻り値: 確定できたら true、候補が見つからなければ false。
    static async _selectCombobox(comboboxSpan: Element | null, label: string): Promise<boolean> {
        if (comboboxSpan == null || label == null || label === "") return false;
        const input = comboboxSpan.querySelector("input") as HTMLInputElement | null;
        const button = comboboxSpan.querySelector(".goog-combobox-button") as HTMLElement | null;
        if (input == null || button == null) return false;

        // 既に同じ値なら何もしない
        if ((input.value ?? "").trim() === label) return true;

        // ドロップダウンを開く
        input.focus();
        button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        button.click();
        await this._wait(60);

        // 開いているフィールド選択メニューから、テキストが一致する項目を探してクリックする。
        // 項目を順次処理していれば、同時に開くメニューは基本1つ（クリックで閉じる）。
        const menus = Array.from(document.querySelectorAll(".gaia-ui-fieldselect-combobox-menu"))
            .filter((m) => (m as HTMLElement).offsetParent !== null);

        for (const menu of menus) {
            const item = Array.from(menu.querySelectorAll(".goog-menuitem"))
                .find((it) => (it.textContent ?? "").trim() === label) as HTMLElement | undefined;
            if (item) {
                item.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                item.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                item.click();
                await this._wait(30);
                return true;
            }
        }

        // 見つからなければメニューを閉じておく（別アプリで該当フィールドが無い場合など）
        button.click();
        console.warn(`[kinToys] フィールド候補が見つかりませんでした: "${label}"`);
        return false;
    }

    // 表示するレコードの条件（自アプリ側 / 参照先アプリ側のフィールド）を読む
    static _readCondition(): { field: string; relatedField: string } {
        const selfBox = document.querySelector(".formRow-filtercondition .formCol-filterinput .gaia-ui-fieldselect-combobox");
        const masterBox = document.querySelector(".formRow-filtercondition .formCol-filtermaster .gaia-ui-fieldselect-combobox");
        return {
            field: this._readCombobox(selfBox),
            relatedField: this._readCombobox(masterBox)
        };
    }

    // 表示するレコードの条件を書き込む
    static async _writeCondition(value: { field: string; relatedField: string }) {
        const selfBox = document.querySelector(".formRow-filtercondition .formCol-filterinput .gaia-ui-fieldselect-combobox");
        const masterBox = document.querySelector(".formRow-filtercondition .formCol-filtermaster .gaia-ui-fieldselect-combobox");
        await this._selectCombobox(selfBox, value.field);
        await this._selectCombobox(masterBox, value.relatedField);
    }

    // 表示するフィールド（treeeditorの各ノードのフィールド選択）を読む
    static _readDisplayFields(): string[] {
        return this._readTreeeditorFields(document.querySelector(".formRow-masterfields .treeeditor-nodes-cybozu"));
    }

    // 表示するフィールドを書き込む
    static async _writeDisplayFields(values: string[]) {
        await this._writeTreeeditorFields(document.querySelector(".formRow-masterfields .treeeditor-nodes-cybozu"), values);
    }

    // treeeditor（各ノードにフィールド選択コンボボックスを持つ）から値の配列を読む
    static _readTreeeditorFields(container: Element | null): string[] {
        if (container == null) return [];
        const nodes = container.querySelectorAll(".treeeditor-node-cybozu");
        return Array.from(nodes)
            .map((node) => this._readCombobox(node.querySelector(".gaia-ui-fieldselect-combobox")))
            .filter((v) => v !== "");   // 空ノードは除外
    }

    // treeeditor にノード数を合わせてから各値をメニューで確定する
    static async _writeTreeeditorFields(container: Element | null, values: string[]) {
        if (container == null || values.length === 0) return;

        // 目的の数までノードを増やす（末尾ノードの「追加」ボタンをクリック）
        let nodes = container.querySelectorAll(".treeeditor-node-cybozu");
        let guard = 0;
        while (nodes.length < values.length && guard++ < 100) {
            const last = nodes[nodes.length - 1];
            const addBtn = last ? last.querySelector(".treeeditor-node-item-add-cybozu") : null;
            if (addBtn == null) break;
            addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await this._wait(20);
            const next = container.querySelectorAll(".treeeditor-node-cybozu");
            if (next.length === nodes.length) break;   // 増えなければ無限ループ回避
            nodes = next;
        }

        // 余分なノードを末尾から削除する（「削除」ボタンをクリック）。最低1ノードは残す。
        guard = 0;
        while (nodes.length > values.length && nodes.length > 1 && guard++ < 100) {
            const last = nodes[nodes.length - 1];
            const removeBtn = last ? last.querySelector(".treeeditor-node-item-remove-cybozu") : null;
            if (removeBtn == null) break;
            removeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await this._wait(20);
            const next = container.querySelectorAll(".treeeditor-node-cybozu");
            if (next.length === nodes.length) break;
            nodes = next;
        }

        // 各ノードに値を順番に確定する
        nodes = container.querySelectorAll(".treeeditor-node-cybozu");
        for (let i = 0; i < values.length; i++) {
            const node = nodes[i];
            if (node) {
                await this._selectCombobox(node.querySelector(".gaia-ui-fieldselect-combobox"), values[i]);
            }
        }
    }

    // レコードのソート（フィールド + 昇順/降順）を読む
    static _readSort(): { field: string; order: string } {
        const sortRow = document.querySelector(".filter-sorts-gaia .filter-item-gaia");
        if (sortRow == null) return { field: "", order: "" };
        const orderLabel = sortRow.querySelector(".gaia-argoui-select-label");
        return {
            field: this._readCombobox(sortRow.querySelector(".gaia-ui-fieldselect-combobox")),
            order: orderLabel ? (orderLabel.textContent ?? "").trim() : ""
        };
    }

    // レコードのソートを書き込む
    static async _writeSort(value: { field: string; order: string }) {
        const sortRow = document.querySelector(".filter-sorts-gaia .filter-item-gaia");
        if (sortRow == null) return;
        await this._selectCombobox(sortRow.querySelector(".gaia-ui-fieldselect-combobox"), value.field);
        // 昇順/降順は gaia-argoui-select（カスタムドロップダウン）のため別処理で設定する
        await this._setArgoSelect(sortRow.querySelector(".gaia-argoui-select"), value.order);
    }

    // gaia-argoui-select（例: 昇順/降順）を指定ラベルに合わせる。
    // メニューを開いて一致する項目をクリックする。項目の構造は環境により異なるため複数のセレクタで探す。
    static async _setArgoSelect(selectEl: Element | null, label: string): Promise<void> {
        if (selectEl == null || !label) return;

        const current = selectEl.querySelector(".gaia-argoui-select-label");
        if (current && (current.textContent ?? "").trim() === label) return;   // 既に一致

        // メニューを開く
        const el = selectEl as HTMLElement;
        el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        el.click();
        await this._wait(60);

        // 開いたメニューから一致するオプションを探してクリックする
        const options = Array.from(document.querySelectorAll(
            '.goog-menuitem, [role="option"], [role="menuitemradio"], .gaia-argoui-select-menu-item'
        )).filter((o) => (o as HTMLElement).offsetParent !== null && (o.textContent ?? "").trim() === label);

        if (options.length > 0) {
            const o = options[0] as HTMLElement;
            o.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            o.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
            o.click();
            await this._wait(30);
            return;
        }
        // 一致するメニューが見つからなければ、開いたメニューを閉じるために再度クリックしておく
        el.click();
        console.warn(`[kinToys] ソート順の候補が見つかりませんでした: "${label}"`);
    }

    // ===== ルックアップ（lookup）向けの処理 =====

    // 開いているダイアログがルックアップの設定かどうかを判定する
    static isLookupDialog(): boolean {
        // 例: gaia-ui-formmaker-control-settingdialogargo-type-lookup（type-single_line_text と併記される）
        const byClass = document.querySelector('[class*="type-lookup"]') != null;
        // キーフィールド欄 or 対応付け欄があればルックアップ設定とみなす
        const byParts = document.querySelector(".formCol-lookup-keyMapping-cybozu") != null
            || document.querySelector(".filter-lookup-fieldmappings-gaia") != null;
        return byClass || byParts;
    }

    // ルックアップ設定を読み取ってJSONにする
    static readLookup(): LookupJson {
        return {
            relatedApp: this._lookupRelatedApp(),
            keyField: this._lookupKeyField(),
            recordSearchType: this.recordSearchType() as boolean | null ?? undefined,
            fieldMappings: this._readFieldMappings(),
            displayFields: this._readTreeeditorFields(document.querySelector(".treeeditor-nodes-cybozu")),
            filterCond: this._readFilterCond() ?? undefined,
            sort: this._readSort()   // ソートの初期設定（.filter-sorts-gaia は関連レコードと共通）
        };
    }

    // ルックアップ設定をダイアログに書き戻す（非同期）。
    // 「関連付けるアプリ」「コピー元のフィールド」はフォーム保存後は変更不可。新規フィールドへのペーストを想定。
    // 参照先（コピー元）アプリのフィールドは、関連付けるアプリが選択済みでないと候補が存在しないため、
    // 未選択のときはアラートで選択を促して中断する。
    static async writeLookup(data: LookupJson) {
        // 関連付けるアプリが未選択なら、候補が無く何も確定できないためアラートして中断する（新規フィールド時）
        if (!this._isLookupAppSelected()) {
            const btn = document.getElementById("appselect-button");
            if (btn != null) {
                const expected = data.relatedApp ? `関連付けるアプリ「${data.relatedApp}」` : "関連付けるアプリ";
                window.alert(`${expected}が選択されていません。\n先に「関連付けるアプリ」を選択してから、もう一度ペーストしてください。`);
                return;
            }
            // ボタンが無い＝保存済みでロックされているケース。以降の編集可能な項目だけ試みる。
        }

        // レコード取得時の検索方式（チェックボックス）
        this.recordSearchType(data.recordSearchType);

        // コピー元のフィールド（キー）: 新規のときだけコンボボックスがあり設定できる。保存済みはロックのためスキップ。
        if (data.keyField) {
            const col = document.querySelector(".formCol-lookup-keyMapping-cybozu");
            const combo = col ? col.querySelector(".gaia-ui-fieldselect-combobox") : null;
            if (combo != null) {
                await this._selectCombobox(combo, data.keyField);
            }
        }

        if (data.fieldMappings) {
            await this._writeFieldMappings(data.fieldMappings);
        }
        if (data.displayFields) {
            await this._writeTreeeditorFields(document.querySelector(".treeeditor-nodes-cybozu"), data.displayFields);
        }
        if (data.filterCond) {
            await this._writeFilterCond(data.filterCond);
        }
        if (data.sort) {
            await this._writeSort(data.sort);
        }
    }

    // 関連付けるアプリが選択済みか判定する（新規=appselect-buttonのテキスト / 保存済み=リンク表示）
    static _isLookupAppSelected(): boolean {
        return this._lookupRelatedApp() !== "";
    }

    // 関連付けるアプリ名を読む。新規はボタン、保存済みはリンク（a.lookup-selected-item-cybozu）から取得する。
    static _lookupRelatedApp(): string {
        // 新規（編集可）: appselect-button（未選択のプレースホルダーは "" になる）
        if (document.getElementById("appselect-button") != null) {
            return this._relatedAppName();
        }
        // 保存済み（ロック）: 関連付けるアプリのラベルと同じ列にあるリンクの表示テキスト
        const label = document.getElementById("appselect-label");
        const col = label ? label.closest(".formCol-cybozu") : null;
        const link = col ? col.querySelector(".lookup-selected-item-cybozu") : null;
        return link ? (link.textContent ?? "").trim() : "";
    }

    // コピー元のフィールド（キー）を読む。新規はコンボボックス、保存済みはラベル表示から取得する。
    static _lookupKeyField(): string {
        const col = document.querySelector(".formCol-lookup-keyMapping-cybozu");
        if (col == null) return "";
        const combo = col.querySelector(".gaia-ui-fieldselect-combobox");
        if (combo != null) {
            return this._readCombobox(combo);
        }
        const locked = col.querySelector(".lookup-selected-item-cybozu");
        return locked ? (locked.textContent ?? "").trim() : "";
    }

    // ほかのフィールドのコピー（コピー先 ← コピー元 のペア）を読む
    static _readFieldMappings(): Array<{ field: string; relatedField: string }> {
        const rows = document.querySelectorAll(".filter-lookup-fieldmappings-gaia .filter-item-gaia");
        const result: Array<{ field: string; relatedField: string }> = [];
        rows.forEach((row) => {
            const combos = row.querySelectorAll(".gaia-ui-fieldselect-combobox");
            if (combos.length < 2) return;
            const field = this._readCombobox(combos[0]);        // コピー先（自アプリ）
            const relatedField = this._readCombobox(combos[1]); // コピー元（関連アプリ）
            if (field === "" && relatedField === "") return;    // 空行は除外
            result.push({ field, relatedField });
        });
        return result;
    }

    // ほかのフィールドのコピーを書き込む。行数を合わせてから各行の2つのコンボボックスを確定する。
    static async _writeFieldMappings(mappings: Array<{ field: string; relatedField: string }>) {
        const container = document.querySelector(".filter-lookup-fieldmappings-gaia");
        if (container == null || mappings.length === 0) return;

        // 目的の行数まで増やす（末尾行の「追加」ボタンをクリック）
        let rows = container.querySelectorAll(".filter-item-gaia");
        let guard = 0;
        while (rows.length < mappings.length && guard++ < 100) {
            const last = rows[rows.length - 1];
            const addBtn = last ? last.querySelector(".filter-item-add-gaia") : null;
            if (addBtn == null) break;
            addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await this._wait(20);
            const next = container.querySelectorAll(".filter-item-gaia");
            if (next.length === rows.length) break;
            rows = next;
        }

        // 余分な行を末尾から削除する。最低1行は残す。
        guard = 0;
        while (rows.length > mappings.length && rows.length > 1 && guard++ < 100) {
            const last = rows[rows.length - 1];
            const removeBtn = last ? last.querySelector(".filter-item-remove-gaia") : null;
            if (removeBtn == null) break;
            removeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await this._wait(20);
            const next = container.querySelectorAll(".filter-item-gaia");
            if (next.length === rows.length) break;
            rows = next;
        }

        // 各行のコンボボックス（左=コピー先 / 右=コピー元）を順番に確定する
        rows = container.querySelectorAll(".filter-item-gaia");
        for (let i = 0; i < mappings.length; i++) {
            const row = rows[i];
            if (row == null) continue;
            const combos = row.querySelectorAll(".gaia-ui-fieldselect-combobox");
            if (combos.length >= 2) {
                await this._selectCombobox(combos[0], mappings[i].field);
                await this._selectCombobox(combos[1], mappings[i].relatedField);
            }
        }
    }
}
