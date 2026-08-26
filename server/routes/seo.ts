import { Router, Request, Response } from 'express';

const router = Router();

router.get('/sitemap.xml', (req: Request, res: Response) => {
  try {
    const baseUrl = process.env.CORS_ORIGIN || 'https://tuondoke.com';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/safety</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/privacy</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>
  <url><loc>${baseUrl}/terms</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err: any) { res.status(500).send('Error'); }
});

router.get('/robots.txt', (req: Request, res: Response) => {
  try {
    const txt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${process.env.CORS_ORIGIN || 'https://tuondoke.com'}/sitemap.xml`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(txt);
  } catch (err: any) { res.status(500).send('Error'); }
});

export default router;
