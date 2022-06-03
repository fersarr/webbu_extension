/* 
This is the content script (or foreground script) for the browser extension.
It can be injected into a site giving us the ability to control the DOM of that site
*/

var webbu_url = 'https://webbu.app'
// webbu_url = 'http://localhost:7002'  // DEPLOY_CHECK: dev debugging

console.log('content_script: running');

function getCharCode(key) {
    // Both the 'keyCode' and 'which' property is provided for compatibility only. The latest version of the DOM Events Specification recommend using the key property instead
    // event.which || event.keyCode;  // Use either which or keyCode, depending on browser support
    charCodes = {
        'A': 65, 'B': 66, 'C': 67, 'D': 68, 'E': 69, 'F': 70, 'G': 71, 'H': 72, 'I': 73, 'J': 74, 'K': 75, 'L': 76, 'M': 77,
        'N': 78, 'O': 79, 'P': 80, 'Q': 81, 'R': 82, 'S': 83, 'T': 84, 'U': 85, 'V': 86, 'W': 87, 'X': 88, 'Y': 89, 'Z': 90,
        'a': 97, 'b': 98, 'c': 99, 'd': 100, 'e': 101, 'f': 102, 'g': 103, 'h': 104, 'i': 105, 'j': 106, 'k': 107, 'l': 108, 'm': 109,
        'n': 110, 'o': 111, 'p': 112, 'q': 113, 'r': 114, 's': 115, 't': 116, 'u': 117, 'v': 118, 'w': 119, 'x': 120, 'y': 121, 'z': 122,
        '0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57,
        ':': 58, ';': 59, '<': 60, '=': 61, '>': 62, '?': 63, '@': 64,
        ' ': 32, '!': 33, '"': 34, '#': 35, '$': 36, '%': 37, '&': 38, "'": 39, '(': 40, ')': 41, '*': 42, '+': 43, ',': 44, '-': 45, ".": 46, "/": 47,
        'Enter': 13, 'backspace': 8, 'space': 32, '/': 191, '\\': 200, 'ArrowDown': '40', 'ArrowUp': '38'
    }

    return charCodes[key];
}


function launch_shortcut(pressedKey, metaKey, altKey, shiftKey, keyEventType) {
    var elem = document.activeElement;
    console.log('launch_shortcut: ' + pressedKey + ' (ctrl: ' + metaKey + ' alt: ' + altKey + ' shift: ' + shiftKey + ') on: ' + elem);
    // console.log('launch_shortcut: on elem: ' + elem + ' id: ' + elem.id + ' class: ' + elem.className);

    var pressedKeyCode = getCharCode(pressedKey);
    var e = new KeyboardEvent(keyEventType, {  //keypress to type in google docs
        bubbles : true,
        cancelable : true,
        char : pressedKey,
        code : pressedKey,
        key : pressedKey,  // for newer browsers?
        keyCode : pressedKeyCode,
        charCode : pressedKeyCode,
        which : pressedKeyCode,
        metaKey: metaKey,  // command on Mac
        shiftKey : shiftKey,
        altKey: altKey,
        ctrlKey: false,
        view: window,
        composed: true
    });
    elem.dispatchEvent(e);

    // console.log('launch_shortcut: finished ' + pressedKey);
}


function parse_shortcut(shortcut) {
    if (shortcut.includes('+')) {
        //console.log('shortcut with +');
        shortcutParts = shortcut.split('+');
        
        var pressedKey = '';
        var metaKey = false;
        var altKey = false;
        var shiftKey = false;
        for (var keyIdx = 0; keyIdx < shortcutParts.length; ++keyIdx) {
            var part = shortcutParts[keyIdx];
            // console.log('parse_shortcut: part: ' + part);
            if (part.toLowerCase() == 'ctrl') {
                metaKey = true;
            } else if (part.toLowerCase() == 'alt') {
                altKey = true;
            } else if (part.toLowerCase() == 'shift') {
                shiftKey = true;
            } else {
                pressedKey = part;
            }
        }
        launch_shortcut(pressedKey, metaKey, altKey, shiftKey, 'keydown')

    } else {
        //console.log('shortcut without +');
        launch_shortcut(shortcut, false, false, false, 'keydown')
    }
}


