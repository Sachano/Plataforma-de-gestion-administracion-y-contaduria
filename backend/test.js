const pool = require('./src/db'); pool.query('SELECT * FROM users WHERE username = $1', ['admin']).then(res => console.log('Query result:', res)).catch(console.error);
