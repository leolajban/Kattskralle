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
 * Shared UI helper: the "Kattskrälle extension" button row above the posts (used by Search links and Thread chat).
 */

function getOrCreateKattskralleFunctionsDiv() {
    const postsDiv = document.getElementById('posts');
    if (!postsDiv) return null;
    
    let functionsDiv = document.getElementById('kattskralleFunctions');
    
    if (!functionsDiv) {
        functionsDiv = document.createElement('div');
        functionsDiv.id = 'kattskralleFunctions';
        functionsDiv.style.cssText = 'margin-bottom: 10px;';
        
        // Add "Kattskrälle extension" text above buttons
        const label = document.createElement('div');
        label.textContent = 'Kattskrälle extension';
        label.style.cssText = 'font-size: 0.85em; color: #666; margin-bottom: 4px;';
        functionsDiv.appendChild(label);
        
        // Insert div before postsDiv
        if (postsDiv.parentNode) {
            postsDiv.parentNode.insertBefore(functionsDiv, postsDiv);
        }
    }
    
    return functionsDiv;
}
