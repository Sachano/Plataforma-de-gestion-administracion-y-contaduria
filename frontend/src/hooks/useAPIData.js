import { useState, useEffect, useCallback } from 'react';
import { API_URL } from './api';
import { offlineQueue, secureOfflineFetch } from './offline';
import { cacheAPIResponse, getCachedData } from './localStorageDB';

// Hook principal para manejar datos con soporte offline
export const useAPIData = (endpoint, autoFetch = true) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [pendingCount, setPendingCount] = useState(offlineQueue.getQueueLength());

    const fullUrl = `${API_URL}${endpoint}`;

    // Actualizar estado de conexión
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Actualizar contador de peticiones pendientes
    useEffect(() => {
        const interval = setInterval(() => {
            setPendingCount(offlineQueue.getQueueLength());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Primero intentar obtener desde el servidor
            const response = await fetch(fullUrl, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const serverData = await response.json();
                setData(serverData);
                // Cachear datos localmente
                await cacheAPIResponse(endpoint, serverData);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (err) {
            // Si falla, intentar obtener desde caché local
            console.log('🌐 Usando datos locales caché:', endpoint);
            const cachedData = await getCachedData(endpoint);
            setData(cachedData);
            setError('Modo sin conexión - mostrando datos guardados');
        } finally {
            setLoading(false);
        }
    }, [endpoint, fullUrl]);

    // Mutaciones (POST, PUT, DELETE) con soporte offline
    const mutate = useCallback(async (method, body, id = null) => {
        const url = id ? `${fullUrl}/${id}` : fullUrl;
        
        const response = await secureOfflineFetch(url, {
            method: method.toUpperCase(),
            body: JSON.stringify(body)
        });

        // Refrescar datos después de mutación exitosa
        if (response.ok) {
            await fetchData();
        }

        return response;
    }, [fullUrl, fetchData]);

    const create = useCallback((body) => mutate('POST', body), [mutate]);
    const update = useCallback((id, body) => mutate('PUT', body, id), [mutate]);
    const remove = useCallback((id) => mutate('DELETE', null, id), [mutate]);

    // Cargar datos automáticamente al montar
    useEffect(() => {
        if (autoFetch) {
            fetchData();
        }
    }, [fetchData, autoFetch]);

    return {
        data,
        loading,
        error,
        isOffline,
        pendingCount,
        refetch: fetchData,
        create,
        update,
        delete: remove,
        mutate
    };
};