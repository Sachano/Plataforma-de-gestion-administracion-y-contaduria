require('dotenv').config();
const pool = require('./src/db');
const initDb = pool.initDb;
const bcrypt = require('bcryptjs');

async function createUsers() {
    await initDb();

    const adminUsername = 'admin';
    const adminPassword = 'admin';
    const adminFullName = 'Administrador';
    const adminRole = 'admin';

    const sellerUsername = 'user';
    const sellerPassword = 'user123';
    const sellerFullName = 'Vendedor';
    const sellerRole = 'seller';

    try {
        const existingAdmin = await pool.query('SELECT id FROM users WHERE username = ?', [adminUsername]);

        if (!existingAdmin.rows || existingAdmin.rows.length === 0) {
            const adminSalt = await bcrypt.genSalt(10);
            const adminHash = await bcrypt.hash(adminPassword, adminSalt);

            await pool.query(
                'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
                [adminUsername, adminHash, adminFullName, adminRole]
            );
            console.log('Admin user created: ' + adminUsername + ' / ' + adminPassword + ' (role: ' + adminRole + ')');
        } else {
            console.log('Admin user already exists: ' + adminUsername);
        }

        const existingSeller = await pool.query('SELECT id FROM users WHERE username = ?', [sellerUsername]);

        if (!existingSeller.rows || existingSeller.rows.length === 0) {
            const sellerSalt = await bcrypt.genSalt(10);
            const sellerHash = await bcrypt.hash(sellerPassword, sellerSalt);

            await pool.query(
                'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
                [sellerUsername, sellerHash, sellerFullName, sellerRole]
            );
            console.log('Seller user created: ' + sellerUsername + ' / ' + sellerPassword + ' (role: ' + sellerRole + ')');
        } else {
            console.log('Seller user already exists: ' + sellerUsername);
        }

        console.log('\n✅ Users created successfully!');
    } catch (err) {
        console.error('Error creating users:', err.message);
    }
}

createUsers();
