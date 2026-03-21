// ============================================================================
// rateLimiter.js — Middleware para prevenir ataques de fuerza bruta
// ============================================================================
// Este middleware limita el número de peticiones que un usuario puede hacer
// a endpoints específicos (como el login).
//
// Rate Limiting aplicado:
// - Login: 5 intentos cada 15 minutos por IP
// ============================================================================

const rateLimit = require('express-rate-limit');

// Rate limiter para el endpoint de login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por ventana por IP
    message: {
        error: 'Demasiados intentos de inicio de sesión',
        message: 'Por favor, espera 15 minutos antes de intentar nuevamente.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false // Contar también los intentos exitosos para seguridad
});

// Rate limiter general para la API
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // 100 peticiones por minuto por IP
    message: {
        error: 'Demasiadas peticiones',
        message: 'Por favor, reduce la frecuencia de tus peticiones.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    apiLimiter
};
