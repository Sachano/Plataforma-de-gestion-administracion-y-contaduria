// ============================================================================
// validate.js (middleware) — Validar datos de entrada con Zod
// ============================================================================
// Este middleware usa los esquemas definidos en schemas.js para verificar
// que los datos enviados por el frontend cumplan las reglas antes de
// procesarlos en la base de datos.
//
// Ejemplo de uso:
//   router.post('/productos', validate(productSchema), (req, res) => { ... });
//
// Si los datos son inválidos, responde con error 400 y los detalles
// de qué campo falló y por qué.
// ============================================================================

/**
 * Crea un middleware de validación a partir de un esquema Zod.
 *
 * @param {import('zod').ZodSchema} schema - El esquema Zod a usar
 * @param {'body'|'query'|'params'} source - De dónde tomar los datos (por defecto: 'body')
 * @returns {Function} Middleware de Express
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        // Intentar validar los datos contra el esquema
        const result = schema.safeParse(req[source]);

        // Si la validación falla, devolver los errores detallados
        if (!result.success) {
            // Extraer los mensajes de error de cada campo que falló
            const errores = result.error.errors.map(e => ({
                campo: e.path.join('.'),  // Nombre del campo (ej: "name", "amount")
                mensaje: e.message       // Mensaje de error (ej: "El nombre es obligatorio")
            }));

            return res.status(400).json({
                error: 'Datos de entrada inválidos',
                detalles: errores
            });
        }

        // Si pasó la validación, reemplazar los datos con los validados
        // (Zod puede transformar/limpiar los datos automáticamente)
        req[source] = result.data;
        next();
    };
};

module.exports = validate;
