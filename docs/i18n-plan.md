# Multi-language Preparation Plan

## Scope and intent
- Replace all Japanese strings in code with placeholders.
- Separate strings into language files to enable localization.

## Steps
1. Inventory all Japanese strings
- Search for Japanese characters across HTML/TS/JS/CSS and comments.
- Decide whether Japanese comments must be translated or can be replaced by neutral placeholders.

2. Define key naming rules
- Use screen-based namespaces (e.g., `options.*`).
- Keep keys stable and descriptive (e.g., `options.header.title`).

3. Choose localization mechanism
- If this is a Chrome extension UI, prefer `__MSG_key__` and `_locales/{lang}/messages.json`.
- Otherwise, use `src/i18n/{lang}.json` and load at runtime.

4. Replace UI text with placeholders
- HTML visible text -> `data-i18n` attributes.
- Attributes like `placeholder`, `alt`, `title` -> `data-i18n-placeholder`, `data-i18n-alt`, etc.
- Replace/remove Japanese comments if required; optionally change to `i18n:` notes.

5. Implement application logic
- On DOM load, map `data-i18n*` to localized strings.
- Unify message rendering with existing code if there is any.

6. Create language files
- `ja` file with current Japanese strings.
- `en` file with English equivalents or temporary values.

7. Validate
- Ensure no missing keys.
- Verify both languages render correctly.

## Open questions
- Use Chrome `_locales` or custom `src/i18n`?
- Should Japanese comments be translated/placeholderized?
- Confirm the target scope (only `src/options.html` or the full codebase).
