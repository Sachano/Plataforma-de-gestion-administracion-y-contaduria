const express = require('express');
const router = express.Router();
const pool = require('../db');
const cheerio = require('cheerio');
const axios = require('axios');
const https = require('https');

// Get all custom saved exchange rates (if any)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exchange_rates');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching exchange rates' });
    }
});

// Get live rates from external API (BCV from dolarapi.com, Binance from Binance P2P)
router.get('/live', async (req, res) => {
    try {
        let bcvRate;

        // Try direct BCV website first (most accurate)
        try {
            const agent = new https.Agent({ rejectUnauthorized: false });
            const bcvResp = await axios.get('https://www.bcv.org.ve/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'es-VE,es;q=0.9'
                },
                httpsAgent: agent,
                timeout: 8000
            });
            const $ = cheerio.load(bcvResp.data);
            const usdText = $('#dolar strong').first().text().trim();
            const parsed = parseFloat(usdText.replace('.', '').replace(',', '.'));
            if (!isNaN(parsed) && parsed > 1) {
                bcvRate = parsed;
                console.log('[BCV] Scraped from bcv.org.ve:', bcvRate);
            }
        } catch (bcvErr) {
            console.warn('[BCV] Direct scrape failed, trying dolarapi fallback...', bcvErr.message);
        }

        // Fallback to dolarapi.com if direct scrape failed
        if (!bcvRate) {
            const fallbackResp = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });
            if (!fallbackResp.ok) throw new Error('Both BCV and fallback API failed');
            const fallbackData = await fallbackResp.json();
            bcvRate = fallbackData.promedio;
            console.log('[BCV] Using dolarapi fallback:', bcvRate);
        }

        // --- 2. Fetch Binance P2P Rate (USDT/VES, SELL orders, top 5) ---
        const binanceResponse = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                fiat: 'VES',
                page: 1,
                rows: 5,
                tradeType: 'SELL',
                asset: 'USDT',
                countries: [],
                proMerchantAds: false,
                shieldMerchantAds: false,
                filterType: 'all',
                periods: [],
                additionalKycVerifyFilter: 0,
                publisherType: null,
                payTypes: [],
                classifies: ['mass', 'profession', 'fiat_merchant']
            }),
            signal: AbortSignal.timeout(7000)
        });
        if (!binanceResponse.ok) throw new Error(`Binance P2P API error: ${binanceResponse.status}`);
        const binanceData = await binanceResponse.json();

        // Average the top 5 SELL prices for a stable rate
        const prices = binanceData.data
            .map(item => parseFloat(item.adv.price))
            .filter(p => !isNaN(p));

        if (prices.length === 0) throw new Error('No Binance P2P prices returned');
        const binanceRate = prices.reduce((sum, p) => sum + p, 0) / prices.length;

        res.json({
            bcv: bcvRate,
            binance: parseFloat(binanceRate.toFixed(2))
        });

    } catch (err) {
        console.error('Error fetching live rates:', err);
        res.status(500).json({ error: 'Failed to fetch live exchange rates', details: err.message });
    }
});

module.exports = router;
