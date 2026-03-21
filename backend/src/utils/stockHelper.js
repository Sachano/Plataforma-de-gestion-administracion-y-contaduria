// ============================================================================
// stockHelper.js — Función reutilizable para descontar inventario
// ============================================================================
// Este archivo existe porque la lógica de descontar stock se necesita
// en DOS lugares: cuando se crea una factura normal y cuando se crea
// una factura asignada a un deudor. En vez de copiar y pegar el mismo
// código, lo ponemos aquí una sola vez.
// ============================================================================

/**
 * Descuenta el stock del inventario para cada item de una factura.
 *
 * ¿Cómo funciona?
 * 1. Para cada item vendido, busca cuántas "unidades base" equivale
 *    la presentación que se vendió (ej: 1 caja = 12 unidades).
 * 2. Multiplica eso por la cantidad vendida.
 * 3. Resta esas unidades de la presentación más pequeña (la "base").
 *
 * @param {object} client - La conexión a la base de datos (debe estar dentro de una transacción)
 * @param {Array} items - Los items de la factura, cada uno con { presentationId, quantity }
 */
const deducirStockPorItems = async (client, items) => {
  // Recorremos cada producto vendido en la factura
  for (const item of items) {
    // Solo podemos descontar stock si sabemos qué presentación se vendió
    if (!item.presentationId) continue;

    // Paso 1: Buscar los datos de la presentación vendida
    // (necesitamos saber a qué producto pertenece y cuántas unidades base contiene)
    const presRes = await client.query(
      'SELECT product_id, quantity_value FROM product_presentations WHERE id = $1',
      [item.presentationId]
    );

    // Si no se encontró la presentación, saltamos este item
    if (presRes.rows.length === 0) continue;

    const presentacionVendida = presRes.rows[0];

    // Paso 2: Calcular cuántas unidades base se vendieron
    // Ejemplo: si vendimos 2 cajas y cada caja tiene 12 unidades → 24 unidades
    const unidadesVendidas = presentacionVendida.quantity_value * item.quantity;

    // Paso 3: Encontrar la presentación "base" (la más pequeña del producto)
    // Es la que tiene el quantity_value más bajo
    const baseRes = await client.query(
      'SELECT id FROM product_presentations WHERE product_id = $1 ORDER BY quantity_value ASC LIMIT 1',
      [presentacionVendida.product_id]
    );

    // Si encontramos la presentación base, le restamos las unidades vendidas
    if (baseRes.rows.length > 0) {
      const idPresentacionBase = baseRes.rows[0].id;
      await client.query(
        'UPDATE product_presentations SET stock = stock - $1 WHERE id = $2',
        [unidadesVendidas, idPresentacionBase]
      );
    }
  }
};

module.exports = { deducirStockPorItems };
