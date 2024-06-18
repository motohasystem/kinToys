(() => {
    const CONST = {
        id_fillin_template: "textarea_fillin_template",
        id_radio_csv_tsv: "radio_csv_tsv",
    };

    const loadOption = (options, key, name) => {
        key = key == undefined ? null : key;
        name = name == undefined ? null : name;

        // keyを指定してnameがundefinedの場合は通常のinput要素
        if (key != null && name == null) {
            const value = options[key];
            if (value == undefined) {
                return "";
            }

            const elm = document.getElementById(key);
            if (elm != null) {
                elm.value = value;
            }
        }
        // keyを指定してnameがnullの場合はradioボタン
        else if (key == null && name != null) {
            const value = options[name];
            if (value == undefined) {
                return "";
            }

            const elm = document.getElementsByName(name);
            if (elm != null) {
                Array.from(elm).find((e) => e.value == value).checked = true;
            }
        }
    };

    const saveOption = (option, key, name) => {
        if (option == undefined) {
            option = {};
        }

        key = key == undefined ? null : key;
        name = name == undefined ? null : name;

        // keyを指定してnameがundefinedの場合は通常のinput要素
        if (key != null && name == null) {
            const elm = document.getElementById(key);
            const value = elm.value;
            option[key] = value;
            return option;
        }

        // keyを指定してnameがnullの場合はradioボタン
        if (key == null && name != null) {
            const elm = document.getElementsByName(name);
            option[name] = Array.from(elm).find((e) => e.checked).value;
            return option;
        }

        throw new Error("Invalid argument");
    };

    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options) => {
            // const textarea = document.getElementById(CONST.id_fillin_template);
            // const stored = options[CONST.id_fillin_template];
            // textarea.value = stored == undefined ? "" : stored;
            console.log({ options });

            loadOption(options, CONST.id_fillin_template);
            loadOption(options, null, CONST.id_radio_csv_tsv);
        });
    });

    // document.querySelectorAll(".color").forEach((elm) => {
    //     elm.addEventListener("click", (e) => {
    //         var options = {
    //             colorValue: e.target.style.backgroundColor,
    //             colorName: e.target.innerText,
    //         };
    //         chrome.storage.sync.set(options);
    //         document.querySelector("#msg").innerText =
    //             `Set color to ${options.colorName}.`;
    //     });
    // });

    document
        .getElementById("button_save_options")
        .addEventListener("click", (el) => {
            let options = {};
            options = saveOption(options, CONST.id_fillin_template, null); // idを指定
            options = saveOption(options, null, CONST.id_radio_csv_tsv); // nameを指定
            chrome.storage.sync.set(options);
            console.log({ options });
        });
})();
