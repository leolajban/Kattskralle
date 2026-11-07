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
 * Feature "Spara & ladda utkast": save and load drafts for replies and new threads.
 */

function SaveDraftInlagg() {
    const textarea = document.getElementById('vB_Editor_001_textarea');
    const threadInput = document.querySelector('input[name="t"]');

    if (!textarea || !threadInput) return;

    const threadId = threadInput.value;
    const draftText = textarea.value.trim();
    if (!draftText) return;

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('chrome.storage not available (probably outside extension context).');
        return;
    }

    try {
        chrome.storage.sync.get(['FbqolThreadReplyDrafts'], (result) => {
            if (chrome.runtime?.lastError) {
                console.log('chrome.storage.sync.get failed:', chrome.runtime.lastError);
                // fallback to local storage
                saveToLocal(threadId, draftText);
                return;
            }

            const storedList = result.FbqolThreadReplyDrafts || [];
            const existingIndex = storedList.findIndex(item => item.threadId === threadId);

            if (existingIndex !== -1) {
                storedList[existingIndex].draft = draftText;
            } else {
                storedList.push({ threadId, draft: draftText });
            }

            chrome.storage.sync.set({ FbqolThreadReplyDrafts: storedList }, () => {
                if (chrome.runtime?.lastError) {
                    console.log('chrome.storage.sync.set failed:', chrome.runtime.lastError);
                    // fallback to local storage
                    saveToLocal(threadId, draftText);
                } else {
                    //console.log(` Draft saved (sync) for thread ${threadId}`);
                }
            });
        });
    } catch (e) {
        console.log('Unexpected storage error:', e);
        saveToLocal(threadId, draftText);
    }

    function saveToLocal(threadId, draftText) {
        try {
            chrome.storage.local.get(['FbqolThreadReplyDrafts'], (res) => {
                const localList = res.FbqolThreadReplyDrafts || [];
                const idx = localList.findIndex(item => item.threadId === threadId);

                if (idx !== -1) {
                    localList[idx].draft = draftText;
                } else {
                    localList.push({ threadId, draft: draftText });
                }

                chrome.storage.local.set({ FbqolThreadReplyDrafts: localList }, () => {
                    if (chrome.runtime?.lastError) {
                        console.log('Local storage set failed:', chrome.runtime.lastError);
                    } else {
                        console.log(`Draft saved (local fallback) for thread ${threadId}`);
                    }
                });
            });
        } catch (err) {
            console.log('Local storage fallback failed:', err);
        }
    }
}

function loadDraftInlagg() {
    const textarea = document.getElementById('vB_Editor_001_textarea');
    const threadInput = document.querySelector('input[name="t"]');

    if (!textarea || !threadInput) return;

    const threadId = threadInput.value;

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('chrome.storage not available (probably outside extension context).');
        return;
    }

    try {
        chrome.storage.sync.get(['FbqolThreadReplyDrafts'], (result) => {
            if (chrome.runtime?.lastError) {
                console.log('⚠️ chrome.storage.sync.get failed:', chrome.runtime.lastError);
                // fallback to local
                loadFromLocal();
                return;
            }

            const storedList = result.FbqolThreadReplyDrafts || [];
            const found = storedList.find(item => item.threadId === threadId);

            if (found && found.draft) {
                textarea.value = found.draft;
                console.log(`Draft loaded (sync) for thread ${threadId}`);
            } else {
                console.log(` No draft found in sync storage for thread ${threadId}`);
                // Try local storage just in case
                loadFromLocal();
            }
        });
    } catch (e) {
        console.log(' Unexpected sync error:', e);
        loadFromLocal();
    }

    function loadFromLocal() {
        try {
            chrome.storage.local.get(['FbqolThreadReplyDrafts'], (res) => {
                if (chrome.runtime?.lastError) {
                    console.log('chrome.storage.local.get failed:', chrome.runtime.lastError);
                    return;
                }

                const localList = res.FbqolThreadReplyDrafts || [];
                const foundLocal = localList.find(item => item.threadId === threadId);

                if (foundLocal && foundLocal.draft) {
                    textarea.value = foundLocal.draft;
                    console.log(`Draft loaded (local fallback) for thread ${threadId}`);
                } else {
                    console.log(`No draft found in local storage for thread ${threadId}`);
                }
            });
        } catch (err) {
            console.log('Local storage load failed:', err);
        }
    }
}

