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
 * Per-post dispatcher: runs the post related features (ignore, previews, TS marking) over the posts on the page.
 */

function findPosts(){
    ignoreQuotesInPosts(); // feature: Ignorera även i citat (see features/ignore.js)
    const postsOnPage = document.getElementsByClassName('post-user-username dropdown-toggle');
    if (postsOnPage.length > 0) {
        Array.from(postsOnPage).forEach(element => {
            var postUser=element.innerHTML.trim()
            ignorePostElement(element, postUser); // feature: Ignorera (see features/ignore.js)

            if (previewsSetting===true){
                addPreviewsToPosts();
            }
            if (showTsSetting === true && threadId && threadTS) {
                markTSPostsInDom();
            };
        })
    }
    ensureLoadButtonOnTop();
}
