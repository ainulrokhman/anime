const API_BASE_URL = 'https://api.otakudesu.natee.my.id/api';

// --- History Manager ---

const HistoryManager = {
    save: (animeSlug, animeTitle, animePoster, episodeData) => {
        try {
            let history = JSON.parse(localStorage.getItem('anime_history')) || [];
            // Remove existing entry for this anime to avoid duplicates and push to top
            history = history.filter(h => h.animeSlug !== animeSlug);

            const entry = {
                animeSlug,
                animeTitle,
                animePoster,
                episodeSlug: episodeData.slug,
                episodeNumber: episodeData.number,
                episodeTitle: episodeData.title,
                timestamp: Date.now()
            };

            history.unshift(entry); // Add to beginning
            localStorage.setItem('anime_history', JSON.stringify(history));
        } catch (e) {
            console.error('Error saving history:', e);
        }
    },

    get: (animeSlug) => {
        try {
            const history = JSON.parse(localStorage.getItem('anime_history')) || [];
            return history.find(h => h.animeSlug === animeSlug);
        } catch (e) {
            return null;
        }
    },

    getAll: () => {
        try {
            return JSON.parse(localStorage.getItem('anime_history')) || [];
        } catch (e) {
            return [];
        }
    },

    setContext: (animeData) => {
        try {
            const context = {
                slug: animeData.slug,
                title: animeData.title,
                poster: animeData.poster
            };
            sessionStorage.setItem('anime_context', JSON.stringify(context));
        } catch (e) {
            console.error('Error setting context:', e);
        }
    },

    getContext: () => {
        try {
            return JSON.parse(sessionStorage.getItem('anime_context'));
        } catch (e) {
            return null;
        }
    }
};

// --- API Functions ---

async function fetchHomeData() {
    try {
        const response = await fetch(`${API_BASE_URL}/home`);
        if (!response.ok) throw new Error('Failed to fetch home data');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching home data:', error);
        return null;
    }
}

async function fetchSearchData(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/search/${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to fetch search results');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error searching:', error);
        return null;
    }
}

async function fetchAnimeDetail(slug) {
    try {
        // Handle full URL slug case if API returns it
        const cleanSlug = slug.replace('https://otakudesu.best/anime/', '').replace('/', '');
        const response = await fetch(`${API_BASE_URL}/anime/${cleanSlug}`);
        if (!response.ok) throw new Error('Failed to fetch anime details');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching anime detail:', error);
        return null;
    }
}

// Helper to extract clean slug from full URL or return slug as is
function extractSlug(urlOrSlug) {
    if (!urlOrSlug) return '';
    if (urlOrSlug.includes('otakudesu.best/anime/')) {
        return urlOrSlug.split('/anime/')[1].replace('/', '');
    }
    if (urlOrSlug.includes('otakudesu.best/episode/')) {
        return urlOrSlug.split('/episode/')[1].replace('/', '');
    }
    return urlOrSlug;
}


async function fetchEpisodeStream(slug) {
    try {
        // Handle full URL slug case if needed
        const cleanSlug = slug.replace('https://otakudesu.best/episode/', '').replace('/', '');
        const response = await fetch(`${API_BASE_URL}/episode/${cleanSlug}`);
        if (!response.ok) throw new Error('Failed to fetch stream url');
        const data = await response.json();
        return data.data;

    } catch (error) {
        console.error('Error fetching stream:', error);
        return null;
    }
}


// --- DOM Manipulation Functions ---

function createAnimeCard(anime) {
    // The API returns differently structured objects for home vs search results sometimes
    // Home: ongoing_anime has `title`, `slug`, `poster`, `current_episode`, etc.
    // Search: has `title`, `slug`, `poster`, `status`, `rating`

    // Determine slug for link
    let slug = anime.slug;
    // API sometimes returns full URL in slug field or otakudesu_url
    if (slug.startsWith('http')) {
        slug = extractSlug(slug);
    }

    const episodeText = anime.current_episode || (anime.episode_count ? `${anime.episode_count} Eps` : '') || anime.status || '';

    // Fix poster URL if needed (sometimes http/https issues)
    const poster = anime.poster || 'img/placeholder.jpg';

    return `
        <div class="col-6 col-md-4 col-lg-3 mb-4">
            <a href="anime.html?slug=${slug}" class="text-decoration-none">
                <div class="anime-card h-100">
                    <div class="card-img-wrapper">
                        <img src="${poster}" class="card-img-top" alt="${anime.title}" loading="lazy">
                        ${episodeText ? `<span class="episode-badge">${episodeText}</span>` : ''}
                    </div>
                    <div class="card-body">
                        <h5 class="card-title" title="${anime.title}">${anime.title}</h5>
                        <p class="card-text text-muted small">${anime.release_day || anime.rating || ''}</p>
                    </div>
                </div>
            </a>
        </div>
    `;
}