function addDraftButtonsInlagg() {
    // Exit early if the URL contains "ThreadChat" (to avoid conflicts)
    if (window.location.href.includes("@ThreadChat")) return;

    const buttonContainer = document.querySelector('.form-group .col-lg-10.col-lg-offset-2');
    if (!buttonContainer) return;

    // Check if the buttons already exist
    if (!document.getElementById('saveDraftButton')) {
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-info btn-sm';
        saveBtn.id = 'saveDraftButton';
        saveBtn.innerHTML = '<i class="fa fa-floppy-o"></i> Spara utkast';
        saveBtn.style.marginLeft = '8px';
        saveBtn.addEventListener('click', SaveDraftInlagg);

        buttonContainer.appendChild(saveBtn);
    }

    if (!document.getElementById('loadDraftButton')) {
        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'btn btn-warning btn-sm';
        loadBtn.id = 'loadDraftButton';
        loadBtn.innerHTML = '<i class="fa fa-upload"></i> Ladda utkast';
        loadBtn.style.marginLeft = '8px';
        loadBtn.addEventListener('click', loadDraftInlagg);

        buttonContainer.appendChild(loadBtn);
    }
}

function saveAndLoadDraft() { // function to save and load drafts in threads
    const url = window.location.href;
    if (url.startsWith("https://www.flashback.org/newreply.php") || 
        url.startsWith("http://www.flashback.org/newreply.php")) {
        console.log("inläggssida");
        addDraftButtonsInlagg();
    } 
    else if (url.startsWith("https://www.flashback.org/newthread.php") || 
        url.startsWith("http://www.flashback.org/newthread.php")) {
            // Case 2: Relative path version
            console.log("ny tråd");     
            addDraftButtonsThread();
    }
}

function addDraftButtonsThread() {
    const buttonContainer = document.querySelector('.col-sm-10.col-sm-offset-2');
    if (!buttonContainer) return;

    // Only create "Spara" button if it doesn't exist
    if (!document.getElementById('saveThreadDraftButton')) {
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-info btn-sm';
        saveBtn.id = 'saveThreadDraftButton';
        saveBtn.innerHTML = '<i class="fa fa-floppy-o"></i> Spara utkast';
        saveBtn.style.marginLeft = '8px';
        saveBtn.addEventListener('click', SaveDraftThread);

        buttonContainer.appendChild(saveBtn);
    }

    // Only create "Ladda" button if it doesn't exist
    if (!document.getElementById('loadThreadDraftButton')) {
        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'btn btn-warning btn-sm';
        loadBtn.id = 'loadThreadDraftButton';
        loadBtn.innerHTML = '<i class="fa fa-upload"></i> Ladda utkast';
        loadBtn.style.marginLeft = '8px';
        loadBtn.addEventListener('click', loadDraftThread);

        buttonContainer.appendChild(loadBtn);
    }
}

function SaveDraftThread() {
    const textarea = document.getElementById('vB_Editor_001_textarea');
    const subjectInput = document.querySelector('input[name="subject"]');
    if (!textarea) return;

    // Get draft name from subject input, fallback to prompt
    let draftName = subjectInput?.value.trim();
    if (!draftName) {
        draftName = prompt('Ange namn för utkastet:');
        if (!draftName) return;
    }

    const draftText = textarea.value.trim();
    if (!draftText) return;

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('chrome.storage not available.');
        return;
    }

    try {
        chrome.storage.sync.get(['FbqolNewThreadDrafts'], (result) => {
            if (chrome.runtime?.lastError) {
                console.log('chrome.storage.sync.get failed, fallback to local:', chrome.runtime.lastError);
                saveToLocal();
                return;
            }

            const storedList = result.FbqolNewThreadDrafts || [];
            const existingIndex = storedList.findIndex(item => item.name === draftName);

            if (existingIndex !== -1) {
                storedList[existingIndex].draft = draftText;
            } else {
                storedList.push({ name: draftName, draft: draftText });
            }

            chrome.storage.sync.set({ FbqolNewThreadDrafts: storedList }, () => {
                if (chrome.runtime?.lastError) saveToLocal();
                else console.log(`Draft saved (sync) under name "${draftName}"`);
            });
        });
    } catch (e) {
        console.log('Unexpected sync error:', e);
        saveToLocal();
    }

    function saveToLocal() {
        try {
            chrome.storage.local.get(['FbqolNewThreadDrafts'], (res) => {
                const localList = res.FbqolNewThreadDrafts || [];
                const idx = localList.findIndex(item => item.name === draftName);
                if (idx !== -1) localList[idx].draft = draftText;
                else localList.push({ name: draftName, draft: draftText });
                chrome.storage.local.set({ FbqolNewThreadDrafts: localList }, () => {
                    if (chrome.runtime?.lastError) console.warn('Local storage set failed:', chrome.runtime.lastError);
                    else console.log(`Draft saved (local fallback) under name "${draftName}"`);
                });
            });
        } catch (err) {
            console.log('Local storage fallback failed:', err);
        }
    }
}

