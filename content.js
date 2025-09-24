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
// let firstLoad = 1;
let lowestPageLoaded = 0;
let highestPageLoaded = 0;
let highestPage = 0;
let currentPage = 0;
let threadId = "";
let nextPageLoaded = 0;
let startOrEnd = "";
let pagesLoaded = [];
let navigationBars = [];
let floatingDivPage = 0;
let ignoreraSetting = false;
let previewsSetting = false;
let infiniteScrollSetting = false;
const fetchQueue = [];
let isFetching = false;
let scrollTimeout;

//On first load, ensure settings exist, then load settings and start main
function ensureDefaultSettings(callback) {
    const defaultSettings = {
        'Ignorera': true,
        'Previews': true,
        'Infinite Scroll': true
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

    //console.log("Settings loaded:", {
    //    ignoreraSetting,
    //    previewsSetting,
    //    infiniteScrollSetting
    //});

    if (!infiniteScrollSetting && !previewsSetting && !ignoreraSetting) {
        return;// Early exit if all settings are false
    }
    main();//only call main if any settings are activated. 
}

function saveUsers(users) {
    try {
        chrome.storage.sync.set({ userStorageFbqolIgnore: users });
    } catch (error) {
        browser.storage.local.set({ userStorageFbqolIgnore: users });
    }
}

function getUsers(callback) {
    try {
        chrome.storage.sync.get(['userStorageFbqolIgnore'], function(result) {
            if (result.userStorageFbqolIgnore) {
                callback(result.userStorageFbqolIgnore);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        browser.storage.local.get(['userStorageFbqolIgnore'], function(result) {
            if (result.userStorageFbqolIgnore) {
                callback(result.userStorageFbqolIgnore);
            } else {
                callback([]);
            }
        });
    }
}

function removePost(postNumber) {
    var post = document.getElementById(postNumber);
    if (post) {
        post.remove();
    }
}

function findPosts(){
    const postsOnPage = document.getElementsByClassName('post-user-username dropdown-toggle');
    if (postsOnPage.length > 0) {
        Array.from(postsOnPage).forEach(element => {
            var postUser=element.innerHTML.trim()
            if (ignoreraSetting===true){
                if (users.includes(postUser)){
                    removePost(element.id.split('dropdown-user-')[1])
                } else {
                        addIgnoreButton(element.id.split('dropdown-user-')[1], postUser);
                };
            };
            if (previewsSetting===true){
                addPreviewsToPosts();
            }
        })
    }
}

function addPreviewsToPosts() {
    const posts = document.querySelectorAll('.post_message');

    function decodeHTMLEntities(str = '') {
        const ta = document.createElement('textarea');
        ta.innerHTML = str;
        return ta.value;
    }

    function cleanHref(raw) {
        try {
            if (raw.includes('leave.php')) {
                const parsed = new URL(raw, window.location.origin);
                const u = parsed.searchParams.get('u');
                if (u) return decodeHTMLEntities(decodeURIComponent(u));
            }
            return decodeHTMLEntities(raw);
        } catch (e) {
            return raw;
        }
    }

    const imageExtensions = ['jpg','jpeg','png','gif','webp','bmp'];
    const videoExtensions = ['mp4', 'webm', 'ogg'];

    posts.forEach(post => {
        if (post.querySelector('.FBQOLPreview')) return;

        const previewDiv = document.createElement('div');
        previewDiv.className = 'FBQOLPreview';
        let added = false;

        const urls = Array.from(post.querySelectorAll('a[href]'))
            .filter(a => !a.closest('.post-clamped-text'))
            .map(a => cleanHref(a.href));

        const seen = new Set();

        urls.forEach(url => {
            if (!url) return;
            let m;

            // --- YouTube ---
            m = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w\-]{11})/i);
            if (m && !seen.has('yt:' + m[1])) {
                seen.add('yt:' + m[1]);
                const iframe = document.createElement('iframe');
                iframe.width = '560';
                iframe.height = '315';
                iframe.src = `https://www.youtube.com/embed/${m[1]}`;
                iframe.frameBorder = '0';
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                iframe.allowFullscreen = true;
                iframe.style.display = 'block';
                iframe.style.margin = '10px 0';
                previewDiv.appendChild(iframe);
                added = true;
                return;
            }

           // --- TikTok ---
            m = url.match(/https?:\/\/(?:www\.)?tiktok\.com\/(@[\w.-]+\/video\/(\d+))/i);
            if (m && !seen.has('tt:' + m[1])) {
                seen.add('tt:' + m[1]);

                const iframe = document.createElement('iframe');
                iframe.src = `https://www.tiktok.com/embed/v2/${m[2]}`;
                iframe.width = '100%';
                iframe.style.maxWidth = '560px';
                iframe.height = '600'; 
                iframe.style.display = 'block';
                iframe.style.margin = '10px 0';
                iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
                iframe.frameBorder = 0;

                previewDiv.appendChild(iframe);

                added = true;
                return;
            }

            // --- Spotify ---
            m = url.match(/https?:\/\/open\.spotify\.com\/(artist|track|album|playlist)\/([a-zA-Z0-9]+)/i);
            if (m && !seen.has('spotify:' + m[2])) {
            seen.add('spotify:' + m[2]);
            fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
                .then(res => res.json())
            .then(data => {
                const match = data.html.match(/src="([^"]+)"/);
                if (!match) return;

                const iframe = document.createElement('iframe');
                iframe.src = match[1];
                iframe.width = '100%';
                iframe.style.maxWidth = '400px';
                iframe.height = '380px';
                iframe.style.display = 'block';
                iframe.style.margin = '10px 0';
                //removes allowfullscreen
                iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
                iframe.frameBorder = 0;

                previewDiv.appendChild(iframe);
            })
            .catch(e => console.error('Spotify oEmbed failed', e));

            added = true;
            return;
            }

            // --- Imgur ---
            m = url.match(/https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.[a-zA-Z]{3,4})?$/i);
            if (m) {
                const imgUrl = m[2] ? url : `https://i.imgur.com/${m[1]}.jpg`;
                if (!seen.has('imgur:' + imgUrl)) {
                    seen.add('imgur:' + imgUrl);
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.style.maxWidth = '100%';
                    img.style.display = 'block';
                    img.style.margin = '10px 0';
                    previewDiv.appendChild(img);
                    added = true;
                    return;
                }
            }

            if (url.match(/https?:\/\/imgur\.com\/a\/[a-zA-Z0-9]+/i)) return; // skip albums

            // --- Generic image links ---
            const extMatch = url.match(/\.(\w{2,5})(?:\?.*)?$/i);
            if (extMatch && imageExtensions.includes(extMatch[1].toLowerCase()) && !seen.has('file:' + url)) {
                seen.add('file:' + url);
                const img = document.createElement('img');
                img.src = url;
                img.style.maxWidth = '100%';
                img.style.display = 'block';
                img.style.margin = '10px 0';
                previewDiv.appendChild(img);
                added = true;
                return;
            }

            // --- Generic video links ---
            const videoMatch = url.match(/\.(\w{2,5})(?:\?.*)?$/i);
            if (videoMatch && videoExtensions.includes(videoMatch[1].toLowerCase()) && !seen.has('video:' + url)) {
                seen.add('video:' + url);
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.style.maxWidth = '100%';
                video.style.display = 'block';
                video.style.margin = '10px 0';
                previewDiv.appendChild(video);
                added = true;
                return;
            } 
        });

        if (added) post.appendChild(previewDiv);
    });
}