function multi_commands(steps, currentUrl, userQuery) {
    console.log('multi_commands: steps:' + steps + ' url: ' + currentUrl + ' userQuery: ' + userQuery);
    if (!steps) {
        console.log('multi_commands: steps is not defined, stopping');
        return;
    }

    for (var idx = 0 ; idx < steps.length ; ++idx) {
        var step = steps[idx];
        console.log('step: ' + step['t']);

        var stepType = step['t'];
        var stepParam = step['p'];
        var stepParam2 = step['p2'];

        if (stepType === 'shortcut') {
            parse_shortcut(stepParam);
        } else if (stepType === 'delay') {
            var delayAmount = parseFloat(stepParam) * 1000;
            console.log('delay for: ' + delayAmount + ' at ' + new Date().toTimeString());
            setTimeout(function() {
                    console.log('finished delay at ' + new Date().toTimeString());
                    var remaining_steps = steps.slice(idx + 1);
                    if (remaining_steps.length > 0) {
                        multi_commands(remaining_steps, currentUrl, userQuery);
                    }
            }, delayAmount);
            break; // stop the for-loop
        } else if (stepType === 'type_text') {
            type_text(stepParam, currentUrl);
        } else if (stepType === 'submit_form') {
            submit_form(stepParam);
        } else if (stepType === 'click') {
            triggerClick(stepParam);
        } else if (stepType === 'focus') {
            focus_on_elem(stepParam);
        } else if (stepType === 'gsheet_cell') {
            gsheet_cell(stepParam);
        } else if (stepType === 'copy_text') {
            copy_text(stepParam, currentUrl);
        } else if (stepType === 'open_url') {
            open_url(stepParam);
        } else if (stepType === 'fetch_text') {
            fetch_text(stepParam);
        } else if (stepType === 'fetch_json') {
            fetch_json(stepParam);
        } else if (stepType === 'change_style') {
            change_style(stepParam, stepParam2);
        } else if (stepType === 'display_msg') {
            display_msg(stepParam, currentUrl);
        } else if (stepType === 'backend_steps') {
            fetch_backend_steps(stepParam, currentUrl, userQuery);
        }
    }
}


function type_text_gdocs(input_text) {
    // gdocs = google docs
    console.log('typing on gdocs: ' + input_text);
    iframe_elem = document.querySelector('.docs-texteventtarget-iframe').contentDocument.activeElement;

    for (idx = 0 ; idx < input_text.length ; ++idx) {
        var currChar = input_text[idx];

        var pressedKeyCode = getCharCode(currChar);
        var e = new KeyboardEvent('keypress', {  //keypress to type in google docs
            bubbles : true, // needed for gdocs
            char : currChar,
            code : currChar,
            key : currChar,
            keyCode : pressedKeyCode,
            charCode : pressedKeyCode,
            which : pressedKeyCode,
        });

        iframe_elem.dispatchEvent(e);
    }
}


function type_text_gsheets_part2(input_text, formula_input) {
    // gsheets = google sheets
    console.log(formula_input);
    formula_input.firstElementChild.innerHTML = formula_input.firstElementChild.innerHTML + input_text;

    // Hit enter to flush the text into the gsheets cell
    currChar = 'Enter';
    pressedKeyCode = getCharCode(currChar);
    var e1 = new KeyboardEvent('keypress', {  //keypress to type in google docs
            bubbles : true, // needed for gdocs
            char : currChar,
            code : currChar,
            key : currChar,
            keyCode : pressedKeyCode,
            charCode : pressedKeyCode,
            which : pressedKeyCode,
    });

    formula_input.dispatchEvent(e1);
}


function type_text_gsheets(input_text) {
    // gsheets = google sheets
    console.log('typing on gsheets: ' + input_text);

    var formula_input = document.querySelector('.cell-input');
    formula_input.focus();

    console.log('on elem: ' + formula_input + ' id: ' + formula_input.id + ' class: ' + formula_input.className);
    setTimeout(function(){
        // wait until the .focus() takes effect and then type
        type_text_gsheets_part2(input_text, formula_input);
    }, 500);

}


