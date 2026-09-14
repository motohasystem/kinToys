/**
 * 一覧画面の「絞り込む」ダイアログ（.gaia-argoui-app-filter-dialog）の
 * 条件・ソートをコピー/ペーストするユーティリティクラス。
 *
 * 条件行の中身（フィールド/演算子/値）はフィールド設定ダイアログの絞り込み条件と同じ部品なので、
 * SettingDialogDuplicator の静的ヘルパー（コンボボックス/argoui-select/メニュー操作）を流用する。
 * 行のラップ構造と追加/削除ボタンだけが異なる（.gaia-argoui-conditional-item / -add / -delete）。
 */

import { SettingDialogDuplicator as SDD } from "./setting_dialog_dupulicator";

// 1条件の型
interface FilterCondition {
    field: string;
    operator: string;
    value?: string;
    values?: string[];
    dateMode?: string;
}

interface FilterDialogJson {
    conditions: FilterCondition[];
    junction?: string;              // "and" / "or"
    sort: Array<{ field: string; order: string }>;
}

const DIALOG_SELECTOR = ".gaia-argoui-app-filter-dialog";
const COPY_ICON_ID = "filter_copy_button";
const PASTE_ICON_ID = "filter_paste_button";

export class FilterDialogDuplicator {

    // 「絞り込む」ダイアログの表示を監視し、コピペアイコンを差し込む
    watchDialogSpawn() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type !== "childList") return;
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && (node as HTMLElement).classList?.contains("gaia-argoui-app-filter-dialog")) {
                        this.addCopyPasteIcon(node as HTMLElement);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // 監視開始前に既に開いている場合にも対応
        const existing = document.querySelector(DIALOG_SELECTOR) as HTMLElement | null;
        if (existing) {
            this.addCopyPasteIcon(existing);
        }
    }

    // ダイアログのタイトル部に ⬆️（コピー）/ ⬇️（ペースト）アイコンを差し込む
    addCopyPasteIcon(dialog: HTMLElement) {
        if (dialog.querySelector(`#${COPY_ICON_ID}`) || dialog.querySelector(`#${PASTE_ICON_ID}`)) {
            return;   // 増殖回避
        }
        const closeButton = dialog.querySelector(".ocean-ui-dialog-title-close");
        if (closeButton == null || closeButton.parentNode == null) {
            return;
        }

        const copyIcon = document.createElement("span");
        copyIcon.id = COPY_ICON_ID;
        copyIcon.textContent = "⬆️";
        copyIcon.style.cursor = "pointer";
        copyIcon.onclick = (event) => {
            try {
                this.copy(event);
                this.showTooltip(event, "copy!");
            } catch (error) {
                console.error("絞り込み条件のコピーに失敗しました:", error);
                this.showTooltip(event, "copy failed!");
            }
        };
        closeButton.parentNode.insertBefore(copyIcon, closeButton);

        const pasteIcon = document.createElement("span");
        pasteIcon.id = PASTE_ICON_ID;
        pasteIcon.textContent = "⬇️";
        pasteIcon.style.cursor = "pointer";
        pasteIcon.onclick = (event) => {
            this.paste(event);
        };
        closeButton.parentNode.insertBefore(pasteIcon, closeButton);
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
        const info = this.readFilterDialog();
        window.focus();
        navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    }

    paste(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        navigator.clipboard.readText().then((text) => {
            const sanitizedText = text.replace(/\r\n|\r|\n/g, "");
            let jsonData: FilterDialogJson;
            try {
                jsonData = JSON.parse(sanitizedText);
            } catch (e) {
                console.error("Invalid JSON data in clipboard:", e);
                this.showTooltip(event, "Not a JSON!");
                return;
            }
            this.writeFilterDialog(jsonData)
                .then(() => this.showTooltip(event, "paste!"))
                .catch((e) => {
                    console.error("絞り込み条件のペーストに失敗しました:", e);
                    this.showTooltip(event, "paste failed!");
                });
        });
    }

    // ===== 読み取り =====

    readFilterDialog(): FilterDialogJson {
        const dlg = document.querySelector(DIALOG_SELECTOR);
        if (dlg == null) {
            return { conditions: [], sort: [] };
        }

        // 条件
        const conditions: FilterCondition[] = [];
        const condCont = dlg.querySelector(".filter-conditions-gaia");
        if (condCont) {
            condCont.querySelectorAll(".gaia-argoui-conditional-item .filter-item-gaia").forEach((row) => {
                const c = this._readConditionRow(row);
                if (c.field !== "") {
                    conditions.push(c);
                }
            });
        }
        const junctionEl = condCont
            ? condCont.querySelector('.filter-op-gaia input[type="radio"]:checked') as HTMLInputElement | null
            : null;
        const junction = junctionEl ? junctionEl.value : undefined;

        // ソート（複数可）
        const sort: Array<{ field: string; order: string }> = [];
        const sortCont = this._containerByLabel(dlg, "ソート");
        if (sortCont) {
            sortCont.querySelectorAll(".gaia-argoui-conditional-item .filter-item-gaia").forEach((row) => {
                const field = SDD._readCombobox(row.querySelector(".gaia-ui-fieldselect-combobox"));
                const orderLabel = row.querySelector(".gaia-argoui-select-label");
                const order = orderLabel ? (orderLabel.textContent ?? "").trim() : "";
                if (field !== "") {
                    sort.push({ field, order });
                }
            });
        }

        return { conditions, junction, sort };
    }

    // 1条件行を読む（フィールド/演算子/値）
    _readConditionRow(row: Element): FilterCondition {
        const field = SDD._readCombobox(row.querySelector(".filter-item-field-gaia .gaia-ui-fieldselect-combobox"));
        const input = row.querySelector(".filter-item-input-gaia");
        const cond: FilterCondition = { field, operator: SDD._readConditionOperator(input) };

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
                .map((it) => SDD._optionItemText(it))
                .filter((t) => t !== "");
        } else {
            const tInput = input ? input.querySelector('.input-text-outer-cybozu input, input[id^="value-"]') as HTMLInputElement | null : null;
            cond.value = tInput ? tInput.value : "";
        }
        return cond;
    }

    // ラベル（条件/ソート）で .gaia-argoui-conditional-container を特定する
    _containerByLabel(dlg: Element, label: string): Element | null {
        const conts = Array.from(dlg.querySelectorAll(".gaia-argoui-conditional-container"));
        for (const c of conts) {
            const l = c.querySelector(".gaia-argoui-conditional-label span");
            if (l && (l.textContent ?? "").trim() === label) {
                return c;
            }
        }
        return null;
    }

    // ===== 書き込み =====

    async writeFilterDialog(data: FilterDialogJson) {
        const dlg = document.querySelector(DIALOG_SELECTOR);
        if (dlg == null) return;

        // 条件
        // 既存条件が残っていると（特に同じフィールドが含まれる場合）コンボボックスの状態が干渉して
        // 挙動が乱れるため、先に「すべてクリア」で条件をリセットしてから書き込む。
        const clearBtn = dlg.querySelector(".filter-remove-all-condition-gaia") as HTMLElement | null;
        if (clearBtn && data.conditions) {
            clearBtn.click();
            await SDD._wait(120);
        }
        const condWidget = dlg.querySelector(".filter-conditions-gaia");
        if (condWidget && data.conditions) {
            await this._adjustRows(condWidget, data.conditions.length);
            const items = condWidget.querySelectorAll(".gaia-argoui-conditional-items > .gaia-argoui-conditional-item");
            for (let i = 0; i < data.conditions.length; i++) {
                const item = items[i];
                if (item == null) continue;
                const row = item.querySelector(".filter-item-gaia");
                if (row) {
                    await this._writeConditionRow(row, data.conditions[i]);
                }
            }
            // AND/OR
            if (data.junction) {
                const radio = Array.from(condWidget.querySelectorAll('.filter-op-gaia input[type="radio"]'))
                    .find((r) => (r as HTMLInputElement).value === data.junction) as HTMLInputElement | undefined;
                if (radio && !radio.checked) {
                    radio.click();
                }
            }
        }

        // ソート
        const sortCont = this._containerByLabel(dlg, "ソート");
        const sortWidget = sortCont ? sortCont.querySelector(".gaia-argoui-conditional") : null;
        if (sortWidget && data.sort) {
            await this._adjustRows(sortWidget, data.sort.length);
            const items = sortWidget.querySelectorAll(".gaia-argoui-conditional-items > .gaia-argoui-conditional-item");
            for (let i = 0; i < data.sort.length; i++) {
                const item = items[i];
                if (item == null) continue;
                const row = item.querySelector(".filter-item-gaia");
                if (row == null) continue;
                await SDD._selectCombobox(row.querySelector(".gaia-ui-fieldselect-combobox"), data.sort[i].field);
                await SDD._wait(60);
                await SDD._setArgoSelect(row.querySelector(".gaia-argoui-select"), data.sort[i].order);
                await SDD._wait(40);
            }
        }
    }

    // .gaia-argoui-conditional ウィジェットの行数を目的の数に合わせる
    async _adjustRows(widget: Element, targetCount: number) {
        const itemsSel = ".gaia-argoui-conditional-items > .gaia-argoui-conditional-item";
        const addBtn = widget.querySelector(".gaia-argoui-conditional-add") as HTMLElement | null;

        // 追加
        let items = widget.querySelectorAll(itemsSel);
        let guard = 0;
        while (items.length < targetCount && addBtn && guard++ < 50) {
            addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await SDD._wait(40);
            const next = widget.querySelectorAll(itemsSel);
            if (next.length === items.length) break;
            items = next;
        }

        // 削除（末尾から。無効化された削除ボタンは最後の1行なのでそこで止める）
        guard = 0;
        while (items.length > targetCount && items.length > 0 && guard++ < 50) {
            const last = items[items.length - 1];
            const del = last.querySelector(".gaia-argoui-conditional-delete") as HTMLElement | null;
            if (del == null || del.classList.contains("gaia-argoui-conditional-disabled")) break;
            del.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await SDD._wait(40);
            const next = widget.querySelectorAll(itemsSel);
            if (next.length === items.length) break;
            items = next;
        }
    }

    // 1条件行を書き込む（フィールド→演算子→値）
    async _writeConditionRow(row: Element, c: FilterCondition) {
        await SDD._selectCombobox(row.querySelector(".filter-item-field-gaia .gaia-ui-fieldselect-combobox"), c.field);
        await SDD._wait(80);

        const input = row.querySelector(".filter-item-input-gaia");
        if (c.operator && input) {
            await SDD._setArgoSelect(input.querySelector(":scope > .select-cybozu .gaia-argoui-select"), c.operator);
            await SDD._wait(60);
        }

        const datetime = input ? input.querySelector(".filter-item-datetime-gaia") : null;
        const multi = input ? input.querySelector(".multipleselect-cybozu") : null;
        if (datetime) {
            if (c.dateMode) {
                await SDD._setArgoSelect(datetime.querySelector(".gaia-argoui-select"), c.dateMode);
                await SDD._wait(40);
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
                const text = SDD._optionItemText(it);
                if (text === "") continue;
                const isSel = it.classList.contains("goog-option-selected") || it.getAttribute("aria-checked") === "true";
                if (isSel !== desired.has(text)) {
                    SDD._activateMenuItem(it as HTMLElement);
                    await SDD._wait(20);
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
}
