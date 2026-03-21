// ============================================================================
// invoices.js — Rutas para gestionar facturas
// ============================================================================
// Este archivo maneja dos cosas:
// 1. Obtener todas las facturas (GET /)
// 2. Crear una nueva factura y descontar stock del inventario (POST /)
//
// Nota: La autenticación está deshabilitada temporalmente (modo un solo usuario).
//       Cuando se reactive, descomentar las líneas de 'auth' y 'logAction'.
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { deducirStockPorItems } = require('../utils/stockHelper');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
// const { logAction } = require('../utils/audit'); // Deshabilitado: modo un solo usuario

// ─────────────────────────────────────────────────────────────────────────────
// GET / — Obtener todas las facturas con sus items
// ─────────────────────────────────────────────────────────────────────────────
// Primero busca todas las facturas, luego busca los items de cada una
// y los agrupa en un objeto { factura, items[] } para enviar al frontend.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        // Buscar todas las facturas ordenadas por fecha (la más nueva primero)
        const invoiceRes = await pool.query('SELECT * FROM invoices ORDER BY timestamp DESC');
        const invoices = invoiceRes.rows;

        // Si no hay facturas, devolver un array vacío
        if (invoices.length === 0) return res.json([]);

        // Obtener los IDs de todas las facturas para buscar sus items de una sola vez
        const invoiceIds = invoices.map(i => i.id);

        // Buscar todos los items de esas facturas (con el nombre del producto incluido)
        const itemRes = await pool.query(
            `SELECT ii.*, p.name as product_name, p.brand 
             FROM invoice_items ii
             LEFT JOIN products p ON ii.product_id = p.id
             WHERE ii.invoice_id = ANY($1)`,
            [invoiceIds]
        );

        // Agrupar los items por factura usando un mapa (objeto)
        // Esto es más eficiente que hacer una consulta por cada factura
        const itemMap = {};
        itemRes.rows.forEach(item => {
            if (!itemMap[item.invoice_id]) itemMap[item.invoice_id] = [];
            itemMap[item.invoice_id].push({
                id: item.id,
                name: item.product_name || 'Producto eliminado',
                brand: item.brand,
                presentationId: item.presentation_id,
                presentationName: item.presentation_name,
                unitPrice: parseFloat(item.unit_price),
                quantity: item.quantity
            });
        });

        // Armar la respuesta: cada factura con su lista de items
        res.json(invoices.map(inv => ({
            id: inv.id,
            timestamp: inv.timestamp,
            total: parseFloat(inv.total_usd),
            items: itemMap[inv.id] || []
        })));
    } catch (err) {
        console.error('Error obteniendo facturas:', err);
        res.status(500).json({ error: 'Error del servidor al obtener facturas' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST / — Crear una nueva factura y descontar el inventario
// ─────────────────────────────────────────────────────────────────────────────
// Pasos:
//   1. Insertar la factura en la tabla 'invoices'
//   2. Insertar cada item en 'invoice_items'
//   3. Descontar stock de cada producto vendido (usando la función compartida)
//
// Todo se hace dentro de una TRANSACCIÓN para que si algo falla,
// no se quede la factura a medias.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, checkRole(['admin', 'seller']), async (req, res) => {
    // Obtener una conexión dedicada para la transacción
    const client = await pool.connect();

    try {
        const { id, total_usd, items } = req.body;

        // Validar que los datos mínimos estén presentes
        if (!id || !items || !items.length) {
            return res.status(400).json({ error: 'Faltan datos de la factura (id, items)' });
        }

        // Iniciar la transacción
        await client.query('BEGIN');

        // Paso 1: Insertar la factura
        await client.query(
            'INSERT INTO invoices (id, total_usd) VALUES ($1, $2)',
            [id, total_usd]
        );

        // Paso 2: Insertar cada item de la factura
        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items 
                 (invoice_id, product_id, presentation_id, presentation_name, unit_price, quantity) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, item.productId, item.presentationId, item.presentationName, item.unitPrice, item.quantity]
            );
        }

        // Paso 3: Descontar stock (función reutilizable en utils/stockHelper.js)
        await deducirStockPorItems(client, items);

        // Confirmar la transacción — todo salió bien
        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Factura creada exitosamente' });

    } catch (err) {
        // Si algo falló, revertir todos los cambios
        await client.query('ROLLBACK');
        console.error('Error creando factura:', err);
        res.status(500).json({ error: 'Error del servidor al crear la factura' });
    } finally {
        // Siempre liberar la conexión (aunque haya error)
        client.release();
    }
});

module.exports = router;
