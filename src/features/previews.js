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
 * Feature "Previews": inline previews of links/images/videos in posts.
 */

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

    function getUniqueColor(usedColors) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#C44569', '#F8B500', '#6C5CE7', '#A29BFE', '#FD79A8',
            '#E17055', '#00B894', '#0984E3', '#A29BFE', '#FDCB6E',
            '#E84393', '#6C5CE7', '#74B9FF', '#00CEC9', '#55A3FF'
        ];
        
        const availableColors = colors.filter(color => !usedColors.has(color));
        if (availableColors.length === 0) {
            // If all colors are used, start reusing but with transparency
            return colors[Math.floor(Math.random() * colors.length)] + '80';
        }
        
        const selectedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        usedColors.add(selectedColor);
        return selectedColor;
    }

    function extractContextAroundUrl(post, url, originalUrl, element, linkColor, contextLength = 100) {
        // Get the full text content of the post
        const postText = post.textContent || post.innerText || '';
        
        // Find the link text in the post
        const linkText = element.textContent || element.innerText || url;
        const linkIndex = postText.indexOf(linkText);
        
        if (linkIndex === -1) {
            // Fallback: just return the styled link
            return `<a href="${url}" style="color: ${linkColor}; font-weight: bold;">${linkText}</a>`;
        }
        
        // Calculate boundaries
        const beforeStart = Math.max(0, linkIndex - contextLength);
        const afterEnd = Math.min(postText.length, linkIndex + linkText.length + contextLength);
        
        // Extract text before and after
        let beforeText = postText.substring(beforeStart, linkIndex);
        let afterText = postText.substring(linkIndex + linkText.length, afterEnd);
        
        // Check for quotes in before text - stop at last [QUOTE
        const quoteStart = beforeText.lastIndexOf('[QUOTE');
        if (quoteStart !== -1) {
            const quoteEnd = beforeText.indexOf(']', quoteStart);
            if (quoteEnd !== -1) {
                beforeText = beforeText.substring(quoteEnd + 1);
            }
        }
        
        // Check for quotes in after text - stop at first [/QUOTE]
        const quoteEndIndex = afterText.indexOf('[/QUOTE]');
        if (quoteEndIndex !== -1) {
            afterText = afterText.substring(0, quoteEndIndex);
        }
        
        // Check for other links in before text - stop after last link
        const linkPattern = /https?:\/\/[^\s\]]+/gi;
        let beforeMatch;
        let lastLinkEnd = -1;
        while ((beforeMatch = linkPattern.exec(beforeText)) !== null) {
            lastLinkEnd = beforeMatch.index + beforeMatch[0].length;
        }
        if (lastLinkEnd !== -1) {
            beforeText = beforeText.substring(lastLinkEnd);
        }
        
        // Check for other links in after text - stop before first link
        linkPattern.lastIndex = 0; // Reset regex
        const afterMatch = linkPattern.exec(afterText);
        if (afterMatch !== null) {
            afterText = afterText.substring(0, afterMatch.index);
        }
        
        // Add ellipsis if we truncated
        if (beforeStart > 0 && beforeText.length > 0) {
            beforeText = '...' + beforeText;
        }
        if (afterEnd < postText.length && afterText.length > 0) {
            afterText = afterText + '...';
        }
        
        // Return the combined result
        return beforeText + `<a href="${url}" style="color: ${linkColor}; font-weight: bold; font-size: 12px;">${linkText}</a>` + afterText;
    }

    const imageExtensions = ['jpg','jpeg','png','gif','webp','bmp'];
    const videoExtensions = ['mp4', 'webm', 'ogg'];

    posts.forEach(post => {
        if (post.querySelector('.FBQOLPreview')) return;

        const previewDiv = document.createElement('div');
        previewDiv.className = 'FBQOLPreview';
        previewDiv.style.border = '2px solid #ccc';
        previewDiv.style.borderRadius = '8px';
        previewDiv.style.padding = '15px';
        previewDiv.style.margin = '10px 0';
        previewDiv.style.backgroundColor = 'transparent';
        
        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.justifyContent = 'space-between';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.margin = '0 0 15px 0';
        
        const header = document.createElement('h4');
        header.textContent = 'Media i inlägg';
        header.style.margin = '0';
        header.style.color = '#333';
        header.style.fontSize = '16px';
        header.style.fontWeight = 'bold';
        
        const toggleButton = document.createElement('button');
        toggleButton.textContent = '−';
        toggleButton.style.background = '#666';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '3px';
        toggleButton.style.padding = '2px 8px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontSize = '16px';
        toggleButton.style.fontWeight = 'bold';
        
        headerContainer.appendChild(header);
        headerContainer.appendChild(toggleButton);
        previewDiv.appendChild(headerContainer);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'FBQOLPreviewContent';
        previewDiv.appendChild(contentContainer);

        let isHidden = false;
        toggleButton.addEventListener('click', function() {
            if (isHidden) {
                contentContainer.style.display = 'block';
                toggleButton.textContent = '−';
                isHidden = false;
            } else {
                contentContainer.style.display = 'none';
                toggleButton.textContent = '+';
                isHidden = true;
            }
        });

        let added = false;
        
        const urls = Array.from(post.querySelectorAll('a[href]'))
            .filter(a => !a.closest('.post-clamped-text'))
            .map(a => ({ 
                url: cleanHref(a.href), 
                element: a,
                originalUrl: a.href 
            }));

        const seen = new Set();
        const usedColors = new Set();

        urls.forEach(({url, element, originalUrl}) => {
            if (!url) return;
            let m;

            // --- YouTube ---
            m = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w\-]{11})/i);
            if (m && !seen.has('yt:' + m[1])) {
                seen.add('yt:' + m[1]);
                
                const linkColor = getUniqueColor(usedColors);
                element.style.color = linkColor;
                element.style.fontWeight = 'bold';

                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.border = '2px solid #ccc';
                wrapperDiv.style.borderRadius = '8px';
                wrapperDiv.style.padding = '10px';
                wrapperDiv.style.marginBottom = '5px';
                wrapperDiv.style.backgroundColor = 'transparent';

                const contextDiv = document.createElement('div');
                contextDiv.style.marginBottom = '10px';
                contextDiv.style.padding = '8px';
                contextDiv.style.backgroundColor = 'transparent';
                contextDiv.style.borderRadius = '4px';
                contextDiv.style.fontSize = '12px';
                contextDiv.style.color = '#666';
                
                const context = extractContextAroundUrl(post, url, originalUrl, element, linkColor);
                contextDiv.innerHTML = context;
                wrapperDiv.appendChild(contextDiv);
                
                const iframe = document.createElement('iframe');
                iframe.width = '560';
                iframe.height = '315';
                iframe.src = `https://www.youtube.com/embed/${m[1]}`;
                iframe.frameBorder = '0';
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                iframe.allowFullscreen = true;
                iframe.style.display = 'block';
                iframe.style.margin = '10px 0 20px 0';
                wrapperDiv.appendChild(iframe);
                
                contentContainer.appendChild(wrapperDiv);
                added = true;
                return;
            }

           // --- TikTok ---
            m = url.match(/https?:\/\/(?:www\.)?tiktok\.com\/(@[\w.-]+\/video\/(\d+))/i);
            if (m && !seen.has('tt:' + m[1])) {
                seen.add('tt:' + m[1]);

                const linkColor = getUniqueColor(usedColors);
                element.style.color = linkColor;
                element.style.fontWeight = 'bold';

                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.border = '2px solid #ccc';
                wrapperDiv.style.borderRadius = '8px';
                wrapperDiv.style.padding = '10px';
                wrapperDiv.style.marginBottom = '5px';
                wrapperDiv.style.backgroundColor = 'transparent';

                // Add context and link
                const contextDiv = document.createElement('div');
                contextDiv.style.marginBottom = '10px';
                contextDiv.style.padding = '8px';
                contextDiv.style.backgroundColor = 'transparent';
                contextDiv.style.borderRadius = '4px';
                contextDiv.style.fontSize = '12px';
                contextDiv.style.color = '#666';
                
                const context = extractContextAroundUrl(post, url, originalUrl, element, linkColor);
                contextDiv.innerHTML = context;
                wrapperDiv.appendChild(contextDiv);

                const iframe = document.createElement('iframe');
                iframe.src = `https://www.tiktok.com/embed/v2/${m[2]}`;
                iframe.width = '100%';
                iframe.style.maxWidth = '560px';
                iframe.height = '600'; 
                iframe.style.display = 'block';
                iframe.style.margin = '10px 0 20px 0';
                iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
                iframe.frameBorder = 0;

                wrapperDiv.appendChild(iframe);
                contentContainer.appendChild(wrapperDiv);
                added = true;
                return;
            }

            // --- Spotify ---
            m = url.match(/https?:\/\/open\.spotify\.com\/(artist|track|album|playlist)\/([a-zA-Z0-9]+)/i);
            if (m && !seen.has('spotify:' + m[2])) {
                seen.add('spotify:' + m[2]);
                
                const linkColor = getUniqueColor(usedColors);
                element.style.color = linkColor;
                element.style.fontWeight = 'bold';
                
                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.border = '2px solid #ccc';
                wrapperDiv.style.borderRadius = '8px';
                wrapperDiv.style.padding = '10px';
                wrapperDiv.style.marginBottom = '5px';
                wrapperDiv.style.backgroundColor = 'transparent';
                
                // Add context and link
                const contextDiv = document.createElement('div');
                contextDiv.style.marginBottom = '10px';
                contextDiv.style.padding = '8px';
                contextDiv.style.backgroundColor = 'transparent';
                contextDiv.style.borderRadius = '4px';
                contextDiv.style.fontSize = '12px';
                contextDiv.style.color = '#666';
                
                const context = extractContextAroundUrl(post, url, originalUrl, element, linkColor);
                contextDiv.innerHTML = context;
                wrapperDiv.appendChild(contextDiv);
                
                fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
                    .then(res => res.json())
                    .then(data => {
                        const match = data.html.match(/src="([^"]+)"/);
                        if (!match) return;

                        const iframe = document.createElement('iframe');
                        iframe.src = match[1];
                        iframe.width = '100%';
                        iframe.style.maxWidth = '400px';
                        iframe.style.height = '380px';
                        iframe.style.display = 'block';
                        iframe.style.margin = '10px 0 20px 0';
                        iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
                        iframe.frameBorder = 0;

                        wrapperDiv.appendChild(iframe);
                    })
                    .catch(e => console.error('Spotify oEmbed failed', e));

                contentContainer.appendChild(wrapperDiv);
                added = true;
                return;
            }

            // --- Imgur ---
            m = url.match(/https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)(\.[a-zA-Z]{3,4})?$/i);
            if (m) {
                const imgUrl = m[2] ? url : `https://i.imgur.com/${m[1]}.jpg`;
                if (!seen.has('imgur:' + imgUrl)) {
                    seen.add('imgur:' + imgUrl);
                    
                    const linkColor = getUniqueColor(usedColors);
                    element.style.color = linkColor;
                    element.style.fontWeight = 'bold';
                    
                    const wrapperDiv = document.createElement('div');
                    wrapperDiv.style.border = '2px solid #ccc';
                    wrapperDiv.style.borderRadius = '8px';
                    wrapperDiv.style.padding = '10px';
                    wrapperDiv.style.marginBottom = '5px';
                    wrapperDiv.style.backgroundColor = 'transparent';
                    
                    // Add context and link
                    const contextDiv = document.createElement('div');
                    contextDiv.style.marginBottom = '10px';
                    contextDiv.style.padding = '8px';
                    contextDiv.style.backgroundColor = 'transparent';
                    contextDiv.style.borderRadius = '4px';
                    contextDiv.style.fontSize = '12px';
                    contextDiv.style.color = '#666';
                    
                    const context = extractContextAroundUrl(post, url, originalUrl, element, linkColor);
                    contextDiv.innerHTML = context;
                    wrapperDiv.appendChild(contextDiv);
                    
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    img.style.margin = '10px 0 20px 0';
                    wrapperDiv.appendChild(img);
                    
                    contentContainer.appendChild(wrapperDiv);
                    added = true;
                    return;
                }
            }

            if (url.match(/https?:\/\/imgur\.com\/a\/[a-zA-Z0-9]+/i)) return; // skip albums

            // --- Generic image links ---
            const extMatch = url.match(/\.(\w{2,5})(?:\?.*)?$/i);
            if (extMatch && imageExtensions.includes(extMatch[1].toLowerCase()) && !seen.has('file:' + url)) {
                seen.add('file:' + url);
                
                // Assign color to this link since it will generate a preview
                const linkColor = getUniqueColor(usedColors);
                element.style.color = linkColor;
                element.style.fontWeight = 'bold';
                
                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.border = '2px solid #ccc';
                wrapperDiv.style.borderRadius = '8px';
                wrapperDiv.style.padding = '10px';
                wrapperDiv.style.marginBottom = '5px';
                wrapperDiv.style.backgroundColor = 'transparent';
                
                // Add context and link
                const contextDiv = document.createElement('div');
                contextDiv.style.marginBottom = '10px';
                contextDiv.style.padding = '8px';
                contextDiv.style.backgroundColor = 'transparent';
                contextDiv.style.borderRadius = '4px';
                contextDiv.style.fontSize = '12px';
                contextDiv.style.color = '#666';
                
                const context = extractContextAroundUrl(post, url, originalUrl, element, linkColor);
                contextDiv.innerHTML = context;
                wrapperDiv.appendChild(contextDiv);
                
                const img = document.createElement('img');
                img.src = url;
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '10px 0 20px 0';
                wrapperDiv.appendChild(img);
                
                contentContainer.appendChild(wrapperDiv);
                added = true;
                return;
            }

            // --- Generic video links ---
            const videoMatch = url.match(/\.(\w{2,5})(?:\?.*)?$/i);
            if (videoMatch && videoExtensions.includes(videoMatch[1].toLowerCase()) && !seen.has('video:' + url)) {
                seen.add('video:' + url);
                
                // Assign color to this link since it will generate a preview
                const linkColor = getUniqueColor(usedColors);
                element.style.color = linkColor;
                element.style.fontWeight = 'bold';
                
                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.border = '2px solid #ccc';
                wrapperDiv.style.borderRadius = '8px';
                wrapperDiv.style.padding = '10px';
                wrapperDiv.style.marginBottom = '5px';
                wrapperDiv.style.backgroundColor = 'transparent';
                
                // Add context and link
                const contextDiv = document.createElement('div');
                contextDiv.style.marginBottom = '10px';
                contextDiv.style.padding = '8px';
                contextDiv.style.backgroundColor = 'transparent';
                contextDiv.style.borderRadius = '4px';
                contextDiv.style.fontSize = '12px';
                contextDiv.style.color = '#666';
                
                const context = extractContextAroundUrl(post, url, originalUrl, element, linkColor);
                contextDiv.innerHTML = context;
                wrapperDiv.appendChild(contextDiv);
                
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.style.maxWidth = '100%';
                video.style.display = 'block';
                video.style.margin = '10px 0 20px 0';
                wrapperDiv.appendChild(video);
                
                contentContainer.appendChild(wrapperDiv);
                added = true;
                return;
            } 
        });

        if (added) post.appendChild(previewDiv);
    });
}
