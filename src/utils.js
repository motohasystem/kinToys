class Utils {
    static CONST = {
        id_fillin_template: "textarea_fillin_template",
        id_radio_csv_tsv: "radio_csv_tsv",
        id_radio_csv_tsv: "radio_csv_tsv",
        id_radio_cell_record: "radio_cell_record",
        id_radio_data_template: "radio_data_template",
    };

    static loadOption(options, key, name) {
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
    }

    static saveOption(option, key, name) {
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
    }

    static fillTemplate(template, record) {
        let filledTemplate = template;
        for (const key in record) {
            const value = record[key].value;
            filledTemplate = filledTemplate.replace(`%${key}%`, value);
        }
        return filledTemplate;
    }
}

export default Utils;
