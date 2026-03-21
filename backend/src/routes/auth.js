// ============================================================================
// auth.js (rutas) — Registro, login, logout y datos del usuario
// ============================================================================
// Este archivo maneja la autenticación de usuarios:
// 1. POST /register → Registrar un nuevo usuario (requiere clave especial)
// 2. POST /login    → Iniciar sesión (devuelve un token JWT en una cookie)
// 3. POST /logout   → Cerrar sesión (borra la cookie del token)
// 4. GET  /me       → Obtener datos del usuario actual (desde el token)
//
// Nota: Actualmente la autenticación está deshabilitada en el frontend.
//       Estas rutas siguen funcionando, pero el frontend no las usa.
// ============================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { loginLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// POST /register — Registrar un nuevo usuario
// ─────────────────────────────────────────────────────────────────────────────
// Requiere una clave especial en el header 'x-registration-key'.
// Esto evita que cualquiera pueda registrarse — solo quien tenga la clave.
// La clave se configura en el archivo .env como REGISTRATION_KEY.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { username, password, full_name } = req.body;
    const REGISTRATION_KEY = process.env.REGISTRATION_KEY;

    // Si no hay clave configurada, bloquear el registro completamente
    if (!REGISTRATION_KEY) {
        return res.status(403).json({ message: 'Registro deshabilitado en este entorno' });
    }

    // Verificar que la clave del header coincida con la configurada
    const providedKey = req.headers['x-registration-key'];
    if (!providedKey || providedKey !== REGISTRATION_KEY) {
        return res.status(403).json({ message: 'Clave de registro inválida' });
    }

    try {
        // Verificar si el usuario ya existe
        const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Encriptar la contraseña (bcrypt genera un "hash" que es imposible de revertir)
        // El número 10 es el "salt rounds" — mientras más alto, más seguro pero más lento
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insertar el nuevo usuario en la base de datos (rol por defecto: seller)
        const newUser = await pool.query(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role',
            [username, password_hash, full_name, 'seller']
        );

        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error('Error en registro:', err.message);
        res.status(500).json({ message: 'Error del servidor al registrar usuario' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /login — Iniciar sesión
// ─────────────────────────────────────────────────────────────────────────────
// 1. Busca el usuario por nombre
// 2. Compara la contraseña con el hash guardado
// 3. Si coincide, genera un token JWT y lo guarda en una cookie httpOnly
//    (httpOnly significa que JavaScript del navegador NO puede leer la cookie,
//     solo el servidor puede — esto es una medida de seguridad)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
    // Verificar que JWT_SECRET esté configurado
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET no está configurado en las variables de entorno');
        return res.status(500).json({ message: 'Error de configuración del servidor' });
    }

    const { username, password } = req.body;

    try {
        // Buscar el usuario en la base de datos
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        // Si no existe el usuario, devolver error genérico
        // (no decimos "usuario no encontrado" por seguridad)
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        // Comparar la contraseña ingresada con el hash guardado
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        // Crear el "payload" del token (datos que se guardan dentro del JWT)
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };

        // Generar el token JWT (expira en 15 minutos)
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

        // Generar el refresh token (expira en 7 días)
        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
            { expiresIn: '7d' }
        );

        // Guardar el token en una cookie segura
        res.cookie('token', accessToken, {
            httpOnly: true,                                    // No accesible desde JavaScript
            secure: process.env.NODE_ENV === 'production',     // Solo HTTPS en producción
            maxAge: 15 * 60 * 1000                          // 15 minutos en milisegundos
        });

        // Guardar el refresh token en una cookie separada
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000                 // 7 días
        });

        // Responder con los datos del usuario (sin la contraseña)
        res.json({
            message: 'Login exitoso',
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Error en login:', err.message);
        res.status(500).json({ message: 'Error del servidor al iniciar sesión' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /logout — Cerrar sesión
// ─────────────────────────────────────────────────────────────────────────────
// Simplemente borra la cookie que contiene el token.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.json({ message: 'Sesión cerrada exitosamente' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /refresh — Renovar el token de acceso usando el refresh token
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: 'No hay refresh token' });
    }

    try {
        // Verificar el refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');

        // Buscar el usuario
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        // Generar nuevos tokens
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };

        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const newRefreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
            { expiresIn: '7d' }
        );

        // Guardar nuevos tokens
        res.cookie('token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ message: 'Token renovado exitosamente' });
    } catch (err) {
        res.status(401).json({ message: 'Refresh token inválido o expirado' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /me — Obtener datos del usuario actual
// ─────────────────────────────────────────────────────────────────────────────
// Lee el token de la cookie, lo decodifica, y busca los datos del usuario.
// Si el token no existe o es inválido, devuelve error 401.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
    const token = req.cookies.token;

    // Si no hay token, el usuario no ha iniciado sesión
    if (!token) {
        return res.status(401).json({ message: 'No autenticado — inicia sesión primero' });
    }

    try {
        // Decodificar el token para obtener el ID del usuario
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar los datos del usuario (sin la contraseña)
        const result = await pool.query(
            'SELECT id, username, full_name, role FROM users WHERE id = $1',
            [decoded.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        // Si el token es inválido o expiró
        res.status(401).json({ message: 'Sesión inválida o expirada' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /profile — Actualizar perfil de usuario
// ─────────────────────────────────────────────────────────────────────────────
// Permite al usuario actualizar:
// - username (solo admin puede cambiar el de otros usuarios)
// - full_name
// - profile_picture (URL)
// - password (con verificación de contraseña actual)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
    const userId = req.user.user.id;
    const { username, full_name, profile_picture, current_password, new_password } = req.body;

    try {
        // Buscar el usuario actual
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Si quiere cambiar contraseña, verificar la actual
        if (new_password) {
            if (!current_password) {
                return res.status(400).json({ message: 'Debe ingresar la contraseña actual para cambiarla' });
            }
            const isMatch = await bcrypt.compare(current_password, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
            }
            // Encriptar la nueva contraseña
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(new_password, salt);
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, userId]);
        }

        // Si quiere cambiar username, verificar que no exista
        if (username && username !== user.username) {
            const usernameExists = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
            if (usernameExists.rows.length > 0) {
                return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
            }
        }

        // Actualizar los campos
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (username) {
            updates.push(`username = ${paramCount++}`);
            values.push(username);
        }
        if (full_name !== undefined) {
            updates.push(`full_name = ${paramCount++}`);
            values.push(full_name);
        }
        if (profile_picture !== undefined) {
            updates.push(`profile_picture = ${paramCount++}`);
            values.push(profile_picture);
        }

        if (updates.length > 0) {
            values.push(userId);
            await pool.query(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ${paramCount}`,
                values
            );
        }

        // Devolver datos actualizados
        const updatedUser = await pool.query(
            'SELECT id, username, full_name, role, profile_picture FROM users WHERE id = $1',
            [userId]
        );

        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error('Error en actualización de perfil:', err.message);
        res.status(500).json({ message: 'Error del servidor al actualizar perfil' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /profile/:id — Admin puede actualizar cualquier usuario
// ─────────────────────────────────────────────────────────────────────────────
// Solo el admin puede cambiar username, role y otros datos de otros usuarios
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile/:id', auth, async (req, res) => {
    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.user.user.id;
    const currentUserRole = req.user.user.role;
    const { username, full_name, profile_picture, role, current_password, new_password } = req.body;

    // Solo admin puede editar otros usuarios
    if (currentUserRole !== 'admin') {
        return res.status(403).json({ message: 'Solo el administrador puede editar otros usuarios' });
    }

    try {
        // Buscar el usuario objetivo
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
        const targetUser = result.rows[0];

        if (!targetUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Si está cambiando su propia contraseña (admin editándose a sí mismo)
        if (targetUserId === currentUserId && new_password) {
            if (!current_password) {
                return res.status(400).json({ message: 'Debe ingresar la contraseña actual para cambiarla' });
            }
            const isMatch = await bcrypt.compare(current_password, targetUser.password_hash);
            if (!isMatch) {
                return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
            }
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(new_password, salt);
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, targetUserId]);
        }

        // Si quiere cambiar username, verificar que no exista
        if (username && username !== targetUser.username) {
            const usernameExists = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, targetUserId]);
            if (usernameExists.rows.length > 0) {
                return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
            }
        }

        // Actualizar los campos
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (username) {
            updates.push(`username = ${paramCount++}`);
            values.push(username);
        }
        if (full_name !== undefined) {
            updates.push(`full_name = ${paramCount++}`);
            values.push(full_name);
        }
        if (profile_picture !== undefined) {
            updates.push(`profile_picture = ${paramCount++}`);
            values.push(profile_picture);
        }
        if (role && (targetUserId !== currentUserId)) { // Admin no puede cambiar su propio rol
            updates.push(`role = ${paramCount++}`);
            values.push(role);
        }

        if (updates.length > 0) {
            values.push(targetUserId);
            await pool.query(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ${paramCount}`,
                values
            );
        }

        // Devolver datos actualizados
        const updatedUser = await pool.query(
            'SELECT id, username, full_name, role, profile_picture FROM users WHERE id = $1',
            [targetUserId]
        );

        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error('Error en actualización de usuario:', err.message);
        res.status(500).json({ message: 'Error del servidor al actualizar usuario' });
    }
});

module.exports = router;
