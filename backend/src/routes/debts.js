// ============================================================================
// debts.js — Rutas para gestionar deudas y deudores
// ============================================================================
// Este archivo maneja:
// 1. GET    /         → Obtener todas las deudas/deudores con su historial
// 2. POST   /         → Crear una nueva deuda o deudor manualmente
// 3. PATCH  /:id/abono → Registrar un pago (abono) a una deuda
// 4. DELETE /:id      → Eliminar una deuda o deudor
// 5. POST   /invoice  → Crear factura asignada a un deudor (fiado)
//
// Nota: La autenticación está deshabilitada temporalmente (modo un solo usuario).
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validate = require('../middleware/validate');
const { debtSchema } = require('../schemas');
const { deducirStockPorItems } = require('../utils/stockHelper');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');


// ─────────────────────────────────────────────────────────────────────────────
// GET / — Obtener todas las deudas/deudores con su historial de pagos
// ─────────────────────────────────────────────────────────────────────────────
// Funciona igual que en invoices: busca todo y agrupa el historial por ID.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        // Buscar todas las deudas ordenadas por fecha de creación (más nueva primero)
        const debtsRes = await pool.query('SELECT * FROM debts ORDER BY created_at DESC');
        const debts = debtsRes.rows;

        // Si no hay deudas, devolver un array vacío
        if (debts.length === 0) return res.json([]);

        // Buscar el historial de pagos de todas las deudas de una sola consulta
        const debtIds = debts.map(d => d.id);
        const historyRes = await pool.query(
            'SELECT * FROM debt_history WHERE debt_id = ANY($1) ORDER BY date ASC',
            [debtIds]
        );

        // Agrupar el historial por deuda usando un mapa
        const historyMap = {};
        historyRes.rows.forEach(h => {
            if (!historyMap[h.debt_id]) historyMap[h.debt_id] = [];
            historyMap[h.debt_id].push({
                id: h.id,
                amount: parseFloat(h.amount),
                note: h.note,
                date: new Date(h.date).toLocaleDateString('es-VE', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                })
            });
        });

        // Armar la respuesta: cada deuda con su historial
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
        console.error('Error obteniendo deudas:', err);
        res.status(500).json({ error: 'Error del servidor al obtener deudas' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST / — Crear una nueva deuda o deudor manualmente
// ─────────────────────────────────────────────────────────────────────────────
// El middleware 'validate(debtSchema)' revisa que los datos sean correctos
// ANTES de que lleguen aquí (nombre no vacío, monto >= 0, tipo válido).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, checkRole(['admin', 'seller']), [validate(debtSchema)], async (req, res) => {
    try {
        const { type, name, amount, description } = req.body;

        // Insertar la nueva deuda en la base de datos
        const result = await pool.query(
            'INSERT INTO debts (type, name, amount, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [type, name.trim(), parseFloat(amount), description?.trim() || null]
        );

        // Devolver la deuda creada (con historial vacío porque es nueva)
        res.status(201).json({
            ...result.rows[0],
            amount: parseFloat(result.rows[0].amount),
            history: []
        });
    } catch (err) {
        console.error('Error creando deuda:', err);
        res.status(500).json({ error: 'Error del servidor al crear deuda' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /:id/abono — Registrar un pago (abono) a una deuda/deudor
// ─────────────────────────────────────────────────────────────────────────────
// Pasos:
//   1. Restar el monto del abono a la deuda (nunca por debajo de 0)
//   2. Registrar el abono en el historial de pagos
// Se usa transacción para que ambas operaciones sean atómicas.
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/abono', auth, checkRole(['admin', 'seller']), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { amount, note } = req.body;

        // Validar que el monto sea un número positivo
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'El monto del abono debe ser mayor a 0' });
        }

        const abonado = parseFloat(amount);

        await client.query('BEGIN');

        // Restar el abono de la deuda (GREATEST evita que quede negativo)
        const updated = await client.query(
            'UPDATE debts SET amount = GREATEST(0, amount - $1) WHERE id = $2 RETURNING *',
            [abonado, id]
        );

        // Si no existe la deuda, devolver error 404
        if (updated.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Deuda no encontrada' });
        }

        // Registrar el pago en el historial
        const histRow = await client.query(
            'INSERT INTO debt_history (debt_id, amount, note) VALUES ($1, $2, $3) RETURNING *',
            [id, abonado, note?.trim() || null]
        );

        await client.query('COMMIT');

        // Responder con la deuda actualizada y los datos del último abono
        res.json({
            ...updated.rows[0],
            amount: parseFloat(updated.rows[0].amount),
            lastAbono: {
                ...histRow.rows[0],
                amount: parseFloat(histRow.rows[0].amount)
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error procesando abono:', err);
        res.status(500).json({ error: 'Error del servidor al procesar el abono' });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id — Eliminar una deuda o deudor
// ─────────────────────────────────────────────────────────────────────────────
// También elimina automáticamente el historial de pagos (CASCADE en la DB).
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Intentar eliminar — si no existe, RETURNING devuelve 0 filas
        const result = await pool.query(
            'DELETE FROM debts WHERE id = $1 RETURNING id, name',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deuda no encontrada' });
        }

        res.json({ success: true, deleted: id });
    } catch (err) {
        console.error('Error eliminando deuda:', err);
        res.status(500).json({ error: 'Error del servidor al eliminar deuda' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /invoice — Crear factura asignada a un deudor (venta a crédito/fiado)
// ─────────────────────────────────────────────────────────────────────────────
// Similar a POST /invoices, pero además:
//   - Si no existe el deudor, lo crea automáticamente
//   - Suma el total de la factura a la deuda del deudor
//   - Registra la factura en el historial de pagos del deudor
// ─────────────────────────────────────────────────────────────────────────────
router.post('/invoice', auth, checkRole(['admin', 'seller']), async (req, res) => {
    const client = await pool.connect();

    try {
        const { id, total_usd, items, debtorId, newDebtorName } = req.body;

        // Validar datos mínimos
        if (!id || !items || !items.length) {
            return res.status(400).json({ error: 'Faltan datos de la factura (id, items)' });
        }

        await client.query('BEGIN');

        // ── Paso 1: Obtener o crear el deudor ──
        let targetDebtorId = debtorId;

        // Si no se seleccionó un deudor existente, crear uno nuevo
        if (!targetDebtorId && newDebtorName) {
            const debtRes = await client.query(
                "INSERT INTO debts (type, name, amount) VALUES ('deudor', $1, 0) RETURNING id",
                [newDebtorName]
            );
            targetDebtorId = debtRes.rows[0].id;
        }

        // ── Paso 2: Sumar el total al saldo del deudor ──
        await client.query(
            'UPDATE debts SET amount = amount + $1 WHERE id = $2',
            [total_usd, targetDebtorId]
        );

        // ── Paso 3: Registrar en el historial del deudor ──
        await client.query(
            'INSERT INTO debt_history (debt_id, amount, note) VALUES ($1, $2, $3)',
            [targetDebtorId, total_usd, `Factura añadida al crédito: ${id}`]
        );

        // ── Paso 4: Crear la factura ──
        await client.query(
            'INSERT INTO invoices (id, total_usd) VALUES ($1, $2)',
            [id, total_usd]
        );

        // ── Paso 5: Insertar los items de la factura ──
        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items 
                 (invoice_id, product_id, presentation_id, presentation_name, unit_price, quantity) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, item.productId, item.presentationId, item.presentationName, item.unitPrice, item.quantity]
            );
        }

        // ── Paso 6: Descontar stock (función compartida) ──
        await deducirStockPorItems(client, items);

        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            message: 'Factura a crédito creada exitosamente',
            debtorId: targetDebtorId
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creando factura a crédito:', err);
        res.status(500).json({ error: 'Error del servidor al crear factura a crédito' });
    } finally {
        client.release();
    }
});

module.exports = router;