function addIgnoreButton(postNumber, userNameToButton) {
    var postUserInfo = document.getElementById(postNumber).querySelector('.post-user-info.small');
    if (postUserInfo) {
        postUserInfo.querySelectorAll('.ignoreButton').forEach(e => e.remove());
        var ignoreButton = document.createElement('button');
        ignoreButton.className = 'ignoreButton';
        ignoreButton.innerHTML = ('Ignorera ' + userNameToButton);
        ignoreButton.style.fontSize = '9px';
        ignoreButton.style.padding = '3px';
        ignoreButton.style.background = '#ccc';
        ignoreButton.style.border = 'none';
        ignoreButton.addEventListener('click', function() {
            users.push(userNameToButton);
            saveUsers(users);
            getUsers(function(retrievedUsers) {
                users = retrievedUsers;
                findPosts();
            });
        });
        postUserInfo.appendChild(ignoreButton);
    }
} 

function fetchPostsFromPage(urlToFetch) {
    fetchQueue.push(urlToFetch);
    processFetchQueue();
}

function processFetchQueue() {
    if (isFetching || fetchQueue.length === 0) return;
    isFetching = true;

    const url = fetchQueue.shift();
    //console.log("fetchPostsFromPage: " + url);

    try {
        chrome.runtime.sendMessage({ message: "fetchSite", url }, (response) => {
            isFetching = false;
            if (chrome.runtime.lastError) {
                console.warn("sendMessage failed:", chrome.runtime.lastError.message);
                // Re-queue for retry after a short delay
                setTimeout(() => fetchPostsFromPage(url), 1000);
            } else {
                //console.log("url fetched:", response.response);
                // Process next in queue
                processFetchQueue();
            }
        });
    } catch (e) {
        isFetching = false;
        console.error("sendMessage threw:", e);
        setTimeout(() => fetchPostsFromPage(url), 1000);
    }
}

