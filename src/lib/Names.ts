export class Names {

    // DOMノード取得のクラス設定
    static readonly Classes = {
        query_selector_class_subtable: ".subtable-row-gaia",    // 詳細画面のサブテーブルの親要素DIVが持つクラス
        query_selector_add_row_button: ".add-row-image-gaia"    // サブテーブルの追加ボタンが持つクラス
    }

    static readonly Ids = {
        id_fillin_template: "textarea_fillin_template",
        id_radio_csv_tsv: "radio_csv_tsv",      // csv または tsv のラジオボタンID
        id_radio_cell_record: "radio_cell_record",  // cell, row, record, link のラジオボタンID
        id_radio_data_template: "radio_data_template",  // template, csv/tsv, json のラジオボタンID
        id_popup_preview: "textarea_clipboard_preview", // ポップアップのプレビュー領域
        id_applied_template: "applied_template", // 適用中テンプレートの表示領域


        table_copy_button_clicked: "tableCopyButtonClicked",    // テーブル抽出ボタン
        template_copy_button_clicked: "templateCopyButtonClicked",    // テンプレートコピーボタン

        id_enable_break_multiline: "enable_break_multiline",  // 複数行文字列の改行設定のチェックボックスID

        // オプション画面
        id_input_template_name: "input_template_name",
        id_select_template_history: "select_template_history",

        id_checkbox_on_off: "checkbox_on_off",        // 有効無効チェックボックスのID

        // コピペアイコン
        id_copy_button: "copy_button",  // コピペアイコンのID
        id_paste_button: "paste_button",  // コピペアイコンのID

    };

    static readonly Messages = {
        changeBreaklineOption: "changeBreaklineOption",
        changePopupOptions: "changePopupOptions",
        loadPopupOptions: "loadPopupOptions",
        requestPopupOptions: "requestPopupOptions"
    }

}