function is_google_omnibox_active() {
    // returns true if the omnibox is active
    // that means we are probably tring to type text in the omnibox
    // not in the google doc or cell in gsheet
    if (document.activeElement != null && document.activeElement.className.includes('docs-omnibox-input')) {
        return true;
    }
    return false;
}


function get_special_text(input_text, currentUrl, callback) {

    if (input_text === '__copied__') {  // needs to be first to get text
        console.log('special_text: getting copied text');
        chrome.storage.local.get(['copied_text'], function(params) {
            callback(params.copied_text, currentUrl);
        });
        return true;
    } else if (input_text.startsWith('__variable__|')) {
        console.log('special_text: getting variable ' + input_text);
        var var_to_read = input_text.split("|")[1];
        console.log('special_text: var to read: ' + var_to_read);
        chrome.storage.local.get([var_to_read], function(storage_value) {
            console.log('special_text: variable value: ');
            console.log(storage_value);
            if (!storage_value[var_to_read]) {
                console.log('special_text: could not find variable');
                return true;
            }
            callback(storage_value[var_to_read], currentUrl);
        });
        return true;
    }

    return false;
}


function type_text(input_text, currentUrl) {
    console.log('type_text: [' + input_text + '] url: ' + currentUrl);

    var used_special_text = get_special_text(input_text, currentUrl, type_text);
    if (used_special_text) {
        return;
    }

    var g_omnibox_active = is_google_omnibox_active();
    if (!g_omnibox_active && currentUrl.startsWith('https://docs.google.com/document')) {
        type_text_gdocs(input_text);
    } else if (!g_omnibox_active &&  currentUrl.startsWith('https://docs.google.com/spreadsheet')) {
        type_text_gsheets(input_text);
    } else {
        var elem = document.activeElement;
        console.log('type_text: on ' + elem + ' id: ' + elem.id);

        if (elem.tagName.toLowerCase() === 'inputaa') {
            elem.value = elem.value + input_text;  // works for <input> elems
        } else {
            elem.innerText = elem.innerText + input_text;
        }
    }
}


function triggerClick(elementSelector) {
    console.log('click: ' + elementSelector);
    var elem = null;
    if (!elementSelector || elementSelector === 'current') {
        elem = document.activeElement;
    } else {
        elem = document.querySelector(elementSelector)
    }
    console.log('click: ' + elem + ' id: ' + elem.id + ' class: ' + elem.className);
    elem.click();  // works for <input> elems
}


function focus_on_elem(elementSelector) {
    console.log('focus: ' + elementSelector);
    var elem = null;
    if (!elementSelector || elementSelector === 'current') {
        elem = document.activeElement;
    } else {
        elem = document.querySelector(elementSelector)
    }

    if (!elem) {
        console.log('focus: failed, the elem is null');
        return;
    }

    console.log('focus: ' + elem.id);
    elem.focus();  // works for <input> elems
}


function gsheet_cell(chosen_cell) {
    console.log('gsheet_cell: [' + chosen_cell + ']');

    selectorField = document.getElementById('t-name-box');
    selectorField.value = chosen_cell;

    // now hit Enter to submit the change
    currChar = 'Enter';
    pressedKeyCode = getCharCode(currChar);
    var e = new KeyboardEvent('keydown', {
            bubbles : true,
            char : currChar,
            code : currChar,
            key : currChar,
            keyCode : pressedKeyCode,
            charCode : pressedKeyCode,
            which : pressedKeyCode,
    });
    selectorField.dispatchEvent(e);
}


function copy_text(selector, currentUrl) {
    console.log('copy_text: selector: ' + selector + ' url: ' + currentUrl);

    var copied_text = null;
    if (currentUrl.startsWith('https://docs.google.com/spreadsheet')) {
        var formula_input = document.querySelector('.cell-input');
        copied_text = formula_input.innerHTML.replace('<br>', '');
    } else {
        if (!selector || selector === 'current') {
            elem = document.activeElement;
            console.log('copy_text: from element: ' + elem.id);
        } else {
            elem = document.querySelector(selector);
        }

        if (elem.tagName.toLowerCase() === 'input') {
            copied_text = elem.value;
        } else {
            copied_text = elem.innerHTML;
        }
    }

    console.log('copied_text: ' + copied_text);
    chrome.storage.local.set({ copied_text: copied_text });
}