function sortPosts(){
    var container = document.getElementById('posts');
    var postDivs = Array.from(container.getElementsByClassName('post'));
    var uniquePosts = new Map();

    postDivs.forEach(function(postDiv) {
        var postId = postDiv.getAttribute('data-postid');
        if (!uniquePosts.has(postId)) {
            uniquePosts.set(postId, postDiv);
        }
    });
    var sortedUniquePosts = Array.from(uniquePosts.values()).sort(function(a, b) {
        var idA = parseInt(a.getAttribute('data-postid'), 10);
        var idB = parseInt(b.getAttribute('data-postid'), 10);
        return idA - idB;
    });
    container.innerHTML = '';
    sortedUniquePosts.forEach(function(postDiv) {
        container.appendChild(postDiv);
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "parseHTML") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(request.html, 'text/html');
        const postsDiv = doc.getElementById('posts');
        let postsHtml = postsDiv ? postsDiv.innerHTML : 'No posts found';
        sendResponse({ response: postsHtml });

        const navDiv = doc.getElementsByClassName('pagination pagination-xs')[0];
        let htmlPageNumber;
        if (postsHtml !== 'No posts found' && navDiv) {
            const dataPage = doc.getElementsByClassName('input-page-jump')[0];
            if (dataPage) {
                htmlPageNumber = parseInt(dataPage.getAttribute('data-page'));
                navigationBars[htmlPageNumber] = navDiv.outerHTML;
                //console.log("htmlPageNumber:" + htmlPageNumber);
                changeNavBars();
                updateFloatingDiv(htmlPageNumber);
            } else {
                //console.log("dataPage element not found or has no 'data-page' attribute");
            }
        }

        if (postsHtml !== 'No posts found') {
            if (typeof htmlPageNumber !== 'undefined') {
                postsHtml = addPageNumberToPosts(postsHtml, htmlPageNumber);
            }
            addPostsToDom(postsHtml);
            //console.log("posts added");
            nextPageLoaded = 0;
            addLoadLastPageButton();
        }
    }
});


function addPageNumberToPosts(postsHtmlToAddPageNumbersTo, pageNumberToAdd) {
    //console.log("Adding page number to posts: page " + pageNumberToAdd);
    const parser = new DOMParser();
    const doc = parser.parseFromString(postsHtmlToAddPageNumbersTo, 'text/html');
    const posts = doc.querySelectorAll('div.post');
    posts.forEach(post => {
        post.setAttribute('pagenumber', pageNumberToAdd);
    });
    return doc.body.innerHTML;
};

function changeNavBars() {   
    let paginationElements = document.querySelectorAll('ul.pagination.pagination-xs');
    if (paginationElements.length === 0) return;
    // Updatedate first navigation bar
    if (navigationBars[lowestPageLoaded]) {
        paginationElements[0].outerHTML = navigationBars[lowestPageLoaded];
    } else {
        //console.log("Navbar for lowest page not saved yet:", lowestPageLoaded);
        // fallback: keep existing navbar
        paginationElements[0].outerHTML = paginationElements[0].outerHTML;
    }

    // Update the second navigation bar (highest page), if it exists
    if (paginationElements.length > 1) {
        if (navigationBars[highestPageLoaded]) {
            paginationElements[1].outerHTML = navigationBars[highestPageLoaded];
        } else {
            //console.log("Navbar for highest page not saved yet:", highestPageLoaded);
            // fallback: keep existing navbar
            paginationElements[1].outerHTML = paginationElements[1].outerHTML;
        }
    }
};

