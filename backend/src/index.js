// ============================================================================
// index.js — Archivo principal del servidor backend
// ============================================================================
// Este es el punto de entrada del backend. Aqui se configura:
// 1. Las variables de entorno (dotenv)
// 2. Los middlewares globales (CORS, JSON, cookies)
// 3. Las rutas de la API (/api/auth, /api/inventory, etc.)
// 4. Se inicia el servidor en el puerto configurado
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const os = require('os');

// Obtener IP local
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

// Configurar variables por defecto para el entorno de producción (Ejecutable)
// (El archivo .env no se empaqueta por seguridad, por ende se proveen fallbacks seguros)
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'yeni_trapiche_secure_jwt_secret_fallback_key';
}
if (!process.env.REGISTRATION_KEY) {
    process.env.REGISTRATION_KEY = 'admin123'; // Clave por defecto para registrar nuevo usuario
}

// Crear la aplicacion de Express
const app = express();

// Middlewares globales
// CORS: permite conexiones desde cualquier origen (necesario para red local)
app.use(cors({
    origin: true,  // Permitir cualquier origen en red local
    credentials: true
}));

// Parsear el body de las peticiones como JSON
app.use(express.json());

// Parsear las cookies de las peticiones
app.use(cookieParser());

// Registrar las rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/exchange-rates', require('./routes/exchange-rates'));

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';  // Escuchar en todas las interfaces de red

app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log('=========================================');
    console.log('✅ Servidor corriendo:');
    console.log('   - Local:   http://localhost:' + PORT);
    console.log('   - Red WiFi: http://' + localIP + ':' + PORT);
    console.log('=========================================');
    console.log('📱 Para conectar desde el MOVIL:');
    console.log('   Usa: http://' + localIP + ':' + PORT);
});
