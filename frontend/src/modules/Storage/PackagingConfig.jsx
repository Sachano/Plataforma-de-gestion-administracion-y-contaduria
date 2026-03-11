import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const PackagingConfig = ({ presentations, setPresentations }) => {
    const addPresentation = () => {
        setPresentations([...presentations, { id: Date.now(), name: '', unitCount: 1, price: 0 }]);
    };

    const removePresentation = (id) => {
        setPresentations(presentations.filter(p => p.id !== id));
    };

    const handleChange = (id, field, value) => {
        setPresentations(presentations.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    return (
        <div className="card" style={{ marginTop: '20px', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--divider-blue-light)', padding: '20px' }}>
            <h3 style={{ color: 'var(--divider-blue)', marginTop: 0, marginBottom: '10px' }}>Configuración de Empaque (Jerarquía)</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Define cómo viene empacado este producto, desde la presentación más grande hasta la unidad mínima de venta.
                Ejemplo: Caja -&gt; Tira -&gt; Cajita -&gt; Unidad. Si se vende por unidad (ej. Botella de Miel), solo deja una fila.
            </p>

            {presentations.map((pres, index) => (
                <div key={pres.id} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '15px', background: 'var(--white)', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>

                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--divider-blue)' }}>Nombre (ej. Caja, Unidad)</label>
                        <input
                            type="text"
                            value={pres.name}
                            onChange={(e) => handleChange(pres.id, 'name', e.target.value)}
                            placeholder="Nombre del Empaque"
                            style={{ marginBottom: 0 }}
                            required
                        />
                    </div>

                    {index < presentations.length - 1 ? (
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--divider-blue)' }}>
                                Cantidad de &quot;{presentations[index + 1]?.name || 'el siguiente'}&quot;
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={pres.unitCount}
                                onChange={(e) => handleChange(pres.id, 'unitCount', Number(e.target.value))}
                                style={{ marginBottom: 0 }}
                                required
                            />
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '64px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: '#eee', padding: '6px 12px', borderRadius: '4px' }}>
                                Unidad Mínima de Venta (Base)
                            </span>
                        </div>
                    )}

                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--divider-blue)' }}>Precio de Venta ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pres.price}
                            onChange={(e) => handleChange(pres.id, 'price', Number(e.target.value))}
                            style={{ marginBottom: 0 }}
                            required
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => removePresentation(pres.id)}
                        disabled={presentations.length === 1}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: presentations.length === 1 ? '#ccc' : '#ff4d4f',
                            cursor: presentations.length === 1 ? 'not-allowed' : 'pointer',
                            marginTop: '25px',
                            padding: '5px'
                        }}
                        title="Eliminar presentación"
                    >
                        <Trash2 size={24} />
                    </button>
                </div>
            ))}

            <button type="button" className="btn btn-accent" onClick={addPresentation} style={{ marginTop: '10px' }}>
                <Plus size={18} /> Agregar Nivel de Empaque Arriba
            </button>
        </div>
    );
};

export default PackagingConfig;
