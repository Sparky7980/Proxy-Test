import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';  // Corrected import for cheerio

const app = express();
const PORT = 3002;

// Get the directory name using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the home page at the root URL (/)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Serve the index.html file
});

// Proxy route to handle requests with the "url" query parameter
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Missing URL parameter');
    }

    try {
        // Launch Puppeteer and get the page HTML
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        // Get the page HTML content
        let html = await page.content();
        await browser.close();

        // Use Cheerio to manipulate the HTML
        const $ = cheerio.load(html);

        // Modify all the links in the HTML to go through the proxy
        $('a').each((i, link) => {
            const href = $(link).attr('href');
            if (href && !href.startsWith('#')) {
                $(link).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
            }
        });

        // Rewrite resource URLs (images, scripts, etc.)
        $('img').each((i, img) => {
            const src = $(img).attr('src');
            if (src) {
                $(img).attr('src', `/proxy?url=${encodeURIComponent(src)}`);
            }
        });

        $('script').each((i, script) => {
            const src = $(script).attr('src');
            if (src) {
                $(script).attr('src', `/proxy?url=${encodeURIComponent(src)}`);
            }
        });

        $('link').each((i, link) => {
            const href = $(link).attr('href');
            if (href) {
                $(link).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
            }
        });

        // Send the modified HTML back to the client
        res.setHeader('Content-Type', 'text/html');
        res.send($.html());
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching the requested URL');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});
