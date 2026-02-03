import { I18nMessages, I18n } from "../i18n";
import { Utils } from "../utils";

const { ReviewStorageKeys } = Utils;

// 定数
const REQUIRED_USAGE_COUNT = 30;        // 表示に必要な使用回数
const REQUIRED_DAYS_SINCE_INSTALL = 7;  // 表示に必要なインストールからの日数
const RESHOW_DELAY_DAYS = 7;            // 「後で」選択時の再表示までの日数
const MAX_DIALOG_SHOWN_COUNT = 3;       // 最大表示回数

const CHROME_WEBSTORE_URL = "https://chromewebstore.google.com/detail/kintoys/johmoplafihagepgbceblbhlmacejoee/reviews";

interface ReviewStorageData {
    [key: string]: number | boolean | undefined;
}

/**
 * レビューダイアログの状態を取得
 */
async function getReviewStorageData(): Promise<ReviewStorageData> {
    return new Promise((resolve) => {
        chrome.storage.sync.get([
            ReviewStorageKeys.usage_count,
            ReviewStorageKeys.install_date,
            ReviewStorageKeys.dialog_shown_count,
            ReviewStorageKeys.last_shown_date,
            ReviewStorageKeys.never_show,
            ReviewStorageKeys.completed
        ], (result) => {
            resolve(result as ReviewStorageData);
        });
    });
}

/**
 * ストレージデータを保存
 */
async function setReviewStorageData(data: Partial<ReviewStorageData>): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.sync.set(data, () => resolve());
    });
}

/**
 * 使用回数をインクリメント
 */
export async function incrementUsageCount(): Promise<void> {
    const data = await getReviewStorageData();
    const currentCount = (data[ReviewStorageKeys.usage_count] as number) || 0;

    // インストール日時が設定されていない場合は設定
    const updateData: ReviewStorageData = {
        [ReviewStorageKeys.usage_count]: currentCount + 1
    };

    if (!data[ReviewStorageKeys.install_date]) {
        updateData[ReviewStorageKeys.install_date] = Date.now();
    }

    await setReviewStorageData(updateData);
}

/**
 * ダイアログを表示すべきかどうかを判定
 */
export async function shouldShowReviewDialog(): Promise<boolean> {
    const data = await getReviewStorageData();

    // 永久非表示または評価完了の場合は表示しない
    if (data[ReviewStorageKeys.never_show] || data[ReviewStorageKeys.completed]) {
        return false;
    }

    // 使用回数チェック
    const usageCount = (data[ReviewStorageKeys.usage_count] as number) || 0;
    if (usageCount < REQUIRED_USAGE_COUNT) {
        return false;
    }

    // インストール日チェック
    const installDate = data[ReviewStorageKeys.install_date] as number;
    if (!installDate) {
        return false;
    }

    const daysSinceInstall = (Date.now() - installDate) / (1000 * 60 * 60 * 24);
    if (daysSinceInstall < REQUIRED_DAYS_SINCE_INSTALL) {
        return false;
    }

    // 表示回数チェック
    const dialogShownCount = (data[ReviewStorageKeys.dialog_shown_count] as number) || 0;
    if (dialogShownCount >= MAX_DIALOG_SHOWN_COUNT) {
        return false;
    }

    // 再表示タイミングチェック
    const lastShownDate = data[ReviewStorageKeys.last_shown_date] as number;
    if (lastShownDate) {
        const daysSinceLastShown = (Date.now() - lastShownDate) / (1000 * 60 * 60 * 24);
        if (daysSinceLastShown < RESHOW_DELAY_DAYS) {
            return false;
        }
    }

    return true;
}

/**
 * レビューダイアログを作成して表示
 */
