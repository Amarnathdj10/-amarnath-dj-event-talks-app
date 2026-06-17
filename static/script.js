document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // STATE VARIABLES
    // ----------------------------------------------------
    let allReleases = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedItem = null;
    let selectedDateStr = '';
    let selectedLink = '';

    // ----------------------------------------------------
    // DOM ELEMENTS
    // ----------------------------------------------------
    const feedContainer = document.getElementById('feedContainer');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const filterChips = document.getElementById('filterChips');
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    const syncStatus = document.getElementById('syncStatus');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    
    // Composer elements
    const composerEmptyState = document.getElementById('composerEmptyState');
    const composerForm = document.getElementById('composerForm');
    const tweetTextarea = document.getElementById('tweetText');
    const tagPool = document.getElementById('tagPool');
    const includeLinkToggle = document.getElementById('includeLinkToggle');
    const charCountLabel = document.getElementById('charCountLabel');
    const charProgressRing = document.getElementById('charProgressRing');
    const tweetShareBtn = document.getElementById('tweetShareBtn');

    // ----------------------------------------------------
    // INITIALIZATION & FETCH
    // ----------------------------------------------------
    fetchReleases(false);

    // ----------------------------------------------------
    // EVENT LISTENERS
    // ----------------------------------------------------
    
    // Refresh button click
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Export to CSV click
    exportCsvBtn.addEventListener('click', exportToCsv);

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        
        // Show/hide clear search button
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        renderFeed();
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    // Category filter chips
    filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        // Remove active class from all chips
        filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        
        // Set active to clicked chip
        chip.classList.add('active');
        activeFilter = chip.dataset.filter;
        
        renderFeed();
    });

    // Composer Input Events
    tweetTextarea.addEventListener('input', updateComposerUI);
    includeLinkToggle.addEventListener('change', () => {
        // Regeneate text with link state changed
        regenerateTweetContent();
    });

    // Hashtag Chips click
    tagPool.addEventListener('click', (e) => {
        const tagChip = e.target.closest('.tag-chip');
        if (!tagChip) return;

        tagChip.classList.toggle('active');
        regenerateTweetContent();
    });

    // Tweet Publish Click
    tweetShareBtn.addEventListener('click', () => {
        if (!selectedItem) return;
        const text = tweetTextarea.value;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });

    // ----------------------------------------------------
    // FUNCTIONS
    // ----------------------------------------------------

    // Fetch releases from API
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = `/api/releases${forceRefresh ? '?force_refresh=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                allReleases = data.releases;
                updateSyncIndicator(data.source, forceRefresh);
                renderFeed();
            } else {
                showErrorState(data.error || 'Failed to fetch release notes');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showErrorState('Network error: Unable to reach the server.');
        } finally {
            setLoadingState(false);
        }
    }

    // Set UI Loading State
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.disabled = true;
            refreshIcon.classList.add('spinning');
            feedContainer.innerHTML = `
                <div class="skeleton-group">
                    <div class="skeleton-date-header"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
                <div class="skeleton-group">
                    <div class="skeleton-date-header"></div>
                    <div class="skeleton-card"></div>
                </div>
            `;
        } else {
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('spinning');
        }
    }

    // Update Status Indicator
    function updateSyncIndicator(source, refreshed) {
        const dot = syncStatus.querySelector('.status-dot');
        const text = syncStatus.querySelector('.status-text');
        
        dot.className = 'status-dot status-green';
        if (source === 'network') {
            text.textContent = 'Sync successful';
            dot.classList.add('status-pulse');
            setTimeout(() => dot.classList.remove('status-pulse'), 5000);
        } else {
            text.textContent = 'Loaded from cache';
        }
    }

    // Show Error Message in Feed
    function showErrorState(message) {
        feedContainer.innerHTML = `
            <div class="zero-state" style="border-color: var(--color-issue-border)">
                <svg class="zero-state-icon" style="color: var(--color-issue)" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path>
                </svg>
                <h3>Unable to load releases</h3>
                <p>${message}</p>
                <button class="btn btn-primary" style="margin-top: 16px" onclick="location.reload()">Retry Connection</button>
            </div>
        `;
    }

    // Render Filtered Feed
    function renderFeed() {
        feedContainer.innerHTML = '';
        let totalRendered = 0;

        allReleases.forEach(entry => {
            // Filter individual items in this entry
            const filteredItems = entry.items.filter(item => {
                const matchesFilter = activeFilter === 'all' || item.type.toLowerCase() === activeFilter.toLowerCase();
                const matchesSearch = !searchQuery || 
                    item.type.toLowerCase().includes(searchQuery) || 
                    item.content_text.toLowerCase().includes(searchQuery) ||
                    entry.date.toLowerCase().includes(searchQuery);
                return matchesFilter && matchesSearch;
            });

            if (filteredItems.length === 0) return;

            // Create date group
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            // Date Header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <h2>${entry.date}</h2>
            `;
            dateGroup.appendChild(dateHeader);

            // Add item cards
            filteredItems.forEach(item => {
                totalRendered++;
                const card = document.createElement('article');
                card.className = `update-card ${selectedItem && selectedItem.id === item.id ? 'selected' : ''}`;
                card.dataset.id = item.id;
                
                // Content highlighting
                let displayHtml = item.content_html;
                if (searchQuery) {
                    displayHtml = highlightText(displayHtml, searchQuery);
                }

                card.innerHTML = `
                    <div class="card-header">
                        <span class="badge badge-${item.type.toLowerCase()}">${item.type}</span>
                    </div>
                    <div class="card-content">${displayHtml}</div>
                    <div class="card-actions">
                        <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="btn-card" title="View official release documentation page">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            <span>Docs Link</span>
                        </a>
                        <button class="btn-card btn-card-copy" type="button" aria-label="Copy this update content to clipboard">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                        <button class="btn-card btn-card-tweet" type="button" aria-label="Load this item to tweet composer">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>${selectedItem && selectedItem.id === item.id ? 'Selected' : 'Select to Tweet'}</span>
                        </button>
                    </div>
                `;

                // Add Copy Button Click
                card.querySelector('.btn-card-copy').addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(item.content_text).then(() => {
                        const btn = e.currentTarget;
                        const span = btn.querySelector('span');
                        const originalText = span.textContent;
                        const originalIconHtml = btn.querySelector('svg').outerHTML;
                        
                        btn.classList.add('copied');
                        span.textContent = 'Copied!';
                        btn.querySelector('svg').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>';
                        
                        setTimeout(() => {
                            btn.classList.remove('copied');
                            span.textContent = originalText;
                            btn.querySelector('svg').outerHTML = originalIconHtml;
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                });

                // Add Card Selection Click
                card.addEventListener('click', (e) => {
                    // Prevent trigger if they click links directly
                    if (e.target.closest('a') || e.target.closest('.btn-card:not(.btn-card-tweet)')) return;
                    selectItemForTweet(item, entry.date, entry.link);
                });

                dateGroup.appendChild(card);
            });

            feedContainer.appendChild(dateGroup);
        });

        // Show zero state if empty
        if (totalRendered === 0) {
            feedContainer.innerHTML = `
                <div class="zero-state">
                    <svg class="zero-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <h3>No release notes match your criteria</h3>
                    <p>Try broadening your search or choosing a different filter category chip.</p>
                </div>
            `;
        }
    }

    // Highlight search keywords in html content securely
    function highlightText(html, query) {
        if (!query) return html;
        
        // Parse the HTML, highlight text nodes only to avoid breaking HTML structures/tags
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        function walk(node) {
            if (node.nodeType === 3) { // Text node
                const val = node.nodeValue;
                const idx = val.toLowerCase().indexOf(query);
                if (idx > -1) {
                    const span = document.createElement('span');
                    span.className = 'highlight-mark';
                    // Splitting nodes with regex to preserve exact casing
                    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
                    span.innerHTML = val.replace(regex, '<mark style="background: rgba(56, 189, 248, 0.3); color: #fff; padding: 1px 3px; border-radius: 3px;">$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === 1 && node.childNodes && !['style', 'script'].includes(node.tagName.toLowerCase())) {
                Array.from(node.childNodes).forEach(walk);
            }
        }
        
        Array.from(tempDiv.childNodes).forEach(walk);
        return tempDiv.innerHTML;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Export current filtered and searched updates to CSV
    function exportToCsv() {
        const csvRows = [];
        
        // Add headers
        csvRows.push(['Date', 'Type', 'Description', 'Docs Link']);

        allReleases.forEach(entry => {
            entry.items.forEach(item => {
                const matchesFilter = activeFilter === 'all' || item.type.toLowerCase() === activeFilter.toLowerCase();
                const matchesSearch = !searchQuery || 
                    item.type.toLowerCase().includes(searchQuery) || 
                    item.content_text.toLowerCase().includes(searchQuery) ||
                    entry.date.toLowerCase().includes(searchQuery);

                if (matchesFilter && matchesSearch) {
                    // Normalize and escape text for CSV syntax
                    const cleanDate = entry.date.replace(/"/g, '""');
                    const cleanType = item.type.replace(/"/g, '""');
                    const cleanText = item.content_text.replace(/"/g, '""');
                    const cleanLink = entry.link.replace(/"/g, '""');
                    
                    csvRows.push([`"${cleanDate}"`, `"${cleanType}"`, `"${cleanText}"`, `"${cleanLink}"`]);
                }
            });
        });

        if (csvRows.length <= 1) {
            alert('No release notes available to export with current search/filter settings.');
            return;
        }

        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        
        // Download with UTF-8 BOM
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_releases_${activeFilter}_${searchQuery ? searchQuery.replace(/\s+/g, '_') : 'all'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ----------------------------------------------------
    // COMPOSER LOGIC
    // ----------------------------------------------------

    // Select Item for Tweet
    function selectItemForTweet(item, dateStr, link) {
        selectedItem = item;
        selectedDateStr = dateStr;
        selectedLink = link;

        // Toggle selected styling in feed list
        document.querySelectorAll('.update-card').forEach(card => {
            if (card.dataset.id === item.id) {
                card.classList.add('selected');
                card.querySelector('.btn-card-tweet span').textContent = 'Selected';
            } else {
                card.classList.remove('selected');
                card.querySelector('.btn-card-tweet span').textContent = 'Select to Tweet';
            }
        });

        // Hide Empty State and Show Form
        composerEmptyState.style.display = 'none';
        composerForm.style.display = 'flex';

        // Scroll composer into view for mobile viewports
        if (window.innerWidth <= 1024) {
            composerSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Fill data
        regenerateTweetContent();
    }

    // Generate Tweet Text Area content based on selection, hashtags, and links
    function regenerateTweetContent() {
        if (!selectedItem) return;

        // Construct standard message template
        const typePrefix = `BigQuery ${selectedItem.type} (${selectedDateStr}): `;
        let bodyText = selectedItem.content_text;
        
        // Selected tags from pool
        const tags = Array.from(tagPool.querySelectorAll('.tag-chip.active'))
            .map(chip => chip.dataset.tag)
            .join(' ');

        // Alternate link
        const urlToInclude = includeLinkToggle.checked ? selectedLink : '';

        // Calculate limits:
        // Max space for body text = 280 - (prefix length) - (tags length) - (link length + spacing)
        const fixedLength = typePrefix.length + (tags ? tags.length + 2 : 0) + (urlToInclude ? 24 : 0); // URLs in tweet count as 23 chars + space
        const maxBodyLength = 280 - fixedLength;

        // Smart truncate the body text to fit within limits
        if (bodyText.length > maxBodyLength) {
            bodyText = bodyText.substring(0, maxBodyLength - 4) + '...';
        }

        // Combine all parts
        let finalTweet = `${typePrefix}${bodyText}`;
        if (tags) {
            finalTweet += `\n\n${tags}`;
        }
        if (urlToInclude) {
            finalTweet += `\n\n${urlToInclude}`;
        }

        tweetTextarea.value = finalTweet;
        updateComposerUI();
    }

    // Update Live Composer Character Counter & Styling
    function updateComposerUI() {
        const text = tweetTextarea.value;
        const charCount = text.length;

        // Note: Twitter counts any URL as exactly 23 characters, but we can do literal count for simplicity or X-specific count.
        // Let's do a smart calculation: count URLs as 23 characters.
        // URL detector regex
        const urlRegex = /https?:\/\/[^\s]+/g;
        let adjustedCount = charCount;
        const urls = text.match(urlRegex) || [];
        
        urls.forEach(url => {
            adjustedCount = adjustedCount - url.length + 23;
        });

        // Cap or warn
        charCountLabel.textContent = `${adjustedCount}/280`;

        // Ring progress stroke-dashoffset math (Circumference is 88)
        const percentage = Math.min(adjustedCount, 280) / 280;
        const offset = 88 - (88 * percentage);
        charProgressRing.style.strokeDashoffset = offset;

        // Adjust Colors based on status
        if (adjustedCount > 280) {
            charCountLabel.className = 'char-count error';
            charProgressRing.className.baseVal = 'ring-fill error';
            tweetShareBtn.disabled = true;
        } else if (adjustedCount >= 250) {
            charCountLabel.className = 'char-count warn';
            charProgressRing.className.baseVal = 'ring-fill warn';
            tweetShareBtn.disabled = false;
        } else {
            charCountLabel.className = 'char-count';
            charProgressRing.className.baseVal = 'ring-fill';
            tweetShareBtn.disabled = false;
        }
    }
});
