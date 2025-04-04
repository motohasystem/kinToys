/**
 * アプリ設定画面のダイアログ項目をコピーする機能を持ったユーティリティクラス
 */

import { Utils } from "../utils";

interface DialogJson {
    fieldname?: string;
    fieldcode?: string;
    hideFieldName?: boolean;
    hasExpression?: boolean;
    requiredField?: boolean;
    uniqueCheck?: boolean;
    selections?: string[];
}

export class SettingDialogDuplicator {

    // 設定画面のダイアログ表示を監視する
    watchDialogSpawn() {
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
        const { CONST: C } = Utils;

        // ダイアログの中にあるクローズボタンを取得する
        const closeButton = document.querySelector(".ocean-ui-dialog-title-close");

        // 増殖回避のため、ダイアログの中にあるコピペボタンを取得する
        const copyButton = document.getElementById(C.id_copy_button);
        const pasteButton = document.getElementById(C.id_paste_button);

        // コピペボタンが存在しない場合のみ、アイコンを追加する
        if (copyButton || pasteButton) {
            return;
        }

        if (closeButton && closeButton.parentNode) {
            const copyIcon = document.createElement("span");
            copyIcon.id = C.id_copy_button;
            copyIcon.textContent = C.icon_field_setting_copy;
            copyIcon.style.cursor = "pointer";
            copyIcon.onclick = (event) => {
                this.copy(event);
                this.showTooltip(event, "copy!");
            };
            closeButton.parentNode.insertBefore(copyIcon, closeButton);

            const pasteIcon = document.createElement("span");
            pasteIcon.id = C.id_paste_button;
            pasteIcon.textContent = C.icon_field_setting_paste;
            pasteIcon.style.cursor = "pointer";
            pasteIcon.onclick = (event) => {
                this.paste(event);
                this.showTooltip(event, "paste!");
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
            // ダイアログ情報をセットする
            SettingDialogDuplicator.setDialogJson(JSON.parse(text));
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
        // console.log({ value });
        const fieldname = document.querySelectorAll(
            '[id^="label-"][id$="-text"]'
        ) as NodeListOf<HTMLInputElement>;
        console.log({ fieldname });
        let namevalue = fieldname[0].value;

        // console.log({ namevalue });

        if (value != null) {
            const oldValue = namevalue;
            fieldname[0].value = value;
            console.log({ oldValue, newValue: fieldname[0].value });
            return oldValue;
        }
        return namevalue;
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
