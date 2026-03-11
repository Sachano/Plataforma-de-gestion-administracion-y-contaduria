import React, { useState } from 'react';
import { Settings, Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';

const MonetaryEquivalenciesModule = ({
    exchangeRates,
    setExchangeRates,
    autoRatesEnabled,
    setAutoRatesEnabled
}) => {
    // Mode states: 'view', 'edit', 'delete', 'add'
    const [mode, setMode] = useState('view');

    // Make local copies for editing
    const [editValues, setEditValues] = useState({});
    const [newCurrency, setNewCurrency] = useState({ name: '', value: '' });
    const [currenciesToDelete, setCurrenciesToDelete] = useState([]);

    const handleEditStart = () => {
        const currentValues = {};
        exchangeRates.forEach(rate => {
            currentValues[rate.id] = rate.value;
            if (rate.isCustomLabel) {
                currentValues[`${rate.id}_name`] = rate.customName || rate.name;
            }
        });
        setEditValues(currentValues);
        setMode('edit');
    };

    const handleEditSave = () => {
        const updatedRates = exchangeRates.map(rate => {
            // Promedio is always computed.
            if (rate.isComputed) return rate;

            // BCV and Binance shouldn't be edited if autoRates is ON.
            if (autoRatesEnabled && (rate.id === 'usd_bcv' || rate.id === 'usd_binance')) {
                return rate;
            }

            const updatedRate = { ...rate };
            if (editValues[rate.id] !== undefined) {
                updatedRate.value = parseFloat(editValues[rate.id]) || 0;
            }
            if (rate.isCustomLabel && editValues[`${rate.id}_name`] !== undefined) {
                updatedRate.customName = editValues[`${rate.id}_name`];
            }
            return updatedRate;
        });
        setExchangeRates(updatedRates);
        setMode('view');
    };

    const handleEditCancel = () => {
        setMode('view');
    };

    const handleAddStart = () => {
        setNewCurrency({ name: '', value: '' });
        setMode('add');
    };

    const handleAddSave = () => {
        if (!newCurrency.name.trim() || !newCurrency.value) return;

        const newRate = {
            id: `custom_${Date.now()}`,
            name: newCurrency.name,
            value: parseFloat(newCurrency.value),
            isDeletable: true,
            group: 'custom'
        };

        setExchangeRates([...exchangeRates, newRate]);
        setMode('view');
    };

    const handleAddCancel = () => {
        setMode('view');
    };

    const handleDeleteStart = () => {
        setCurrenciesToDelete([]);
        setMode('delete');
    };

    const toggleDeleteSelection = (id) => {
        if (currenciesToDelete.includes(id)) {
            setCurrenciesToDelete(currenciesToDelete.filter(item => item !== id));
        } else {
            setCurrenciesToDelete([...currenciesToDelete, id]);
        }
    };

    const handleDeleteConfirm = () => {
        const remainingRates = exchangeRates.filter(rate => !currenciesToDelete.includes(rate.id));
        setExchangeRates(remainingRates);
        setMode('view');
    };

    const handleDeleteCancel = () => {
        setMode('view');
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Header section */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, var(--white) 0%, var(--bg-secondary) 100%)',
                borderLeft: '6px solid #10b981',
                padding: '30px 35px',
                marginBottom: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div>
                    <h1 style={{ color: 'var(--divider-blue)', margin: 0, fontSize: '34px', fontWeight: 700, lineHeight: 1.2 }}>
                        Equivalencias Monetarias
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '8px 0 0 0' }}>
                        Gestiona y personaliza los valores de conversión de monedas.
                    </p>
                </div>
            </div>

            {/* Config Section */}
            <div className="card" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        background: autoRatesEnabled ? '#10b981' : 'var(--bg-secondary)',
                        borderRadius: '8px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                    }}>
                        <Settings size={22} color={autoRatesEnabled ? 'white' : 'var(--text-muted)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>Equivalencias Automáticas</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {autoRatesEnabled
                                ? 'Las monedas oficiales (BCV, Binance) se están actualizando solas por internet.'
                                : 'Activa esta opción para no tener que actualizar el dólar manualmente cada día.'}
                        </p>
                    </div>
                    <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '50px',
                        height: '28px'
                    }}>
                        <input
                            type="checkbox"
                            checked={autoRatesEnabled}
                            onChange={(e) => setAutoRatesEnabled(e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: autoRatesEnabled ? '#10b981' : '#cbd5e1',
                            transition: '.4s',
                            borderRadius: '34px'
                        }}>
                            <span style={{
                                position: 'absolute',
                                content: '""',
                                height: '20px', width: '20px',
                                left: autoRatesEnabled ? '26px' : '4px',
                                bottom: '4px',
                                backgroundColor: 'white',
                                transition: '.4s',
                                borderRadius: '50%'
                            }}></span>
                        </span>
                    </label>
                </div>
            </div>

            {/* Actions Toolbar */}
            {mode === 'view' && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <button onClick={handleAddStart} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'var(--divider-blue)', color: 'white',
                        border: 'none', padding: '10px 18px', borderRadius: '8px',
                        fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                        transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <Plus size={18} /> Añadir nueva moneda
                    </button>
                    <button onClick={handleEditStart} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'var(--bg-secondary)', color: 'var(--text-main)',
                        border: '1px solid var(--border-color)', padding: '10px 18px', borderRadius: '8px',
                        fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                        transition: 'all 0.2s'
                    }}>
                        <Edit2 size={18} /> Editar equivalencias
                    </button>
                    <button onClick={handleDeleteStart} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#fee2e2', color: '#ef4444',
                        border: '1px solid #fecaca', padding: '10px 18px', borderRadius: '8px',
                        fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                        transition: 'all 0.2s'
                    }}>
                        <Trash2 size={18} /> Eliminar moneda
                    </button>
                </div>
            )}

            {/* Main Content Area Based on Mode */}
            <div className="card">

                {/* HEADINGS FOR VIEW / EDIT / DELETE */}
                {mode === 'add' && (
                    <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, color: 'var(--divider-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={20} /> Añadir Nueva Moneda
                        </h3>
                    </div>
                )}
                {mode === 'edit' && (
                    <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Edit2 size={20} /> Modo de Edición
                        </h3>
                        <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            Modifica los valores de las monedas permitidas. Ciertas monedas de sistema no pueden ser editadas manualmente.
                        </p>
                    </div>
                )}
                {mode === 'delete' && (
                    <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trash2 size={20} /> Modo de Eliminación
                        </h3>
                        <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            Selecciona las monedas personalizadas que deseas eliminar.
                        </p>
                    </div>
                )}

                {/* ADD MODE CONTENT */}
                {mode === 'add' ? (
                    <div style={{ display: 'grid', gap: '20px', maxWidth: '500px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                                Nombre de la moneda
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Euros"
                                value={newCurrency.name}
                                onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                                style={{
                                    width: '100%', padding: '12px 16px',
                                    borderRadius: '8px', border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)', color: 'var(--text-main)',
                                    fontSize: '15px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                                Valor en Bolívares (Bs)
                            </label>
                            <input
                                type="number"
                                placeholder="Ej: 450.5"
                                value={newCurrency.value}
                                onChange={(e) => setNewCurrency({ ...newCurrency, value: e.target.value })}
                                style={{
                                    width: '100%', padding: '12px 16px',
                                    borderRadius: '8px', border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)', color: 'var(--text-main)',
                                    fontSize: '15px'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <button onClick={handleAddSave} disabled={!newCurrency.name || !newCurrency.value} style={{
                                background: 'var(--divider-blue)', color: 'white', border: 'none',
                                padding: '12px 24px', borderRadius: '8px', fontWeight: 600,
                                cursor: (!newCurrency.name || !newCurrency.value) ? 'not-allowed' : 'pointer',
                                opacity: (!newCurrency.name || !newCurrency.value) ? 0.6 : 1,
                                flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                            }}>
                                <Check size={18} /> Añadir
                            </button>
                            <button onClick={handleAddCancel} style={{
                                background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)',
                                padding: '12px 24px', borderRadius: '8px', fontWeight: 600,
                                cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                            }}>
                                <X size={18} /> Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    /* LIST OF CURRENCIES (used in View, Edit, and Delete modes) */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {exchangeRates.map((rate) => {
                            const isComputed = rate.isComputed;
                            const isAutoFetched = autoRatesEnabled && (rate.id === 'usd_bcv' || rate.id === 'usd_binance');
                            const isSystemFixed = isComputed || isAutoFetched;
                            const isEditable = !isSystemFixed;
                            const isDeletable = mode === 'delete' && rate.isDeletable;

                            return (
                                <div key={rate.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '16px',
                                    padding: '16px', borderRadius: '12px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    opacity: (mode === 'edit' && isSystemFixed) ? 0.6 : 1
                                }}>

                                    {/* DELETE CHECKBOX */}
                                    {mode === 'delete' && (
                                        <div style={{ width: '30px', display: 'flex', justifyContent: 'center' }}>
                                            {rate.isDeletable ? (
                                                <input
                                                    type="checkbox"
                                                    checked={currenciesToDelete.includes(rate.id)}
                                                    onChange={() => toggleDeleteSelection(rate.id)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                            ) : (
                                                <div title="Moneda de sistema, no se puede eliminar">
                                                    <AlertCircle size={18} color="#94a3b8" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* CURRENCY INFO / EDIT INPUTS */}
                                    <div style={{ flex: 1 }}>
                                        {/* NAME */}
                                        {mode === 'edit' && rate.isCustomLabel ? (
                                            <input
                                                type="text"
                                                value={editValues[`${rate.id}_name`] || ''}
                                                onChange={(e) => setEditValues({ ...editValues, [`${rate.id}_name`]: e.target.value })}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '6px',
                                                    border: '1px solid var(--divider-blue)',
                                                    background: 'var(--white)', color: 'var(--text-main)',
                                                    fontSize: '15px', fontWeight: 600, width: '100%', maxWidth: '250px',
                                                    marginBottom: '4px'
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '15px', marginBottom: '4px' }}>
                                                {rate.customName || rate.name}
                                                {rate.group === 'usd' && <span style={{ fontSize: '12px', color: '#10b981', marginLeft: '8px' }}>Dólar</span>}
                                                {rate.isComputed && <span style={{ fontSize: '11px', color: '#8b5cf6', marginLeft: '8px', background: '#ede9fe', padding: '2px 6px', borderRadius: '4px' }}>(BCV + Binance) ÷ 2</span>}
                                            </div>
                                        )}

                                        {/* VALUE */}
                                        {mode === 'edit' && isEditable ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={editValues[rate.id] || ''}
                                                    onChange={(e) => setEditValues({ ...editValues, [rate.id]: e.target.value })}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '6px',
                                                        border: '1px solid var(--divider-blue)',
                                                        background: 'var(--white)', color: 'var(--text-main)',
                                                        fontSize: '14px', width: '120px'
                                                    }}
                                                />
                                                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Bs</span>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                                {rate.value} Bs
                                            </div>
                                        )}
                                    </div>

                                    {/* System label */}
                                    {isSystemFixed && mode === 'edit' && (
                                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                                            {rate.isComputed ? 'Calculado automáticamente' : 'Actualización automática'}
                                        </div>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FLOATING ACTION BOTTOM BAR FOR EDIT AND DELETE MODES */}
            {(mode === 'edit' || mode === 'delete') && (
                <div style={{
                    position: 'fixed',
                    bottom: '0', left: '260px', right: '0', // Adjust left according to sidebar width if possible, approx 260px assumption
                    background: 'var(--white)',
                    borderTop: '1px solid var(--border-color)',
                    padding: '20px 40px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '16px',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                    zIndex: 100 // ensure above other content
                }}>
                    <button onClick={mode === 'edit' ? handleEditCancel : handleDeleteCancel} style={{
                        background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)',
                        padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                    }}>
                        Cancelar
                    </button>

                    {mode === 'edit' && (
                        <button onClick={handleEditSave} style={{
                            background: '#10b981', color: 'white', border: 'none',
                            padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <Check size={18} /> Guardar cambios
                        </button>
                    )}

                    {mode === 'delete' && (
                        <button onClick={handleDeleteConfirm} disabled={currenciesToDelete.length === 0} style={{
                            background: '#ef4444', color: 'white', border: 'none',
                            padding: '12px 24px', borderRadius: '8px', fontWeight: 600,
                            cursor: currenciesToDelete.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: currenciesToDelete.length === 0 ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <Trash2 size={18} /> Eliminar seleccionados ({currenciesToDelete.length})
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MonetaryEquivalenciesModule;