function loadDraftThread() {
    const textarea = document.getElementById('vB_Editor_001_textarea');
    if (!textarea) return;

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('chrome.storage not available.');
        return;
    }

    function showDraftSelector(list, source) {
        if (!list.length) {
            console.log(`No drafts found in ${source} storage.`);
            return;
        }

        // Remove existing modal if present
        const existingModal = document.getElementById('draftSelectorModal');
        if (existingModal) existingModal.remove();

        // Create modal background
        const modalBg = document.createElement('div');
        modalBg.id = 'draftSelectorModal';
        modalBg.style.position = 'fixed';
        modalBg.style.top = '0';
        modalBg.style.left = '0';
        modalBg.style.width = '100%';
        modalBg.style.height = '100%';
        modalBg.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modalBg.style.display = 'flex';
        modalBg.style.alignItems = 'center';
        modalBg.style.justifyContent = 'center';
        modalBg.style.zIndex = '9999';

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = '#fff';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '8px';
        modalContent.style.minWidth = '300px';
        modalContent.style.maxHeight = '70%';
        modalContent.style.overflowY = 'auto';

        const title = document.createElement('h4');
        title.innerText = 'Välj utkast att ladda';
        modalContent.appendChild(title);

        list.forEach(item => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.margin = '5px 0';

            const btn = document.createElement('button');
            btn.textContent = item.name;
            btn.style.flexGrow = '1';
            btn.style.padding = '5px 10px';
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => {
                textarea.value = item.draft || '';
                console.log(`Draft loaded from ${source} storage under name "${item.name}"`);
                modalBg.remove();
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = 'X';
            delBtn.style.marginLeft = '5px';
            delBtn.style.backgroundColor = 'red';
            delBtn.style.color = '#fff';
            delBtn.style.border = 'none';
            delBtn.style.cursor = 'pointer';
            delBtn.style.padding = '0 8px';
            delBtn.style.borderRadius = '4px';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent loading draft
                // Remove from storage
                const storageKey = source === 'sync' ? chrome.storage.sync : chrome.storage.local;
                const newList = list.filter(d => d.name !== item.name);
                const data = source === 'sync' ? { FbqolNewThreadDrafts: newList } : { FbqolNewThreadDrafts: newList };
                storageKey.set(data, () => {
                    if (chrome.runtime?.lastError) {
                        console.log(`Failed to delete draft "${item.name}" from ${source}:`, chrome.runtime.lastError);
                    } else {
                        console.log(`Deleted draft "${item.name}" from ${source} storage`);
                        container.remove(); // remove from modal
                    }
                });
            });

            container.appendChild(btn);
            container.appendChild(delBtn);
            modalContent.appendChild(container);
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Avbryt';
        closeBtn.style.marginTop = '10px';
        closeBtn.style.padding = '5px 10px';
        closeBtn.addEventListener('click', () => modalBg.remove());
        modalContent.appendChild(closeBtn);

        modalBg.appendChild(modalContent);
        document.body.appendChild(modalBg);
    }

    try {
        chrome.storage.sync.get(['FbqolNewThreadDrafts'], (result) => {
            if (chrome.runtime?.lastError) {
                console.log('chrome.storage.sync.get failed, fallback to local:', chrome.runtime.lastError);
                loadFromLocal();
                return;
            }

            const storedList = result.FbqolNewThreadDrafts || [];
            if (storedList.length) {
                showDraftSelector(storedList, 'sync');
            } else {
                loadFromLocal();
            }
        });
    } catch (e) {
        console.log('Unexpected sync error:', e);
        loadFromLocal();
    }

    function loadFromLocal() {
        try {
            chrome.storage.local.get(['FbqolNewThreadDrafts'], (res) => {
                if (chrome.runtime?.lastError) return console.warn('Local storage get failed:', chrome.runtime.lastError);
                const localList = res.FbqolNewThreadDrafts || [];
                if (localList.length) showDraftSelector(localList, 'local');
            });
        } catch (err) {
            console.log('Local storage load failed:', err);
        }
    }
}
