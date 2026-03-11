import { useState } from 'react';
import { Archive, PackagePlus, Truck } from 'lucide-react';
import InventoryViewSubmodule from './InventoryViewSubmodule';
import RestockSubmodule from './RestockSubmodule';
import ProductDefinitionSubmodule from './ProductDefinitionSubmodule';

// ─────────────────────────────────────────────────────────────────────────────
// StorageModule — Módulo de Inventario
// Pestañas: Inventario | Registrar Surtido | Definición de Producto
// ─────────────────────────────────────────────────────────────────────────────
const StorageModule = ({ inventory, setInventory }) => {
    const [activeTab, setActiveTab] = useState('inventory');

    const tabs = [
        { id: 'inventory', label: 'Inventario', icon: Archive },
        { id: 'restock', label: 'Registrar Surtido', icon: Truck },
        { id: 'definition', label: 'Definición de Producto', icon: PackagePlus },
    ];

    return (
        <div style={{ paddingBottom: '40px' }}>
            <h2 className="title">Inventario</h2>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

                {/* ── Tab bar ──────────────────────────────── */}
                <div style={{
                    display: 'flex',
                    borderBottom: '2px solid var(--divider-blue-light)',
                    background: 'var(--bg-secondary)',
                    overflowX: 'auto',
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '15px 26px', border: 'none',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    background: isActive ? 'var(--white)' : 'transparent',
                                    color: isActive ? 'var(--divider-blue)' : 'var(--text-muted)',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '14px',
                                    borderBottom: isActive
                                        ? '3px solid var(--accent-orange)'
                                        : '3px solid transparent',
                                    marginBottom: '-2px',
                                    transition: 'all 0.18s',
                                    borderRadius: 0,
                                }}
                            >
                                <Icon size={17} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab content ──────────────────────────── */}
                <div style={{ padding: activeTab === 'inventory' ? '0' : '28px 30px' }}>
                    {activeTab === 'inventory' && (
                        <InventoryViewSubmodule inventory={inventory} />
                    )}
                    {activeTab === 'restock' && (
                        <RestockSubmodule inventory={inventory} setInventory={setInventory} />
                    )}
                    {activeTab === 'definition' && (
                        <ProductDefinitionSubmodule inventory={inventory} setInventory={setInventory} />
                    )}
                </div>

            </div>
        </div>
    );
};

export default StorageModule;
