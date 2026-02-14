export default function handler(req, res) {
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const robots = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/api/sitemap`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(robots);
}