function addPostsToDom(postsToAdd){
    const parser = new DOMParser();
    const doc = parser.parseFromString(postsToAdd, 'text/html');
    const newPosts = Array.from(doc.querySelectorAll('div.post'));
    const container = document.getElementById("posts");
    if (!container || newPosts.length === 0) return;

    getUsers(function(retrievedUsers) {
        users = retrievedUsers || [];

        const existingLivePosts = Array.from(container.querySelectorAll('div.post'));
        const existingIds = new Set(existingLivePosts.map(p => p.getAttribute('data-postid')));

        //sort posts
        newPosts.sort((a,b) => {
            return parseInt(a.getAttribute('data-postid')||0, 10) - parseInt(b.getAttribute('data-postid')||0, 10);
        });

        newPosts.forEach(newPost => {
            const postId = newPost.getAttribute('data-postid');
            if (!postId) return;
            if (existingIds.has(postId)) return; //if post exists in DOM skip it

            // if ignore setting is true then check if user is in ignore list.  
            if (ignoreraSetting === true) {
                const userEl = newPost.querySelector('.post-user-username.dropdown-toggle') || newPost.querySelector('.post-user-username');
                const userName = userEl ? userEl.textContent.trim() : null;
                if (userName && users.includes(userName)) {
                    return; // ignorera detta nya inlägg
                }
            }

            const imported = document.importNode(newPost, true);

            const existingNow = Array.from(container.querySelectorAll('div.post'));
            let next = existingNow.find(p => parseInt(p.getAttribute('data-postid')||0, 10) > parseInt(postId, 10));

            if (next) {
                container.insertBefore(imported, next);
            } else {
                container.appendChild(imported);
            }
            existingIds.add(postId);
        });

        findPosts();          // Adds ignore buttons an previews
        addPageSeparators();  // adds page separators 
        addLoadLastPageButton();//adds load last page button if needed
        const pageNumbersNow = Array.from(document.querySelectorAll('.post'))
            .map(p => parseInt(p.getAttribute('pagenumber') || '', 10))
            .filter(n => !isNaN(n));
        if (pageNumbersNow.length > 0 && Math.min(...pageNumbersNow) === 1) {
            document.querySelectorAll('#loadLastPageButton, .load-page-button').forEach(btn => btn.remove());
        }
    });
}

function saveFirstNavbar(pageNumb) {
    const navDiv = document.getElementsByClassName('pagination pagination-xs')[0];
    if (navDiv) {
        const dataPage = document.getElementsByClassName('input-page-jump')[0];
        const htmlPageNumber = parseInt(dataPage.getAttribute('data-page'));
        navigationBars[pageNumb] = navDiv.outerHTML;
    }
}

function getThreadInfo(){
    const threadInfoElement = document.getElementsByClassName('input-page-jump')[0];
    if (threadInfoElement){
        threadId = threadInfoElement.getAttribute('data-url');
        highestPage = parseInt(threadInfoElement.getAttribute('data-total-pages'));
        currentPage = parseInt(threadInfoElement.getAttribute('data-page'));
        lowestPageLoaded = parseInt(threadInfoElement.getAttribute('data-page'));
        highestPageLoaded = parseInt(threadInfoElement.getAttribute('data-page'));
        pagesLoaded.push(currentPage);
        //console.log("threadId:" +threadId);
        //console.log("highestPage:"+highestPage);
        //console.log("currentPage:"+currentPage);
        //console.log("lowestPageLoaded:"+lowestPageLoaded);
    }
};

