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
 * Feature "Sök länkar": search for links in a thread, show results, export to HTML/TXT.
 */

let searchCancelled = false;

function searchLinks() {
    const postsDiv = document.getElementById('posts');
    if (postsDiv && !document.getElementById('searchLinks')) {
        const functionsDiv = getOrCreateKattskralleFunctionsDiv();
        if (!functionsDiv) return;
        
        const searchBtn = document.createElement('button');
        searchBtn.id = 'searchLinks';
        searchBtn.type = 'button';
        searchBtn.classList.add('btn', 'btn-sm');
        searchBtn.textContent = 'Sök länkar i tråd';
        searchBtn.style.cssText = 'margin-right: 10px; background: #7a7a7a; color: #fff; border: none; padding: 6px 12px; cursor: pointer; white-space: nowrap;';

        searchBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (typeof showSearchLinksInThreadMenu === 'function') {
                showSearchLinksInThreadMenu();
            } else {
                console.log('showSearchLinksInThreadMenu() is not defined.');
            }
        });

        functionsDiv.appendChild(searchBtn);
    }

     if (postsDiv) {
        const dropdownSearch = document.getElementById('dropdown-search');
        if (dropdownSearch && !document.getElementById('searchLinks2')) {
            const searchBtn2 = document.createElement('button');
            searchBtn2.id = 'searchLinks2';
            searchBtn2.type = 'button';
            searchBtn2.classList.add('btn', 'btn-sm', 'btn-warning');
            searchBtn2.textContent = 'Kattskrälle extension - Sök länkar i tråd';

            searchBtn2.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof showSearchLinksInThreadMenu === 'function') {
                    showSearchLinksInThreadMenu();
                } else {
                    console.log('showSearchLinksInThreadMenu() is not defined.');
                }
            });
            searchBtn2.style.fontSize = '12px';
            searchBtn2.style.display = 'block';
            searchBtn2.style.width = '100%';
            searchBtn2.style.background = '#7a7a7a';
            searchBtn2.style.color = '#fff';
            searchBtn2.style.textAlign = 'center';
            searchBtn2.style.cursor = 'pointer';
            searchBtn2.style.padding = '6px 0';
            searchBtn2.style.boxSizing = 'border-box';
            searchBtn2.style.border = 'none';
            searchBtn2.style.position = 'relative';
            searchBtn2.style.overflow = 'visible';
            searchBtn2.style.pointerEvents = 'auto';
            dropdownSearch.appendChild(searchBtn2);
        }
    }
}

