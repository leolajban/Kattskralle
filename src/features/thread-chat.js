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
 * Feature "Trådchatt": live chat-like view of a thread with polling, quoting and reply from the chat.
 */

let threadChatFetchedPages = new Set();

let threadChatInterval = null;

let threadChatDiv = null;

let threadChatCurrentPage = 0;

let threadChatLowestPageLoaded = 0;

function playThreadChatNewPostSound() {
    try {
        // Create or reuse a single AudioContext
        if (!window._threadChatAudioCtx) {
            window._threadChatAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = window._threadChatAudioCtx;

        // Only resume in response to user gesture
        if (audioCtx.state === 'suspended') {
            // Chrome requires this be called in a user gesture
            const resume = () => {
                audioCtx.resume().then(() => {
                    playBeepSequence(audioCtx);
                    document.removeEventListener('click', resume);
                }).catch(() => {});
            };
            document.addEventListener('click', resume);
        } else {
            playBeepSequence(audioCtx);
        }

        function playBeepSequence(ctx) {
            const playBeep = (startTime) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, startTime);
                gain.gain.setValueAtTime(0.05, startTime);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.1);
            };

            const now = ctx.currentTime;
            playBeep(now);
            playBeep(now + 0.15);
        }
    } catch (err) {
        console.log('Could not play new post sound:', err);
    }
}

function compactifyEditor() {
    const editorWrapper = document.querySelector('#vB_Editor_001')?.closest('.col-lg-10.col-lg-offset-2');
    if (editorWrapper) {
        editorWrapper.style.setProperty('width', '100%', 'important');
        editorWrapper.style.setProperty('margin-left', '0', 'important');
        editorWrapper.style.setProperty('padding', '0', 'important');
    }

    const editor = document.querySelector('#vB_Editor_001');
    if (!editor) return;

    // Remove the top "Svara på ämne" panel heading
    const panelHeading = editor.closest('.panel')?.querySelector('.panel-heading');
    if (panelHeading) panelHeading.remove();

    // Editor container styling
    editor.style.setProperty('margin', '0', 'important');
    editor.style.setProperty('padding', '0', 'important');
    editor.style.setProperty('border', '1px solid #ccc', 'important');
    editor.style.setProperty('border-radius', '4px', 'important');

    // Toolbar buttons remain visible, just make them compact
    const toolbar = editor.querySelector('#vB_Editor_001_controls');
    if (toolbar) {
        toolbar.style.setProperty('margin', '0', 'important');
        toolbar.style.setProperty('padding', '2px 4px', 'important');
        toolbar.style.setProperty('background', '#f8f8f8', 'important');
        toolbar.style.setProperty('border-bottom', '1px solid #ccc', 'important');
        toolbar.style.setProperty('width', '100%', 'important');
    }
    editor.querySelectorAll('#vB_Editor_001_controls .btn').forEach(btn => {
        btn.style.setProperty('padding', '1px 3px', 'important');
        btn.style.setProperty('font-size', '11px', 'important');
    });

    // Textarea container
    const textareaContainer = editor.querySelector('div');
    if (textareaContainer) {
        textareaContainer.style.setProperty('width', '100%', 'important');
        textareaContainer.style.setProperty('margin', '0 auto', 'important');
        textareaContainer.style.setProperty('padding', '0', 'important');
        textareaContainer.style.setProperty('text-align', 'center', 'important');
    }

    // Textarea itself
    const textarea = editor.querySelector('textarea[name="message"]');
    if (textarea) {
        textarea.style.setProperty('width', '80%', 'important'); // narrower, centered
        textarea.style.setProperty('margin', '0 auto', 'important');
        textarea.style.setProperty('padding', '4px', 'important');
        textarea.style.setProperty('height', '150px', 'important');
        textarea.style.setProperty('resize', 'vertical', 'important');
        textarea.style.setProperty('font-size', '13px', 'important');
        textarea.style.setProperty('box-sizing', 'border-box', 'important');
        textarea.style.setProperty('display', 'block', 'important');
    }

    // Fix the submit button container and button
    const submitWrapper = document.querySelector('#vB_Editor_001_save')?.closest('.col-lg-10.col-lg-offset-2');
    if (submitWrapper) {
        submitWrapper.className = 'col-lg-12 col-lg-offset-0'; // full width, no offset
        submitWrapper.style.setProperty('padding', '0', 'important');
    }

    const submitButton = document.querySelector('#vB_Editor_001_save');
    if (submitButton) {
        submitButton.style.setProperty('display', 'block', 'important');
        submitButton.style.setProperty('width', '20%', 'important');
        submitButton.style.setProperty('margin', '0 auto', 'important');
    }
}

