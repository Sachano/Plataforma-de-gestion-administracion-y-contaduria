# Documentación del Sistema

---

## 1. Información General

### Nombre del Proyecto
**Sistema de Gestión Empresarial**

### Descripción
Sistema integral de gestión empresarial para una empresa o negocio. La plataforma permite administrar inventario, facturación, deudas de clientes, contabilidad y equivalencias monetarias con tasas de cambio en tiempo real.

### Destinado a
- **Usuario principal:** Propietario del negocio
- **Tipo de negocio:** Empresa / Negocio (venta de productos al mayor y detal)
- **Ubicación:** Venezuela
- **Modo actual:** Single-user (sin autenticación)

### Tecnología
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **APIs externas:** BCV (Banco Central de Venezuela), Binance P2P

---

## 2. Arquitectura del Sistema

### Estructura de Archivos

```
├── backend/
│   ├── src/
│   │   ├── routes/          # Endpoints de API
│   │   │   ├── auth.js      # Autenticación (deshabilitado)
│   │   │   ├── inventory.js # Gestión de inventario
│   │   │   ├── invoices.js  # Facturación
│   │   │   ├── debts.js     # Deudas y deudores
│   │   │   └── exchange-rates.js # Tasas de cambio
│   │   ├── middleware/      # Middlewares
│   │   │   ├── auth.js      # Validación JWT
│   │   │   └── validate.js  # Validación Zod
│   │   ├── db/              # Base de datos
│   │   ├── schemas.js       # Esquemas de validación
│   │   └── utils/           # Utilidades
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── modules/          # Módulos de la aplicación
│   │   │   ├── Auth/         # Login (deshabilitado)
│   │   │   ├── Storage/      # Inventario
│   │   │   ├── Invoicing/    # Facturación
│   │   │   ├── Accounting/   # Contabilidad
│   │   │   ├── Cart/         # Carrito de compras
│   │   │   ├── Debts/        # Deudas
│   │   │   ├── Home/         # Inicio
│   │   │   └── MonetaryEquivalencies/ # Equivalencias monetarias
│   │   ├── components/       # Componentes compartidos
│   │   ├── context/          # Contextos de React
│   │   └── assets/          # Recursos estáticos
│   └── package.json
│
├── docker-compose.yml       # Orquestación Docker
└── README.md
```

---

## 3. Módulos del Sistema

### 3.1 Módulo de Inicio (Home)
**Archivo:** `frontend/src/modules/Home/HomeModule.jsx`

| Submódulo | Descripción |
|-----------|-------------|
| Dashboard | Vista principal con estadísticas del negocio |
| Resumen | Muestra totales de inventario, ventas, deudas |

---

### 3.2 Módulo de Inventario (Storage)
**Archivo:** `frontend/src/modules/Storage/StorageModule.jsx`

| Submódulo | Descripción |
|-----------|-------------|
| InventoryViewSubmodule | Vista tabular del inventario con presentaciones |
| ProductDefinitionSubmodule | Creación y edición de productos |
| RestockSubmodule | Recarga de inventario (entrada de stock) |
| PackagingConfig | Configuración de presentaciones/empaques |
| EditProductModal | Modal para editar productos |

**Funcionalidades:**
- CRUD de productos
- Gestión de presentaciones (múltiples tamaños/precios)
- Código de barras
- Historial de movimientos
- Control de stock por presentación

---

### 3.3 Módulo de Facturación (Invoicing)
**Archivo:** `frontend/src/modules/Invoicing/InvoicingModule.jsx`

| Submódulo | Descripción |
|-----------|-------------|
| InvoiceList | Lista de facturas emitidas |
| InvoiceDetail | Detalle de factura específica |

**Funcionalidades:**
- Creación de facturas
- Deducción automática de inventario
- Registro de ventas en USD
- Historial de facturas

---

### 3.4 Módulo de Carrito (Cart)
**Archivo:** `frontend/src/modules/Cart/CartModule.jsx`

| Submódulo | Descripción |
|-----------|-------------|
| CheckoutOverlay | Proceso de checkout/venta |

**Funcionalidades:**
- Agregar productos al carrito
- Seleccionar presentación
- Calcular total en USD
- Finalizar venta (genera factura)
- Generar deuda (si cliente no paga)