function initiatePageLoadForward(){
    startOrEnd='end';
    //console.log("initiateforward-highest:" + highestPage)
    //console.log("initiateforward-highestloaded:" + highestPageLoaded)
    if (highestPageLoaded<highestPage){
        currentPage++;
        highestPageLoaded++;
        if (!pagesLoaded.includes(highestPageLoaded)){
            let pageToLoadFrom=('https://www.flashback.org'+threadId+"p"+(highestPageLoaded))
            // Insert loading separator at the end of posts
            const postsContainer = document.getElementById('posts');
            if (postsContainer && !document.getElementById('loadingPageSeparator')) {
                const loadingSeparator = document.createElement('div');
                loadingSeparator.className = 'pageSeparator';
                loadingSeparator.id = 'loadingPageSeparator';
                loadingSeparator.setAttribute('data-page', highestPageLoaded);
                loadingSeparator.textContent = `Laddar sida ${highestPageLoaded}`;
                loadingSeparator.style.fontSize = '20px';
                loadingSeparator.style.background = '#7a7a7a';
                loadingSeparator.style.color = '#fff';
                loadingSeparator.style.textAlign = 'center';
                loadingSeparator.style.width = '100%';
                postsContainer.appendChild(loadingSeparator);
            }
            fetchPostsFromPage(pageToLoadFrom);
            pagesLoaded.push(highestPageLoaded);
            //console.log("pagesLoaded:"+pagesLoaded);
            history.replaceState(null,'',pageToLoadFrom);
        };
    }
}
function initiatePageLoadBackward(){
    startOrEnd='start';
    //console.log("initiatebackward-highest:" + highestPage)
    //console.log("initiatebackward-lowest:" + lowestPageLoaded)
    if (lowestPageLoaded>1){
        currentPage--;
        lowestPageLoaded--;
        if (!pagesLoaded.includes(lowestPageLoaded)){
            let pageToLoadFrom=('https://www.flashback.org'+threadId+"p"+(lowestPageLoaded))
            // Change button text to "Laddar sida X" and disable it
            const btn = document.getElementById('loadLastPageButton');
            if (btn) {
                btn.textContent = `Laddar sida ${lowestPageLoaded}`;
                btn.disabled = true;
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';
            }
            fetchPostsFromPage(pageToLoadFrom);
            pagesLoaded.push(lowestPageLoaded);
            //console.log("pagesLoaded:"+pagesLoaded);
            history.replaceState(null,'',pageToLoadFrom);
        };
    }
}
function addLoadLastPageButton(){
    document.querySelectorAll('#loadLastPageButton, .load-page-button').forEach(btn => btn.remove());

    const container = document.getElementById('posts');
    if (!container) return;

    const postNodes = Array.from(container.querySelectorAll('.post'));
    if (postNodes.length === 0) return;

    const pageNumbers = postNodes
        .map(p => parseInt(p.getAttribute('pagenumber') || '', 10))
        .filter(n => !isNaN(n));
    if (pageNumbers.length === 0) return;

    const minPage = Math.min(...pageNumbers);

    if (minPage <= 1) return;

    const pageToLoad = minPage - 1;
    const firstOfMin = postNodes.find(p => parseInt(p.getAttribute('pagenumber'), 10) === minPage);
    const insertBeforeNode = firstOfMin || container.firstChild;
    const loadLastPageButton = document.createElement('button');
    loadLastPageButton.id = 'loadLastPageButton';
    loadLastPageButton.className = 'loadLastPageButton load-page-button';
    loadLastPageButton.textContent = 'Ladda sida ' + pageToLoad;
    loadLastPageButton.setAttribute('style', `
        font-size: 20px !important;
        display: block !important;
        width: 100% !important;
        background: #7a7a7a !important;
        text-align: center !important;
        cursor: pointer !important;
        padding: 10px 0 !important;
        box-sizing: border-box !important;
        border: none !important;
        color: #fff !important;
        overflow: visible !important;
        pointer-events: auto !important;
        position: relative !important;
        z-index: 99999 !important;
    `);

    loadLastPageButton.addEventListener('click', function() {
        initiatePageLoadBackward();
    });

    container.insertBefore(loadLastPageButton, insertBeforeNode);
}

