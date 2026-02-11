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

    // 計算フィールドの設定
    expression?: string;    // 計算式
    showExpression?: boolean; // 計算式を表示するか
    decimalFormat?: string; // 書式
    displayScale?: string; // 小数点以下の表示桁数
    unit?: string; // 単位記号
    unitPosition?: "BEFORE" | "AFTER";   // 単位記号の位置

}

export class SettingDialogDuplicator {

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
        tooltip.style.position = "absolute";
        tooltip.style.backgroundColor = "black";
        tooltip.style.color = "white";
        tooltip.style.padding = "5px";
        tooltip.style.borderRadius = "5px";
        tooltip.style.top = `${event.clientY + 10}px`;
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.zIndex = '1000';
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
        // クリップボードにダイアログ情報をコピーする
        window.focus();
        navigator.clipboard.writeText(JSON.stringify(info));
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

        // 項目と順番を取得
        const selections = this.selections();
        console.log({ selections });

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
            unitPosition: unitPosition
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
}
