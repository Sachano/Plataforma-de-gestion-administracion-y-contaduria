import React, { useState } from 'react';
import { Box, Trash2, Edit3 } from 'lucide-react';
import EditProductModal from './EditProductModal';

// ─────────────────────────────────────────────────────────────────────────────
// Convierte unidades mínimas → cantidad en cada nivel del empaque
// ─────────────────────────────────────────────────────────────────────────────
function calcStockByLevel(presentations, baseUnits) {
    if (!presentations || presentations.length === 0 || baseUnits === undefined) return [];
    const factors = [];
    factors[presentations.length - 1] = 1;
    for (let i = presentations.length - 2; i >= 0; i--) {
        factors[i] = presentations[i].unitCount * factors[i + 1];
    }
    return presentations.map((p, i) => ({ name: p.name, qty: baseUnits / factors[i] }));
}

function fmt(n) {
    return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Submódulo: Vista de Inventario Actual
// ─────────────────────────────────────────────────────────────────────────────
const InventoryViewSubmodule = ({ inventory, setInventory }) => {
    const [editingProduct, setEditingProduct] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${name}" del inventario?`)) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:3001/api/inventory/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Error al eliminar');

            // Actualizar estado local
            setInventory(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error(err);
            alert('Hubo un error al intentar eliminar el producto.');
        }
    };

    const handleEditSave = (updatedProduct) => {
        // Find and replace the product in the local state
        setInventory(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    };
    if (inventory.length === 0) {
        return (
            <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Box size={60} color="var(--divider-blue-light)" style={{ opacity: 0.3, marginBottom: '14px', display: 'block', margin: '0 auto 14px' }} />
                <p style={{ fontSize: '17px', fontWeight: 600 }}>No hay productos en el inventario.</p>
                <p style={{ fontSize: '13px' }}>
                    Ve a <strong>Definición de Producto</strong> para registrar productos, luego usa{' '}
                    <strong>Registrar Surtido</strong> para ingresar existencias.
                </p>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--divider-blue-light)' }}>
                    <tr>
                        {['Producto', 'Marca', 'Jerarquía de Empaque', 'Stock por Presentación', 'Precio Base', 'Acciones'].map(h => (
                            <th key={h} style={{ padding: '14px 18px', color: 'var(--divider-blue)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {inventory.map((item, i) => {
                        const stockLevels = calcStockByLevel(item.presentations, item.stock || 0);
                        return (
                            <tr key={item.id} style={{
                                borderBottom: '1px solid #eee',
                                background: i % 2 === 0 ? 'var(--white)' : '#fafafa',
                            }}>
                                {/* Nombre */}
                                <td style={{ padding: '15px 18px', fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                                    {item.name}
                                </td>

                                {/* Marca */}
                                <td style={{ padding: '15px 18px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {item.brand || '—'}
                                </td>

                                {/* Jerarquía: chips encadenados */}
                                <td style={{ padding: '15px 18px' }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {item.presentations.map((p, idx) => (
                                            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{
                                                    background: 'var(--divider-blue)', color: 'white',
                                                    padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                                }}>
                                                    {p.name}
                                                    {idx < item.presentations.length - 1 && (
                                                        <span style={{ opacity: 0.7, marginLeft: '4px', fontSize: '10px' }}>
                                                            ×{p.unitCount}
                                                        </span>
                                                    )}
                                                </span>
                                                {idx < item.presentations.length - 1 && (
                                                    <span style={{ color: '#bbb', fontSize: '12px' }}>›</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </td>

                                {/* Stock por presentación */}
                                <td style={{ padding: '15px 18px' }}>
                                    {(item.stock || 0) === 0 ? (
                                        <span style={{ fontSize: '12px', color: '#e74c3c', background: '#fff0f0', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                                            Sin stock
                                        </span>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {stockLevels.map((lvl, si) => (
                                                <span key={si} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    background: si === 0 ? 'rgba(230,126,34,0.1)' : 'var(--bg-secondary)',
                                                    border: si === 0 ? '1px solid rgba(230,126,34,0.4)' : '1px solid var(--divider-blue-light)',
                                                    borderRadius: '20px', padding: '4px 11px', fontSize: '12px',
                                                }}>
                                                    <span style={{ fontWeight: 700, color: si === 0 ? 'var(--accent-orange)' : 'var(--divider-blue)' }}>
                                                        {fmt(lvl.qty)}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{lvl.name}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>

                                {/* Precio base */}
                                <td style={{ padding: '15px 18px', fontWeight: 600, color: 'var(--accent-orange)', fontSize: '14px' }}>
                                    ${item.presentations[item.presentations.length - 1]?.price.toFixed(2)}
                                </td>

                                {/* Acciones */}
                                <td style={{ padding: '15px 18px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            title="Editar Producto"
                                            onClick={() => {
                                                setEditingProduct(item);
                                                setIsEditModalOpen(true);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--divider-blue)', padding: '6px' }}
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button
                                            title="Eliminar Producto"
                                            onClick={() => handleDelete(item.id, item.name)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', padding: '6px' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <EditProductModal
                isOpen={isEditModalOpen}
                product={editingProduct}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingProduct(null);
                }}
                onSave={handleEditSave}
            />
        </div>
    );
};

export default InventoryViewSubmodule;