function addFloatingPageDiv() {
    if (threadId.substring(0, 2) === '/t') {
        const floatingDiv = document.createElement('div');
        floatingDiv.id = "floatingDiv";
        floatingDiv.style.position = 'fixed';
        floatingDiv.style.bottom = '10px';
        floatingDiv.style.right = '10px';
        floatingDiv.style.backgroundColor = 'white';
        floatingDiv.style.color = 'white';
        floatingDiv.style.padding = '1px';
        floatingDiv.style.zIndex = '1000';
        floatingDiv.style.zIndex = '9999 !important';
        floatingDiv.style.alignItems = 'center';
        floatingDiv.style.display = 'flex';
        document.body.appendChild(floatingDiv);
    }
};
function initialAddPageNumberToPostsInDom(initialPageNumber){
    const posts = document.querySelectorAll('div.post');
    posts.forEach(post => {
        post.setAttribute('pagenumber', initialPageNumber);
    });
};

function updateFloatingDiv(navBarNumber){
    let urlFloatinDivToSetUrlBar = ('https://www.flashback.org'+threadId+"p"+(navBarNumber));
    if (threadId.substring(0,2)!=='/t') return;

    const floatingDiv = document.getElementById("floatingDiv");
    if (!floatingDiv) return;

    if (floatingDivPage === navBarNumber && floatingDiv.innerHTML && floatingDiv.innerHTML.length > 0) {
        return;
    }

    const answDiv = document.getElementsByClassName('btn btn-default btn-xs')[0];
    const navBarHtml = navigationBars[navBarNumber];

    if (!navBarHtml || typeof navBarHtml !== 'string' || navBarHtml.length < 1) {
        //console.log("Floating navbar missing or empty for page:", navBarNumber);
        return; 
    }

    floatingDivPage = navBarNumber;
    floatingDiv.innerHTML = (answDiv ? answDiv.outerHTML : '') + navBarHtml;
    //console.log("Updated Floating Div for page:", navBarNumber);
    history.replaceState(null,'',urlFloatinDivToSetUrlBar);
};

function checkPostClosestToWindowCenter() {
    const postsDiv = document.getElementById("posts"); 
    if (!postsDiv) {
        //console.log("Posts div not found!");
        return;
    }
    const postDivs = postsDiv.querySelectorAll("div.post");

    if (postDivs.length === 0) {
        //console.log("No posts found");
        return;
    }
    const windowCenterX = window.innerWidth / 2;
    const windowCenterY = window.innerHeight / 2;

    let closestPost = null;
    let closestDistance = Infinity;

    postDivs.forEach(post => {
        const postRect = post.getBoundingClientRect();
        const postCenterX = postRect.left + postRect.width / 2;
        const postCenterY = postRect.top + postRect.height / 2;
        const distance = Math.sqrt(
            Math.pow(postCenterX - windowCenterX, 2) +
            Math.pow(postCenterY - windowCenterY, 2)
        );

        if (distance < closestDistance) {
            closestDistance = distance;
            closestPost = post;
        }
    });
    if (closestPost) {
        if (parseInt(closestPost.getAttribute("pagenumber"))!=parseInt(floatingDivPage)){
            updateFloatingDiv(closestPost.getAttribute("pagenumber"));
        }
    } else {
        //console.log("No post found");
    }
}

function addPageSeparators(){
    // Remove loading separator if present
    const loadingSep = document.getElementById('loadingPageSeparator');
    if (loadingSep) loadingSep.remove();

    const btn = document.getElementById('loadLastPageButton');
    if (btn && btn.disabled) btn.remove();

    document.querySelectorAll('.pageSeparator').forEach(e => e.remove());

    const posts = Array.from(document.querySelectorAll('.post'));
    if (posts.length === 0) return;

    let lastPage = posts[0].getAttribute('pagenumber') || null;

    for (let i = 1; i < posts.length; i++) {
        const currentPage = posts[i].getAttribute('pagenumber') || null;
        if (!currentPage) continue;

        if (currentPage !== lastPage) {
            const separator = document.createElement('div');
            separator.className = 'pageSeparator';
            separator.setAttribute('data-page', currentPage);
            separator.textContent = `Sida ${currentPage}`;
            separator.style.fontSize = '20px';
            separator.style.background = '#7a7a7a';
            separator.style.color = '#fff';
            separator.style.textAlign = 'center';
            separator.style.width = '100%';
            posts[i].parentNode.insertBefore(separator, posts[i]);
            lastPage = currentPage;
        }
    }
}

