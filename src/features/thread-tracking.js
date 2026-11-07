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
 * Features "Visa Trådskapare(TS)" + "Markera visade trådar": remembers thread starter / visited threads and marks them.
 */

let threadTS = "";

function loadSaveThreadAndTS() {
    threadId=""
    const threadInfoElement = document.querySelector('.input-page-jump');
    if (threadInfoElement) {
        threadId = threadInfoElement.getAttribute('data-url');
    }

    if (!threadId) {
        const titleLink = document.querySelector('.page-title a[href]');
        if (titleLink) {
            threadId = titleLink.getAttribute('href');
        }
    }

    if (!threadId) {
        const metaOgUrl = document.querySelector('meta[property="og:url"]');
        if (metaOgUrl) {
            const ogContent = metaOgUrl.getAttribute('content');
            const match = ogContent?.match(/\/t\d+/);
            if (match) threadId = match[0];
        }
    }

    if (!threadId || !threadId.startsWith('/t')) {
        threadId = "";
    }

    if (!threadId) return;

    chrome.storage.sync.get(['userStorageFbqolThreadsAndTS'], (result) => {
        const storedList = result.userStorageFbqolThreadsAndTS || [];
        handleThreadAndTS(storedList, threadId);
    });

    function handleThreadAndTS(storedList, threadId) {
        const entry = storedList.find(item => item.threadId === threadId);
        if (entry) {
            //console.log('Found existing entry for threadId:', threadId, 'TS:', entry.TS);
            threadTS = entry.TS;
        }

        if (!threadTS) {
            //console.log('No TS found for threadId:', threadId, '— checking DOM.');
            const firstPostAnchor = document.querySelector('a[name="1"]');
            const postElement = firstPostAnchor?.closest('.post');
            const userElement = postElement?.querySelector('.post-user-username');

            if (userElement) {
                threadTS = userElement.textContent.trim();
                console.log('Found thread starter (TS) in DOM:', threadTS);
                saveThreadTS(threadId, threadTS, storedList);
                if (showTsSetting === true) markTSPostsInDom();
                return;
            }
        }

        // --- If still not found, ask service worker ---
        if (!threadTS) {
            console.log('TS not found in DOM — requesting via service worker...');
            chrome.runtime.sendMessage({ action: 'fetchThreadTS', threadId }, (response) => {
                if (!response) {
                    //console.log("No response from background.");
                    return;
                }

                if (response.error) {
                    //console.log("Background error fetching thread:", response.error);
                    return;
                }

                if (!response.html) {
                    //console.log("Background returned no html for thread:", threadId);
                    return;
                }

                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.html, "text/html");

                    const firstPostAnchor = doc.querySelector('a[name="1"]');
                    const postElement = firstPostAnchor?.closest?.('.post');
                    const userElement = postElement?.querySelector?.('.post-user-username');

                    if (userElement && userElement.textContent) {
                        const fetchedThreadTS = userElement.textContent.trim();
                        console.log("Got TS from fetched HTML:", fetchedThreadTS);
                        threadTS = fetchedThreadTS;
                        chrome.storage.sync.get(['userStorageFbqolThreadsAndTS'], (result) => {
                            const storedList = result.userStorageFbqolThreadsAndTS || [];
                            if (!storedList.some(item => item.threadId === threadId)) {
                                const updatedList = [...storedList, { threadId, TS: threadTS }];
                                chrome.storage.sync.set({ userStorageFbqolThreadsAndTS: updatedList }, () => {
                                    console.log('Saved threadId + TS to sync storage:', { threadId, TS: threadTS });
                                    chrome.storage.local.set({ userStorageFbqolThreadsAndTS: updatedList }, () => {
                                        console.log('Saved threadId + TS to local storage as well.');
                                    });
                                });
                            }
                        });

                        if (showTsSetting === true) {
                            markTSPostsInDom();
                        }
                    } else {
                        //console.warn("Could not find thread starter username in fetched HTML for", threadId);
                    }
                } catch (err) {
                    //console.error("Error parsing fetched HTML:", err);
                }
            });
        }

        if (showTsSetting === true && threadTS) {
            markTSPostsInDom();
        }
    }

    function saveThreadTS(threadId, threadTS, storedList) {
        const exists = storedList.some(item => item.threadId === threadId);
        if (exists) return;

        const updatedList = [...storedList, { threadId, TS: threadTS }];

        chrome.storage.sync.set({ userStorageFbqolThreadsAndTS: updatedList }, () => {

            // Also save to local
            chrome.storage.local.set({ userStorageFbqolThreadsAndTS: updatedList }, () => {
            });
        });
    }
}