function renderAnimeList(containerId, animeList) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!animeList || animeList.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No anime found</div>';
        return;
    }

    container.innerHTML = animeList.map(anime => createAnimeCard(anime)).join('');
}


function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="col-12 spinner-container">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }
}

function renderEpisodesWithBatching(container, episodes) {
    if (!episodes || episodes.length === 0) {
        container.innerHTML = '<div class="text-center py-3 text-muted">No episodes found</div>';
        return;
    }

    const BATCH_SIZE = 50;

    if (episodes.length <= BATCH_SIZE) {
        // Render all if small list
        container.innerHTML = generateEpisodeHtml(episodes);
    } else {
        // Setup batching
        container.innerHTML = '';

        // Create Select Dropdown
        const select = document.createElement('select');
        select.className = 'form-select mb-3 bg-dark text-white border-secondary';

        const totalBatches = Math.ceil(episodes.length / BATCH_SIZE);

        for (let i = 0; i < totalBatches; i++) {
            const start = i * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, episodes.length);
            const option = document.createElement('option');
            option.value = i;
            option.text = `Episodes ${start + 1} - ${end}`;
            select.appendChild(option);
        }

        // Container for list
        const listDiv = document.createElement('div');
        listDiv.id = 'episode-list-content';

        // Event Listener
        select.addEventListener('change', (e) => {
            const batchIndex = parseInt(e.target.value);
            const start = batchIndex * BATCH_SIZE;
            const end = start + BATCH_SIZE;
            const batchEpisodes = episodes.slice(start, end);
            listDiv.innerHTML = generateEpisodeHtml(batchEpisodes);
        });

        // Initial Render (first batch)
        const initialBatch = episodes.slice(0, BATCH_SIZE);
        listDiv.innerHTML = generateEpisodeHtml(initialBatch);

        container.appendChild(select);
        container.appendChild(listDiv);
    }
}

function generateEpisodeHtml(episodeList) {
    return episodeList.map(ep => {
        const epSlug = extractSlug(ep.slug || ep.otakudesu_url);
        return `
            <a href="stream.html?slug=${epSlug}" class="episode-item text-white">
                <span>Episode ${ep.episode_number}</span>
                <span class="text-muted small text-truncate" style="max-width: 150px;">${ep.episode}</span>
            </a>
        `;
    }).join('');
}

