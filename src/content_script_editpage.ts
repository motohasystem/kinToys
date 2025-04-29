// ページ読み込み開始時に即座にスクリプトを埋め込む
const script = document.createElement('script');
script.src = chrome.runtime.getURL('embedding_script_editpage.js');
script.type = "module";  // モジュール型を使うなら
(document.head || document.documentElement).appendChild(script);