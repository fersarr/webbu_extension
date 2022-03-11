
// Reminder: Debugging console.logs() from the extension:
// from background service: go to chrome://extensions/ and click on that inspect view under your extension
// from the popup: right-click inspect the extension

// Messages:
// chrome.runtime.sendMessage sends messages to the BackgroundPage and to Popups.
// chrome.tabs.sendMessage sends messages to ContentScripts


var webbu_url = 'https://webbu.app'
// webbu_url = 'http://localhost:7002'  // DEPLOY-CHECK: dev debugging

var current_url = null;
var name_2_visible_ids_map = {}


function getDOM() {
    console.log('Getting DOM');
    all_html = document.body.innerHTML;
    return all_html;
}


window.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM Loaded');

    document.getElementById("search_skills_input").focus();
    document.getElementById("search_button").addEventListener("click", search_skills);  // browser extensions don't allow inline JS code

    document.getElementById("search_skills_input").addEventListener('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            search_skills();
        }
    });

    document.getElementById("hide_display_msg").addEventListener("click", function (e) {
        document.getElementById("display_msg_div").style.display = 'none';  // hide the msg
    });
});


function search_skills_part2(tabs) {

    let search_text = document.getElementById('search_skills_input').value;
    console.log('search_skills_p2: t: "' + search_text + '" tabs: ' + tabs);

    current_url = tabs[0].url;
    req_data = {
        'search_text': search_text,
        'current_url': current_url,
    }

    document.getElementById('user_msg').innerHTML = 'Searching...';

    $.get(webbu_url + "/search", req_data,
        function(data, status){
            console.log('search_skills_p2: response status: ' + status + ', data:');
            console.log(data);
            document.getElementById('user_msg').innerHTML = data['user_msg'];

            var skills_container = document.getElementById('skill_rows');
            skills_container.innerHTML = "";

            var skills = data['skills'];
            var steps = {}
            var max_skills = 3;
            for (idx = 0; idx < skills.length && idx < max_skills; ++idx) {
                var curr_skill = skills[idx];
                var skill_steps = curr_skill.steps;

                var new_row = add_skill_row(curr_skill, idx);

                skills_container.appendChild(new_row);

                var skill_key = 'skill' + (idx + 1);
                steps[skill_key] = skill_steps;
                name_2_visible_ids_map[skill_key] = curr_skill['visible_id'];
            }

            // store the steps of the skill so they can
            // be accessed from the content script
            chrome.storage.local.set({ 'steps': steps });
            chrome.storage.local.set({ 'visible_ids': name_2_visible_ids_map });
        }
    ).fail(function(response) {
        console.log('search_skills_p2: request failed:');
        console.log(response);
        document.getElementById('user_msg').innerHTML = 'Error: ' + response;
    });
}


function add_skill_row(skill, idx) {

    var new_row = document.createElement("div");
    var skill_number = (idx + 1);
    new_row.id = 'new_skill_row' + skill_number;
    new_row.className = 'skill_row';
    new_row.addEventListener("click", function (e) {
        send_skill_triggered_msg('skill' + (idx + 1), skill['visible_id'], skill_number);
    });

    // title
    var skill_title = document.createElement("p");
    skill_title.className = 'skill_title';
    skill_title.innerHTML = skill['title'];
    new_row.appendChild(skill_title);

    // bottom row
    var bottom_row = document.createElement("div");
    bottom_row.className = 'skill_bottom_row'

    //shortcut
    var skill_shortcut = document.createElement("label");
    skill_shortcut.className = 'skill_shortcut';
    var shortcut_num = idx + 1;
    if (idx == 2) {
        // ctrl+shift+9 instead of ctrl+shift+3 because that's taken in macs and easier to access
        shortcut_num = 9;
    }
    skill_shortcut.innerHTML = 'Ctrl+Shift+' + shortcut_num;
    new_row.appendChild(skill_shortcut);

    // bottom row right
    var bottom_row_right = document.createElement("div");
    bottom_row_right.className = 'skill_bottom_row_right'

    // vote up
    var vote_up_img = document.createElement("img");
    vote_up_img.className = 'vote_img';
    vote_up_img.src = '/images/vote_up.png';
    vote_up_img.addEventListener("click", function (e) {
        vote_skill(skill['visible_id'], +1);
        e.stopPropagation();
    });
    bottom_row_right.appendChild(vote_up_img);

    // vote down
    var vote_down_img = document.createElement("img");
    vote_down_img.className = 'vote_img';
    vote_down_img.src = '/images/vote_down.png';
    vote_down_img.addEventListener("click", function (e) {
        vote_skill(skill['visible_id'], -1);
        e.stopPropagation();
    });
    bottom_row_right.appendChild(vote_down_img);

    // expand
    var expand_link = document.createElement("a");
    expand_link.className = 'img_link';
    expand_link.href = webbu_url + '/s/' + skill['visible_id'];
    expand_link.setAttribute('target', '_blank');
    var expand_img = document.createElement("img");
    expand_img.className = 'vote_img';
    expand_img.src = '/images/maximize.png';
    expand_link.appendChild(expand_img);
    bottom_row_right.appendChild(expand_link);

    bottom_row.appendChild(skill_shortcut);
    bottom_row.appendChild(bottom_row_right);

    new_row.appendChild(bottom_row);

    return new_row;

}


