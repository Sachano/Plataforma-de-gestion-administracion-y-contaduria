const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all inventory items
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id as product_id, p.name as product_name, p.brand, p.barcode,
                pr.id as presentation_id, pr.name as presentation_name, 
                pr.quantity_value, pr.stock, pr.price
            FROM products p
            LEFT JOIN product_presentations pr ON p.id = pr.product_id
            ORDER BY p.id, pr.id;
        `;
        const { rows } = await pool.query(query);

        // Map flat SQL response to nested JSON structure matching the frontend
        const inventoryMap = {};

        for (const row of rows) {
            if (!inventoryMap[row.product_id]) {
                inventoryMap[row.product_id] = {
                    id: row.product_id,
                    name: row.product_name,
                    brand: row.brand,
                    barcode: row.barcode,
                    stock: 0, // This is derived from the base unit later if needed or kept simple
                    presentations: []
                };
            }
            if (row.presentation_id) {
                inventoryMap[row.product_id].presentations.push({
                    id: row.presentation_id,
                    name: row.presentation_name,
                    unitCount: row.quantity_value || 1, // mapping unitCount to quantity_value
                    price: parseFloat(row.price),
                    stock: row.stock
                });
            }
        }

        res.json(Object.values(inventoryMap));
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: 'Server error fetching inventory' });
    }
});

// POST new product (Definition)
router.post('/', async (req, res) => {
    const client = await pool.connect();

    try {
        const { name, brand, barcode, presentations } = req.body;

        await client.query('BEGIN');

        // 1. Insert product
        const prodRes = await client.query(
            'INSERT INTO products (name, brand, barcode) VALUES ($1, $2, $3) RETURNING id',
            [name, brand, barcode]
        );
        const productId = prodRes.rows[0].id;

        // 2. Insert presentations
        const insertedPresentations = [];
        if (presentations && presentations.length > 0) {
            for (const p of presentations) {
                const presRes = await client.query(
                    'INSERT INTO product_presentations (product_id, name, quantity_value, price, stock) VALUES ($1, $2, $3, $4, 0) RETURNING id',
                    [productId, p.name, p.unitCount, p.price]
                );
                insertedPresentations.push({
                    id: presRes.rows[0].id,
                    name: p.name,
                    unitCount: p.unitCount, // Maps to quantity_value
                    price: p.price,
                    stock: 0
                });
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            id: productId,
            name,
            brand,
            barcode,
            stock: 0,
            presentations: insertedPresentations
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Server error creating product' });
    } finally {
        client.release();
    }
});

// PUT restock (Surtido)
router.put('/:id/restock', async (req, res) => {
    const client = await pool.connect();

    try {
        const productId = req.params.id;
        const { totalBaseUnits, cost, note } = req.body;

        await client.query('BEGIN');

        // Find the base presentation (the one with the lowest unitCount, generally 1, or just the last inserted level for this product)
        // Here we assume the base presentation is the one with quantity_value = 1 or we simply update a master "stock" on the lowest level
        // Let's get the base presentation ID (the one with the lowest quantity_value)
        const presRes = await client.query(
            'SELECT id FROM product_presentations WHERE product_id = $1 ORDER BY quantity_value ASC LIMIT 1',
            [productId]
        );

        if (presRes.rows.length === 0) {
            throw new Error('No presentations found for this product');
        }

        const basePresentationId = presRes.rows[0].id;

        // 1. Update stock on that base presentation
        await client.query(
            'UPDATE product_presentations SET stock = stock + $1 WHERE id = $2',
            [totalBaseUnits, basePresentationId]
        );

        // 2. Insert into inventory_history
        await client.query(
            'INSERT INTO inventory_history (product_id, presentation_id, quantity_added, cost, note) VALUES ($1, $2, $3, $4, $5)',
            [productId, basePresentationId, totalBaseUnits, cost || 0, note || '']
        );

        await client.query('COMMIT');
        res.json({ success: true, added: totalBaseUnits });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error restocking product:', err);
        res.status(500).json({ error: 'Server error restocking product' });
    } finally {
        client.release();
    }
});

// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // cascade deletion handles product_presentations and inventory_history based on our schema
        res.json({ success: true, message: 'Product deleted successfully', id });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Server error deleting product' });
    }
});

// PUT (Edit) product 
router.put('/:id', async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { name, brand, barcode, presentations } = req.body;

        await client.query('BEGIN');

        // 1. Update main product details
        const prodRes = await client.query(
            'UPDATE products SET name = $1, brand = $2, barcode = $3 WHERE id = $4 RETURNING id',
            [name, brand, barcode, id]
        );

        if (prodRes.rows.length === 0) {
            throw new Error('Product not found');
        }

        // 2. Handle Presentations (Simplest approach: Delete all existing and insert new ones to avoid complex diffing logic)
        // Since we have ON DELETE CASCADE on history, dropping presentations drops history. 
        // A safer approach that preserves history is to UPDATE existing ones and INSERT new ones.

        // Let's get existing presentation IDs for this product
        const existingPres = await client.query('SELECT id FROM product_presentations WHERE product_id = $1', [id]);
        const existingIds = existingPres.rows.map(r => r.id);
        const incomingIds = presentations.map(p => p.id).filter(id => id !== undefined && id !== null);

        // Find which ones to delete (exist in DB but not in incoming request)
        const toDelete = existingIds.filter(dbId => !incomingIds.includes(dbId));
        if (toDelete.length > 0) {
            await client.query('DELETE FROM product_presentations WHERE id = ANY($1)', [toDelete]);
        }

        // Update or Insert incoming presentations
        const returnedPresentations = [];
        for (const p of presentations) {
            let pId;
            if (p.id) {
                // Update
                const upRes = await client.query(
                    'UPDATE product_presentations SET name = $1, quantity_value = $2, price = $3 WHERE id = $4 RETURNING id, stock',
                    [p.name, p.unitCount, p.price, p.id]
                );
                pId = upRes.rows[0].id;
                returnedPresentations.push({
                    id: pId,
                    name: p.name,
                    unitCount: p.unitCount,
                    price: p.price,
                    stock: upRes.rows[0].stock
                });
            } else {
                // Insert new
                const inRes = await client.query(
                    'INSERT INTO product_presentations (product_id, name, quantity_value, price, stock) VALUES ($1, $2, $3, $4, 0) RETURNING id',
                    [id, p.name, p.unitCount, p.price]
                );
                pId = inRes.rows[0].id;
                returnedPresentations.push({
                    id: pId,
                    name: p.name,
                    unitCount: p.unitCount,
                    price: p.price,
                    stock: 0
                });
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            product: {
                id: Number(id),
                name,
                brand,
                barcode,
                presentations: returnedPresentations
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating product:', err);
        res.status(500).json({ error: err.message || 'Server error updating product' });
    } finally {
        client.release();
    }
});

module.exports = router;
