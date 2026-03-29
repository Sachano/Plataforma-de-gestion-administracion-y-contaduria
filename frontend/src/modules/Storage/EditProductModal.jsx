import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { secureFetch, API_URL } from '../../utils/api';

const EditProductModal = ({ product, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: '', brand: '', barcode: '' });
    const [presentations, setPresentations] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Sync state when product explicitly changes or modal opens
    useEffect(() => {
        if (product && isOpen) {
            setFormData({
                name: product.name || '',
                brand: product.brand || '',
                barcode: product.barcode || ''
            });
            // We need to clone presentations so we don't mutate the parent state by accident
            setPresentations(product.presentations.map(p => ({ ...p })));
        }
    }, [product, isOpen]);

    if (!isOpen || !product) return null;

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePresChange = (id, field, value) => {
        setPresentations(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addPresentation = () => {
        setPresentations(prev => [
            ...prev,
            { id: `temp-${Date.now()}`, name: '', unitCount: 1, price: 0 }
        ]);
    };

    const removePresentation = (id) => {
        if (presentations.length <= 1) return alert('El producto debe tener al menos un nivel de empaque.');
        setPresentations(prev => prev.filter(p => p.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) return alert('El nombre del producto es obligatorio.');
        if (presentations.some(p => !p.name.trim())) return alert('Todos los niveles de empaque deben tener nombre.');

        // Remove 'temp-' prefix from new presentations because backend expects missing IDs for Inserts
        const cleanedPresentations = presentations.map(p => {
            const isTemp = typeof p.id === 'string' && p.id.startsWith('temp-');
            return {
                id: isTemp ? undefined : p.id,
                name: p.name.trim(),
                unitCount: Number(p.unitCount),
                price: Number(p.price)
            };
        });

        const updatedProductData = {
            name: formData.name.trim(),
            brand: formData.brand.trim(),
            barcode: formData.barcode.trim(),
            presentations: cleanedPresentations
        };

        setIsSaving(true);
        try {
            const res = await secureFetch(`${API_URL}/inventory/${product.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedProductData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error saving product');
            }

            const data = await res.json();

            // Pass the successfully updated product back up
            onSave(data.product);
            onClose();
        } catch (err) {
            console.error(err);
            alert(`Error al actualizar el producto: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Modal Styles
    const overlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)' // Optional touch to make the background slighty blurry
    };
    const modalStyle = {
        background: 'var(--white)', borderRadius: '12px', width: '90%', maxWidth: '650px',
        maxHeight: '90vh', overflowY: 'auto', padding: '30px',
        boxShadow: '0 15px 40px rgba(0,0,0,0.4)', border: '1px solid var(--divider-blue-light)'
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '20px' }}>Editar Producto</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '15px', marginBottom: '25px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--divider-blue)', textTransform: 'uppercase' }}>Nombre del Producto *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleFormChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '5px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--divider-blue)', textTransform: 'uppercase' }}>Marca</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleFormChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '5px' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--divider-blue)', textTransform: 'uppercase' }}>Código de Barras</label>
                                <input type="text" name="barcode" value={formData.barcode} onChange={handleFormChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '5px' }} />
                            </div>
                        </div>
                    </div>

                    <h4 style={{ margin: '0 0 15px 0', color: 'var(--divider-blue)' }}>Presentaciones de Empaque</h4>

                    {presentations.map((p, i) => (
                        <div key={p.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px', background: 'var(--white)', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nivel {i + 1} (ej. {i === presentations.length - 1 ? 'Unidad' : 'Caja'})</label>
                                <input type="text" value={p.name} onChange={(e) => handlePresChange(p.id, 'name', e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                            </div>

                            {i < presentations.length - 1 && (
                                <div style={{ flex: 1.5 }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trae (Unid. mínimas)</label>
                                    <input type="number" min="2" value={p.unitCount} onChange={(e) => handlePresChange(p.id, 'unitCount', e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                                </div>
                            )}

                            <div style={{ flex: 1.5 }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Precio ($)</label>
                                <input type="number" step="0.01" min="0" value={p.price} onChange={(e) => handlePresChange(p.id, 'price', e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                            </div>

                            <button type="button" onClick={() => removePresentation(p.id)} style={{ padding: '8px', background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', opacity: presentations.length > 1 ? 1 : 0.5 }} disabled={presentations.length <= 1}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}

                    <button type="button" onClick={addPresentation} style={{ background: 'none', border: '1px dashed var(--divider-blue)', color: 'var(--divider-blue)', width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '25px', fontWeight: 600 }}>
                        <Plus size={16} /> Agregar Sub-Nivel de Empaque
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px', color: 'var(--divider-blue)', fontWeight: 600, cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSaving} style={{ padding: '10px 20px', background: 'var(--accent-orange)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProductModal;
