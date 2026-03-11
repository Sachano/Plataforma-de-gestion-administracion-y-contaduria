const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all debts and debtors with their history
router.get('/', async (req, res) => {
    try {
        const debtsRes = await pool.query('SELECT * FROM debts ORDER BY created_at DESC');
        const debts = debtsRes.rows;

        if (debts.length === 0) return res.json([]);

        const debtIds = debts.map(d => d.id);
        const historyRes = await pool.query(
            'SELECT * FROM debt_history WHERE debt_id = ANY($1) ORDER BY date ASC',
            [debtIds]
        );

        const historyMap = {};
        historyRes.rows.forEach(h => {
            if (!historyMap[h.debt_id]) historyMap[h.debt_id] = [];
            historyMap[h.debt_id].push({
                id: h.id,
                amount: parseFloat(h.amount),
                note: h.note,
                date: new Date(h.date).toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' })
            });
        });

        res.json(debts.map(d => ({
            id: d.id,
            type: d.type,
            name: d.name,
            description: d.description,
            amount: parseFloat(d.amount),
            created_at: d.created_at,
            history: historyMap[d.id] || []
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching debts' });
    }
});

// Manually create a new debt or debtor
router.post('/', async (req, res) => {
    try {
        const { type, name, amount, description } = req.body;
        if (!type || !name || !amount) return res.status(400).json({ error: 'Missing required fields' });

        const result = await pool.query(
            'INSERT INTO debts (type, name, amount, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [type, name.trim(), parseFloat(amount), description?.trim() || null]
        );
        res.status(201).json({ ...result.rows[0], amount: parseFloat(result.rows[0].amount), history: [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating debt' });
    }
});

// Register a payment (abono) to a debt/debtor
router.patch('/:id/abono', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { amount, note } = req.body;
        if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });

        const abonado = parseFloat(amount);

        await client.query('BEGIN');

        // Reduce the debt amount (cannot go below 0)
        const updated = await client.query(
            'UPDATE debts SET amount = GREATEST(0, amount - $1) WHERE id = $2 RETURNING *',
            [abonado, id]
        );
        if (updated.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Debt not found' });
        }

        // Log into debt_history
        const histRow = await client.query(
            'INSERT INTO debt_history (debt_id, amount, note) VALUES ($1, $2, $3) RETURNING *',
            [id, abonado, note?.trim() || null]
        );

        await client.query('COMMIT');

        res.json({
            ...updated.rows[0],
            amount: parseFloat(updated.rows[0].amount),
            lastAbono: { ...histRow.rows[0], amount: parseFloat(histRow.rows[0].amount) }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error processing abono' });
    } finally {
        client.release();
    }
});

// Delete a debt/debtor
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM debts WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Debt not found' });
        res.json({ success: true, deleted: id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting debt' });
    }
});

// Create new invoice assigned to a debtor
router.post('/invoice', async (req, res) => {
    const client = await pool.connect();

    try {
        // debtorId is optional if newDebtorName is provided
        const { id, total_usd, items, debtorId, newDebtorName } = req.body;

        if (!id || !items || !items.length) {
            return res.status(400).json({ error: 'Missing invoice data' });
        }
        if (!debtorId && !newDebtorName) {
            return res.status(400).json({ error: 'A debtor must be specified' });
        }

        await client.query('BEGIN');

        let targetDebtorId = debtorId;

        // 1. Create Debtor if needed
        if (!targetDebtorId && newDebtorName) {
            const debtRes = await client.query(
                "INSERT INTO debts (type, name, amount) VALUES ('deudor', $1, 0) RETURNING id",
                [newDebtorName]
            );
            targetDebtorId = debtRes.rows[0].id;
        }

        // 2. Increase Debtor's total amount
        await client.query(
            "UPDATE debts SET amount = amount + $1 WHERE id = $2",
            [total_usd, targetDebtorId]
        );

        // 3. Log into debt_history
        await client.query(
            "INSERT INTO debt_history (debt_id, amount, note) VALUES ($1, $2, $3)",
            [targetDebtorId, total_usd, `Factura añadida al crédito: ${id}`]
        );

        // 4. Save Invoice (we save it in invoices too so it appears in records, but maybe flag it? 
        // For now, saving it just like a regular invoice so we have the items record)
        await client.query(
            'INSERT INTO invoices (id, total_usd) VALUES ($1, $2)',
            [id, total_usd]
        );

        // 5. Insert Items and 6. Deduct Stock
        for (const item of items) {
            // Insert item
            await client.query(
                `INSERT INTO invoice_items 
                 (invoice_id, product_id, presentation_id, presentation_name, unit_price, quantity) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, item.productId, item.presentationId, item.presentationName, item.unitPrice, item.quantity]
            );

            // Deduct stock
            if (item.presentationId) {
                const presRes = await client.query('SELECT product_id, quantity_value FROM product_presentations WHERE id = $1', [item.presentationId]);

                if (presRes.rows.length > 0) {
                    const soldPres = presRes.rows[0];
                    const unitsSold = soldPres.quantity_value * item.quantity;

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
        res.status(201).json({ success: true, message: 'Debt added successfully', debtorId: targetDebtorId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating debt invoice:', err);
        res.status(500).json({ error: 'Server error creating debt invoice' });
    } finally {
        client.release();
    }
});

module.exports = router;
