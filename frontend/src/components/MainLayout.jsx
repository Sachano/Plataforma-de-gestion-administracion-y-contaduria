import { Home, Package, Receipt, LineChart, ShoppingCart, Landmark, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
// La imagen del logo debe de agregarse manualmente por el usuario en src/assets/logo.jpg
import logo from '../assets/logo.jpg';

const MainLayout = ({ activeModule, onModuleChange, onCartToggle, children, user }) => {
    const { logout } = useAuth();
    const navItems = [
        { id: 'home', label: 'Inicio', icon: Home },
        { id: 'storage', label: 'Inventario', icon: Package },
        { id: 'invoicing', label: 'Cuentas y Facturas', icon: Receipt },
        { id: 'accounting', label: 'Contaduría', icon: LineChart },
        { id: 'monetary_equivalencies', label: 'Equivalencias', icon: Receipt },
        { id: 'debts', label: 'Deudas y Deudores', icon: Landmark },
    ];

    return (
        <div className="app-container">
            {/* Sidebar / Menu */}
            <aside className="sidebar">
                <div className="logo-container">
                    <img
                        src={logo}
                        alt="Logo de la Empresa"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <div className="logo-placeholder" style={{ display: 'none' }}>
                        MI EMPRESA
                    </div>
                </div>

                <nav className="nav-menu">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.id}
                                className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
                                onClick={() => onModuleChange(item.id)}
                            >
                                <Icon size={24} />
                                <span>{item.label}</span>
                            </div>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                {user && (
                    <div style={{
                        padding: '16px',
                        borderTop: '1px solid var(--bg-secondary)',
                        marginTop: 'auto'
                    }}>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            marginBottom: '8px'
                        }}>
                            {user.full_name || user.username}
                            <span style={{
                                display: 'inline-block',
                                marginLeft: '8px',
                                padding: '2px 6px',
                                backgroundColor: user.role === 'admin' ? 'var(--accent-orange)' : 'var(--divider-blue)',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '10px',
                                textTransform: 'uppercase'
                            }}>
                                {user.role}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--text-muted)',
                                borderRadius: '6px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            <LogOut size={16} />
                            Cerrar Sesión
                        </button>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                {children}
            </main>

            {/* Floating Cart Button (Bottom Right) */}
            <div className="cart-widget" onClick={onCartToggle} title="Abrir Carrito">
                <ShoppingCart size={32} />
            </div>
        </div>
    );
};

export default MainLayout;
