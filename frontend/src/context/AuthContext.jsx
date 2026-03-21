import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/auth/me', {
                headers: { 'Accept': 'application/json' },
                credentials: 'include'
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await res.json();

            if (res.ok) {
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, message: data.message || 'Error al iniciar sesión' };
            }
        } catch (err) {
            console.error('Login fetch error:', err);
            if (err.name === 'AbortError') {
                return { success: false, message: 'Tiempo de espera agotado. Intenta de nuevo.' };
            }
            return { success: false, message: 'Error de conexión: ' + err.message };
        }
    };

    const logout = async () => {
        await fetch('http://localhost:3001/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
