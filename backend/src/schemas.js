// ============================================================================
// schemas.js — Esquemas de validación con Zod
// ============================================================================
// Zod es una librería que nos permite definir "reglas" para los datos
// que recibimos del frontend. Si los datos no cumplen las reglas,
// el middleware de validación devuelve un error 400 automáticamente.
//
// Ejemplo: si alguien intenta crear un producto sin nombre,
// Zod lo rechaza antes de que llegue a la base de datos.
// ============================================================================

const { z } = require('zod');

// ── Esquema para crear/editar un producto ──
// Define las reglas que debe cumplir un producto:
// - Nombre: obligatorio, mínimo 1 carácter
// - Marca: opcional
// - Código de barras: opcional
const productSchema = z.object({
    name: z.string().min(1, 'El nombre del producto es obligatorio'),
    brand: z.string().optional(),
    barcode: z.string().optional(),
});

// ── Esquema para una presentación de empaque ──
// Cada presentación define un nivel del empaque:
// - Nombre: obligatorio (ej: "Caja", "Unidad")
// - unitCount: cuántas unidades del siguiente nivel contiene (mínimo 1)
// - Precio: obligatorio, mínimo 0
const presentationSchema = z.object({
    name: z.string().min(1, 'El nombre de la presentación es obligatorio'),
    unitCount: z.number().int().min(1, 'Debe contener al menos 1 unidad'),
    price: z.number().min(0, 'El precio no puede ser negativo'),
});

// ── Esquema para crear una deuda/deudor ──
// - Tipo: solo puede ser 'deuda' o 'deudor'
// - Nombre: obligatorio
// - Monto: obligatorio, mínimo 0
// - Descripción: opcional
const debtSchema = z.object({
    type: z.enum(['deuda', 'deudor'], {
        errorMap: () => ({ message: 'El tipo debe ser "deuda" o "deudor"' })
    }),
    name: z.string().min(1, 'El nombre es obligatorio'),
    amount: z.number().min(0, 'El monto no puede ser negativo'),
    description: z.string().optional(),
});

module.exports = { productSchema, presentationSchema, debtSchema };