function submit_form(elementSelector) {
    console.log('submit form: ' + formName);
    var elem = null;
    if (elementSelector === 'current') {
        elem = document.activeElement;
    } else {
        elem = document.querySelector(elementSelector)
    }
    console.log('on elem: ' + elem + ' id: ' + elem.id + ' class: ' + elem.className);
    elem.form.submit(); //works for google search but not for gsheets omni search box
}


function open_url(input_url) {
    console.log('open_url: ' + input_url);
    if (input_url.includes('__copied__')) {
        chrome.storage.local.get(['copied_text', ], function(params) {
            input_url = input_url.replace('__copied__', params.copied_text);
            open_url(input_url);
        });
        return;
    }
    window.location = input_url;
}


function fetch_text(input_url) {
    console.log('fetch_text: ' + input_url);
    req_data = {};
    fetch(input_url, {
        mode: 'cors',
        method: 'GET',
    })
    .then(response => response.text())
    .then(response_text => {
        console.log('fetch_text: success resp:');
        console.log(response_text);

        chrome.storage.local.set({ 'fetched_text': response_text });

    }).catch((error) => {
        console.log('fetch_text: failed');
        console.log(error);
    });
}


function fetch_json(input_url) {
    console.log('fetch_json: ' + input_url);
    req_data = {};
    fetch(input_url, {
        mode: 'cors',
        method: 'GET',
    })
    .then(response => response.json())
    .then(response_json => {
        console.log('fetch_json: success resp:');
        console.log(response_json);

        chrome.storage.local.set({ 'fetched_json': JSON.stringify(response_json) });

    }).catch((error) => {
        console.log('fetch_json: failed');
        console.log(error);
    });
}


function change_style(selector, style) {
    console.log('change_style: ' + selector + ' style: ' + style);
    document.querySelector(selector).style = style;
}


function display_msg(message, currentUrl) {
    var used_special_text = get_special_text(message, currentUrl, display_msg);
    if (used_special_text) {
        return;
    }
    chrome.runtime.sendMessage({ display_msg: message });
}


console.log('content_script: getting the skill that was triggered');
chrome.storage.local.get(['currentUrl', 'lastSkill', 'steps', 'visible_ids', 'user_query'], function(params) {
    console.log("content_script: params: ");
    console.log(params);

    var currentSkill = params.lastSkill;
    var curr_skill_steps = null;
    if (params.steps) {
        var curr_skill_steps_json = params.steps[currentSkill];
        console.log('content_script: curr_skill_steps_json: ' + curr_skill_steps_json);
        try {
            curr_skill_steps = JSON.parse(curr_skill_steps_json);
        } catch (err) {
            console.log('content_script: failed loading JSON for steps:');
            console.log(params.steps);
            return;
        }
    }

    console.log('content_script: steps dict:');
    console.log(curr_skill_steps);
    multi_commands(curr_skill_steps, params.currentUrl, params.user_query);

});


function fetch_backend_steps(stepParam, currentUrl, userQuery) {
    console.log('fetch_backend_steps: ' + stepParam);

    page_content = document.all[0].outerHTML;
    console.log('fetch_backend_steps: user_query: ' + userQuery + ' page_content: ' + page_content.length);
    req_data = {};
    fetch(webbu_url + '/get_backend_steps/' + stepParam, {
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify({'page_content': page_content, 'user_query': userQuery})
    })
    .then(response => response.json())
    .then(response_json => {
        console.log('fetch_backend_steps: success resp:');
        console.log(response_json);

        // now that we have the steps from the backend
        // execute them as if they were normal steps
        console.log('fetch_backend_steps: starting to execute');
        multi_commands(response_json['steps'], currentUrl, userQuery);

    }).catch((error) => {
        console.log('fetch_backend_steps: failed');
        console.log(error);
    });
}
