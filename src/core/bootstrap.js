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
 * Entry point (loaded last): main(), re-initialisation and the page level event listeners.
 */

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page restored from cache (Back/Forward)
        try {
            reInitPlugin(); // or just highlightStoredThreads()
        } catch (e) {
            console.error('Error re-initializing plugin on back:', e);
        }
    }
});

let fbqolFirstLoad = true;

function main(){
    if(bypassLeavingSetting){try{const u=new URLSearchParams(location.search).get('u');if(location.pathname.endsWith('/leave.php')&&u){location.replace(decodeURIComponent(u));return}}catch(e){}}
     if (showTsSetting === true || markReadThreadsSetting === true) {
        loadSaveThreadAndTS();
    } // 251013
    if (markReadThreadsSetting === true) {
        highlightStoredThreads()
    }
    if (saveDraftsSetting === true) {
        saveAndLoadDraft();
    }
    if (searchLinksSetting === true) {
        searchLinks();
    }
    if (threadChatSetting === true) {
        threadChat();
    }
    getUsers(function(retrievedUsers) {
        users = retrievedUsers; 
        findPosts();
    });
    if (fbqolFirstLoad) {
        if (document.readyState === 'loading') {
            document.documentElement.style.visibility = 'hidden';
            document.addEventListener('DOMContentLoaded', function() {
                try {
                    if(bypassLeavingSetting){rewriteLeaveLinks()}
                    findPosts();
                    if (showTsSetting === true || markReadThreadsSetting === true) {
                        loadSaveThreadAndTS();
                    } // 251013
                    if (markReadThreadsSetting === true) {
                        highlightStoredThreads()
                    }
                    if (saveDraftsSetting === true) {
                        saveAndLoadDraft();
                    }
                    if (searchLinksSetting === true) {
                        searchLinks();
                    }
                    if (threadChatSetting === true) {
                        threadChat();
                    }
                } catch(error){
                    //console.log('KATTSKRÄLLE:'+error);
                }
                document.documentElement.style.visibility = '';
                if (infiniteScrollSetting===true){
                    getThreadInfo();
                    initialAddPageNumberToPostsInDom(currentPage);
                    saveFirstNavbar(currentPage);
                    addFloatingPageDiv();
                    updateFloatingDiv(currentPage);
                    fixMultiQuote();
                    setupMutationObserver();
                    if (lowestPageLoaded>1){addLoadLastPageButton()};
                    window.onscroll = function(ev) {
                        if (window.location.href.includes("@ThreadChat")) return;
                        //251026 don't run when search div is open
                        const toggleDiv = document.querySelector('.kattskralle-search-div');
                        if (toggleDiv) return;
                        //251026 don't run when search div is open
                        if (scrollTimeout) clearTimeout(scrollTimeout);
                        scrollTimeout = setTimeout(() => {
                            checkPostClosestToWindowCenter();
                            tryTriggerForwardLoad(800); 
                            if (window.scrollY === 0) {
                                if (nextPageLoaded === 0 && threadId.substring(0,2) === '/t') {
                                    addLoadLastPageButton();
                                }
                                if (lowestPageLoaded > 1) {
                                    nextPageLoaded = 1;
                                }
                            } else {
                                if (!isInitiatingPageLoad) {
                                    nextPageLoaded = 0;
                                }
                            }
                        }, 150); // 150ms debounce
                    };
                }
            });
        } else {
            try {
                if(bypassLeavingSetting){rewriteLeaveLinks()}
                findPosts();
            } catch(error){
                //console.log('KATTSKRÄLLE:'+error);
            };
            document.documentElement.style.visibility = '';
            if (infiniteScrollSetting===true){
                getThreadInfo();
                initialAddPageNumberToPostsInDom(currentPage);
                saveFirstNavbar(currentPage);
                addFloatingPageDiv();
                updateFloatingDiv(currentPage);
                fixMultiQuote();
                if (lowestPageLoaded>1){addLoadLastPageButton()};
                window.onscroll = function(ev) {
                    if (window.location.href.includes("@ThreadChat")) return;
                    //251026 don't run when search div is open
                    const toggleDiv = document.querySelector('.kattskralle-search-div');
                    if (toggleDiv) return;
                    //251026 don't run when search div is open
                    checkPostClosestToWindowCenter();
                    tryTriggerForwardLoad(800);
                    if (window.scrollY === 0) {
                        if (nextPageLoaded === 0 && threadId.substring(0,2) === '/t') {
                            addLoadLastPageButton();
                        }
                        if (lowestPageLoaded > 1) {
                            nextPageLoaded = 1;
                        }
                    } else {
                        if (!isInitiatingPageLoad) {
                            nextPageLoaded = 0;
                        }
                    }
                };
            }
        }
        fbqolFirstLoad = false;
    } else {
        reInitPlugin();
    }
}

function reInitPlugin() {
    findPosts();
    if (markReadThreadsSetting === true) {
        highlightStoredThreads()
    }
    if (infiniteScrollSetting===true){
        if (!document.getElementById("floatingDiv")) {
            addFloatingPageDiv();
        }
        fixMultiQuote();
        if (lowestPageLoaded>1){addLoadLastPageButton()};
        window.onscroll = function(ev) {
            if (window.location.href.includes("@ThreadChat")) return;
            //251026 don't run when search div is open
            const toggleDiv = document.querySelector('.kattskralle-search-div');
            if (toggleDiv) return;
            //251026 don't run when search div is open
            checkPostClosestToWindowCenter();
            tryTriggerForwardLoad(800);
            if (window.innerHeight + Math.round(window.scrollY) >= document.body.offsetHeight) {
            }
            if (window.scrollY === 0) {
                if (nextPageLoaded === 0 && threadId.substring(0,2) === '/t') {
                    addLoadLastPageButton();
                }
                nextPageLoaded = 1;
            }
        };
        checkPostClosestToWindowCenter();
    }
}

ensureDefaultSettings(loadSettings);

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        reInitPlugin();
    }
});
