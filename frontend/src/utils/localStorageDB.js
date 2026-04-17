// IndexedDB wrapper para almacenamiento local de datos
const DB_NAME = 'BodegaDB';
const DB_VERSION = 1;
const STORES = {
    products: 'products',
    invoices: 'invoices',
    debts: 'debts',
    rates: 'exchange_rates',
    sync_state: 'sync_state'
};

class LocalDB {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear almacenes
                if (!db.objectStoreNames.contains(STORES.products)) {
                    db.createObjectStore(STORES.products, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.invoices)) {
                    db.createObjectStore(STORES.invoices, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.debts)) {
                    db.createObjectStore(STORES.debts, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.rates)) {
                    db.createObjectStore(STORES.rates, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORES.sync_state)) {
                    db.createObjectStore(STORES.sync_state, { keyPath: 'key' });
                }
            };
        });
    }

    async getAll(storeName) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async putAll(storeName, items) {
        await this.initPromise;
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        for (const item of items) {
            store.put(item);
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async delete(storeName, id) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });
    }
}

export const localDB = new LocalDB();

// Helper para cachear respuestas de API
export const cacheAPIResponse = async (endpoint, data) => {
    const storeMap = {
        '/api/inventory': STORES.products,
        '/api/invoices': STORES.invoices,
        '/api/debts': STORES.debts,
        '/api/exchange-rates': STORES.rates
    };

    const store = storeMap[endpoint];
    if (store && Array.isArray(data)) {
        await localDB.putAll(store, data);
    }

    // Guardar timestamp de última sincronización
    await localDB.put(STORES.sync_state, {
        key: endpoint,
        lastSync: new Date().toISOString()
    });
};

// Helper para obtener datos desde caché
export const getCachedData = async (endpoint) => {
    const storeMap = {
        '/api/inventory': STORES.products,
        '/api/invoices': STORES.invoices,
        '/api/debts': STORES.debts,
        '/api/exchange-rates': STORES.rates
    };

    const store = storeMap[endpoint];
    if (store) {
        return await localDB.getAll(store);
    }
    return [];
};