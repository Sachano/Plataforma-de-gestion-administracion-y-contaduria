# Plataforma Donde Jenny

Este proyecto está dividido en dos partes principales que conviven en este repositorio:

1. **Frontend**: Aplicación en React + Vite.
2. **Backend**: API REST en Node.js + Express con base de datos PostgreSQL.

---

## 🖥 Frontend

Para correr el frontend localmente:

```bash
cd frontend
npm install
npm run dev
```

El frontend se levantará por defecto en `http://localhost:5173`. Para más detalles sobre dependencias o estructura, revisar `frontend/package.json`.

---

## ⚙️ Backend

Para configurar y correr el backend:

```bash
cd backend
npm install
```

Configurar variables de entorno:
1. Copia `.env.example` a `.env` dentro de `backend/`.
2. Actualiza `DB_USER` y `DB_PASSWORD` según tu configuración local de PostgreSQL.
3. Asegúrate de haber creado la base de datos `yeni_trapiche`.
4. Importa el esquema SQL ubicado en `backend/src/db/schema.sql`.

Correr el servidor:

```bash
npm run dev
```

El servidor arrancará en `http://localhost:3001` con Nodemon (se reiniciará automáticamente al hacer cambios en el código de backend).
