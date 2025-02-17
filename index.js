import express from 'express';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import cors from 'cors';
import https from 'https';

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EPG configuration
const EPG_URL = 'https://cdn88.xyz/xmltv.php';
const USERNAME = 'mtfVNd';
const PASSWORD = 'DAm6ay';

// Configuração do agente HTTPS para ignorar erros de certificado
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Tentativa ${i + 1} de ${retries} para ${url}`);
            const response = await fetch(url, {
                ...options,
                agent: httpsAgent,
                timeout: 30000 // 30 segundos
            });
            
            if (response.ok) {
                console.log(`Sucesso na tentativa ${i + 1}`);
                return response;
            }
            
            console.log(`Tentativa ${i + 1} falhou com status ${response.status}`);
            
            if (i === retries - 1) {
                throw new Error(`Status ${response.status} na última tentativa`);
            }
        } catch (error) {
            console.error(`Erro na tentativa ${i + 1}:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
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

        console.log('Cache miss, fetching fresh EPG data...');

        // Build URL with parameters
        const params = new URLSearchParams({
            username: USERNAME,
            password: PASSWORD,
            type: 'm3u_plus',
            output: 'ts'
        });

        const url = `${EPG_URL}?${params}`;
        console.log('Fetching EPG from:', url);

        // Fetch from EPG server with retry
        const response = await fetchWithRetry(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const xmlData = await response.text();
        console.log('EPG data received, length:', xmlData.length);
        console.log('First 200 chars:', xmlData.substring(0, 200));

        if (!xmlData.includes('<?xml')) {
            throw new Error('Invalid XML response received');
        }

        // Store in cache
        cache.set('epg_data', xmlData);
        console.log('EPG data cached successfully');

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
            message: error.message,
            details: error.stack
        });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'EPG Proxy is running!',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const cacheStats = cache.getStats();
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        cache: {
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            keys: cacheStats.keys,
            hasEpgData: cache.has('epg_data')
        }
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
    console.log(`Test the server at: http://localhost:${PORT}/test`);
    console.log(`Get EPG data at: http://localhost:${PORT}/epg`);
    console.log(`Check health at: http://localhost:${PORT}/health`);
}); 