function showSearchLinksInThreadMenu() {
    // Ensure necessary thread info is set
    if (typeof threadId === 'undefined' || typeof highestPage === 'undefined' || !threadId || !highestPage) {
        getThreadInfo();
    }

    const searchBtn = document.getElementById('searchLinks'); 
    const searchBtnDropdown = document.getElementById('searchLinks2');
    if (!searchBtn && !searchBtnDropdown) return;

    const postsDiv = document.getElementById('posts');
    const paginationULs = document.querySelectorAll('ul.pagination.pagination-xs');
    const replyBtns = document.querySelectorAll('div.btn-group a.btn.btn-default.btn-xs[href*="/newreply.php"]');

    let toggleDiv = document.querySelector('.kattskralle-search-div');

    function closeToggleDiv() {
        // Use unified function to show posts and reset all buttons
        // This will close the toggleDiv if it exists
        showPostsAndResetButtons();
    }

    if (toggleDiv) {
        closeToggleDiv();
    } else {
        if (postsDiv) postsDiv.style.display = 'none';
        paginationULs.forEach(ul => ul.style.display = 'none');
        replyBtns.forEach(btn => btn.style.display = 'none');

        toggleDiv = document.createElement('div');
        toggleDiv.classList.add('kattskralle-search-div');
        toggleDiv.style.cssText = 'position:relative; margin:10px 0; padding:10px; border:1px solid #ccc; background-color:#f9f9f9;';

        const titleP = document.createElement('p');
        titleP.textContent = 'Kattskrälle - Sök länkar i tråd';
        titleP.style.cssText = 'font-weight:bold; margin:0 0 8px 0; font-size:1em;';
        toggleDiv.appendChild(titleP);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'X';
        closeBtn.style.cssText = `
            position:absolute; top:5px; right:5px; border:1px solid red; background:white;
            color:red; cursor:pointer; font-weight:bold; font-size:14px; line-height:14px;
            width:20px; height:20px; text-align:center; padding:0; border-radius:2px;
        `;
        closeBtn.title = 'Stäng';
        closeBtn.addEventListener('click', closeToggleDiv);
        toggleDiv.appendChild(closeBtn);

        const segment1 = document.createElement('div');
        segment1.style.cssText = 'border:1px solid #ccc; border-radius:3px; padding:6px; margin-bottom:6px; background:#fff;';
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:auto 1fr; gap:4px 6px; align-items:center; max-width:300px;';

        const labelThread = document.createElement('label');
        labelThread.textContent = 'TrådID:';
        labelThread.style.fontWeight = 'bold';
        labelThread.setAttribute('for','threadId');

        const inputThread = document.createElement('input');
        inputThread.type = 'text';
        inputThread.id = 'threadId';
        inputThread.name = 'threadId';
        inputThread.value = threadId || '';
        inputThread.readOnly = true;
        inputThread.style.cssText = 'padding:2px 4px; border:1px solid #bbb; border-radius:3px; width:100%;';
        inputThread.style.backgroundColor = '#eee'; 

        const labelFrom = document.createElement('label');
        labelFrom.textContent = 'Från Sida:';
        labelFrom.style.fontWeight = 'bold';
        labelFrom.setAttribute('for','fromPage');

        const inputFrom = document.createElement('input');
        inputFrom.type = 'number';
        inputFrom.id = 'fromPage';
        inputFrom.name = 'fromPage';
        inputFrom.value = 1;
        inputFrom.min = 1;
        inputFrom.max = highestPage || 1;
        inputFrom.style.cssText = 'padding:2px 4px; border:1px solid #bbb; border-radius:3px; width:100%;';
        inputFrom.addEventListener('input', () => {
            if (parseInt(inputFrom.value) > highestPage) inputFrom.value = highestPage;
        });

        const labelTo = document.createElement('label');
        labelTo.textContent = 'Till Sida:';
        labelTo.style.fontWeight = 'bold';
        labelTo.setAttribute('for','toPage');

        const inputTo = document.createElement('input');
        inputTo.type = 'number';
        inputTo.id = 'toPage';
        inputTo.name = 'toPage';
        inputTo.value = highestPage || 1;
        inputTo.min = 1;
        inputTo.max = highestPage || 1;
        inputTo.style.cssText = 'padding:2px 4px; border:1px solid #bbb; border-radius:3px; width:100%;';
        inputTo.addEventListener('input', () => {
            if (parseInt(inputTo.value) > highestPage) inputTo.value = highestPage;
        });

        grid.append(labelThread,inputThread,labelFrom,inputFrom,labelTo,inputTo);
        segment1.appendChild(grid);
        toggleDiv.appendChild(segment1);

        // --- Segment 2: Checkboxes & Buttons ---
        const segment2 = document.createElement('div');
        segment2.style.cssText = 'border:1px solid #ccc; border-radius:3px; padding:6px; margin-bottom:6px; background:#fff;';
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.cssText='display:flex; gap:6px; flex-wrap:wrap;';

        // Safe / unsafe mode
        const checkboxSafeBox = document.createElement('div');
        checkboxSafeBox.style.cssText='display:flex; flex-direction:column; gap:2px; min-width:180px; border:1px solid #ccc; border-radius:3px; padding:4px; background:#fefefe;';
        const safeP = document.createElement('p'); safeP.textContent='Sökläge'; safeP.style.cssText='margin:0 0 2px 0; font-weight:bold;';
        const safeLabel = document.createElement('label'); safeLabel.style.cssText='display:flex; align-items:center; gap:4px;';
        const safeCheckbox = document.createElement('input'); safeCheckbox.type='checkbox'; safeCheckbox.id='safeMode'; safeCheckbox.checked=true;
        safeLabel.appendChild(safeCheckbox); safeLabel.appendChild(document.createTextNode('Säkert läge - Långsammare men rekommenderat'));
        const unsafeLabel = document.createElement('label'); unsafeLabel.style.cssText='display:flex; align-items:center; gap:4px;';
        const unsafeCheckbox = document.createElement('input'); unsafeCheckbox.type='checkbox'; unsafeCheckbox.id='unsafeMode';
        unsafeLabel.appendChild(unsafeCheckbox); unsafeLabel.appendChild(document.createTextNode('Osäkert läge - Snabbare men risk för IP-blockering'));
        checkboxSafeBox.append(safeP,safeLabel,unsafeLabel);

        // Result format
        const checkboxResultBox = document.createElement('div');
        checkboxResultBox.style.cssText='display:flex; flex-direction:column; gap:2px; min-width:180px; border:1px solid #ccc; border-radius:3px; padding:4px; background:#fefefe;';
        const resultP = document.createElement('p'); resultP.textContent='Resultat format'; resultP.style.cssText='margin:0 0 2px 0; font-weight:bold;';
        const linkOnlyLabel = document.createElement('label'); linkOnlyLabel.style.cssText='display:flex; align-items:center; gap:4px;';
        const linkOnlyCheckbox = document.createElement('input'); linkOnlyCheckbox.type='checkbox'; linkOnlyCheckbox.id='linkOnly'; linkOnlyCheckbox.checked=true;
        linkOnlyLabel.appendChild(linkOnlyCheckbox); linkOnlyLabel.appendChild(document.createTextNode('Endast länkar'));
        const fullPostLabel = document.createElement('label'); fullPostLabel.style.cssText='display:flex; align-items:center; gap:4px;';
        const fullPostCheckbox = document.createElement('input'); fullPostCheckbox.type='checkbox'; fullPostCheckbox.id='fullPost';
        fullPostLabel.appendChild(fullPostCheckbox); fullPostLabel.appendChild(document.createTextNode('Hela inlägg'));
        checkboxResultBox.append(resultP,linkOnlyLabel,fullPostLabel);

        // Flashback links
        const checkboxFlashbackBox = document.createElement('div');
        checkboxFlashbackBox.style.cssText = 'display:flex; flex-direction:column; gap:2px; min-width:180px; border:1px solid #ccc; border-radius:3px; padding:4px; background:#fefefe;';
        const flashbackP = document.createElement('p'); flashbackP.textContent = 'Flashback-länkar'; flashbackP.style.cssText = 'margin:0 0 2px 0; font-weight:bold;';

        const hideFlashbackLabel = document.createElement('label'); 
        hideFlashbackLabel.style.cssText = 'display:flex; align-items:center; gap:4px;';
        const hideFlashbackCheckbox = document.createElement('input'); 
        hideFlashbackCheckbox.type = 'checkbox'; 
        hideFlashbackCheckbox.id = 'hideFlashback'; 
        hideFlashbackCheckbox.checked = true;
        hideFlashbackLabel.appendChild(hideFlashbackCheckbox);
        hideFlashbackLabel.appendChild(document.createTextNode('Visa inte Flashback-länkar'));

        const showFlashbackLabel = document.createElement('label'); 
        showFlashbackLabel.style.cssText = 'display:flex; align-items:center; gap:4px;';
        const showFlashbackCheckbox = document.createElement('input'); 
        showFlashbackCheckbox.type = 'checkbox'; 
        showFlashbackCheckbox.id = 'showFlashback'; 
        showFlashbackCheckbox.checked = false;
        showFlashbackLabel.appendChild(showFlashbackCheckbox);
        showFlashbackLabel.appendChild(document.createTextNode('Visa Flashback-länkar'));

        hideFlashbackCheckbox.addEventListener('change',()=>{if(hideFlashbackCheckbox.checked) showFlashbackCheckbox.checked=false;});
        showFlashbackCheckbox.addEventListener('change',()=>{if(showFlashbackCheckbox.checked) hideFlashbackCheckbox.checked=false;});

        checkboxFlashbackBox.append(flashbackP, hideFlashbackLabel, showFlashbackLabel);

        checkboxContainer.append(checkboxSafeBox,checkboxResultBox,checkboxFlashbackBox);
        segment2.appendChild(checkboxContainer);

        // Buttons
        const btnDiv = document.createElement('div'); btnDiv.style.cssText='display:flex; gap:6px; margin:6px 0;';
        const startBtn = document.createElement('button'); startBtn.id='startButton'; startBtn.textContent='Starta sökning';
        const cancelBtn = document.createElement('button'); cancelBtn.id='cancelButton'; cancelBtn.textContent='Avbryt';
        startBtn.addEventListener('click', startSearchLinksInThread);
        cancelBtn.addEventListener('click', closeToggleDiv);
        btnDiv.append(startBtn,cancelBtn);
        segment2.appendChild(btnDiv);

        // Activity
        const activityDiv = document.createElement('div'); activityDiv.style.cssText='border:1px solid #ccc; border-radius:3px; padding:4px; background:#fefefe;';
        const activityP = document.createElement('p'); activityP.id='activityText'; activityP.textContent='Aktivitet: Söker igenom sida 0 av 0 efter länkar.'; 
        activityDiv.id='activityDiv';
        activityP.style.cssText='margin:0 0 2px 0; font-size:0.9em;';
        const progressBar = document.createElement('div'); progressBar.style.cssText='width:100%; background-color:#eee; border-radius:3px; overflow:hidden; height:14px;';
        const progressInner = document.createElement('div'); progressInner.id='progressBar'; progressInner.style.cssText='height:100%; width:0%; background-color:#4caf50; transition:width 0.2s;';
        progressBar.appendChild(progressInner); activityDiv.append(activityP,progressBar);
        segment2.appendChild(activityDiv);

        toggleDiv.appendChild(segment2);

        // --- Segment 3: Results ---
        const segment3 = document.createElement('div'); 
        segment3.style.cssText = 'border:1px solid #ccc; border-radius:3px; padding:6px; background:#fff; margin-bottom:6px;';

        const resultatP = document.createElement('p'); 
        resultatP.textContent = 'Resultat:'; 
        resultatP.style.cssText = 'margin:0 0 2px 0; font-weight:bold;';
        segment3.appendChild(resultatP);

        segment3.id = 'resultSegment';

        const resultBtnDiv = document.createElement('div'); 
        resultBtnDiv.style.cssText = 'display:flex; gap:6px; margin-top:4px;';

        const saveTxtBtn = document.createElement('button'); 
        saveTxtBtn.id = 'saveTxtButton'; 
        saveTxtBtn.textContent = 'Spara länkar till .txt-fil';

        // **Add click listener to call your function**
        saveTxtBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveResultsToTxt();
        });

        const saveHtmlBtn = document.createElement('button'); 
        saveHtmlBtn.id = 'saveHtmlButton'; 
        saveHtmlBtn.textContent = 'Spara resultat till .HTML-fil';
        saveHtmlBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof saveResultsToHtml === 'function') {
                saveResultsToHtml();
            } else {
                console.log('saveResultsToHtml() is not defined.');
            }
        });
        resultBtnDiv.append(saveTxtBtn, saveHtmlBtn);
        segment3.appendChild(resultBtnDiv);

        const resultatDiv = document.createElement('div'); 
        resultatDiv.id = 'resultat';
        resultatDiv.style.cssText = 'border:1px solid #ccc; border-radius:3px; padding:4px; min-height:40px; background:#fff; font-size:0.9em;';
        segment3.appendChild(resultatDiv);
        toggleDiv.appendChild(segment3);

        // Mutually exclusive checkboxes
        safeCheckbox.addEventListener('change',()=>{if(safeCheckbox.checked) unsafeCheckbox.checked=false;});
        unsafeCheckbox.addEventListener('change',()=>{if(unsafeCheckbox.checked) safeCheckbox.checked=false;});
        linkOnlyCheckbox.addEventListener('change',()=>{if(linkOnlyCheckbox.checked) fullPostCheckbox.checked=false;});
        fullPostCheckbox.addEventListener('change',()=>{if(fullPostCheckbox.checked) linkOnlyCheckbox.checked=false;});

        // Insert toggleDiv first
        if(postsDiv){ postsDiv.parentNode.insertBefore(toggleDiv,postsDiv); }
        else { document.body.insertBefore(toggleDiv,document.body.firstChild); }
        
        // Create/show unified back button and always position it before toggleDiv
        const backBtn = createBackToThreadButton();
        if (backBtn && toggleDiv.parentNode) {
            backBtn.style.display = '';
            // Always ensure back button is positioned before toggleDiv
            if (backBtn.nextSibling !== toggleDiv) {
                toggleDiv.parentNode.insertBefore(backBtn, toggleDiv);
            }
        }

        // Hide searchLinks buttons
        if (searchBtn) searchBtn.style.display = 'none';
        if (searchBtnDropdown) searchBtnDropdown.style.display = 'none';
        
        // Hide threadChat button
        const threadChatBtn = document.getElementById('threadChatBtn');
        if (threadChatBtn) threadChatBtn.style.display = 'none';

        const activityDivEl = document.getElementById('activityDiv');
        if (activityDivEl) activityDivEl.style.display = 'none';
        const resultSegmentEl = document.getElementById('resultSegment');
        if (resultSegmentEl) resultSegmentEl.style.display = 'none';
    }
}