---

### 3.5 Módulo de Deudas (Debts)
**Archivo:** `frontend/src/modules/Debts/DebtsModule.jsx`

| Submódulo | Descripción |
|-----------|-------------|
| DebtList | Lista de deudas y deudores |
| DebtDetail | Detalle de deuda con historial de abonos |

**Funcionalidades:**
- Registro de deudas (clientes que deben)
- Registro de deudores (personas que deben)
- Abonos parciales
- Historial de pagos
- Convertir factura a deuda

---

### 3.6 Módulo de Contabilidad (Accounting)
**Archivo:** `frontend/src/modules/Accounting/AccountingModule.jsx`

| Submódulo | Descripción |
|-----------|-------------|
| FinancialSummary | Resumen financiero |
| Reports | Reportes contables |

**Funcionalidades:**
- Balance general
- Estados de cuenta
- Reportes de ventas
- Control de ingresos/egresos

---

### 3.7 Módulo de Equivalencias Monetarias
**Archivo:** `frontend/src/modules/MonetaryEquivalencies/MonetaryEquivalenciesModule.jsx`

| Submódulo | Descripción |
|-----------|-------------|
| RateManager | Gestión de tasas de cambio |
| Converter | Conversor de monedas |

**Funcionalidades:**
- Tasas manuales (USD, COP, EUR)
- Tasas automáticas (BCV, Binance)
- Promedio de tasas
- Conversor de monedas
- Actualización en tiempo real

---

## 4. Endpoints de API

### Inventario
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/inventory` | Listar productos |
| POST | `/api/inventory` | Crear producto |
| PUT | `/api/inventory/:id` | Actualizar producto |
| PUT | `/api/inventory/:id/restock` | Recargar stock |
| DELETE | `/api/inventory/:id` | Eliminar producto |

### Facturas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/invoices` | Listar facturas |
| POST | `/api/invoices` | Crear factura |

### Deudas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/debts` | Listar deudas/deudores |
| POST | `/api/debts` | Crear deuda |
| PATCH | `/api/debts/:id/abono` | Registrar abono |
| DELETE | `/api/debts/:id` | Eliminar deuda |
| POST | `/api/debts/invoice` | Factura como deuda |

### Tasas de Cambio
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/exchange-rates` | Listar tasas |
| GET | `/api/exchange-rates/live` | Obtener tasas en vivo |

---

## 5. Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `products` | Catálogo de productos |
| `product_presentations` | Presentaciones de productos |
| `inventory_history` | Historial de movimientos |
| `invoices` | Facturas emitidas |
| `invoice_items` | Items de facturas |
| `debts` | Deudas y deudores |
| `debt_history` | Historial de abonos |
| `users` | Usuarios del sistema (futuro) |
| `audit_logs` | Logs de auditoría (futuro) |

---

## 6. Configuración

### Variables de Entorno (Backend)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mi_empresa
DB_USER=postgres
DB_PASSWORD=Sachano
PORT=3001
JWT_SECRET=mi_empresa_secret_2026_safe_key
```

### Puertos

| Servicio | Puerto |
|----------|--------|
| Frontend (Vite) | 5173 |
| Backend (Express) | 3001 |
| PostgreSQL | 5432 |

---

## 7. Cómo Iniciar

### Desarrollo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Producción (Docker)

```bash
docker-compose up --build
```

---

## 8. Características Especiales

### Tasas de Cambio en Tiempo Real
- **BCV:** Scraping de bcv.org.ve
- **Binance:** API P2P para USDT/VES
- **Promedio:** Calcula promedio BCV + Binance

### Generación Automática de ID de Factura
- Formato: `INV-YYYYMMDD-HHMMSS`

### Deducción Automática de Inventario
- Al generar factura, descuenta stock automáticamente

---

## 9. Notas de Uso

- **Modo actual:** Single-user sin autenticación
- **Moneda base:** USD (Dólar estadounidense)
- **Monedas adicionales:** COP (Peso colombiano), VES (Bolívar)
- **Empresa desarrolladora:** Sachano Tech

---

*Documentación generada automáticamente - 14 de Marzo de 2026*
