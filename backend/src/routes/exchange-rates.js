// ============================================================================
// exchange-rates.js — Rutas para gestionar tasas de cambio
// ============================================================================
// Este archivo maneja las equivalencias monetarias del negocio:
// 1. GET    /       → Obtener todas las tasas guardadas (o crear las por defecto)
// 2. GET    /live   → Obtener tasas en tiempo real (BCV + Binance)
// 3. POST   /       → Crear una nueva tasa personalizada
// 4. PUT    /:id    → Actualizar una tasa existente
// 5. DELETE /:id    → Eliminar una tasa (solo si es eliminable)
// 6. PUT    /       → Actualización masiva de todas las tasas
//
// Las tasas por defecto son: BCV (dólar oficial), Binance (dólar paralelo)
// y Pesos Colombianos. El usuario puede agregar más.
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const cheerio = require('cheerio');
const axios = require('axios');
const https = require('https');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// ─────────────────────────────────────────────────────────────────────────────
// GET / — Obtener todas las tasas de cambio guardadas
// ─────────────────────────────────────────────────────────────────────────────
// Si es la primera vez (tabla vacía), inserta tasas por defecto.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exchange_rates');

        // Si no hay tasas guardadas, crear las por defecto
        if (result.rows.length === 0) {
            const tasasPorDefecto = [
                { id: 'usd_bcv', name: 'BCV', value: 425.67, isDeletable: false, isComputed: false, currencyGroup: 'usd' },
                { id: 'usd_binance', name: 'Binance', value: 622.11, isDeletable: false, isComputed: false, currencyGroup: 'usd' },
                { id: 'cop', name: 'Pesos Colombianos', value: 6, isDeletable: false, isComputed: false, currencyGroup: 'cop' }
            ];

            for (const tasa of tasasPorDefecto) {
                await pool.query(
                    `INSERT INTO exchange_rates (id, name, value, is_deletable, is_computed, currency_group)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [tasa.id, tasa.name, tasa.value, tasa.isDeletable, tasa.isComputed, tasa.currencyGroup]
                );
            }

            // Volver a consultar para devolver las recién creadas
            const freshResult = await pool.query('SELECT * FROM exchange_rates');
            return res.json(freshResult.rows);
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo tasas de cambio:', err);
        res.status(500).json({ error: 'Error del servidor al obtener tasas de cambio' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /live — Obtener tasas en tiempo real de APIs externas
// ─────────────────────────────────────────────────────────────────────────────
// Fuentes:
//   1. BCV (Banco Central de Venezuela) — se raspa del sitio web oficial
//      Si falla, se usa dolarapi.com como respaldo
//   2. Binance P2P — promedio de las 5 mejores ofertas de venta USDT/VES
//
// Nota: rejectUnauthorized: false es necesario porque el certificado SSL
// del BCV a veces tiene problemas. No es ideal pero es la única forma.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/live', auth, async (req, res) => {
    try {
        let bcvRate;

        // ── Intento 1: Raspar directamente del sitio del BCV ──
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

            // Usar cheerio para extraer el valor del dólar del HTML
            const $ = cheerio.load(bcvResp.data);
            const usdText = $('#dolar strong').first().text().trim();
            // El BCV usa formato venezolano: "52.345,67" → convertir a número
            const parsed = parseFloat(usdText.replace('.', '').replace(',', '.'));

            if (!isNaN(parsed) && parsed > 1) {
                bcvRate = parsed;
            }
        } catch (bcvErr) {
            console.warn('[BCV] Scraping directo falló, usando respaldo dolarapi...', bcvErr.message);
        }

        // ── Intento 2: Respaldo con dolarapi.com si el scraping falló ──
        if (!bcvRate) {
            const fallbackResp = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });

            if (!fallbackResp.ok) {
                throw new Error('Tanto el BCV como la API de respaldo fallaron');
            }

            const fallbackData = await fallbackResp.json();
            bcvRate = fallbackData.promedio;
        }

        // ── Obtener tasa de Binance P2P ──
        // Busca las 5 mejores ofertas de VENTA de USDT por bolívares
        // y promedia sus precios para obtener una tasa estable
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

        if (!binanceResponse.ok) {
            throw new Error(`Error de la API de Binance P2P: ${binanceResponse.status}`);
        }

        const binanceData = await binanceResponse.json();

        // Extraer los precios y calcular el promedio
        const prices = binanceData.data
            .map(item => parseFloat(item.adv.price))
            .filter(p => !isNaN(p));

        if (prices.length === 0) {
            throw new Error('No se obtuvieron precios de Binance P2P');
        }

        const binanceRate = prices.reduce((sum, p) => sum + p, 0) / prices.length;

        // Devolver ambas tasas
        res.json({
            bcv: bcvRate,
            binance: parseFloat(binanceRate.toFixed(2))
        });

    } catch (err) {
        console.error('Error obteniendo tasas en vivo:', err);
        res.status(500).json({ error: 'Error al obtener tasas de cambio en vivo', details: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST / — Crear una nueva tasa de cambio personalizada
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { id, name, value, isDeletable, currencyGroup, customName } = req.body;

        // Validar campos obligatorios
        if (!id || !name || value === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: id, name, value' });
        }

        // Verificar que no exista una tasa con el mismo ID
        const existing = await pool.query('SELECT id FROM exchange_rates WHERE id = $1', [id]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe una tasa de cambio con ese ID' });
        }

        const result = await pool.query(
            `INSERT INTO exchange_rates (id, name, value, is_deletable, is_computed, currency_group, custom_name)
             VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING *`,
            [id, name, parseFloat(value) || 0, isDeletable !== false, currencyGroup || 'custom', customName || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creando tasa de cambio:', err);
        res.status(500).json({ error: 'Error del servidor al crear tasa de cambio' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id — Actualizar una tasa de cambio existente
// ─────────────────────────────────────────────────────────────────────────────
// Las tasas calculadas automáticamente (is_computed = true) no se pueden
// editar manualmente desde este endpoint.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, value, customName } = req.body;

        // Verificar que la tasa exista
        const existing = await pool.query('SELECT * FROM exchange_rates WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Tasa de cambio no encontrada' });
        }

        // No permitir editar tasas calculadas automáticamente
        if (existing.rows[0].is_computed) {
            return res.status(403).json({ error: 'No se pueden editar tasas calculadas automáticamente' });
        }

        // Actualizar solo los campos que se enviaron (COALESCE mantiene el valor actual si es null)
        const result = await pool.query(
            `UPDATE exchange_rates 
             SET name = COALESCE($1, name), 
                 value = COALESCE($2, value), 
                 custom_name = COALESCE($3, custom_name)
             WHERE id = $4 RETURNING *`,
            [name, value ? parseFloat(value) : null, customName, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando tasa de cambio:', err);
        res.status(500).json({ error: 'Error del servidor al actualizar tasa de cambio' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id — Eliminar una tasa de cambio
// ─────────────────────────────────────────────────────────────────────────────
// Solo se pueden eliminar tasas que tengan is_deletable = true.
// Las tasas predeterminadas (BCV, Binance, COP) no se pueden eliminar.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la tasa exista
        const existing = await pool.query('SELECT * FROM exchange_rates WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Tasa de cambio no encontrada' });
        }

        // Verificar que sea eliminable
        if (!existing.rows[0].is_deletable) {
            return res.status(403).json({ error: 'Esta tasa de cambio no se puede eliminar' });
        }

        await pool.query('DELETE FROM exchange_rates WHERE id = $1', [id]);

        res.json({ message: 'Tasa de cambio eliminada exitosamente' });
    } catch (err) {
        console.error('Error eliminando tasa de cambio:', err);
        res.status(500).json({ error: 'Error del servidor al eliminar tasa de cambio' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT / — Actualización masiva de tasas de cambio (bulk upsert)
// ─────────────────────────────────────────────────────────────────────────────
// Recibe un array de tasas y las inserta o actualiza todas de una vez.
// Usa ON CONFLICT para hacer "upsert" (insertar si no existe, actualizar si sí).
// ─────────────────────────────────────────────────────────────────────────────
router.put('/', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { rates } = req.body;

        if (!Array.isArray(rates)) {
            return res.status(400).json({ error: 'El campo "rates" debe ser un array' });
        }

        const results = [];

        for (const rate of rates) {
            const { id, name, value, isDeletable, isComputed, currencyGroup, customName } = rate;

            // Upsert: si el ID ya existe, actualiza; si no, inserta
            const result = await pool.query(
                `INSERT INTO exchange_rates (id, name, value, is_deletable, is_computed, currency_group, custom_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    value = EXCLUDED.value,
                    custom_name = EXCLUDED.custom_name
                 RETURNING *`,
                [
                    id,
                    name,
                    parseFloat(value) || 0,
                    isDeletable !== false,
                    isComputed === true,
                    currencyGroup || 'custom',
                    customName || null
                ]
            );
            results.push(result.rows[0]);
        }

        res.json(results);
    } catch (err) {
        console.error('Error en actualización masiva de tasas:', err);
        res.status(500).json({ error: 'Error del servidor en actualización masiva de tasas' });
    }
});

module.exports = router;