async function initializeThreadChatOnNewReply() {
    console.log("Initializing ThreadChat on newreply page...");
    
    // Get thread ID from form
    const form = document.getElementById('form-newreply');
    if (!form) {
        console.log('Reply form not found.');
        return;
    }
    
    const threadIdInput = form.querySelector('input[name="t"]');
    if (!threadIdInput) {
        console.log('Thread ID input not found.');
        return;
    }
    
    const threadIdValue = threadIdInput.value;
    const threadUrl = `https://www.flashback.org/t${threadIdValue}`;
    
    console.log('Fetching thread info from:', threadUrl);
    
    // Fetch the thread page to get pagination info
    try {
        const response = await fetch(threadUrl, { credentials: 'include' });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract pagination info (if any)
        let threadInfoElement = doc.querySelector('.input-page-jump');
        let totalPages = 1;
        let threadIdPath = '/t' + threadIdValue; // default

        if (threadInfoElement) {
            threadIdPath = threadInfoElement.getAttribute('data-url') || threadIdPath;
            const parsedPages = parseInt(threadInfoElement.getAttribute('data-total-pages'));
            if (!isNaN(parsedPages) && parsedPages > 0) totalPages = parsedPages;
        } else {
            console.log('No pagination detected – assuming single page thread.');
        }
        
        console.log('Thread ID path:', threadIdPath);
        console.log('Total pages:', totalPages);
        
        // Create thread chat div
        createThreadChatDiv();

        //Remove unnecessary elements:
        compactifyEditor();

        // Remove "Förhandsgranska inlägg" preview buttons
        document.querySelectorAll('button[name="preview"]').forEach(btn => btn.remove());

        //delete Posts outside the chat div: 
        // Select all posts
        document.querySelectorAll('div.post').forEach(post => {
            // Check if this post has a threadChatPageSeparator as an ancestor
            if (!post.closest('.threadChatPageSeparator')) {
                post.remove(); // Remove posts outside the separator
            }
        });
        // Remove the "Översikt av ämnet" header
        document.querySelectorAll('h4').forEach(h4 => {
            if (h4.textContent.includes("Översikt av ämnet")) {
                h4.remove();
            }
        });

        // Remove all "well" notice divs
        document.querySelectorAll('div.well.well-xs.text-center').forEach(div => div.remove());

        // Initialize with thread info
        threadId = threadIdPath;
        highestPage = totalPages;
        threadChatCurrentPage = totalPages;
        threadChatLowestPageLoaded = totalPages;
        
        // Fetch the last TWO pages
        await fetchLastTwoPagesForNewReply(totalPages);
        
        // Start polling for new posts
        startThreadChatPolling();
        
    } catch (err) {
        console.log('Error fetching thread info:', err);
    }
}

