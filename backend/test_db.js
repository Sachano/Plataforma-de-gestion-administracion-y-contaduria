const pool = require('./src/db');
const bcrypt = require('bcryptjs');

async function test() {
    console.log('=== TEST DE LOGIN ===');
    
    // Test 1: SELECT con parámetro Postgres
    const q = 'SELECT * FROM users WHERE username = $1';
    console.log('\n[Test 1] Query original:', q);
    
    try {
        const result = await pool.query(q, ['admin']);
        console.log('[Test 1] Filas encontradas:', result.rows.length);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('[Test 1] Usuario:', user.username, '| Rol:', user.role);
            
            // Test 2: Verificar contraseña
            const isMatch = await bcrypt.compare('admin', user.password_hash);
            console.log('[Test 2] Contraseña "admin" coincide:', isMatch);
        } else {
            console.log('[!] No se encontró el usuario admin en la DB');
        }
    } catch (err) {
        console.error('[ERROR]', err.message);
    }
    
    process.exit(0);
}

test();
