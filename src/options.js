(() => {
    const CONST = {
        id_fillin_template: "textarea_fillin_template",
    };
    // オプションを読み込む
    document.addEventListener("DOMContentLoaded", function () {
        // 保存された値を読み込む
        chrome.storage.sync.get(null, (options) => {
            const textarea = document.getElementById(CONST.id_fillin_template);
            const stored = options[CONST.id_fillin_template];
            textarea.value = stored == undefined ? "" : stored;
            console.log({ options });
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
            const fillin_template = document.getElementById(
                CONST.id_fillin_template
            ).value;

            const options = {
                textarea_fillin_template: fillin_template,
            };
            chrome.storage.sync.set(options);
            console.log({ options });
        });
})();
