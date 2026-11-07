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
 * Feature "Ignorera" + "Ignorera även i citat": ignored users list, hide-with-placeholder, ignore button, quote check.
 */

let users = [];

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

// Returns the placeholder bar belonging to a (hidden) post, or null.
// Matched by post id (not by DOM adjacency) because other features - page
// separators, "Ladda sida"-button - may end up between placeholder and post.
function getIgnoredPlaceholder(post) {
    if (!post || !post.id || !post.parentNode) return null;
    return post.parentNode.querySelector(
        ':scope > .kattskralle-ignored-placeholder[data-for-post="' + CSS.escape(post.id) + '"]'
    );
}

// Returns the element new content should be inserted before so that it ends up
// above a post - i.e. above the post's placeholder bar if it has one.
function getPostInsertAnchor(post) {
    return getIgnoredPlaceholder(post) || post;
}

function getPostAuthorName(post) {
    const userEl = post.querySelector('.post-user-username.dropdown-toggle') || post.querySelector('.post-user-username');
    return userEl ? userEl.textContent.trim() : '';
}

// Hides a post from an ignored user and leaves a placeholder bar with a button
// that lets the reader show/hide the post. reasonQuotedUser is set when the post
// is hidden because it quotes an ignored user ("ignorera även i citat").
function removePost(postNumber, reasonQuotedUser) {
    const post = document.getElementById(postNumber);
    if (!post) return;

    // Already has a placeholder (findPosts runs many times) - don't duplicate.
    if (getIgnoredPlaceholder(post)) return;

    const username = getPostAuthorName(post) || 'Ignorerad användare';
    const originalDisplay = post.style.display === 'none' ? '' : post.style.display;

    post.style.display = 'none';

    const placeholder = document.createElement('div');
    placeholder.className = 'kattskralle-ignored-placeholder';
    placeholder.setAttribute('data-for-post', post.id);
    placeholder.style.cssText = `
        background-color: rgba(128, 128, 128, 0.12);
        border: 1px solid rgba(128, 128, 128, 0.45);
        border-radius: 4px;
        padding: 6px 12px;
        margin: 5px 0;
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    // Built with DOM methods (not innerHTML) so usernames can't inject markup.
    const textSpan = document.createElement('span');
    const bold = (t) => { const b = document.createElement('strong'); b.textContent = t; return b; };
    textSpan.appendChild(document.createTextNode('Inlägg av '));
    textSpan.appendChild(bold(username));
    if (reasonQuotedUser) {
        textSpan.appendChild(document.createTextNode(' dolt eftersom det citerar ignorerad användare ('));
        textSpan.appendChild(bold(reasonQuotedUser));
        textSpan.appendChild(document.createTextNode(').'));
    } else {
        textSpan.appendChild(document.createTextNode(' är dolt (ignorerad användare).'));
    }
    placeholder.appendChild(textSpan);

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.textContent = 'Visa inlägg';
    viewBtn.style.cssText = `
        background: #7a7a7a;
        color: #fff;
        border: none;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        margin-left: 12px;
        flex-shrink: 0;
    `;
    viewBtn.addEventListener('click', () => {
        // The post node may have been replaced since the placeholder was made - look it up again if so.
        let target = post;
        if (!target.isConnected && placeholder.parentNode) {
            target = placeholder.parentNode.querySelector(':scope > [id="' + CSS.escape(post.id) + '"]') || post;
        }
        if (target.style.display === 'none') {
            target.style.display = originalDisplay;
            // Safety net: if something else still hides it, force it visible.
            if (getComputedStyle(target).display === 'none') target.style.display = 'block';
            viewBtn.textContent = 'Dölj inlägg';
            placeholder.style.backgroundColor = 'rgba(128, 128, 128, 0.22)';
        } else {
            target.style.display = 'none';
            viewBtn.textContent = 'Visa inlägg';
            placeholder.style.backgroundColor = 'rgba(128, 128, 128, 0.12)';
        }
    });
    placeholder.appendChild(viewBtn);

    post.parentNode.insertBefore(placeholder, post);
    ensureLoadButtonOnTop();
}

function removePostsWithIgnoredQuotes(users) {
    document.querySelectorAll('.post').forEach(post => {
        if (getIgnoredPlaceholder(post)) return;                 // already handled
        if (users.includes(getPostAuthorName(post))) return;     // author itself ignored - handled in findPosts()

        const quotes = post.querySelectorAll('.post-bbcode-quote, .post-bbcode-quote-wrapper');
        for (const quote of quotes) {
            const headerDiv = quote.querySelector('div');
            const strongEl = headerDiv ? headerDiv.querySelector('strong') : null;
            if (!strongEl) continue;

            const quotedUser = strongEl.textContent.trim();
            if (users.includes(quotedUser)) {
                removePost(post.id, quotedUser);
                break;
            }
        }
    });
}

function addIgnoreButton(postNumber, userNameToButton) {
    var postUserInfo = document.getElementById(postNumber).querySelector('.post-user-info.small');
    if (postUserInfo) {
        postUserInfo.querySelectorAll('.ignoreButton').forEach(e => e.remove());
        var ignoreButton = document.createElement('button');
        ignoreButton.className = 'ignoreButton';
        ignoreButton.innerHTML = ('Ignorera ' + userNameToButton);
        ignoreButton.style.display = "inline-block";
        ignoreButton.style.padding = "1px 3px";
        ignoreButton.style.fontSize = "10px";
        ignoreButton.style.fontWeight = "bold";
        ignoreButton.style.color = "#000";
        ignoreButton.style.backgroundColor = "#ccc";
        ignoreButton.style.border = "0.5px solid #999";
        ignoreButton.style.borderRadius = "2px";
        ignoreButton.style.cursor = "pointer";
        ignoreButton.style.marginRight = "4px";
        ignoreButton.style.marginBottom = "2px";
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

// Called from findPosts() once per run: "Ignorera även i citat" - hides posts that quote an ignored user.
function ignoreQuotesInPosts() {
    //new function ignoreInQuotes - removes post if it quotes a ignored user. 
    if (ignoreraSetting===true && ignoreInQuotesSetting===true){
        removePostsWithIgnoredQuotes(users);
    }
}

// Called from findPosts() for every username element: "Ignorera" - hides posts by ignored
// users (with a placeholder) and adds the "Ignorera <user>" button to everyone else.
function ignorePostElement(element, postUser) {
    //old code
    if (ignoreraSetting===true){
        if (users.includes(postUser)){
            removePost(element.id.split('dropdown-user-')[1])
        } else {
                addIgnoreButton(element.id.split('dropdown-user-')[1], postUser);
        };
    };
}