function createThreadChatDiv() {
    const panelForm = document.querySelector('.panel.panel-default.panel-form');
    if (!panelForm) {
        console.log('Reply panel not found.');
        return;
    }
    
    // Remove existing chat div if present
    const existingChatDiv = document.getElementById('KattskralleThreadChat');
    if (existingChatDiv) {
        existingChatDiv.remove();
    }
    
    // Create chat div
    threadChatDiv = document.createElement('div');
    threadChatDiv.id = 'KattskralleThreadChat';
    threadChatDiv.style.cssText = `
        padding: 10px;
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        max-height: 80vh;
        height: 80vh;
        overflow-y: auto;
        margin-bottom: 15px;
    `;
    
    // Add header
    const header = document.createElement('div');
    header.style.cssText = `
        background: #7a7a7a;
        color: #fff;
        padding: 8px 12px;
        margin: -10px -10px 10px -10px;
        border-radius: 4px 4px 0 0;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const headerText = document.createElement('span');
    headerText.textContent = 'Trådchatt - Senaste inläggen';
    
    const scrollBtn = document.createElement('button');
    scrollBtn.textContent = '↓ Scrolla ner';
    scrollBtn.style.cssText = `
        background: #fff;
        color: #333;
        border: none;
        padding: 4px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
    `;
    scrollBtn.addEventListener('click', () => {
        threadChatDiv.scrollTop = threadChatDiv.scrollHeight;
    });
    
    header.appendChild(headerText);
    header.appendChild(scrollBtn);
    threadChatDiv.appendChild(header);
    
    // Insert before the reply panel
    panelForm.parentNode.insertBefore(threadChatDiv, panelForm);
}

async function fetchLastTwoPagesForNewReply(latestPage) {
    const pagesToFetch = [];
    if (latestPage <= 0) return;
    
    // Always fetch latest page
    pagesToFetch.push(latestPage);
    // Also fetch previous page if exists
    if (latestPage > 1) {
        pagesToFetch.push(latestPage - 1);
        threadChatLowestPageLoaded = latestPage - 1;
    } else {
        threadChatLowestPageLoaded = latestPage;
    }
    
    threadChatFetchedPages = new Set();
    
    let remaining = pagesToFetch.length;
    const collectedPosts = [];
    
    for (const pageNum of pagesToFetch) {
        const pageUrl = 'https://www.flashback.org' + threadId + 'p' + pageNum;
        
        try {
            const response = await fetch(pageUrl, { credentials: 'include' });
            const arrayBuffer = await response.arrayBuffer();
            const decoder = new TextDecoder('iso-8859-1');
            const html = decoder.decode(arrayBuffer);
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const posts = Array.from(doc.querySelectorAll('div.post'));
            
            // Add page number attribute to posts
            posts.forEach(p => {
                p.setAttribute('pagenumber', pageNum);
                collectedPosts.push(p);
            });
            threadChatFetchedPages.add(pageNum);
            
            remaining--;
            if (remaining === 0) {
                // Sort posts before adding
                collectedPosts.sort((a, b) => {
                    const idA = parseInt(a.getAttribute('data-postid') || 0, 10);
                    const idB = parseInt(b.getAttribute('data-postid') || 0, 10);
                    return idA - idB;
                });
                
                // Add all posts at once
                addPostsToThreadChatDiv(collectedPosts, false);
                
                // Add page separators
                addThreadChatPageSeparators();
                
                // Add load previous page button if not on page 1
                if (threadChatLowestPageLoaded > 1) {
                    addLoadPreviousThreadChatPageButton();
                }
                
                // Scroll to bottom
                scrollThreadChatToBottom();
            }
        } catch (err) {
            console.log('Error fetching page:', pageNum, err);
        }
    }
}

async function insertServerFormattedQuote(href) {
    try {
        // Fetch raw bytes so we can decode with the correct charset
        const response = await fetch(href, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.arrayBuffer();

        // Try to get charset from Content-Type header
        const contentType = response.headers.get('content-type') || '';
        let match = contentType.match(/charset=([^;]+)/i);
        let charset = match ? match[1].toLowerCase() : null;

        // If no charset in header, try to sniff from the HTML meta tag
        let decoded = null;
        if (!charset) {
            // Tentatively decode as windows-1252/iso-8859-1 to search for <meta charset=...>
            try {
                decoded = new TextDecoder('windows-1252').decode(buffer);
            } catch (e) {
                decoded = new TextDecoder().decode(buffer); // fallback UTF-8
            }
            const metaMatch = decoded.match(/<meta[^>]+charset=["']?\s*([^"'>\s]+)/i);
            if (metaMatch) charset = metaMatch[1].toLowerCase();
        }

        // Normalize some common names
        if (charset) {
            if (charset === 'iso-8859-1' || charset === 'latin1') charset = 'iso-8859-1';
            if (charset === 'cp1252' || charset === 'windows-1252') charset = 'windows-1252';
        } else {
            // default fallback: try windows-1252 (covers most ISO-8859-1 pages with smart quotes)
            charset = 'windows-1252';
        }

        // Decode using the chosen charset
        let htmlText;
        try {
            htmlText = new TextDecoder(charset).decode(buffer);
        } catch (err) {
            console.warn('TextDecoder failed for', charset, 'falling back to windows-1252 then utf-8', err);
            try { htmlText = new TextDecoder('windows-1252').decode(buffer); }
            catch { htmlText = new TextDecoder().decode(buffer); }
        }

        // Parse as DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Find server-generated textarea
        const textarea = doc.querySelector('textarea[name="message"]');
        if (!textarea) {
            console.warn('No quote textarea found in quote page:', href);
            return;
        }

        const quoteText = textarea.value;
        if (!quoteText) return;

        // Insert into live editor
        const liveTextarea = document.getElementById('vB_Editor_001_textarea') || document.querySelector('textarea[name="message"]');
        if (!liveTextarea) {
            console.warn('No live reply textarea found on current page');
            return;
        }

        if (liveTextarea.value.trim().length > 0) {
            liveTextarea.value += "\n\n" + quoteText;
        } else {
            liveTextarea.value = quoteText;
        }

        liveTextarea.focus();
        liveTextarea.selectionStart = liveTextarea.selectionEnd = liveTextarea.value.length;
        liveTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
        console.error("Failed to insert server-formatted quote:", err);
    }
}

function addPostsToThreadChatDiv(newPosts, playSound = true) {
    if (!threadChatDiv) return;

    const existingPosts = Array.from(threadChatDiv.querySelectorAll('div.post'));
    const existingIds = new Set(existingPosts.map(p => p.getAttribute('data-postid')));

    let hasNewPosts = false;
    let newestPostId = 0;

    newPosts.forEach(newPost => {
        const postId = parseInt(newPost.getAttribute('data-postid') || 0, 10);
        if (!postId || existingIds.has(String(postId))) return;

        // Remove signature
        newPost.querySelectorAll('.clear.signature').forEach(sig => sig.remove());

        // Remove "Citera+" buttons
        newPost.querySelectorAll('.btn-quote-multiple, a.quote-observed[data-postid]').forEach(btn => btn.remove());
        
        // Import node into DOM
        const imported = document.importNode(newPost, true);
        threadChatDiv.appendChild(imported);

        // Attach "Citera" click handler
        imported.querySelectorAll('a.btn.btn-xs').forEach(btn => {
            const btnText = btn.textContent.trim();
            const isQuoteBtn = btnText.includes('Citera') && !btnText.includes('Citera+');
            if (!isQuoteBtn) return;

            // Intercept and fetch quote
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const href = btn.getAttribute('href');
                if (!href) {
                    console.warn("Citera button missing href");
                    return;
                }

                insertServerFormattedQuote(href);
            });
        });

        existingIds.add(String(postId));
        hasNewPosts = true;
        if (postId > newestPostId) newestPostId = postId;

        if (ignoreraSetting===true){
            findPosts();
        };
    });

    if (hasNewPosts) {
        sortThreadChatPosts();
        addThreadChatPageSeparators();
        if (threadChatLowestPageLoaded > 1) addLoadPreviousThreadChatPageButton();

        if (playSound && !window.threadChatManualLoadActive) {
            scrollThreadChatToBottom();
            playThreadChatNewPostSound();
        }
    }
}

function sortThreadChatPosts() {
    if (!threadChatDiv) return;
    
    const posts = Array.from(threadChatDiv.querySelectorAll('div.post'));
    
    // Function to get postcount from a post element
    function getPostcount(postElement) {
        const postcountLink = postElement.querySelector('a[id^="postcount"]');
        if (postcountLink) {
            const postcount = parseInt(postcountLink.getAttribute('name') || 0, 10);
            return postcount;
        }
        return parseInt(postElement.getAttribute('data-postid') || 0, 10);
    }
    
    // Sort posts by postcount
    posts.sort((a, b) => {
        const postcountA = getPostcount(a);
        const postcountB = getPostcount(b);
        return postcountA - postcountB;
    });
    
    // Re-append posts in sorted order (preserve header)
    const header = threadChatDiv.querySelector('div:first-child');
    posts.forEach(post => {
        const placeholder = getIgnoredPlaceholder(post);
        if (placeholder) threadChatDiv.appendChild(placeholder);
        threadChatDiv.appendChild(post);
    });
}

function addThreadChatPageSeparators() {
    if (!threadChatDiv) return;
    
    // Remove existing separators
    threadChatDiv.querySelectorAll('.threadChatPageSeparator').forEach(sep => sep.remove());
    
    const posts = Array.from(threadChatDiv.querySelectorAll('.post'));
    if (posts.length === 0) return;
    
    let lastPage = posts[0].getAttribute('pagenumber');
    
    for (let i = 1; i < posts.length; i++) {
        const currentPage = posts[i].getAttribute('pagenumber');
        if (!currentPage) continue;
        
        if (currentPage !== lastPage) {
            const separator = document.createElement('div');
            separator.className = 'threadChatPageSeparator';
            separator.setAttribute('data-page', currentPage);
            separator.textContent = `Sida ${currentPage}`;
            separator.style.cssText = `
                font-size: 16px;
                background: #7a7a7a;
                color: #fff;
                text-align: center;
                width: 100%;
                padding: 5px 0;
                margin: 10px 0;
                border-radius: 3px;
            `;
            posts[i].parentNode.insertBefore(separator, getPostInsertAnchor(posts[i]));
            lastPage = currentPage;
        }
    }
}

function addLoadPreviousThreadChatPageButton() {
    if (!threadChatDiv) return;
    
    // Remove existing button if present
    const existingBtn = document.getElementById('loadPreviousThreadChatPageButton');
    if (existingBtn) existingBtn.remove();
    
    if (threadChatLowestPageLoaded <= 1) return;
    
    const loadBtn = document.createElement('button');
    loadBtn.id = 'loadPreviousThreadChatPageButton';
    loadBtn.textContent = 'Ladda sida ' + (threadChatLowestPageLoaded - 1);
    loadBtn.style.cssText = `
        font-size: 16px;
        display: block;
        width: calc(100% + 20px);
        background: #7a7a7a;
        color: #fff;
        text-align: center;
        cursor: pointer;
        padding: 8px 0;
        box-sizing: border-box;
        border: none;
        margin: 0 -10px 10px -10px;
        border-radius: 0;
    `;
    
    loadBtn.addEventListener('click', async function() {
        await loadPreviousThreadChatPage();
    });
    
    // Insert after header
    const header = threadChatDiv.querySelector('div:first-child');
    if (header && header.nextSibling) {
        threadChatDiv.insertBefore(loadBtn, header.nextSibling);
    } else {
        threadChatDiv.appendChild(loadBtn);
    }
}

async function loadPreviousThreadChatPage() {
    if (threadChatLowestPageLoaded <= 1) return;
    window.threadChatManualLoadActive = true;
    
    const pageToLoad = threadChatLowestPageLoaded - 1;
    const btn = document.getElementById('loadPreviousThreadChatPageButton');
    
    if (btn) {
        btn.textContent = 'Laddar sida ' + pageToLoad;
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
    }
    
    const pageUrl = 'https://www.flashback.org' + threadId + 'p' + pageToLoad;
    
    try {
        const response = await fetch(pageUrl, { credentials: 'include' });
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const html = decoder.decode(arrayBuffer);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const posts = Array.from(doc.querySelectorAll('div.post'));
        
        // Add page number to posts
        posts.forEach(p => p.setAttribute('pagenumber', pageToLoad));
        
        // Add posts to chat div
        addPostsToThreadChatDiv(posts);
        
        // Update lowest page loaded
        threadChatLowestPageLoaded = pageToLoad;
        threadChatFetchedPages.add(pageToLoad);
        
        // Re-add page separators
        addThreadChatPageSeparators();
        window.threadChatManualLoadActive = false;
        // Update or remove button
        if (pageToLoad > 1) {
            addLoadPreviousThreadChatPageButton();
        }
    } catch (err) {
        console.log('Error loading previous page:', err);
        if (btn) {
            btn.textContent = 'Ladda sida ' + pageToLoad;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    }
}

function scrollThreadChatToBottom() {
    if (!threadChatDiv) return;
    threadChatDiv.scrollTop = threadChatDiv.scrollHeight;
}

function startThreadChatPolling() {
    if (threadChatInterval) {
        clearInterval(threadChatInterval);
    }
    
    // Poll every 10 seconds
    threadChatInterval = setInterval(async () => {
        if (!threadChatDiv || !document.body.contains(threadChatDiv)) {
            clearInterval(threadChatInterval);
            return;
        }
        
        await checkThreadChatForNewPosts();
    }, 10000); // 10 seconds
}

async function checkThreadChatForNewPosts() {
    if (!threadId || !threadChatCurrentPage) return;
    
    const pageUrl = 'https://www.flashback.org' + threadId + 'p' + threadChatCurrentPage;
    
    try {
        const response = await fetch(pageUrl, { credentials: 'include' });
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const html = decoder.decode(arrayBuffer);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const posts = Array.from(doc.querySelectorAll('div.post'));
        
        // Add page number to new posts
        posts.forEach(p => p.setAttribute('pagenumber', threadChatCurrentPage));
        
        // Add any new posts from the polled page
        addPostsToThreadChatDiv(posts);
        //if (posts && posts.length > 0) playThreadChatNewPostSound();

        // Check if there's a new page
        const threadInfoElement = doc.querySelector('.input-page-jump');
        if (threadInfoElement) {
            const parsedHighest = parseInt(threadInfoElement.getAttribute('data-total-pages'));
            
            if (parsedHighest > highestPage) {
                highestPage = parsedHighest;
                threadChatCurrentPage = highestPage;
                
                const newestPageUrl = 'https://www.flashback.org' + threadId + 'p' + threadChatCurrentPage;
                const newResponse = await fetch(newestPageUrl, { credentials: 'include' });
                const newArrayBuffer = await newResponse.arrayBuffer();
                const newHtml = decoder.decode(newArrayBuffer);
                
                const newDoc = parser.parseFromString(newHtml, 'text/html');
                const newPosts = Array.from(newDoc.querySelectorAll('div.post'));
                
                newPosts.forEach(p => p.setAttribute('pagenumber', threadChatCurrentPage));
                addPostsToThreadChatDiv(newPosts);
                threadChatFetchedPages.add(threadChatCurrentPage);
                scrollThreadChatToBottom();
            }
        }
    } catch (err) {
        console.log('Error checking for new posts:', err);
    }
}

// Update the threadChat function to initialize on newreply page
function threadChat() {
    // --- THREADCHAT MODE (on newreply.php?...@ThreadChat) ---
    if (location.search.includes('@ThreadChat')) {
        console.log("threadChat mode activated on newreply page.");

        function setupFormHandler() {
            const form = document.getElementById('form-newreply');
            if (form) {
                // DO NOT clone the form — keep editor & submit button intact
                // Guard against adding multiple handlers
                if (!form.__threadChatHandlerAdded) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Form submit intercepted (ThreadChat mode)');

                        try {
                            const result = await sendFlashbackReply(form);
                            console.log('Post result:', result);

                            // Clear editor if available
                            const editor = window.vB_Editor?.['vB_Editor_001'];
                            if (editor && typeof editor.clear_editor === 'function') {
                                editor.clear_editor();
                            }

                            // Trigger immediate check for new posts
                            setTimeout(() => {
                                checkThreadChatForNewPosts();
                            }, 2000);
                        } catch (err) {
                            console.log('Error sending reply:', err);
                            alert('Kunde inte skicka inlägget. Försök igen.');
                        }
                    }, { passive: false });

                    form.__threadChatHandlerAdded = true;
                    console.log('ThreadChat form handler attached.');
                }
                return true;
            }
            return false;
        }

        // Try immediately, else wait for the form to be inserted
        if (!setupFormHandler()) {
            const observer = new MutationObserver(() => {
                if (setupFormHandler()) observer.disconnect();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        // Initialize UI for the newreply page
        initializeThreadChatOnNewReply();
        return;
    }

    // --- NORMAL THREAD PAGE MODE (create Trådchatt button) ---
    if (typeof threadId === 'undefined' || typeof highestPage === 'undefined' || !threadId || !highestPage) {
        getThreadInfo();
    }

    const postsDiv = document.getElementById('posts');
    if (!postsDiv) return;

    let threadChatBtn = document.getElementById('threadChatBtn');
    if (!threadChatBtn) {
        const functionsDiv = getOrCreateKattskralleFunctionsDiv();
        if (!functionsDiv) return;

        threadChatBtn = document.createElement('button');
        threadChatBtn.id = 'threadChatBtn';
        threadChatBtn.type = 'button';
        threadChatBtn.classList.add('btn', 'btn-sm');
        threadChatBtn.textContent = 'Trådchatt';
        threadChatBtn.style.cssText = 'margin-right: 10px; background: #7a7a7a; color: #fff; border: none; padding: 6px 12px; cursor: pointer; white-space: nowrap;';
        functionsDiv.appendChild(threadChatBtn);

        threadChatBtn.addEventListener('click', function(e) {
            e.preventDefault();

            const replyBtn = document.querySelector('a.btn.btn-default.btn-xs[href*="newreply.php"]');
            if (!replyBtn) {
                console.log('Reply button not found.');
                return;
            }

            let newHref = replyBtn.getAttribute('href') || '';
            // normalize relative hrefs to absolute Flashback URL
            if (newHref.startsWith('/')) newHref = 'https://www.flashback.org' + newHref;
            // append token
            newHref = newHref + '@ThreadChat';
            window.location.href = newHref;
        });
    }
}

async function sendFlashbackReply(formEl) {
    if (!formEl) {
        console.log('sendFlashbackReply: no form element provided.');
        return;
    }

    console.log('Preparing to send reply...');

    // 1) vBulletin editor validation (pre-submit)
    const editor = window.vB_Editor?.['vB_Editor_001'];
    if (editor && typeof editor.prepare_submit === 'function') {
        const ok = editor.prepare_submit(0, 0);
        if (!ok) {
            console.log('vBulletin editor prevented submission (empty or invalid message).');
            alert('Meddelandet kan inte vara tomt.');
            return 'Editor blocked submission (empty or invalid).';
        }
    }

    // 2) Collect the form data (after editor updates hidden fields)
    const formData = new FormData(formEl);
    const actionUrl = formEl.action.replace(/#.*/, '') || (location.origin + location.pathname);

    console.log('Sending post to:', actionUrl);

    try {
        // 3) Send the post but don't follow redirects
        const response = await fetch(actionUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            redirect: 'manual'
        });

        console.log('Post request completed. status:', response.status, 'type:', response.type);

        // 4) Extract thread ID from the form’s hidden input (must be present after editor processing)
        const threadIdInput = formEl.querySelector('input[name="t"]');
        const threadId = threadIdInput ? threadIdInput.value : null;
        if (!threadId) {
            console.log('No thread ID (input[name="t"]) found in form after posting.');
            alert('Kunde inte hitta tråd-ID.');
            return 'Thread ID missing.';
        }
        console.log('Thread ID found:', threadId);

        // 5) Fetch the thread root path (Flashback style: https://www.flashback.org/t{threadId})
        const threadUrl = 'https://www.flashback.org/t' + threadId;
        console.log('Fetching thread page to locate newreply button:', threadUrl);

        const threadResp = await fetch(threadUrl, { credentials: 'include' });
        const arrayBuffer = await threadResp.arrayBuffer();
        // Flashback uses iso-8859-1 / latin1 — decode safely
        const decoder = new TextDecoder('iso-8859-1');
        const threadHtml = decoder.decode(arrayBuffer);

        // 6) Parse the fetched thread HTML and find the "Svara / New Reply" button
        const parser = new DOMParser();
        const doc = parser.parseFromString(threadHtml, 'text/html');

        // Look for the specific button in the thread page
        const replyBtn = doc.querySelector('a.btn.btn-default.btn-xs[href*="newreply.php"]');
        if (!replyBtn) {
            console.log('Could not find newreply link in thread page at', threadUrl);
            alert('Kunde inte hitta svara-länk i tråden.');
            return 'No reply link found.';
        }

        // 7) Build absolute URL and append @ThreadChat (avoid double-adding)
        let replyHref = replyBtn.getAttribute('href') || '';
        if (replyHref.startsWith('/')) {
            replyHref = 'https://www.flashback.org' + replyHref;
        } else if (!/^https?:\/\//i.test(replyHref)) {
            // If it's relative without leading slash, resolve against origin + thread path
            replyHref = new URL(replyHref, 'https://www.flashback.org' + location.pathname).toString();
        }

        // ensure not already containing @ThreadChat
        if (!replyHref.includes('@ThreadChat')) replyHref = replyHref + '@ThreadChat';

        console.log('Navigating to ThreadChat reply URL:', replyHref);
        // 8) Navigate to the new reply URL with @ThreadChat
        window.location.href = replyHref;

        return 'Post sent and navigation started to ThreadChat.';
    } catch (err) {
        console.log('Error in sendFlashbackReply:', err);
        alert('Ett fel uppstod vid sändning.');
        throw err;
    }
}
