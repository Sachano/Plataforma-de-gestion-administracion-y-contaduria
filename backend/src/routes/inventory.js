// ============================================================================
// inventory.js — Rutas para gestionar el inventario de productos
// ============================================================================
// Este archivo maneja todo lo relacionado con los productos del negocio:
// 1. GET    /              → Ver todos los productos con sus presentaciones
// 2. POST   /              → Crear un nuevo producto
// 3. PUT    /:id/restock   → Registrar surtido (agregar stock)
// 4. DELETE /:id           → Eliminar un producto
// 5. PUT    /:id           → Editar un producto existente
//
// Nota: La autenticación está deshabilitada (modo un solo usuario).
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validate = require('../middleware/validate');
const { productSchema } = require('../schemas');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
// ─────────────────────────────────────────────────────────────────────────────
// GET / — Obtener todos los productos del inventario
// ─────────────────────────────────────────────────────────────────────────────
// Busca todos los productos junto con sus presentaciones de empaque.
// Agrupa las presentaciones por producto para enviar al frontend un array
// donde cada producto tiene su array de presentaciones.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        // Una sola consulta que trae productos + presentaciones juntos
        // Esto es más eficiente que hacer una consulta por cada producto
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

        // Agrupar las filas por producto usando un mapa
        // El LEFT JOIN puede devolver varias filas por producto (una por presentación)
        const inventoryMap = {};

        for (const row of rows) {
            // Si es la primera vez que vemos este producto, creamos su objeto
            if (!inventoryMap[row.product_id]) {
                inventoryMap[row.product_id] = {
                    id: row.product_id,
                    name: row.product_name,
                    brand: row.brand,
                    barcode: row.barcode,
                    stock: 0,
                    presentations: []
                };
            }

            // Si tiene presentación, agregarla al array del producto
            if (row.presentation_id) {
                inventoryMap[row.product_id].presentations.push({
                    id: row.presentation_id,
                    name: row.presentation_name,
                    unitCount: row.quantity_value || 1,
                    price: parseFloat(row.price),
                    stock: row.stock
                });
            }
        }

        // Convertir el mapa a un array y enviarlo
        res.json(Object.values(inventoryMap));
    } catch (err) {
        console.error('Error obteniendo inventario:', err);
        res.status(500).json({ error: 'Error del servidor al obtener el inventario' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST / — Crear un nuevo producto con sus presentaciones
// ─────────────────────────────────────────────────────────────────────────────
// Recibe nombre, marca, código de barras y un array de presentaciones.
// Todo se inserta en una transacción para que sea atómico.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, checkRole(['admin', 'seller']), [validate(productSchema)], async (req, res) => {
    const client = await pool.connect();

    try {
        const { name, brand, barcode, presentations } = req.body;

        await client.query('BEGIN');

        // Paso 1: Insertar el producto
        const prodRes = await client.query(
            'INSERT INTO products (name, brand, barcode) VALUES ($1, $2, $3) RETURNING id',
            [name, brand, barcode]
        );
        const productId = prodRes.rows[0].id;

        // Paso 2: Insertar cada presentación de empaque
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
                    unitCount: p.unitCount,
                    price: p.price,
                    stock: 0
                });
            }
        }

        await client.query('COMMIT');

        // Devolver el producto recién creado con sus presentaciones
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
        console.error('Error creando producto:', err);
        res.status(500).json({ error: 'Error del servidor al crear el producto' });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id/restock — Registrar surtido (agregar stock a un producto)
