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
 * Feature "Bypass Leaving Site": rewrites flashback.org/leave.php?u=... links to direct links.
 */

function decodeLeaveHref(raw){try{if(!raw)return raw;const parsed=new URL(raw,window.location.origin);if(parsed.pathname.endsWith('/leave.php')){const u=parsed.searchParams.get('u');if(u)return decodeURIComponent(u)}return raw}catch(e){return raw}}

function rewriteLeaveLinks(){const as=Array.from(document.querySelectorAll('a[href*="leave.php?u="],a[href*="/leave.php?u="]'));as.forEach(a=>{const nh=decodeLeaveHref(a.getAttribute('href'));if(nh&&nh!==a.getAttribute('href')){a.setAttribute('href',nh);a.removeAttribute('onclick');a.removeAttribute('target')}})}
