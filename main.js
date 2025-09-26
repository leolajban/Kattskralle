/* 
 * Kattskrälle
 * Copyright (C) 2025 Leo Forsmark
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

let users = [];

function ensureDefaultSettings(callback) {
    const defaultSettings = {
        'Ignorera': true,
        'Previews': true,
        'Infinite Scroll': true,
        'Bypass Leaving Site': true
    };

    function saveDefaultsToChrome() {
        if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
            chrome.storage.sync.set({ userStorageFbqol: defaultSettings }, callback);
        } else if (typeof browser !== 'undefined' && browser.storage?.local) {
            browser.storage.local.set({ userStorageFbqol: defaultSettings }).then(callback);
        } else {
            callback();
        }
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        chrome.storage.sync.get('userStorageFbqol', (result) => {
            if (!result.userStorageFbqol || Object.keys(result.userStorageFbqol).length === 0) {
                saveDefaultsToChrome();
            } else {
                callback();
            }
        });
    } else if (typeof browser !== 'undefined' && browser.storage?.local) {
        browser.storage.local.get('userStorageFbqol').then(result => {
            if (!result.userStorageFbqol || Object.keys(result.userStorageFbqol).length === 0) {
                saveDefaultsToChrome();
            } else {
                callback();
            }
        });
    } else {
        callback();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ensureDefaultSettings(() => {
        const input = document.getElementById('input');
        const addButton = document.getElementById('add');

        addButton.addEventListener('click', addOrRemove);

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                addOrRemove();
            }
        });

        getUsers((retrievedUsers) => {
            users = retrievedUsers;
            updateList();
        });

        const checkboxes = document.querySelectorAll('#settings input[type="checkbox"]');

        getSettings((savedSettings) => {
            checkboxes.forEach(cb => {
                const name = cb.nextSibling.textContent.trim();
                cb.checked = savedSettings[name] || false;
            });
        });

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const name = cb.nextSibling.textContent.trim();
                saveSetting(name, cb.checked);
            });
        });
    });
});

function addOrRemove() {
    const inputValue = document.getElementById('input').value.trim();
    if (!inputValue) return;

    if (!users.includes(inputValue)) {
        users.push(inputValue);
    } else {
        users = users.filter(e => e !== inputValue);
    }

    document.getElementById('input').value = '';
    updateList();
    saveUsers(users);
}

function updateList() {
    const listElement = document.getElementById('list');
    listElement.innerHTML = '';

    users.forEach(item => {
        const listItem = document.createElement('li');
        listItem.id = 'user-' + item;
        listElement.appendChild(listItem);

        const listDiv = document.createElement('div');
        listDiv.className = 'listDiv';
        listItem.appendChild(listDiv);

        const textSpan = document.createElement('span');
        textSpan.className = 'textSpanInList';
        textSpan.textContent = item;
        listDiv.appendChild(textSpan);

        const removeButton = document.createElement('button');
        removeButton.className = 'removeButton';
        removeButton.textContent = 'X';
        removeButton.addEventListener('click', () => {
            users = users.filter(e => e !== item);
            saveUsers(users);
            listItem.remove();
        });

        listDiv.appendChild(removeButton);
    });
}

function saveUsers(users) {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        chrome.storage.sync.set({ userStorageFbqolIgnore: users });
    } else if (typeof browser !== 'undefined' && browser.storage?.local) {
        browser.storage.local.set({ userStorageFbqolIgnore: users });
    } else {
        console.error("No storage API available. Users cannot be saved.");
    }
}

function getUsers(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        chrome.storage.sync.get(['userStorageFbqolIgnore'], (result) => {
            callback(result.userStorageFbqolIgnore || []);
        });
    } else if (typeof browser !== 'undefined' && browser.storage?.local) {
        browser.storage.local.get(['userStorageFbqolIgnore']).then((result) => {
            callback(result.userStorageFbqolIgnore || []);
        });
    } else {
        console.error("No storage API available. Returning empty list.");
        callback([]);
    }
}

function saveSetting(key, value) {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        chrome.storage.sync.get('userStorageFbqol', (result) => {
            const settings = result.userStorageFbqol || {};
            settings[key] = value;
            chrome.storage.sync.set({ userStorageFbqol: settings });
        });
    } else if (typeof browser !== 'undefined' && browser.storage?.local) {
        browser.storage.local.get('userStorageFbqol').then(result => {
            const settings = result.userStorageFbqol || {};
            settings[key] = value;
            browser.storage.local.set({ userStorageFbqol: settings });
        });
    } else {
        console.error("No storage API available. Cannot save settings.");
    }
}

function getSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        chrome.storage.sync.get('userStorageFbqol', (result) => {
            callback(result.userStorageFbqol || {});
        });
    } else if (typeof browser !== 'undefined' && browser.storage?.local) {
        browser.storage.local.get('userStorageFbqol').then(result => {
            callback(result.userStorageFbqol || {});
        });
    } else {
        console.error("No storage API available. Returning empty settings.");
        callback({});
    }
}