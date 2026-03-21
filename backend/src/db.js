// ============================================================================
// db.js — Capa de compatibilidad SQLite (Traductor Mágico)
// ============================================================================
// TRADUCTOR ACTIVO: El backend entero y sus rutas creen que están
// usando PostgreSQL. Este archivo intercepta las llamadas, traduce el SQL
// y lo ejecuta en SQLite ("database.sqlite") automáticamente.
// ============================================================================

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

let DB_PATH;
try {
    const { app } = require('electron');
    if (app && app.isPackaged) {
        // En producción (.exe), AppData es el único lugar donde Windows permite escribir archivos
        DB_PATH = path.join(app.getPath('userData'), 'database.sqlite');
    } else {
        DB_PATH = path.join(__dirname, '..', 'database.sqlite');
    }
} catch (e) {
    // Fallback normal si node.js ejecuta esto directamente (scripts) o no hay Electron cargado.
    DB_PATH = path.join(__dirname, '..', 'database.sqlite');
}

let dbInstance = null;
let isInitializing = false;
let initPromise = null;

// Obtener la instancia de SQLite, inicializándola solo la primera vez
async function getDb() {
    if (dbInstance) return dbInstance;
    if (isInitializing) return initPromise;

    isInitializing = true;
    initPromise = (async () => {
        try {
            if (!fs.existsSync(DB_PATH)) {
                fs.writeFileSync(DB_PATH, '');
            }

            const db = await sqlite.open({
                filename: DB_PATH,
                driver: sqlite3.Database
            });

            // Requerido en SQLite para borrar en cascada (ON DELETE CASCADE)
            await db.run('PRAGMA foreign_keys = ON');
            await createTables(db);

            dbInstance = db;
            isInitializing = false;
            console.log('✅ Base de datos SQLite operando en modo Translator =>', DB_PATH);
            return db;
        } catch (error) {
            console.error('❌ Error fatal al iniciar SQLite:', error);
            throw error;
        }
    })();
    return initPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Núcleo del Traductor (Postgres -> SQLite)
// ─────────────────────────────────────────────────────────────────────────────
async function executeQuery(text, originalParams = []) {
    const db = await getDb();

    let sqliteQuery = text;
    let flatParams = [];
    const params = Array.isArray(originalParams) ? [...originalParams] : [];

    // 1. Manejar PostgreSQL Arrays y "ANY($x)" (Ej: id = ANY($1))
    // SQLite no soporta "ANY(array)", necesita "IN (?, ?, ...)"
    for (let i = 0; i < params.length; i++) {
        let val = params[i];
        let pgParamMarker = `\\$${i + 1}`;

        // Expresión regular para encontrar "= ANY($n)" o "ANY ($n)"
        const anyRegex = new RegExp(`=\\s*ANY\\s*\\(\\s*${pgParamMarker}\\s*\\)`, 'gi');

        if (anyRegex.test(sqliteQuery) && Array.isArray(val)) {
            if (val.length === 0) {
                // Un IN vacío crashea SQLite. Mentimos pasando IN (NULL) para que no matchee
                sqliteQuery = sqliteQuery.replace(anyRegex, `IN (NULL)`);
            } else {
                const placeholders = val.map(() => '?').join(',');
                sqliteQuery = sqliteQuery.replace(anyRegex, `IN (${placeholders})`);
                flatParams.push(...val);
            }
        } else {
            flatParams.push(val);
        }
    }

    // 2. Reemplazar todos los "$1", "$2" restantes por "?" para SQLite
    // Esto convierte de Postgres a SQLite binding parameters.
    sqliteQuery = sqliteQuery.replace(/\$\d+/g, '?');

    // 3. Determinar el método de ejecución (all vs run)
    // Postgres siempre devuelve 'rows', SQLite usa db.all para SELECT/RETURNING
    // y db.run para INSERT/UPDATE/DELETE solos.
    const isSelectOrReturning = sqliteQuery.trim().toUpperCase().startsWith('SELECT') ||
        sqliteQuery.toUpperCase().includes('RETURNING');

    try {
        if (isSelectOrReturning) {
            const rows = await db.all(sqliteQuery, flatParams);
            return { rows: rows, rowCount: rows.length };
        } else {
            const result = await db.run(sqliteQuery, flatParams);
            // Result en SQLite tiene "changes" y "lastID"
            return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastID };
        }
    } catch (err) {
        console.error('❌ SQL Translation Error:', err);
        console.error(`=> Original: ${text}`);
        console.error(`=> SQLite:   ${sqliteQuery}`);
        console.error(`=> Params:   `, flatParams);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Objeto Pool Simulado
// Engañamos a Express para que crea que somos PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
const pool = {
    // Para rutas que usan pool.query()
    query: executeQuery,

    // Para rutas que usan transacciones (pool.connect())
    connect: async () => {
        const db = await getDb();
        let inTransaction = false;

        return {
            query: async (text, params) => {
                // Manejar transacciones manualmente
                if (text.trim().toUpperCase() === 'BEGIN') {
                    inTransaction = true;
                    return { rows: [], rowCount: 0 };
                }
                if (text.trim().toUpperCase() === 'COMMIT') {
                    inTransaction = false;
                    return { rows: [], rowCount: 0 };
                }
                if (text.trim().toUpperCase() === 'ROLLBACK') {
                    inTransaction = false;
                    return { rows: [], rowCount: 0 };
                }

                return executeQuery(text, params);
            },
            // Las transacciones en SQLite operan en el mismo archivo secuencialmente
            release: () => { /* No-op */ }
        };
    },

    end: async () => {
        if (dbInstance) await dbInstance.close();
    }
};

pool.initDb = getDb;

// ─────────────────────────────────────────────────────────────────────────────
// Creación de las tablas (Schema SQLite)
// ─────────────────────────────────────────────────────────────────────────────
async function createTables(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            profile_picture TEXT,
            role TEXT DEFAULT 'seller' CHECK(role IN ('admin', 'seller')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS exchange_rates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            value REAL NOT NULL,
            is_deletable INTEGER DEFAULT 1,
            is_computed INTEGER DEFAULT 0,
            currency_group TEXT NOT NULL,
            custom_name TEXT
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,
            barcode TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS product_presentations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            quantity_type TEXT,
            quantity_value REAL,
            stock INTEGER DEFAULT 0,
            price REAL NOT NULL,
            image_url TEXT
        );
        CREATE TABLE IF NOT EXISTS inventory_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            presentation_id INTEGER REFERENCES product_presentations(id) ON DELETE CASCADE,
            quantity_added INTEGER NOT NULL,
            cost REAL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            note TEXT
        );
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            total_usd REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id),
            presentation_id INTEGER REFERENCES product_presentations(id),
            presentation_name TEXT,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invoice_exchange_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
            rate_id TEXT,
            rate_value REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS debts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('deuda', 'deudor')),
            name TEXT NOT NULL,
            description TEXT,
            amount REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS debt_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
            amount REAL NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            note TEXT
        );
    `);
}

// Iniciar pasiva (warm-up)
getDb().catch(console.error);

module.exports = pool;
