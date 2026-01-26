(function () {
    console.log("embedding_script_editpage.js loaded");

    // kintone.eventsが存在するか確認（ただちに）
    if (typeof kintone === 'undefined' || !kintone.events) {
        console.warn("kintone.events が未定義のため、イベント登録をスキップします");
        return;
    }

    // 即座にイベント登録する（同期登録）
    kintone.events.on('app.record.edit.show', function (event) {
        console.log('edit.show イベント検知しました！');
        return event;
    });

    kintone.events.on('app.record.create.show', function (event) {
        console.log('create.show イベント検知しました！');
        return event;
    });
})();