// --- Page Initialization Logic ---

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const page = path.split('/').pop();

    // Common: Search Bar Listener everywhere if present
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('searchInput').value.trim();
            if (query) {
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }

    // Home Page
    if (page === 'index.html' || page === '') {
        // Render Watch History if available
        const history = HistoryManager.getAll();
        const historyList = document.getElementById('history-list'); // We need to add this to HTML
        const historySection = document.getElementById('history-section'); // We need to add this to HTML

        if (history.length > 0 && historyList && historySection) {
            historySection.style.display = 'block';
            historyList.innerHTML = history.slice(0, 4).map(h => `
                <div class="col-6 col-md-4 col-lg-3 mb-4">
                    <a href="stream.html?slug=${h.episodeSlug}" class="text-decoration-none">
                        <div class="anime-card h-100 relative">
                            <div class="card-img-wrapper">
                                <img src="${h.animePoster}" class="card-img-top" alt="${h.animeTitle}" loading="lazy">
                                <span class="episode-badge">Ep ${h.episodeNumber}</span>
                                <div class="play-overlay">
                                    <i class="bi bi-play-circle-fill"></i>
                                </div>
                            </div>
                            <div class="card-body">
                                <h5 class="card-title text-truncate" title="${h.animeTitle}">${h.animeTitle}</h5>
                                <p class="card-text text-muted small">Lanjut Nonton</p>
                            </div>
                        </div>
                    </a>
                </div>
            `).join('');
        }

        showLoading('ongoing-list');
        showLoading('completed-list');

        const data = await fetchHomeData();
        if (data) {
            renderAnimeList('ongoing-list', data.ongoing_anime);
            renderAnimeList('completed-list', data.complete_anime);
        } else {
            document.getElementById('ongoing-list').innerHTML = '<div class="col-12 text-center text-danger">Failed to load data. API might be down.</div>';
            document.getElementById('completed-list').innerHTML = '';
        }
    }

    // Search Page
    if (page === 'search.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');

        if (query) {
            document.getElementById('search-query').textContent = `Search Results for: "${query}"`;
            showLoading('search-results');

            const results = await fetchSearchData(query);
            renderAnimeList('search-results', results);
        }
    }

    // Anime Detail Page
    if (page === 'anime.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (slug) {
            const data = await fetchAnimeDetail(slug);
            if (data) {
                // Set Context for Watch History
                HistoryManager.setContext({
                    slug: slug, // This is the clean slug from URL params
                    title: data.title,
                    poster: data.poster
                });

                // Check for existing history to show "Resume" button
                const history = HistoryManager.get(slug);
                if (history) {
                    const resumeBtnContainer = document.getElementById('resume-button-container');
                    if (resumeBtnContainer) {
                        resumeBtnContainer.innerHTML = `
                            <a href="stream.html?slug=${history.episodeSlug}" class="btn btn-primary w-100 mb-3">
                                <i class="bi bi-play-fill"></i> Lanjut Nonton Episode ${history.episodeNumber}
                            </a>
                        `;
                    }
                }

                // Render Details
                document.getElementById('anime-title').textContent = data.title;
                document.getElementById('anime-poster').src = data.poster;
                document.getElementById('anime-synopsis').innerHTML = data.synopsis.replace(/\n/g, '<br>'); // Synopsis might be plain text

                // Info list
                const infoList = document.getElementById('anime-info');
                infoList.innerHTML = `
                    <li><strong>Japanese:</strong> ${data.japanese_title}</li>
                    <li><strong>Score:</strong> ${data.rating}</li>
                    <li><strong>Producer:</strong> ${data.produser}</li>
                    <li><strong>Type:</strong> ${data.type}</li>
                    <li><strong>Status:</strong> ${data.status}</li>
                    <li><strong>Episodes:</strong> ${data.episode_count}</li>
                    <li><strong>Duration:</strong> ${data.duration}</li>
                    <li><strong>Release Date:</strong> ${data.release_date}</li>
                    <li><strong>Studio:</strong> ${data.studio}</li>
                    <li><strong>Genres:</strong> ${data.genres.map(g => g.name).join(', ')}</li>
                `;

                // Render Episodes
                const episodeContainer = document.getElementById('episode-list');
                const episodes = data.episode_lists || [];
                const searchInput = document.getElementById('episode-search');

                if (episodes.length > 0) {
                    searchInput.style.display = 'block';

                    // Search Listener
                    searchInput.addEventListener('input', (e) => {
                        const searchTerm = e.target.value.toLowerCase();

                        if (searchTerm) {
                            // Filter and show all matches (no batching)
                            const filtered = episodes.filter(ep =>
                                ep.episode.toLowerCase().includes(searchTerm) ||
                                ep.episode_number.toString().includes(searchTerm)
                            );

                            // Clear check for batching select to hide it temporarily if needed, 
                            // but simpler to just overwrite container content
                            episodeContainer.innerHTML = generateEpisodeHtml(filtered);
                            if (filtered.length === 0) {
                                episodeContainer.innerHTML = '<div class="text-center py-3 text-muted">No episodes found</div>';
                            }
                        } else {
                            // Restore batching view
                            renderEpisodesWithBatching(episodeContainer, episodes);
                        }
                    });
                }

                renderEpisodesWithBatching(episodeContainer, episodes);

            }
        }
    }

    // Stream Page
    if (page === 'stream.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (slug) {
            loadEpisode(slug);
        }

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.slug) {
                loadEpisode(event.state.slug, false); // Don't push state again
            }
        });
    }
});

