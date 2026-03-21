const { Client } = require('pg');

async function createDb() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'Sachano',
    port: 5432
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='mi_empresa'");
    if (res.rows.length === 0) {
      console.log('Creando base de datos mi_empresa...');
      await client.query('CREATE DATABASE mi_empresa');
      console.log('Base de datos mi_empresa creada con éxito.');
    } else {
      console.log('La base de datos mi_empresa ya existe.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

createDb();