// ─────────────────────────────────────────────────────────────────────────────
// Recibe la cantidad de unidades base que llegaron y la suma al stock
// de la presentación más pequeña (la "base").
// También registra el surtido en el historial de inventario.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/restock', auth, checkRole(['admin', 'seller']), async (req, res) => {
    const client = await pool.connect();

    try {
        const productId = req.params.id;
        const { totalBaseUnits, cost, note } = req.body;

        await client.query('BEGIN');

        // Buscar la presentación base (la más pequeña, con el quantity_value más bajo)
        const presRes = await client.query(
            'SELECT id FROM product_presentations WHERE product_id = $1 ORDER BY quantity_value ASC LIMIT 1',
            [productId]
        );

        if (presRes.rows.length === 0) {
            throw new Error('Este producto no tiene presentaciones configuradas');
        }

        const basePresentationId = presRes.rows[0].id;

        // Paso 1: Sumar las unidades al stock de la presentación base
        await client.query(
            'UPDATE product_presentations SET stock = stock + $1 WHERE id = $2',
            [totalBaseUnits, basePresentationId]
        );

        // Paso 2: Registrar en el historial de inventario
        await client.query(
            'INSERT INTO inventory_history (product_id, presentation_id, quantity_added, cost, note) VALUES ($1, $2, $3, $4, $5)',
            [productId, basePresentationId, totalBaseUnits, cost || 0, note || '']
        );

        await client.query('COMMIT');
        res.json({ success: true, added: totalBaseUnits });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error registrando surtido:', err);
        res.status(500).json({ error: 'Error del servidor al registrar surtido' });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id — Eliminar un producto del inventario
// ─────────────────────────────────────────────────────────────────────────────
// Las presentaciones, historial y items de factura se eliminan automáticamente
// gracias al CASCADE configurado en la base de datos.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 RETURNING id, name',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ success: true, message: 'Producto eliminado exitosamente', id });
    } catch (err) {
        console.error('Error eliminando producto:', err);
        res.status(500).json({ error: 'Error del servidor al eliminar el producto' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /:id — Editar un producto existente (nombre, marca, presentaciones)
// ─────────────────────────────────────────────────────────────────────────────
// Este endpoint es más complejo porque debe manejar tres casos para
// las presentaciones:
//   - Presentaciones que ya existían → se ACTUALIZAN
//   - Presentaciones nuevas (sin ID) → se INSERTAN
//   - Presentaciones que ya no están → se ELIMINAN
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, checkRole(['admin']), [validate(productSchema)], async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { name, brand, barcode, presentations } = req.body;

        await client.query('BEGIN');

        // Paso 1: Actualizar los datos básicos del producto
        const prodRes = await client.query(
            'UPDATE products SET name = $1, brand = $2, barcode = $3 WHERE id = $4 RETURNING id',
            [name, brand, barcode, id]
        );

        if (prodRes.rows.length === 0) {
            throw new Error('Producto no encontrado');
        }

        // Paso 2: Identificar qué presentaciones se deben eliminar
        // (Las que existen en la DB pero ya no vienen en la petición)
        const existingPres = await client.query(
            'SELECT id FROM product_presentations WHERE product_id = $1',
            [id]
        );
        const existingIds = existingPres.rows.map(r => r.id);
        const incomingIds = presentations
            .map(p => p.id)
            .filter(presId => presId !== undefined && presId !== null);

        // Eliminar presentaciones que ya no están en la lista
        const toDelete = existingIds.filter(dbId => !incomingIds.includes(dbId));
        if (toDelete.length > 0) {
            await client.query('DELETE FROM product_presentations WHERE id = ANY($1)', [toDelete]);
        }

        // Paso 3: Actualizar existentes e insertar nuevas
        const returnedPresentations = [];
        for (const p of presentations) {
            if (p.id) {
                // Ya existe → actualizar nombre, cantidad y precio (sin tocar el stock)
                const upRes = await client.query(
                    'UPDATE product_presentations SET name = $1, quantity_value = $2, price = $3 WHERE id = $4 RETURNING id, stock',
                    [p.name, p.unitCount, p.price, p.id]
                );
                returnedPresentations.push({
                    id: upRes.rows[0].id,
                    name: p.name,
                    unitCount: p.unitCount,
                    price: p.price,
                    stock: upRes.rows[0].stock
                });
            } else {
                // Es nueva → insertar con stock 0
                const inRes = await client.query(
                    'INSERT INTO product_presentations (product_id, name, quantity_value, price, stock) VALUES ($1, $2, $3, $4, 0) RETURNING id',
                    [id, p.name, p.unitCount, p.price]
                );
                returnedPresentations.push({
                    id: inRes.rows[0].id,
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
        console.error('Error actualizando producto:', err);
        res.status(500).json({ error: err.message || 'Error del servidor al actualizar el producto' });
    } finally {
        client.release();
    }
});

module.exports = router;