export function showReviewDialog(
    container: HTMLElement,
    messages: I18nMessages
): void {
    const t = (key: string) => I18n.t(messages, key);

    // オーバーレイ要素
    const overlay = document.createElement("div");
    overlay.id = "review-dialog-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    // ダイアログ本体
    const dialog = document.createElement("div");
    dialog.id = "review-dialog";
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        position: relative;
        font-family: Arial, sans-serif;
    `;

    // 閉じるボタン
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "&times;";
    closeButton.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        line-height: 1;
        padding: 4px;
    `;
    closeButton.addEventListener("click", () => handleLater(overlay));

    // タイトル
    const title = document.createElement("h3");
    title.textContent = t("review_dialog_title");
    title.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 18px;
        color: #333;
        text-align: center;
    `;

    // 説明文
    const description = document.createElement("p");
    description.textContent = t("review_dialog_description");
    description.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 14px;
        color: #666;
        text-align: center;
        line-height: 1.6;
    `;

    // ボタンコンテナ
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
    `;

    // 評価するボタン
    const reviewButton = document.createElement("button");
    reviewButton.textContent = t("review_dialog_button_review");
    reviewButton.style.cssText = `
        background-color: #F09200;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    `;
    reviewButton.addEventListener("mouseenter", () => {
        reviewButton.style.backgroundColor = "#D87C00";
    });
    reviewButton.addEventListener("mouseleave", () => {
        reviewButton.style.backgroundColor = "#F09200";
    });
    reviewButton.addEventListener("click", () => handleReview(overlay));

    // 後でボタン
    const laterButton = document.createElement("button");
    laterButton.textContent = t("review_dialog_button_later");
    laterButton.style.cssText = `
        background-color: #f0f0f0;
        color: #333;
        border: 1px solid #ddd;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
    `;
    laterButton.addEventListener("mouseenter", () => {
        laterButton.style.backgroundColor = "#e0e0e0";
    });
    laterButton.addEventListener("mouseleave", () => {
        laterButton.style.backgroundColor = "#f0f0f0";
    });
    laterButton.addEventListener("click", () => handleLater(overlay));

    // もう表示しないボタン
    const neverButton = document.createElement("button");
    neverButton.textContent = t("review_dialog_button_never");
    neverButton.style.cssText = `
        background-color: transparent;
        color: #999;
        border: none;
        padding: 10px 20px;
        font-size: 12px;
        cursor: pointer;
        transition: color 0.2s;
    `;
    neverButton.addEventListener("mouseenter", () => {
        neverButton.style.color = "#666";
    });
    neverButton.addEventListener("mouseleave", () => {
        neverButton.style.color = "#999";
    });
    neverButton.addEventListener("click", () => handleNever(overlay));

    // 要素の組み立て
    buttonContainer.appendChild(reviewButton);
    buttonContainer.appendChild(laterButton);
    buttonContainer.appendChild(neverButton);

    dialog.appendChild(closeButton);
    dialog.appendChild(title);
    dialog.appendChild(description);
    dialog.appendChild(buttonContainer);

    overlay.appendChild(dialog);
    container.appendChild(overlay);

    // 表示回数と最終表示日時を更新
    updateDialogShownData();
}

/**
 * ダイアログ表示データを更新
 */
async function updateDialogShownData(): Promise<void> {
    const data = await getReviewStorageData();
    const currentCount = (data[ReviewStorageKeys.dialog_shown_count] as number) || 0;

    await setReviewStorageData({
        [ReviewStorageKeys.dialog_shown_count]: currentCount + 1,
        [ReviewStorageKeys.last_shown_date]: Date.now()
    });
}

/**
 * 「評価する」ボタンのハンドラ
 */
async function handleReview(overlay: HTMLElement): Promise<void> {
    // Chrome Web Storeを開く
    window.open(CHROME_WEBSTORE_URL, "_blank");

    // 評価完了フラグを設定
    await setReviewStorageData({
        [ReviewStorageKeys.completed]: true
    });

    // ダイアログを閉じる
    overlay.remove();
}

/**
 * 「後で」ボタンのハンドラ
 */
async function handleLater(overlay: HTMLElement): Promise<void> {
    // 最終表示日時は既に updateDialogShownData で更新されているので、
    // ダイアログを閉じるだけ
    overlay.remove();
}

/**
 * 「もう表示しない」ボタンのハンドラ
 */
async function handleNever(overlay: HTMLElement): Promise<void> {
    // 永久非表示フラグを設定
    await setReviewStorageData({
        [ReviewStorageKeys.never_show]: true
    });

    // ダイアログを閉じる
    overlay.remove();
}

/**
 * レビューダイアログのメイン処理
 * コピー成功後に呼び出す
 */
export async function tryShowReviewDialog(
    container: HTMLElement,
    messages: I18nMessages
): Promise<void> {
    // 使用回数をインクリメント
    await incrementUsageCount();

    // ダイアログ表示条件をチェック
    const shouldShow = await shouldShowReviewDialog();

    if (shouldShow) {
        showReviewDialog(container, messages);
    }
}

/**
 * レビューダイアログを強制表示（イースターエッグ用）
 * 条件チェックをスキップして表示
 */
export function forceShowReviewDialog(
    container: HTMLElement,
    messages: I18nMessages
): void {
    // 既にダイアログが表示されている場合は何もしない
    if (document.getElementById("review-dialog-overlay")) {
        return;
    }
    showReviewDialog(container, messages);
}