async function loadEpisode(slug, pushState = true) {
    const data = await fetchEpisodeStream(slug);
    if (!data) return;

    // Update URL
    if (pushState) {
        const newUrl = `stream.html?slug=${slug}`;
        window.history.pushState({ slug: slug }, '', newUrl);
    }

    document.getElementById('stream-title').textContent = data.episode;
    document.title = `${data.episode} - AnimeStream`;

    // Save to History
    const context = HistoryManager.getContext();
    if (context) {
        // Extract episode number from title if possible, or use API data if reliable 
        // (API data for episode number usually exists as `episode_number` in list, here we might rely on regex from title or passed data?)
        // The stream API response doesn't always have `episode_number` directly, let's try to parse it or just use title

        // Try to parse episode number from title "Episode X"
        const match = data.episode.match(/Episode\s+(\d+)/i);
        const epNum = match ? match[1] : '?';

        HistoryManager.save(context.slug, context.title, context.poster, {
            slug: slug,
            number: epNum,
            title: data.episode
        });
    }

    const iframe = document.getElementById('video-player');
    iframe.src = data.stream_url;

    // Prev/Next Navigation
    const prevBtn = document.getElementById('prev-ep-btn');
    const nextBtn = document.getElementById('next-ep-btn');

    // Reset buttons
    prevBtn.classList.add('disabled');
    prevBtn.onclick = null;
    nextBtn.classList.add('disabled');
    nextBtn.onclick = null;

    if (data.has_previous_episode) {
        const prevSlug = extractSlug(data.previous_episode.slug);
        prevBtn.href = `stream.html?slug=${prevSlug}`;
        prevBtn.classList.remove('disabled');
        prevBtn.onclick = (e) => {
            e.preventDefault();
            loadEpisode(prevSlug);
        };
    }

    // Overlay Next Button Logic
    const overlayNextBtn = document.getElementById('overlay-next-btn');
    if (overlayNextBtn) {
        overlayNextBtn.style.display = 'none'; // Hide by default
        overlayNextBtn.onclick = null;
    }

    if (data.has_next_episode) {
        const nextSlug = extractSlug(data.next_episode.slug);
        nextBtn.href = `stream.html?slug=${nextSlug}`;
        nextBtn.classList.remove('disabled');
        nextBtn.onclick = (e) => {
            e.preventDefault();
            loadEpisode(nextSlug);
        };

        if (overlayNextBtn) {
            overlayNextBtn.href = `stream.html?slug=${nextSlug}`;
            overlayNextBtn.style.display = 'block'; // Show it
            overlayNextBtn.onclick = (e) => {
                e.preventDefault();
                loadEpisode(nextSlug);
            };
        }
    }

    // Custom Fullscreen Logic (Re-attach not needed, listener is static)
    const fsBtn = document.getElementById('custom-fs-btn');
    const videoWrapper = document.getElementById('video-wrapper');

    if (fsBtn && videoWrapper && !fsBtn.hasAttribute('data-listener-attached')) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                videoWrapper.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Inactivity Detection
        let inactivityTimeout;

        const showOverlays = () => {
            videoWrapper.classList.add('user-active');
            clearTimeout(inactivityTimeout);

            // Hide after 3 seconds of inactivity
            inactivityTimeout = setTimeout(() => {
                videoWrapper.classList.remove('user-active');
            }, 3000);
        };

        videoWrapper.addEventListener('mousemove', showOverlays);
        videoWrapper.addEventListener('click', showOverlays); // Also show on click

        // Interaction Layer Logic (Wake up from hidden state)
        const interactionLayer = document.getElementById('interaction-layer');
        if (interactionLayer) {
            interactionLayer.addEventListener('mousemove', showOverlays);
            interactionLayer.addEventListener('click', showOverlays);
        }

        // Initial show
        showOverlays();

        fsBtn.setAttribute('data-listener-attached', 'true');
    }

    // Download Links
    const downloadContainer = document.getElementById('download-links');
    if (downloadContainer) {
        downloadContainer.innerHTML = '<h5 class="text-muted">Download links will appear here if available.</h5>';
        if (data.download_urls && data.download_urls.mp4) {
            const res360 = data.download_urls.mp4.find(r => r.resolution.includes('360')) || data.download_urls.mp4[0];
            if (res360) {
                downloadContainer.innerHTML = `<h6 class="mt-3">Download (360p):</h6>` +
                    res360.urls.map(u => `<a href="${u.url}" target="_blank" class="btn btn-sm btn-outline-secondary me-2 mb-2">${u.provider}</a>`).join('');
            }
        }
    }
}
