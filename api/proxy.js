export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        // Validasi URL sederhana untuk keamanan (opsional, sesuaikan kebutuhan)
        // if (!decodedUrl.startsWith('http')) { ... }

        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                // Tambahkan referer jika perlu, misalnya untuk bypass hotlink protection
                'Referer': 'https://otakudesu.best/'
            }
        });

        if (!response.ok) {
            return res.status(response.status).send('Failed to fetch image');
        }

        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Cache Control: Cache selama 1 hari (86400 detik) di CDN Vercel
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=60');

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
