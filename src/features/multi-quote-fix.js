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
 * Helper for "Infinite Scroll": makes the "Citera+" multi-quote buttons work across loaded pages (cookie handling).
 */

function getCookie(name) {
    return document.cookie
        .split("; ")
        .find(row => row.startsWith(name + "="))
        ?.split("=")[1] || "";
}

//this version uses Max-Age instead of Expires, and adds SameSite and Secure attributes - Thank you Mr.RedHat for the suggestion!
function setCookie(name, value, days) {
    let maxAge = "";
    if (days) {
        maxAge = days * 24 * 60 * 60; 
    }
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}

function fixMultiQuote() {
    // Exit early if the URL contains "ThreadChat" (to avoid conflicts)
    if (window.location.href.includes("@ThreadChat")) return;

    console.log("fixMultiQuote initialized");

    if (!document._multiQuoteClickBound) {
        document.addEventListener("click", function(e) {
            let btn = e.target.closest(".btn-quote-multiple");
            if (!btn) return;

            e.preventDefault(); 

            let postId = parseInt(btn.dataset.postid);
            if (!postId) return;

            let postMessage = document.querySelector("#post_message_" + postId);
            if (!postMessage) return;

            let qpostids = getCookie("qpostids") ? getCookie("qpostids") + "," : "";
            let postIdsArray = qpostids.split(",");


            postIdsArray = postIdsArray.filter(id => !(postMessage.classList.contains("quotem") && id == postId));

            postMessage.classList.toggle("quotem");

            qpostids = postIdsArray.length ? postIdsArray.join(",") : "";
            if (postMessage.classList.contains("quotem")) {
                qpostids = (qpostids ? qpostids + "," : "") + postId;
            }

            setCookie("qpostids", qpostids, 1);
        });

        document._multiQuoteClickBound = true;
    }

    if (document._multiQuoteObserver) {
        document._multiQuoteObserver.disconnect();
    }

    let observer = new MutationObserver(mutations => {
        for (let mutation of mutations) {
            for (let added of mutation.addedNodes) {
                if (!(added instanceof HTMLElement)) continue;

                added.querySelectorAll?.(".btn-quote-multiple").forEach(btn => {
                    if (!btn.classList.contains("quote-observed")) {
                        btn.classList.add("quote-observed");
                    }
                });

                if (added.matches?.(".btn-quote-multiple")) {
                    if (!added.classList.contains("quote-observed")) {
                        added.classList.add("quote-observed");
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document._multiQuoteObserver = observer;
}
