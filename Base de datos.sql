-- Esquema de base de datos para la plataforma Donde Jenny

-- 1. Equivalencias Monetarias
CREATE TABLE IF NOT EXISTS exchange_rates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    value DECIMAL(15, 2) NOT NULL,
    is_deletable BOOLEAN DEFAULT TRUE,
    is_computed BOOLEAN DEFAULT FALSE,
    currency_group VARCHAR(50) NOT NULL,
    custom_name VARCHAR(100)
);

-- 2. Inventario y Almacenamiento
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    barcode VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_presentations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    quantity_type VARCHAR(50),
    quantity_value DECIMAL(10, 2),
    stock INTEGER DEFAULT 0,
    price DECIMAL(15, 2) NOT NULL,
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS inventory_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    presentation_id INTEGER REFERENCES product_presentations(id) ON DELETE CASCADE,
    quantity_added INTEGER NOT NULL,
    cost DECIMAL(15, 2),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

-- 3. Cuentas y Facturas
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_usd DECIMAL(15, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    presentation_id INTEGER REFERENCES product_presentations(id),
    presentation_name VARCHAR(255),
    unit_price DECIMAL(15, 2) NOT NULL,
    quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_exchange_rates (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
    rate_id VARCHAR(50),
    rate_value DECIMAL(15, 2) NOT NULL
);

-- 4. Deudas y Deudores
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deuda', 'deudor')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debt_history (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);
