const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const invoiceRes = await pool.query('SELECT * FROM invoices ORDER BY timestamp DESC');
        const invoices = invoiceRes.rows;

        if (invoices.length === 0) return res.json([]);

        const invoiceIds = invoices.map(i => i.id);
        const itemRes = await pool.query(
            `SELECT ii.*, p.name as product_name, p.brand 
             FROM invoice_items ii
             LEFT JOIN products p ON ii.product_id = p.id
             WHERE ii.invoice_id = ANY($1)`,
            [invoiceIds]
        );

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

        res.json(invoices.map(inv => ({
            id: inv.id,
            timestamp: inv.timestamp,
            total: parseFloat(inv.total_usd),
            items: itemMap[inv.id] || []
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching invoices' });
    }
});

// Create new invoice and deduct stock
router.post('/', async (req, res) => {
    const client = await pool.connect();

    try {
        const { id, total_usd, items } = req.body;

        if (!id || !items || !items.length) {
            return res.status(400).json({ error: 'Missing invoice data' });
        }

        await client.query('BEGIN');

        // 1. Insert Invoice
        await client.query(
            'INSERT INTO invoices (id, total_usd) VALUES ($1, $2)',
            [id, total_usd]
        );

        // 2. Insert Items and 3. Deduct Stock
        for (const item of items) {
            // Insert item
            await client.query(
                `INSERT INTO invoice_items 
                 (invoice_id, product_id, presentation_id, presentation_name, unit_price, quantity) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, item.productId, item.presentationId, item.presentationName, item.unitPrice, item.quantity]
            );

            // Deduct stock (if presentationId is provided)
            if (item.presentationId) {
                // To deduct correctly across all presentations, we should ideally deduct from the Base Unit.
                // However, our backend schema currently tracks `stock` per presentation. 
                // We'll trust the frontend inventory calculations or adjust the specific presentation's stock directly.
                // According to our Restock logic, all stock is stored in the BASE presentation (index 0).

                // Let's get the target presentation to see its quantity_value
                const presRes = await client.query('SELECT product_id, quantity_value FROM product_presentations WHERE id = $1', [item.presentationId]);

                if (presRes.rows.length > 0) {
                    const soldPres = presRes.rows[0];
                    const unitsSold = soldPres.quantity_value * item.quantity;

                    // Deduct from the Base Presentation (which holds all the stock, i.e., the one with the highest quantity_value = 1)
                    // Find base presentation for this product
                    const baseRes = await client.query(
                        'SELECT id FROM product_presentations WHERE product_id = $1 ORDER BY quantity_value ASC LIMIT 1',
                        [soldPres.product_id]
                    );

                    if (baseRes.rows.length > 0) {
                        const baseId = baseRes.rows[0].id;
                        await client.query(
                            'UPDATE product_presentations SET stock = stock - $1 WHERE id = $2',
                            [unitsSold, baseId]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Invoice created successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating invoice:', err);
        res.status(500).json({ error: 'Server error creating invoice' });
    } finally {
        client.release();
    }
});

module.exports = router;
