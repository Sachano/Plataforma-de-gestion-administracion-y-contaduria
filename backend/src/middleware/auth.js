// ============================================================================
// auth.js (middleware) — Verificar que el usuario esté autenticado
// ============================================================================
// Este middleware se coloca ANTES de una ruta para protegerla.
// Ejemplo de uso:
//   router.get('/datos-privados', auth, (req, res) => { ... });
//
// ¿Cómo funciona?
// 1. Busca el token JWT en las cookies de la petición
// 2. Si no hay token → responde con error 401 (no autenticado)
// 3. Si el token es inválido o expiró → responde con error 401/403
// 4. Si el token es válido → agrega los datos del usuario a req.user
//    y deja pasar la petición al siguiente handler
//
// Nota: Actualmente deshabilitado en la mayoría de rutas (modo un solo usuario).
// ============================================================================

const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // Buscar el token JWT en las cookies
    const token = req.cookies.token;

    // Si no hay token, el usuario no está autenticado
    if (!token) {
        return res.status(401).json({ error: 'No autenticado — se requiere iniciar sesión' });
    }

    try {
        // Verificar que el token sea válido usando la clave secreta
        // jwt.verify() decodifica el token y devuelve los datos del usuario
        // Si el token es inválido o expiró, lanza un error
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Agregar los datos del usuario a la petición para que
        // las rutas posteriores puedan acceder a ellos
        req.user = decoded;

        // Dejar pasar al siguiente handler
        next();
    } catch (err) {
        // Diferenciar entre token expirado y token inválido
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Sesión expirada — inicia sesión nuevamente' });
        }
        return res.status(403).json({ error: 'Token inválido — acceso denegado' });
    }
};

module.exports = auth;