function getCookie(name) {
    return document.cookie
        .split("; ")
        .find(row => row.startsWith(name + "="))
        ?.split("=")[1] || "";
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + "; path=/" + expires;
}
function fixMultiQuote() {
    document.addEventListener("click", function(e) {
        let btn = e.target.closest(".btn-quote-multiple");
        if (!btn) return;

        e.preventDefault();

        let postId = parseInt(btn.dataset.postid);
        if (!postId) return;

        let postMessage = document.querySelector("#post_message_" + postId);
        if (!postMessage) return;

        let qpostids = (getCookie("qpostids") ? getCookie("qpostids") + "," : "") + postId;
        let postIdsArray = qpostids.split(",");

        postIdsArray = postIdsArray.filter(id => !(postMessage.classList.contains("quotem") && id == postId));

        qpostids = postIdsArray.length ? postIdsArray.join(",") : "";
        setCookie("qpostids", qpostids, 1);

        postMessage.classList.toggle("quotem");
    });
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.matches(".post")) {
                    let quoteButtons = node.querySelectorAll(".btn-quote-multiple");
                    quoteButtons.forEach(btn => btn.classList.add("quote-observed"));
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

let fbqolFirstLoad = true;
function main(){
    getUsers(function(retrievedUsers) {
        users = retrievedUsers; 
        findPosts();
    });
    if (fbqolFirstLoad) {
        if (document.readyState === 'loading') {
            document.documentElement.style.visibility = 'hidden';
            document.addEventListener('DOMContentLoaded', function() {
                try {
                    findPosts();
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
                    if (lowestPageLoaded>1){addLoadLastPageButton()};
                    window.onscroll = function(ev) {
                        if (scrollTimeout) clearTimeout(scrollTimeout);
                        scrollTimeout = setTimeout(() => {
                            checkPostClosestToWindowCenter();
                            if ((window.innerHeight + Math.round(window.scrollY)) >= document.body.offsetHeight) {
                                initiatePageLoadForward();
                            }
                            if (window.scrollY === 0) {
                                addLoadLastPageButton();
                            }
                        }, 150); // 150ms debounce
                    };
                }
            });
        } else {
            try {
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
                    checkPostClosestToWindowCenter();
                    if ((window.innerHeight + Math.round(window.scrollY)) >= document.body.offsetHeight) {
                        if ((nextPageLoaded===0) && (threadId.substring(0,2)==='/t')){
                            initiatePageLoadForward();
                        }
                        nextPageLoaded = 1;
                    }
                    if ((window.scrollY === 0)){
                        if ((nextPageLoaded===0) && (threadId.substring(0,2)==='/t')){
                            addLoadLastPageButton();
                        }
                        nextPageLoaded = 1;
                    }
                };
            }
        }
        fbqolFirstLoad = false;
    } else {
        reInitPlugin();
    }
}

// Only run DOM hooks/event listeners that need to be restored after sleep/tab inactive
function reInitPlugin() {
    findPosts();
    if (infiniteScrollSetting===true){
        if (!document.getElementById("floatingDiv")) {
            addFloatingPageDiv();
        }
        fixMultiQuote();
        if (lowestPageLoaded>1){addLoadLastPageButton()};
        window.onscroll = function(ev) {
            checkPostClosestToWindowCenter();
            if ((window.innerHeight + Math.round(window.scrollY)) >= document.body.offsetHeight) {
                if ((nextPageLoaded===0) && (threadId.substring(0,2)==='/t')){
                    initiatePageLoadForward();
                }
                nextPageLoaded = 1;
            }
            if ((window.scrollY === 0)){
                if ((nextPageLoaded===0) && (threadId.substring(0,2)==='/t')){
                    addLoadLastPageButton();
                }
                nextPageLoaded = 1;
            }
        };
        checkPostClosestToWindowCenter();
    }
}

ensureDefaultSettings(loadSettings);

// Re-initialize only DOM hooks/event listeners when the page becomes visible again (if the user switched tabs or minimized the browser)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        reInitPlugin();
    }
});