const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'src', 'db', 'security_update.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration Error:", err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