function saveResultsToHtml() {
    const resultatDiv = document.getElementById('resultat');
    if (!resultatDiv) return;

    const cloneDiv = resultatDiv.cloneNode(true);

    cloneDiv.querySelectorAll('.post ul.dropdown-menu').forEach(menu => menu.remove());

    cloneDiv.querySelectorAll('.post a').forEach(link => {
        const textNode = document.createTextNode(link.textContent);
        link.replaceWith(textNode);
    });

    cloneDiv.querySelectorAll('.post').forEach(post => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('collapsible-post');

        const postContent = document.createElement('div');
        postContent.classList.add('post-content');
        postContent.style.maxHeight = '5em';
        postContent.style.overflow = 'hidden';
        postContent.style.position = 'relative';

        post.parentNode.insertBefore(wrapper, post);
        postContent.appendChild(post);
        wrapper.appendChild(postContent);

        const fade = document.createElement('div');
        fade.classList.add('fade-overlay');
        fade.style.cssText = `
            position:absolute; bottom:0; left:0; right:0;
            height:2em; background: linear-gradient(rgba(255,255,255,0), #fff);
            pointer-events:none;
        `;
        postContent.appendChild(fade);

        const btn = document.createElement('button');
        btn.textContent = 'Visa mer';
        btn.classList.add('toggle-btn');
        wrapper.appendChild(btn);
    });

    const style = `
    body { font-family: Arial, sans-serif; padding: 10px; background: #fefefe; }
    .collapsible-post { margin-bottom: 12px; border: 1px solid #ccc; border-radius: 4px; padding: 6px; background: #fff; position: relative; }
    .collapsible-post button.toggle-btn { cursor: pointer; padding: 2px 6px; border: 1px solid #888; background: #eee; border-radius: 2px; margin-top:4px; }
    .collapsible-post .post-content { transition: max-height 0.3s ease; overflow: hidden; position: relative; }
    .collapsible-post .fade-overlay { pointer-events: none; }
    a { color: blue; text-decoration: underline; }
    `;

    const script = `
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.collapsible-post').forEach(wrapper => {
            const btn = wrapper.querySelector('button.toggle-btn');
            const content = wrapper.querySelector('.post-content');
            const fade = wrapper.querySelector('.fade-overlay');
            btn.addEventListener('click', () => {
                if (content.style.maxHeight === 'none') {
                    content.style.maxHeight = '5em';
                    fade.style.display = 'block';
                    btn.textContent = 'Visa mer';
                } else {
                    content.style.maxHeight = 'none';
                    fade.style.display = 'none';
                    btn.textContent = 'Minimera';
                }
            });
        });
    });
    `;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>Saved Results</title>
    <style>${style}</style>
    </head>
    <body>
    ${cloneDiv.innerHTML}
    <script>${script}</script>
    </body>
    </html>
    `;

    const threadIdEl = document.getElementById('threadId');
    const fromPageEl = document.getElementById('fromPage');
    const toPageEl = document.getElementById('toPage');

    const threadId = threadIdEl ? threadIdEl.value.replace(/\//g, '') : 'unknownThread';
    const fromPage = fromPageEl ? fromPageEl.value : 'unknownFrom';
    const toPage = toPageEl ? toPageEl.value : 'unknownTo';

    const filename = `results-kattskrälle-${threadId}-${fromPage}-${toPage}.html`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function saveResultsToTxt() {
    const resultatDiv = document.getElementById('resultat');
    if (!resultatDiv) return;

    const links = Array.from(resultatDiv.querySelectorAll('a')).filter(link => !link.closest('.post'));

    if (links.length === 0) {
        alert('Inga länkar hittades att spara.');
        return;
    }

    let txtContent = '';
    links.forEach(link => {
        txtContent += link.href + '\n';
    });

    const threadIdEl = document.getElementById('threadId');
    const fromPageEl = document.getElementById('fromPage');
    const toPageEl = document.getElementById('toPage');

    let threadId = threadIdEl ? threadIdEl.value.replace(/\//g, '') : 'unknownThread';
    let fromPage = fromPageEl ? fromPageEl.value : 'unknownFrom';
    let toPage = toPageEl ? toPageEl.value : 'unknownTo';

    const filename = `links-kattskrälle-${threadId}-${fromPage}-${toPage}.txt`;

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function startSearchLinksInThread() {
    searchCancelled = false;

    const startBtn = document.getElementById('startButton');
    if (startBtn) startBtn.style.display = 'none';

    const inputFrom = document.getElementById('fromPage');
    const inputTo = document.getElementById('toPage');
    if (inputFrom) { inputFrom.disabled = true; inputFrom.style.backgroundColor = '#eee'; }
    if (inputTo) { inputTo.disabled = true; inputTo.style.backgroundColor = '#eee'; }

    const safeCheckbox = document.getElementById('safeMode');
    const unsafeCheckbox = document.getElementById('unsafeMode');
    const linkOnlyCheckbox = document.getElementById('linkOnly');
    const fullPostCheckbox = document.getElementById('fullPost');
    const hideFlashbackCheckbox = document.getElementById('hideFlashback');
    const showFlashbackCheckbox = document.getElementById('showFlashback');
    [safeCheckbox, unsafeCheckbox, linkOnlyCheckbox, fullPostCheckbox, hideFlashbackCheckbox, showFlashbackCheckbox].forEach(cb => { if(cb) cb.disabled = true; });

    const activityDiv = document.getElementById('activityDiv');
    if(activityDiv) activityDiv.style.display = '';

    const resultSegment = document.getElementById('resultSegment');
    if(resultSegment) resultSegment.style.display = '';

    const activityText = document.getElementById('activityText');
    const resultatDiv = document.getElementById('resultat');
    const progressBar = document.getElementById('progressBar');

    const threadId = document.getElementById('threadId').value.trim();
    const fromPage = parseInt(inputFrom.value) || 1;
    const toPage = parseInt(inputTo.value) || 1;

    const totalPages = Math.max(1, toPage - fromPage + 1);
    const hideFlashback = hideFlashbackCheckbox && hideFlashbackCheckbox.checked;
    const fullPostMode = fullPostCheckbox && fullPostCheckbox.checked;
    const hits = [];
    const shownPosts = new Set();

    const cancelBtn = document.getElementById('cancelButton');
    if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.onclick = () => {
            searchCancelled = true;
            cancelBtn.disabled = true;
            if (activityText) activityText.textContent = 'Sökning avbruten av användaren.';
        };
    }

    function cleanLeaveLink(href) {
        if (!href) return null;
        try {
            const url = new URL(href, location.origin);
            if (url.pathname.includes('leave.php') && url.searchParams.has('u')) {
                return decodeURIComponent(url.searchParams.get('u'));
            }
        } catch(e) {}
        return href;
    }

    function isInsideQuote(el) {
        let node = el;
        while (node && node !== document) {
            if (node.nodeType === 1) { 
                const tag = (node.tagName || '').toUpperCase();
                if (tag === 'BLOCKQUOTE') return true;
                const cls = node.className || '';
                if (typeof cls === 'string' && /quote/i.test(cls)) return true;
                if (cls.includes('post-bbcode-quote') || cls.includes('post-bbcode-quote-wrapper') || cls.includes('post-clamped-text')) {
                    return true;
                }
            }
            node = node.parentElement;
        }
        return false;
    }

    if (progressBar) progressBar.style.width = '0%';

    for (let page = fromPage; page <= toPage; page++) {
        if (searchCancelled) break;

        const kattsDiv = document.querySelector('.kattskralle-search-div');
        if (!kattsDiv || kattsDiv.offsetParent === null) {
            searchCancelled = true;
            if (activityText) activityText.textContent = 'Sökning stoppad (Kattskrälle-fönster stängt).';
            break;
        }

        const progress = Math.round(((page - fromPage) / totalPages) * 100);
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (activityText) activityText.textContent = `Aktivitet: Söker igenom sida ${page} av ${toPage} efter länkar.`;

        const url = `https://www.flashback.org/${threadId}p${page}`;
        try {
            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) throw new Error(`Error fetching page ${page}`);

            // 🔹 Debug log for each fetched page
            //console.log(`Fetched page ${page}: ${url}`);

            const arrayBuffer = await response.arrayBuffer();
            const decoder = new TextDecoder('iso-8859-1');
            const html = decoder.decode(arrayBuffer);
            if (searchCancelled) break;

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const postMessages = doc.querySelectorAll('#posts .post .post_message');
            postMessages.forEach(msg => {
                if (searchCancelled) return;

                const postElement = msg.closest('.post');
                if (!postElement) return;
                const postId = postElement.id || (`post_${Math.random().toString(36).slice(2)}`);

                const anchors = Array.from(msg.querySelectorAll('a[href]'))
                    .filter(a => {
                        if (!a) return false;
                        if (isInsideQuote(a)) return false;
                        if (a.closest('.signature')) return false;
                        if (a.closest('.FBQOLPreview')) return false;
                        return true;
                    });

                if (anchors.length === 0) return;

                const postLinks = [];
                anchors.forEach(a => {
                    let href = a.getAttribute('href');
                    if (!href) return;
                    if (/^\/p\d+/.test(href)) return;
                    href = cleanLeaveLink(href);
                    if (hideFlashback && href.includes('flashback.org')) return;
                    if (href && !postLinks.includes(href)) postLinks.push(href);
                });

                if (postLinks.length === 0) return;
                if (shownPosts.has(postId)) return;
                shownPosts.add(postId);

                if (resultatDiv) {
                    const wrapper = document.createElement('div');
                    wrapper.style.wordBreak = 'break-word';
                    wrapper.style.marginBottom = '15px';

                    postLinks.forEach(href => {
                        if (!hits.includes(href)) hits.push(href);
                        const linkEl = document.createElement('div');
                        linkEl.innerHTML = `<a href="${href}" target="_blank" rel="noreferrer noopener">${href}</a>`;
                        wrapper.appendChild(linkEl);
                    });

                    if (fullPostMode) {
                        const clonedPost = postElement.cloneNode(true);
                        const nestedQuotes = clonedPost.querySelectorAll('.post-bbcode-quote, .post-bbcode-quote-wrapper, .post-clamped-text, blockquote');
                        nestedQuotes.forEach(nq => nq.remove());
                        clonedPost.style.border = '1px solid #ddd';
                        clonedPost.style.borderRadius = '6px';
                        clonedPost.style.marginTop = '6px';
                        clonedPost.style.padding = '6px';
                        clonedPost.style.background = '#fafafa';
                        wrapper.appendChild(clonedPost);
                    }

                    resultatDiv.appendChild(wrapper);
                }
            });
        } catch (err) {
            console.log(`Error scraping page ${page}:`, err);
        }

        if (searchCancelled) break;
        if (safeCheckbox && safeCheckbox.checked) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    if (progressBar) progressBar.style.width = '100%';

    if (searchCancelled) {
        if (activityText) activityText.textContent = `Sökning avbruten. Hittade ${hits.length} länkar innan stopp.`;
        return;
    }

    if (activityText) activityText.textContent = `Aktivitet: Klar! Hittade ${hits.length} länkar.`;
    console.log('All links found:', hits);
}

