import { useState } from 'react';
import { Plus, Trash2, Save, PackagePlus, ChevronRight } from 'lucide-react';
import BarcodeScanner from '../../components/BarcodeScanner';
import { secureFetch, API_URL } from '../../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: fila de un nivel de empaque
// ─────────────────────────────────────────────────────────────────────────────
const PresentationRow = ({ pres, index, total, onChange, onRemove, nextName }) => (
    <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-end',
        marginBottom: '12px', background: 'var(--white)',
        padding: '14px 16px', borderRadius: '10px',
        border: '1px solid #e4e8ef',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
    }}>
        {/* Indicador de nivel */}
        <div style={{ minWidth: '28px', textAlign: 'center', paddingBottom: '8px' }}>
            <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--divider-blue)', color: 'white',
                fontSize: '12px', fontWeight: 700,
            }}>{index + 1}</span>
        </div>

        {/* Nombre del empaque */}
        <div style={{ flex: 2 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--divider-blue)', fontWeight: 600, letterSpacing: '0.05em' }}>
                Nombre del empaque
            </label>
            <input
                type="text"
                value={pres.name}
                onChange={e => onChange(pres.id, 'name', e.target.value)}
                placeholder="Ej. Caja, Tira, Unidad"
                style={{ marginBottom: 0 }}
                required
            />
        </div>

        {/* Cuántas unidades del siguiente nivel contiene */}
        {index < total - 1 ? (
            <div style={{ flex: 2 }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--divider-blue)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Contiene (# de "{nextName || 'siguiente'}")
                </label>
                <input
                    type="number"
                    min="1"
                    value={pres.unitCount}
                    onChange={e => onChange(pres.id, 'unitCount', Number(e.target.value))}
                    style={{ marginBottom: 0 }}
                    required
                />
            </div>
        ) : (
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', height: '62px' }}>
                <span style={{
                    fontSize: '12px', color: 'var(--text-muted)',
                    background: '#f0f0f0', padding: '6px 12px', borderRadius: '6px',
                }}>
                    Unidad mínima de venta
                </span>
            </div>
        )}

        {/* Precio de venta */}
        <div style={{ flex: 1.5 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--divider-blue)', fontWeight: 600, letterSpacing: '0.05em' }}>
                Precio de venta ($)
            </label>
            <input
                type="number"
                min="0"
                step="0.01"
                value={pres.price}
                onChange={e => onChange(pres.id, 'price', Number(e.target.value))}
                style={{ marginBottom: 0 }}
                required
            />
        </div>

        {/* Eliminar */}
        <button
            type="button"
            onClick={() => onRemove(pres.id)}
            disabled={total === 1}
            title="Eliminar nivel"
            style={{
                background: 'none', border: 'none', cursor: total === 1 ? 'not-allowed' : 'pointer',
                color: total === 1 ? '#ccc' : '#e74c3c', padding: '8px', marginBottom: '2px',
            }}
        >
            <Trash2 size={20} />
        </button>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Submódulo principal: Definición de Producto
// ─────────────────────────────────────────────────────────────────────────────
const ProductDefinitionSubmodule = ({ inventory, setInventory }) => {
    const [formData, setFormData] = useState({ name: '', brand: '', barcode: '' });
    const [presentations, setPresentations] = useState([
        { id: Date.now(), name: 'Unidad', unitCount: 1, price: 0 }
    ]);
    const [saved, setSaved] = useState(false);

    const handleInput = e => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const addLevel = () => {
        // Agrega un nuevo nivel ARRIBA (es decir, al principio del array)
        setPresentations(p => [
            { id: Date.now(), name: '', unitCount: 1, price: 0 },
            ...p
        ]);
    };

    const removeLevel = id => {
        setPresentations(p => p.filter(x => x.id !== id));
    };

    const changeLevel = (id, field, value) => {
        setPresentations(p => p.map(x => x.id === id ? { ...x, [field]: value } : x));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return alert('El nombre del producto es obligatorio.');
        if (presentations.some(p => !p.name.trim())) return alert('Todos los niveles de empaque deben tener nombre.');

        const newProduct = {
            name: formData.name.trim(),
            brand: formData.brand.trim(),
            barcode: formData.barcode.trim(),
            presentations: presentations.map(p => ({
                name: p.name.trim(),
                unitCount: Number(p.unitCount),
                price: Number(p.price)
            }))
        };

        try {
            const res = await secureFetch(`${API_URL}/inventory`, {
                method: 'POST',
                body: JSON.stringify(newProduct)
            });

            if (!res.ok) {
                throw new Error('Error saving product');
            }

            const savedProduct = await res.json();

            // Append the saved product from the backend directly to the inventory state
            setInventory(prev => [...prev, savedProduct]);

            setFormData({ name: '', brand: '', barcode: '' });
            setPresentations([{ id: Date.now(), name: 'Unidad', unitCount: 1, price: 0 }]);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error(err);
            alert('Error al guardar el producto en el servidor.');
        }
    };

    return (
        <div>
            {/* Encabezado del submódulo */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '24px', borderBottom: '2px solid var(--divider-blue-light)', paddingBottom: '14px'
            }}>
                <PackagePlus size={24} color="var(--accent-orange)" />
                <div>
                    <h3 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '18px', fontWeight: 700 }}>
                        Definición de Producto
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                        Registra un nuevo producto y define cómo viene empacado (cuánto contiene cada presentación).
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                {/* Datos básicos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px', marginBottom: '24px' }}>
                    <div>
                        <label>Nombre del Producto *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInput}
                            placeholder="Ej. Jabón Azul" required />
                    </div>
                    <div>
                        <label>Marca</label>
                        <input type="text" name="brand" value={formData.brand} onChange={handleInput}
                            placeholder="Ej. Las Llaves" />
                    </div>
                    <div>
                        <label>Código de Barras</label>
                        <BarcodeScanner
                            value={formData.barcode}
                            onScan={(code) => setFormData(p => ({ ...p, barcode: code }))}
                            placeholder="Escanee o escriba el código..."
                        />
                    </div>
                </div>

                {/* Jerarquía de empaques */}
                <div style={{
                    background: 'var(--bg-secondary)', borderRadius: '12px',
                    padding: '20px', border: '1px dashed var(--divider-blue-light)', marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h4 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '15px' }}>
                                Jerarquía de Empaque
                            </h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                El nivel #1 es el empaque más grande. El último nivel es la unidad mínima de venta.
                                Ejemplo: Caja → Tira → Unidad
                            </p>
                        </div>
                        <button type="button" className="btn btn-accent" onClick={addLevel}
                            style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <Plus size={16} /> Agregar Nivel
                        </button>
                    </div>

                    {/* Vista previa de la jerarquía */}
                    {presentations.length > 1 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
                            marginBottom: '16px', padding: '10px 14px', background: 'var(--white)',
                            borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)'
                        }}>
                            <span style={{ fontWeight: 600, color: 'var(--divider-blue)', fontSize: '12px', marginRight: '4px' }}>JERARQUÍA:</span>
                            {presentations.map((p, i) => (
                                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        background: 'var(--divider-blue)', color: 'white',
                                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
                                    }}>{p.name || '?'}</span>
                                    {i < presentations.length - 1 && (
                                        <ChevronRight size={14} color="#aaa" />
                                    )}
                                </span>
                            ))}
                        </div>
                    )}

                    {presentations.map((pres, idx) => (
                        <PresentationRow
                            key={pres.id}
                            pres={pres}
                            index={idx}
                            total={presentations.length}
                            onChange={changeLevel}
                            onRemove={removeLevel}
                            nextName={presentations[idx + 1]?.name}
                        />
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                    {saved && (
                        <span style={{ color: '#27ae60', fontWeight: 600, fontSize: '14px' }}>
                            ✓ Producto guardado con éxito
                        </span>
                    )}
                    <button type="submit" className="btn btn-accent" style={{ fontSize: '15px', padding: '13px 28px' }}>
                        <Save size={18} /> Guardar Producto
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductDefinitionSubmodule;
