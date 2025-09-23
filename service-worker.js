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

// service-worker.js

// --- Queue & rate-limiting ---
const requestQueue = [];
let activeRequests = 0;
const MAX_REQUESTS = 10;
const TIME_WINDOW = 30 * 1000; // 30 seconds
let firstRequestTime = null;

// --- Message listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "fetchSite") {
        const requestData = { url: request.url, sender, sendResponse };
        enqueueRequest(requestData);
        return true; // Keep channel open for async response
    }
});

// --- Enqueue request ---
function enqueueRequest(requestData) {
    requestQueue.push(requestData);
    processQueue();
}

// --- Process queue with rate limiting ---
function processQueue() {
    if (requestQueue.length === 0) return;

    const now = Date.now();

    if (!firstRequestTime || now - firstRequestTime >= TIME_WINDOW) {
        firstRequestTime = now;
        activeRequests = 0;
    }

    while (activeRequests < MAX_REQUESTS && requestQueue.length > 0) {
        const requestData = requestQueue.shift();
        activeRequests++;
        handleRequest(requestData);
    }

    if (requestQueue.length > 0) {
        const nextTime = firstRequestTime + TIME_WINDOW - now;
        setTimeout(processQueue, nextTime > 0 ? nextTime : 0);
    }
}

// --- Handle individual fetch ---
function handleRequest({ url, sender, sendResponse }) {
    let responded = false;
    const safeSendResponse = (data) => {
        if (!responded) {
            responded = true;
            sendResponse(data);
        }
    };

    //console.log("Fetching site:", url);

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            const decoder = new TextDecoder('iso-8859-1');
            const html = decoder.decode(arrayBuffer);

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0 || !tabs[0].id) {
                    safeSendResponse({ response: "No active tab found." });
                    return;
                }

                const tabId = tabs[0].id;

                // Try sending message, inject content script if missing
                chrome.tabs.sendMessage(tabId, { message: "parseHTML", html }, (response) => {
                    if (chrome.runtime.lastError) {
                        //console.warn("sendMessage failed, trying to inject content script:", chrome.runtime.lastError.message);

                        // Inject content script dynamically
                        chrome.scripting.executeScript({
                            target: { tabId },
                            files: ['contentScript.js']
                        }, () => {
                            chrome.tabs.sendMessage(tabId, { message: "parseHTML", html }, (resp) => {
                                if (chrome.runtime.lastError) {
                                    //console.error("sendMessage after injection failed:", chrome.runtime.lastError.message);
                                    safeSendResponse({ response: "Error: " + chrome.runtime.lastError.message });
                                } else {
                                    safeSendResponse(resp);
                                }
                            });
                        });
                    } else {
                        safeSendResponse(response);
                    }
                });
            });
        })
        .catch(error => {
            //console.error('Error fetching site:', error);
            safeSendResponse({ response: "Could not fetch page: " + error.message });
        });
}