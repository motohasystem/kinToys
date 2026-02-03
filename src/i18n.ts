export type I18nMessages = Record<string, { message: string }>;

const LANGUAGE_KEY = "language";
const SUPPORTED_LANGUAGES = ["ja", "en"] as const;

function normalizeLanguage(lang: string): string {
    return lang.toLowerCase().split("-")[0];
}

function getStoredLanguage(): Promise<string | undefined> {
    return new Promise((resolve) => {
        chrome.storage.sync.get(LANGUAGE_KEY, (result) => {
            const value = result[LANGUAGE_KEY];
            if (typeof value === "string" && value.trim().length > 0) {
                resolve(normalizeLanguage(value));
                return;
            }
            resolve(undefined);
        });
    });
}

function setStoredLanguage(lang: string): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [LANGUAGE_KEY]: normalizeLanguage(lang) }, () => resolve());
    });
}

async function fetchMessages(lang: string): Promise<I18nMessages | null> {
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as I18nMessages;
    } catch {
        return null;
    }
}

async function loadMessages(preferredLang?: string): Promise<{ lang: string; messages: I18nMessages }> {
    const uiLang = normalizeLanguage(chrome.i18n.getUILanguage());
    const candidates = [
        preferredLang ? normalizeLanguage(preferredLang) : undefined,
        uiLang,
        ...SUPPORTED_LANGUAGES
    ].filter((lang): lang is string => Boolean(lang));

    for (const lang of candidates) {
        const messages = await fetchMessages(lang);
        if (messages) {
            return { lang, messages };
        }
    }

    return { lang: "en", messages: {} };
}

function format(message: string, params?: Record<string, string>): string {
    if (!params) {
        return message;
    }
    return message.replace(/\{(\w+)\}/g, (_match, key) => {
        const value = params[key];
        return value === undefined ? "" : value;
    });
}

function t(messages: I18nMessages, key: string, params?: Record<string, string>): string {
    const raw = messages[key]?.message ?? key;
    return format(raw, params);
}

function applyToDom(messages: I18nMessages): void {
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
        const key = element.dataset.i18n;
        if (key) {
            element.textContent = t(messages, key);
        }
    });

    document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((element) => {
        const key = element.dataset.i18nHtml;
        if (key) {
            element.innerHTML = t(messages, key);
        }
    });

    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]").forEach((element) => {
        const key = element.dataset.i18nPlaceholder;
        if (key) {
            element.placeholder = t(messages, key);
        }
    });

    document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((element) => {
        const key = element.dataset.i18nTitle;
        if (key) {
            element.title = t(messages, key);
        }
    });

    document.querySelectorAll<HTMLImageElement>("[data-i18n-alt]").forEach((element) => {
        const key = element.dataset.i18nAlt;
        if (key) {
            element.alt = t(messages, key);
        }
    });

    document.querySelectorAll<HTMLInputElement | HTMLButtonElement>("[data-i18n-value]").forEach((element) => {
        const key = element.dataset.i18nValue;
        if (key) {
            element.value = t(messages, key);
        }
    });
}

export const I18n = {
    LANGUAGE_KEY,
    getStoredLanguage,
    setStoredLanguage,
    loadMessages,
    t,
    applyToDom
};
