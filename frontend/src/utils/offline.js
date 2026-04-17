import { API_URL } from './api';

// Cola de peticiones offline
const REQUEST_QUEUE_KEY = 'offline_request_queue';
const SYNC_INTERVAL = 5000; // 5 segundos

class OfflineQueue {
    constructor() {
        this.queue = this.loadQueue();
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.init();
    }

    init() {
        // Detectar cambios de conexión
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });

        // Procesar cola periódicamente
        setInterval(() => this.processQueue(), SYNC_INTERVAL);
    }

    loadQueue() {
        try {
            const stored = localStorage.getItem(REQUEST_QUEUE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    saveQueue() {
        localStorage.setItem(REQUEST_QUEUE_KEY, JSON.stringify(this.queue));
    }

    async enqueue(request) {
        const queueItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            ...request,
            timestamp: new Date().toISOString(),
            retries: 0
        };

        this.queue.push(queueItem);
        this.saveQueue();

        // Intentar procesar inmediatamente si hay conexión
        if (this.isOnline) {
            await this.processQueue();
        }

        return queueItem.id;
    }

    async processQueue() {
        if (this.isSyncing || !this.isOnline || this.queue.length === 0) return;

        this.isSyncing = true;
        const failed = [];

        for (const item of this.queue) {
            try {
                const response = await fetch(item.url, {
                    method: item.method,
                    headers: item.headers || {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: item.body ? JSON.stringify(item.body) : undefined
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                console.log('✅ Petición sincronizada:', item.url);
            } catch (err) {
                item.retries++;
                if (item.retries < 5) {
                    failed.push(item);
                    console.log(`⏳ Reintentando petición (${item.retries}/5):`, item.url);
                } else {
                    console.error('❌ Petición descartada después de 5 intentos:', item.url);
                }
            }
        }

        this.queue = failed;
        this.saveQueue();
        this.isSyncing = false;
    }

    getQueueLength() {
        return this.queue.length;
    }

    clearQueue() {
        this.queue = [];
        this.saveQueue();
    }
}

export const offlineQueue = new OfflineQueue();

// Wrapper para fetch que usa la cola automáticamente
export const offlineFetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());

    // Si es operación de escritura y estamos offline, encolar
    if (isWriteOperation && !navigator.onLine) {
        await offlineQueue.enqueue({
            url,
            method: method.toUpperCase(),
            headers: options.headers,
            body: options.body ? JSON.parse(options.body) : undefined
        });
        return {
            ok: true,
            offline: true,
            message: 'Guardado localmente, se sincronizará cuando haya conexión'
        };
    }

    // Si estamos online, intentar normalmente
    try {
        return await fetch(url, options);
    } catch (err) {
        // Si falla y es escritura, encolar
        if (isWriteOperation) {
            await offlineQueue.enqueue({
                url,
                method: method.toUpperCase(),
                headers: options.headers,
                body: options.body ? JSON.parse(options.body) : undefined
            });
            return {
                ok: true,
                offline: true,
                message: 'Guardado localmente, se sincronizará cuando haya conexión'
            };
        }
        throw err;
    }
};

// Wrapper para secureFetch con funcionalidad offline
export const secureOfflineFetch = (url, options = {}) => {
    return offlineFetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...options.headers,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    });
};