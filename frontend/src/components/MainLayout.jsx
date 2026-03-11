import { Home, Package, Receipt, LineChart, ShoppingCart, Landmark } from 'lucide-react';
// La imagen del logo debe de agregarse manualmente por el usuario en src/assets/logo.jpg
import logo from '../assets/logo.jpg';

const MainLayout = ({ activeModule, onModuleChange, onCartToggle, children }) => {
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
                        alt="Donde Jenny Logo"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <div className="logo-placeholder" style={{ display: 'none' }}>
                        DONDE JENNY
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
