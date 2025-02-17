import express from 'express';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import cors from 'cors';

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Enable CORS for all routes
app.use(cors());

// EPG configuration
const EPG_URL = 'https://cdn88.xyz/xmltv.php';
const USERNAME = 'mtfVNd';
const PASSWORD = 'DAm6ay';

const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    throw new Error(`Failed after ${retries} retries`);
};

app.get('/epg', async (req, res) => {
    try {
        // Check cache first
        const cachedData = cache.get('epg_data');
        if (cachedData) {
            console.log('Serving cached EPG data');
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('X-Cache', 'HIT');
            return res.send(cachedData);
        }

        // Build URL with parameters
        const params = new URLSearchParams({
            username: USERNAME,
            password: PASSWORD,
            type: 'm3u_plus',
            output: 'ts'
        });

        // Fetch from EPG server with retry
        const response = await fetchWithRetry(`${EPG_URL}?${params}`, {
            timeout: 30000, // 30 seconds timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const xmlData = await response.text();

        // Store in cache
        cache.set('epg_data', xmlData);

        // Send response
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('X-Cache', 'MISS');
        res.send(xmlData);

    } catch (error) {
        console.error('Error fetching EPG:', error);

        // Try to serve stale cache if available
        const staleData = cache.get('epg_data');
        if (staleData) {
            console.log('Serving stale cached EPG data due to error');
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('X-Cache', 'STALE');
            res.setHeader('X-Error', error.message);
            return res.send(staleData);
        }

        res.status(500).json({
            error: true,
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
}); 