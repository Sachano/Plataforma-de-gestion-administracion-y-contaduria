const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runSchema() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'mi_empresa',
    password: 'Sachano',
    port: 5432
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos mi_empresa.');
    
    // Leer el sql
    const schemaPath = path.join(__dirname, 'src', 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Ejecutar el sql
    await client.query(sql);
    console.log('Esquema (schema.sql) aplicado exitosamente.');
    
  } catch (err) {
    console.error('Error aplicando el esquema:', err.message);
  } finally {
    await client.end();
  }
}

runSchema();
