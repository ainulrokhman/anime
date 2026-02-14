function renderNavbar() {
    const navbarHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
        <div class="container">
            <a class="navbar-brand" href="index.html">Ane<span class="text-white">Nyong</span></a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link ${window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') ? 'active' : ''}" href="index.html">Beranda</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="index.html#ongoing">On-Going</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="index.html#completed">Tamat</a>
                    </li>
                </ul>
                <form class="d-flex" id="searchForm">
                    <div class="input-group">
                        <input class="form-control" type="search" placeholder="Cari anime..." aria-label="Cari"
                            id="searchInput">
                        <button class="btn btn-search" type="submit">Cari</button>
                    </div>
                </form>
            </div>
        </div>
    </nav>`;

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
}

function renderFooter() {
    const footerHTML = `
    <footer>
        <div class="container">
            <p>&copy; 2026 AneNyong. Sebuah proyek penggemar untuk komunitas anime Indonesia.</p>
            <p class="small text-muted">Disclaimer: Kami tidak menyimpan file apapun di server kami.</p>
        </div>
    </footer>`;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
}

// Execute immediately when DOM is ready (or script is loaded at bottom)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        renderNavbar();
        renderFooter();
    });
} else {
    renderNavbar();
    renderFooter();
}
