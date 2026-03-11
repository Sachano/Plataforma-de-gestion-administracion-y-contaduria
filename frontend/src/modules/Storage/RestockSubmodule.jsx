import { useState } from 'react';
import { Truck, Plus, Trash2, ClipboardCheck } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Calcula cuántas unidades mínimas equivalen a (qty) de (presentationIndex)
// dentro de la jerarquía de presentaciones del producto.
// Las presentaciones están de MAYOR a MENOR (índice 0 = el más grande).
// La última presentación es la unidad mínima (unitCount no se usa para ella).
// ─────────────────────────────────────────────────────────────────────────────
function toBaseUnits(presentations, presentationIndex, qty) {
    // Multiplica por todos los unitCount de los niveles siguientes al seleccionado
    let factor = 1;
    for (let i = presentationIndex; i < presentations.length - 1; i++) {
        factor *= presentations[i].unitCount;
    }
    return qty * factor;
}

// Fila individual de surtido
const RestockRow = ({ row, inventory, onChange, onRemove, isOnly }) => {
    // We use String() comparison because HTML select values are always strings, 
    // but the backend returns IDs as numbers.
    const product = inventory.find(p => String(p.id) === String(row.productId)) || null;
    const presentations = product ? product.presentations : [];

    return (
        <div style={{
            display: 'flex', gap: '12px', alignItems: 'flex-end',
            marginBottom: '12px', background: 'var(--white)',
            padding: '14px 16px', borderRadius: '10px',
            border: '1px solid #e4e8ef',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}>
            {/* Producto */}
            <div style={{ flex: 2.5 }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--divider-blue)', fontWeight: 600 }}>
                    Producto
                </label>
                <select
                    value={row.productId}
                    onChange={e => onChange(row.id, 'productId', e.target.value)}
                    style={{ marginBottom: 0 }}
                    required
                >
                    <option value="">— Seleccionar producto —</option>
                    {inventory.map(p => (
                        <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>
                    ))}
                </select>
            </div>

            {/* Presentación que llegó */}
            <div style={{ flex: 2 }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--divider-blue)', fontWeight: 600 }}>
                    Presentación recibida
                </label>
                <select
                    value={row.presentationIndex}
                    onChange={e => onChange(row.id, 'presentationIndex', Number(e.target.value))}
                    style={{ marginBottom: 0 }}
                    disabled={!product}
                    required
                >
                    {presentations.map((p, i) => (
                        <option key={p.id} value={i}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Cantidad recibida */}
            <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--divider-blue)', fontWeight: 600 }}>
                    Cantidad
                </label>
                <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={e => onChange(row.id, 'qty', Number(e.target.value))}
                    style={{ marginBottom: 0 }}
                    disabled={!product}
                    required
                />
            </div>

            {/* Equivalencia informativa */}
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', height: '62px' }}>
                {product && (
                    <span style={{
                        fontSize: '12px', color: 'var(--text-muted)', background: '#f0f4ff',
                        padding: '6px 10px', borderRadius: '6px', lineHeight: 1.4,
                    }}>
                        = {toBaseUnits(product.presentations, row.presentationIndex, row.qty).toLocaleString()}
                        &nbsp;<strong>{product.presentations[product.presentations.length - 1]?.name || 'unidades'}</strong>
                    </span>
                )}
            </div>

            {/* Eliminar fila */}
            <button
                type="button"
                onClick={() => onRemove(row.id)}
                disabled={isOnly}
                title="Eliminar línea"
                style={{
                    background: 'none', border: 'none',
                    cursor: isOnly ? 'not-allowed' : 'pointer',
                    color: isOnly ? '#ccc' : '#e74c3c',
                    padding: '8px', marginBottom: '2px',
                }}
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Submódulo principal: Registro de Surtido
// ─────────────────────────────────────────────────────────────────────────────
const RestockSubmodule = ({ inventory, setInventory }) => {
    const mkRow = () => ({ id: Date.now() + Math.random(), productId: '', presentationIndex: 0, qty: 1 });
    const [rows, setRows] = useState([mkRow()]);
    const [saved, setSaved] = useState(false);

    const addRow = () => setRows(r => [...r, mkRow()]);

    const removeRow = id => setRows(r => r.filter(x => x.id !== id));

    const changeRow = (id, field, value) => {
        setRows(r => r.map(x => {
            if (x.id !== id) return x;
            const updated = { ...x, [field]: value };
            // Si cambia el producto, reinicia la presentación seleccionada
            if (field === 'productId') updated.presentationIndex = 0;
            return updated;
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar que todos los productos estén seleccionados
        if (rows.some(r => !r.productId)) {
            alert('Selecciona un producto en cada fila.');
            return;
        }

        try {
            // Send requests to backend
            const updatePromises = rows.map(row => {
                const product = inventory.find(p => String(p.id) === String(row.productId));
                if (!product) return null;

                const added = toBaseUnits(product.presentations, row.presentationIndex, row.qty);

                return fetch(`http://localhost:3001/api/inventory/${row.productId}/restock`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        totalBaseUnits: added,
                        cost: 0, // In the future, we can add a cost input to the UI
                        note: `Surtido de ${row.qty} ${product.presentations[row.presentationIndex]?.name}`
                    })
                });
            });

            await Promise.all(updatePromises.filter(p => p !== null));

            // Update local state for immediate UI feedback
            setInventory(prev => {
                const next = [...prev];
                rows.forEach(row => {
                    const idx = next.findIndex(p => String(p.id) === String(row.productId));
                    if (idx === -1) return;
                    const product = { ...next[idx] };
                    const added = toBaseUnits(product.presentations, row.presentationIndex, row.qty);
                    product.stock = (product.stock || 0) + added;
                    next[idx] = product;
                });
                return next;
            });

            setRows([mkRow()]);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Error in restock:', err);
            alert('Error al registrar surtido en el servidor.');
        }
    };

    return (
        <div>
            {/* Encabezado */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '24px', borderBottom: '2px solid var(--divider-blue-light)', paddingBottom: '14px'
            }}>
                <Truck size={24} color="var(--accent-orange)" />
                <div>
                    <h3 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '18px', fontWeight: 700 }}>
                        Registro de Surtido
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                        Ingresa los productos que llegaron con el surtido. Selecciona el producto, la presentación
                        en la que llegó y la cantidad recibida.
                    </p>
                </div>
            </div>

            {inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <Truck size={42} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    <p>Primero debes definir al menos un producto en el submódulo <strong>"Definición de Producto"</strong>.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {rows.map(row => (
                        <RestockRow
                            key={row.id}
                            row={row}
                            inventory={inventory}
                            onChange={changeRow}
                            onRemove={removeRow}
                            isOnly={rows.length === 1}
                        />
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                        <button type="button" className="btn" onClick={addRow}
                            style={{ background: 'var(--bg-secondary)', color: 'var(--divider-blue)', border: '1px solid var(--divider-blue-light)', padding: '10px 18px', fontSize: '13px' }}>
                            <Plus size={16} /> Agregar Otro Producto
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {saved && (
                                <span style={{ color: '#27ae60', fontWeight: 600, fontSize: '14px' }}>
                                    ✓ Surtido registrado con éxito
                                </span>
                            )}
                            <button type="submit" className="btn btn-accent" style={{ fontSize: '15px', padding: '13px 28px' }}>
                                <ClipboardCheck size={18} /> Confirmar Surtido
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default RestockSubmodule;
