// ============================================================================
// checkRole.js (middleware) — Verificar que el usuario tenga el rol adecuado
// ============================================================================
// Este middleware verifica que el usuario autenticado tenga uno de los roles
// permitidos para acceder a una ruta específica.
//
// Uso:
//   const checkRole = require('./checkRole');
//   router.get('/ruta-protegida', auth, checkRole(['admin']), handler);
//
// También puedes permitir múltiples roles:
//   router.get('/ruta', auth, checkRole(['admin', 'manager']), handler);
// ============================================================================

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // Primero verificar que el usuario esté autenticado
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado — se requiere iniciar sesión' });
        }

        // Obtener el rol del usuario del token
        const userRole = req.user.user?.role;

        // Verificar si el rol del usuario está en la lista de roles permitidos
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Sin permisos suficientes',
                message: `Esta acción requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
            });
        }

        // El usuario tiene el rol adecuado, continuar
        next();
    };
};

module.exports = checkRole;