function markTSPostsInDom() {
    if (!threadTS) return;

    const usernameElements = document.querySelectorAll('.post-user-username');

    usernameElements.forEach(userEl => {
        const username = userEl.textContent.trim();
        const postRow = userEl.closest('.post-row');
        //const postLeft = userEl.closest('.post-col.post-left');
        const postLeft = postRow.querySelector('.post-user-info.small');
        const postRight = postRow?.querySelector('.post-col.post-right');
        if (!postRow || !postLeft || !postRight) return;

        let tsBadge = postLeft.querySelector('.ts-badge');

        if (username === threadTS) {
            postRight.style.backgroundColor = "rgba(214, 211, 6, 0.05)";
            postRight.style.borderRadius = "6px";
            postRight.style.transition = "all 0.3s ease";

            if (!tsBadge) {
                tsBadge = document.createElement('div');
                tsBadge.className = 'ts-badge';
                tsBadge.textContent = "TS";
                tsBadge.style.display = "inline-block";
                tsBadge.style.padding = "1px 3px";
                tsBadge.style.fontSize = "10px";
                tsBadge.style.fontWeight = "bold";
                tsBadge.style.color = "#000";
                tsBadge.style.backgroundColor = "yellow";
                tsBadge.style.border = "0.5px solid #ccc";
                tsBadge.style.borderRadius = "2px";
                tsBadge.style.pointerEvents = "none";
                tsBadge.style.marginRight = "4px";
                tsBadge.style.marginBottom = "2px";
                tsBadge.style.whiteSpace = "nowrap";

                if (getComputedStyle(postLeft).position === "static") {
                    postLeft.style.position = "relative";
                }

                //postLeft.appendChild(tsBadge);
                postLeft.insertBefore(tsBadge, postLeft.firstChild); 
            }
        } else {
            // Reset non-TS posts
            postRight.style.backgroundColor = "";
            postRight.style.borderRadius = "";
            if (tsBadge) tsBadge.remove();
        }
    });
}

function highlightStoredThreads() {
    //console.log("🟦 highlightStoredThreads() called");

    const threadElements = document.querySelectorAll(
        '.thread-title, a[id^="thread_title_"]'
    );
    //console.log("🟦 Found", threadElements.length, "thread elements");

    if (threadElements.length === 0) {
        //console.warn('⚠️ No thread-title elements found on this page.');
        return;
    }

    const getStorage = (callback) => {
        const runCallback = (data) => {
            if (typeof callback === 'function') {
                callback(data || []);
            }
        };

        try {
            // Prefer Chrome sync storage if available
            if (typeof chrome !== 'undefined' && chrome.storage?.sync?.get) {
                chrome.storage.sync.get(['userStorageFbqolThreadsAndTS'], (result) => {
                    if (chrome.runtime?.lastError) {
                        //console.warn('⚠️ chrome.storage.sync error:', chrome.runtime.lastError);
                        // fallback to chrome.storage.local
                        if (chrome.storage?.local?.get) {
                            chrome.storage.local.get(['userStorageFbqolThreadsAndTS'], (res) => {
                                runCallback(res.userStorageFbqolThreadsAndTS || []);
                            });
                        } else {
                            runCallback([]);
                        }
                    } else {
                        runCallback(result.userStorageFbqolThreadsAndTS || []);
                    }
                });
            } 
            // fallback to local storage
            else if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
                chrome.storage.local.get(['userStorageFbqolThreadsAndTS'], (result) => {
                    runCallback(result.userStorageFbqolThreadsAndTS || []);
                });
            } 
            else {
                //console.warn('⚠️ No storage API available');
                runCallback([]);
            }
        } catch (error) {
            //console.error('Storage retrieval failed:', error);
            runCallback([]);
        }
    };

    getStorage((storedList) => {
        if (!Array.isArray(storedList)) {
            //console.warn("⚠️ Stored list is not an array:", storedList);
            return;
        }

        //console.log("📋 Stored thread IDs:", storedList.map(i => i.threadId));

        threadElements.forEach((el) => {
            const threadHref = el.getAttribute('href');
            if (!threadHref) return;

            const match = storedList.find(item => item.threadId === threadHref);
            if (match) {
                //console.log("✅ Highlighting thread:", threadHref, "→", match.TS);
                el.style.backgroundColor = 'rgba(188, 196, 205, 0.58)'; //grey
                el.style.borderRadius = '5px';
                el.style.padding = '2px 4px';
            }
        });
    });
}
