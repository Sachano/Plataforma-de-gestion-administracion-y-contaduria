# Backend - Donde Jenny

Este es el servidor Node.js/Express para la plataforma de gestión "Donde Jenny".
Provee una API REST conectada a una base de datos PostgreSQL.

## Configuración inicial

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar base de datos:
   - Copia `.env.example` a `.env`
   - Configura tus credenciales (`DB_USER`, `DB_PASSWORD`) de PostgreSQL local.
   - Crea una base de datos llamada `yeni_trapiche` en PostgreSQL.
   - Ejecuta el script SQL `src/db/schema.sql` en tu base de datos para crear las tablas.

3. Correr el servidor:
   ```bash
   npm run dev
   ```

El servidor correrá en `http://localhost:3001` y se reiniciará automáticamente al cambiar código.
