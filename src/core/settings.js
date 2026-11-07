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

/*
 * Settings: on/off flags for every feature, defaults, and loading of the settings saved by the popup.
 */

let ignoreraSetting = false;

let previewsSetting = false;

let infiniteScrollSetting = false;

let bypassLeavingSetting = false;

let showTsSetting = false;

let markReadThreadsSetting = false;

let ignoreInQuotesSetting = false;

let saveDraftsSetting = false;

let searchLinksSetting = false;

let threadChatSetting = false;

function ensureDefaultSettings(callback) {
    const defaultSettings = {
        'Ignorera': true,
        'Previews': true,
        'Infinite Scroll': true,
        'Bypass Leaving Site': true,
        'Visa Trådskapare(TS)': true,
        'Markera visade trådar': true,
        'Ignorera även i citat': true,
        'Spara & ladda utkast': true,
        'Sök länkar': true,
        'Trådchatt': true
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

function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        chrome.storage.sync.get('userStorageFbqol', (result) => {
            const settings = result.userStorageFbqol || {};
            applySettings(settings);
        });
    } else if (typeof browser !== 'undefined' && browser.storage?.local) {
        browser.storage.local.get('userStorageFbqol').then(result => {
            const settings = result.userStorageFbqol || {};
            applySettings(settings);
        });
    } else {
        //console.error("KATTSKRÄLLE: No storage API available. Settings cannot be loaded.");
    }
}

function applySettings(settings) {
    ignoreraSetting = !!settings['Ignorera'];
    previewsSetting = !!settings['Previews'];
    infiniteScrollSetting = !!settings['Infinite Scroll'];
    bypassLeavingSetting = !!settings['Bypass Leaving Site'];
    showTsSetting = !!settings['Visa Trådskapare(TS)'];
    markReadThreadsSetting = !!settings['Markera visade trådar'];
    ignoreInQuotesSetting = !!settings['Ignorera även i citat'];
    saveDraftsSetting = !!settings['Spara & ladda utkast'];
    searchLinksSetting = !!settings['Sök länkar'];
    threadChatSetting = !!settings['Trådchatt'];

    if (!infiniteScrollSetting && !previewsSetting && !ignoreraSetting && !bypassLeavingSetting && !showTsSetting && !markReadThreadsSetting && !saveDraftsSetting && !searchLinksSetting && !threadChatSetting) {
        return;// Early exit if all settings are false
    }
    main();//only call main if any settings are activated. 
}
