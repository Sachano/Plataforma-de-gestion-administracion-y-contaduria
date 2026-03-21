import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Loader2 } from 'lucide-react';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.message);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Error de conexión con el servidor: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <img src="../../assets/logo.jpg" alt="Logo" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                    <h1>Mi Empresa</h1>
                    <p>Sistema de Gestión Empresarial</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="login-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="username">Usuario</label>
                        <div className="input-with-icon">
                            <User size={18} />
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingresa tu usuario"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="btn-login">
                        {isSubmitting ? (
                            <><Loader2 className="animate-spin" size={20} /> Iniciando...</>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>&copy; 2026 Sachano Tech. Todos los derechos reservados.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
