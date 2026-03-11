const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const query = `
    SELECT 
        p.id as product_id, p.name as product_name, p.brand, p.barcode,
        pr.id as presentation_id, pr.name as presentation_name, 
        pr.quantity_value, pr.stock, pr.price
    FROM products p
    LEFT JOIN product_presentations pr ON p.id = pr.product_id
    ORDER BY p.id, pr.id;
`;

pool.query(query)
    .then(res => {
        console.log("Success:", res.rows);
    })
    .catch(err => {
        console.error("Query Error:", err.message);
    })
    .finally(() => pool.end());
