// ============================================================================
// seed.js — Script para crear los usuarios iniciales del sistema
// ============================================================================
// Ejecutar con: node src/db/seed.js
//
// Este script crea la tabla de usuarios (si no existe) e inserta los
// usuarios predeterminados: admin y vendedor (seller).
//
// Si los usuarios ya existen, no los duplica (usa ON CONFLICT).
// ============================================================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');

// Usuarios predeterminados del sistema
const usuarios = [
    {
        username: 'admin',
        password: 'admin',
        full_name: 'Administrador',
        role: 'admin'
    },
    {
        username: 'user',
        password: 'user123',
        full_name: 'Vendedor',
        role: 'seller'
    }
];

const seed = async () => {
    try {
        console.log('🌱 Iniciando seed de usuarios...\n');

        // Crear la tabla de usuarios si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'seller' CHECK (role IN ('admin', 'seller')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Asegurarnos de que las columnas están allí (por si la tabla es de una versión vieja)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'seller'
        `);
        console.log('✅ Tabla "users" verificada/creada y columnas actualizadas');

        // Insertar cada usuario
        for (const user of usuarios) {
            // Encriptar la contraseña
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(user.password, salt);

            // Insertar o ignorar si ya existe (ON CONFLICT DO NOTHING)
            const result = await pool.query(
                `INSERT INTO users (username, password_hash, full_name, role)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (username) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    full_name = EXCLUDED.full_name,
                    role = EXCLUDED.role
                 RETURNING id, username, role`,
                [user.username, hash, user.full_name, user.role]
            );

            const created = result.rows[0];
            console.log(`   ✅ Usuario "${created.username}" (${created.role}) — ID: ${created.id}`);
        }

        console.log('\n🎉 Seed completado exitosamente!');
        console.log('\n📋 Credenciales:');
        console.log('   Admin    → usuario: admin  / contraseña: admin');
        console.log('   Vendedor → usuario: user   / contraseña: user123');

    } catch (err) {
        console.error('❌ Error durante el seed:', err);
    } finally {
        // Cerrar la conexión al terminar
        await pool.end();
        process.exit(0);
    }
};

seed();
