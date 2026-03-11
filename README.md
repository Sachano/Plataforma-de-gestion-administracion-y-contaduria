# 🏢 Plataforma de Gestión, Administración y Contaduría

Sistema integral diseñado para la gestión eficiente de inventario, ventas, deudas y contabilidad, con integración en tiempo real de tasas de cambio.

## 🚀 Características Principales

- 📦 **Gestión de Inventario**: Control total de productos, presentaciones y existencias con historial de movimientos.
- 🛒 **Punto de Venta (POS)**: Carrito de compras intuitivo con búsqueda por nombre o código de barras.
- 💱 **Equivalencias Monetarias**: Tasas en tiempo real (BCV y Binance P2P) con cálculo automático de promedio.
- 🧾 **Facturación**: Generación de facturas digitales (PDF/JPG) y registro histórico de ventas.
- 💳 **Control de Deudas**: Gestión de cuentas por cobrar (deudores) y pagar (proveedores) con historial de abonos.
- 📊 **Contabilidad**: Análisis visual de ventas mensuales y anuales.

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React.js, Vite, Vanilla CSS (Premium Design), Lucide Icons.
- **Backend**: Node.js, Express.js.
- **Base de Datos**: PostgreSQL.
- **APIs/Scraping**: Integración directa con `bcv.org.ve` y `Binance API`.

## ⚙️ Configuración y Ejecución

### 1. Requisitos Previos
- Node.js instalado.
- PostgreSQL en ejecución.

### 2. Instalación de Dependencias

Ejecutar en la raíz del proyecto:
```bash
# Instalar dependencias del Backend
cd backend && npm install

# Instalar dependencias del Frontend
cd ../frontend && npm install
```

### 3. Base de Datos
1. Crea una base de datos llamada `yeni_trapiche` en PostgreSQL.
2. Ejecuta el script de esquema ubicado en: `backend/src/db/schema.sql`.
3. Configura el archivo `backend/.env` con tus credenciales:
   ```env
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=yeni_trapiche
   ```

### 4. Ejecución
Para iniciar el proyecto en modo desarrollo, abre dos terminales:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---
*Desarrollado con ❤️ para la gestión de Donde Jenny.*
