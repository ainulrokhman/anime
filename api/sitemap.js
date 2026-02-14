export default async function handler(req, res) {
    try {
        // 1. Fetch data dari API Home untuk mendapatkan anime terbaru/populer
        const response = await fetch('https://api.otakudesu.natee.my.id/api/home');
        const data = await response.json();

        // Base URL website Anda (secara otomatis mendeteksi host, atau fallback)
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        // 2. Mulai buat XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Halaman Statis -->
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/index.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>`;

        // Helper untuk membersihkan slug
        const getSlug = (urlOrSlug) => {
            if (!urlOrSlug) return '';
            if (urlOrSlug.includes('otakudesu.best/anime/')) {
                return urlOrSlug.split('/anime/')[1].replace('/', '');
            }
            if (urlOrSlug.includes('otakudesu.best/episode/')) {
                return urlOrSlug.split('/episode/')[1].replace('/', '');
            }
            return urlOrSlug;
        };

        // 3. Tambahkan Ongoing Anime
        if (data.data?.ongoing_anime) {
            data.data.ongoing_anime.forEach(anime => {
                const slug = getSlug(anime.slug);
                if (slug) {
                    xml += `
    <url>
        <loc>${baseUrl}/anime.html?slug=${slug}</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>`;
                }
            });
        }

        // 4. Tambahkan Completed Anime
        if (data.data?.complete_anime) {
            data.data.complete_anime.forEach(anime => {
                const slug = getSlug(anime.slug);
                if (slug) {
                    xml += `
    <url>
        <loc>${baseUrl}/anime.html?slug=${slug}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`;
                }
            });
        }

        // Tutup XML
        xml += `
</urlset>`;

        // 5. Kirim Respons dengan Header XML
        res.setHeader('Content-Type', 'application/xml');
        // Cache selama 1 jam (3600 detik)
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
        res.status(200).send(xml);

    } catch (error) {
        console.error('Sitemap Error:', error);
        res.status(500).send('Error generating sitemap');
    }
}