function createBackToThreadButton() {
    const postsDiv = document.getElementById('posts');
    if (!postsDiv) return null;
    
    let backBtn = document.getElementById('backToThreadBtn');
    
    if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.id = 'backToThreadBtn';
        backBtn.type = 'button';
        backBtn.classList.add('btn', 'btn-sm');
        backBtn.textContent = 'Gå tillbaka till tråd';
        backBtn.style.cssText = 'margin-bottom: 10px; background: #7a7a7a; color: #fff; border: none; padding: 6px 12px; cursor: pointer; white-space: nowrap; display: none;';
        
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showPostsAndResetButtons();
        });
        
        // Insert button before postsDiv
        if (postsDiv.parentNode) {
            postsDiv.parentNode.insertBefore(backBtn, postsDiv);
        }
    }
    
    return backBtn;
}

function showPostsAndResetButtons(){
    const postsDiv = document.getElementById('posts');
    if (!postsDiv) return;
    
    // Close search links menu if it's open
    const toggleDiv = document.querySelector('.kattskralle-search-div');
    if (toggleDiv) {
        toggleDiv.remove();
    }
    
    // Show all elements
    postsDiv.style.display = '';
    const paginationULs = document.querySelectorAll('ul.pagination.pagination-xs');
    paginationULs.forEach(ul => ul.style.display = '');
    const replyBtns = document.querySelectorAll('div.btn-group a.btn.btn-default.btn-xs[href*="/newreply.php"]');
    replyBtns.forEach(btn => btn.style.display = '');
    
    // Hide unified back button
    const backBtn = document.getElementById('backToThreadBtn');
    if (backBtn) backBtn.style.display = 'none';
    
    // Show all individual buttons
    const searchBtn = document.getElementById('searchLinks');
    if (searchBtn) searchBtn.style.display = '';
    
    const searchBtnDropdown = document.getElementById('searchLinks2');
    if (searchBtnDropdown) searchBtnDropdown.style.display = '';
    
    const threadChatBtn = document.getElementById('threadChatBtn');
    if (threadChatBtn) threadChatBtn.style.display = '';
}
