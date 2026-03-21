-- ============================================================================
-- schema.sql — Esquema de la base de datos para la plataforma de gestión
-- ============================================================================
-- Este archivo define TODAS las tablas que usa la aplicación.
-- Para ejecutarlo: psql -U tu_usuario -d tu_base_de_datos -f schema.sql
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. USUARIOS Y AUTENTICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla de usuarios del sistema. Cada usuario tiene un rol que determina
-- qué acciones puede realizar (admin = todo, seller = ventas e inventario).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,   -- Nombre de usuario para login
    password_hash TEXT NOT NULL,             -- Contraseña encriptada con bcrypt
    full_name VARCHAR(255),                 -- Nombre completo (opcional)
    profile_picture TEXT,                  -- URL de foto de perfil
    role VARCHAR(50) DEFAULT 'seller'       -- Rol: 'admin' o 'seller'
        CHECK (role IN ('admin', 'seller')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EQUIVALENCIAS MONETARIAS
-- ─────────────────────────────────────────────────────────────────────────────
-- Guarda las tasas de cambio (BCV, Binance, personalizadas).
-- Algunas son calculadas automáticamente (is_computed = TRUE),
-- otras las ingresa el usuario manualmente.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
    id VARCHAR(50) PRIMARY KEY,          -- ID único (ej: 'bcv', 'binance', 'cop')
    name VARCHAR(100) NOT NULL,          -- Nombre visible (ej: 'BCV', 'Pesos Colombianos')
    value DECIMAL(15, 2) NOT NULL,       -- Valor de la tasa de cambio
    is_deletable BOOLEAN DEFAULT TRUE,   -- Si el usuario puede eliminarla
    is_computed BOOLEAN DEFAULT FALSE,   -- Si se calcula automáticamente (ej: promedio)
    currency_group VARCHAR(50) NOT NULL, -- Grupo de moneda ('usd', 'cop', etc.)
    custom_name VARCHAR(100)             -- Nombre personalizado (opcional)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INVENTARIO Y ALMACENAMIENTO
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabla de productos (ej: "Jabón Azul", "Harina Pan")
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,               -- ID auto-incremental
    name VARCHAR(255) NOT NULL,          -- Nombre del producto
    brand VARCHAR(100),                  -- Marca (opcional)
    barcode VARCHAR(100),                -- Código de barras (opcional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Fecha de creación
);

-- Presentaciones de cada producto (ej: Caja → Tira → Unidad)
-- Cada producto puede tener múltiples presentaciones jerárquicas.
CREATE TABLE IF NOT EXISTS product_presentations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,          -- Nombre (ej: 'Caja', 'Unidad')
    quantity_type VARCHAR(50),           -- Tipo de cantidad (opcional)
    quantity_value DECIMAL(10, 2),       -- Cuántas unidades base contiene
    stock INTEGER DEFAULT 0,            -- Cantidad en inventario (unidades base)
    price DECIMAL(15, 2) NOT NULL,      -- Precio de venta de esta presentación
    image_url TEXT                       -- URL de imagen (uso futuro)
);

-- Historial de surtidos (cada vez que llega mercancía)
CREATE TABLE IF NOT EXISTS inventory_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    presentation_id INTEGER REFERENCES product_presentations(id) ON DELETE CASCADE,
    quantity_added INTEGER NOT NULL,     -- Unidades base agregadas
    cost DECIMAL(15, 2),                -- Costo del surtido (uso futuro)
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT                           -- Nota descriptiva del surtido
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FACTURAS
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabla principal de facturas
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,          -- ID de la factura (generado en frontend)
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_usd DECIMAL(15, 2) NOT NULL   -- Total en dólares
);

-- Items dentro de cada factura
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    presentation_id INTEGER REFERENCES product_presentations(id),
    presentation_name VARCHAR(255),      -- Nombre de la presentación (se guarda por si se elimina el producto)
    unit_price DECIMAL(15, 2) NOT NULL,  -- Precio unitario al momento de la venta
    quantity INTEGER NOT NULL            -- Cantidad vendida
);

-- Tasas de cambio vigentes al momento de cada factura (uso futuro)
CREATE TABLE IF NOT EXISTS invoice_exchange_rates (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
    rate_id VARCHAR(50),                 -- ID de la tasa (ej: 'bcv')
    rate_value DECIMAL(15, 2) NOT NULL   -- Valor de la tasa en ese momento
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DEUDAS Y DEUDORES
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabla de deudas y deudores
-- type = 'deuda' → alguien nos debe (o nosotros debemos)
-- type = 'deudor' → un cliente que compra a crédito (fiado)
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deuda', 'deudor')),
    name VARCHAR(255) NOT NULL,          -- Nombre del deudor o descripción de la deuda
    description TEXT,                    -- Detalle adicional (opcional)
    amount DECIMAL(15, 2) DEFAULT 0,     -- Monto pendiente actual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de pagos (abonos) y movimientos de cada deuda
CREATE TABLE IF NOT EXISTS debt_history (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,      -- Monto del pago o movimiento
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT                            -- Nota del pago (ej: "Abono parcial")
);