function vote_skill(skill_visible_id, up_or_down) {
    console.log('voting: ' + skill_visible_id + ' v: ' + up_or_down);

    fetch(webbu_url + '/vote_skill/' + skill_visible_id, {
        mode: 'no-cors',
        method: 'POST',
        body: JSON.stringify({'current_url': current_url, 'vote': up_or_down})
    })
    .then(response => {
        console.log('vote_skill: success');
        console.log(response);
    }).catch((error) => {
        console.log('vote_skill: failed');
        console.log(error);
    });
}


function search_skills() {
    console.log('searching skills');
    document.getElementById('user_msg').innerHTML = 'Starting Search';

    chrome.tabs.query({ active: true, currentWindow: true }, search_skills_part2);
}


function send_skill_triggered_msg(skill_row_name, skill_visible_id, skill_number) {
    // notify background.js that a skill was clicked in the UI
    // so it must be triggered (just like via keyboard shortcut)
    console.log('send_skill_triggered_msg: ' + skill_row_name);
    chrome.runtime.sendMessage({ skill_clicked: skill_row_name });

    highlight_skill_in_ui(skill_number);

    record_executed_skill(skill_visible_id, skill_number, 'ck');  // ck = 'click'
}


function record_executed_skill(skill_visible_id, skill_number, trigger_method) {
    // Notify backend of an executed skill for stats
    // do it from popup.js in case user is signed in (include tokens in request)
    // trigger_method: either 'shortcut' or via 'click on UI' (for stats only)
    console.log('record_executed_skill: ' + skill_visible_id);
    fetch(webbu_url + '/skill_executed/' + skill_visible_id, {
        mode: 'no-cors',
        method: 'POST',
        body: JSON.stringify({'current_url': current_url, 'row': skill_number, 'trigger': trigger_method})
    })
    .then(response => {
        console.log('skill_executed: recorded');
        console.log(response);
    }).catch((error) => {
        console.log('skill_executed: failed');
        console.log(error);
    });
}


function highlight_skill_in_ui(skill_number) {
    var skill_row = document.getElementById('new_skill_row' + skill_number);
    skill_row.style.transition = 'border 0.2s';
    skill_row.style.border = '2px solid white';
    setTimeout(function(){ 
        skill_row.style.border = '0px solid white';
    }, 1000);
}


function skill_triggered_via_shortcut(skill_row_name) {

    // highlight the skill in the UI
    var skill_number = skill_row_name.substr(skill_row_name.length - 1);  // number is the last character
    highlight_skill_in_ui(skill_number);

    var visible_id = name_2_visible_ids_map[skill_row_name];
    record_executed_skill(visible_id, skill_number, 'sc');  // sc = 'keyboard shortcut'
}


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // A skill was triggered via keyboard shortcut
    // we receive the message from background.js in popup.js
    // to highlight the skill row in the UI
    console.log('message_received: msg:');
    console.log(message);

    if ('skill_triggered' in message) {
        var skill_row_name = message['skill_triggered'];
        skill_triggered_via_shortcut(skill_row_name);

    } else if ('display_msg' in message) {
        document.getElementById("display_msg").innerText = message['display_msg'];
        document.getElementById("display_msg_div").style.display = 'block';  // make it visible
    }
});


// @sourceURL=popup.js