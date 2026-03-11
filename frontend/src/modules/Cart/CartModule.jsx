import { useState } from 'react';
import { ShoppingCart, Search, Plus, X, Users, UserPlus, ChevronDown } from 'lucide-react';
import CheckoutOverlay from './CheckoutOverlay';

const CartModule = ({ inventory, onCheckout, onClose, exchangeRates = [], debts = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cartItems, setCartItems] = useState([]);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedPresentation, setSelectedPresentation] = useState(null);

    const [completedInvoice, setCompletedInvoice] = useState(null);

    // ── Debtor panel state ────────────────────────────────────────────────────
    const [registerAsDebtor, setRegisterAsDebtor] = useState(false);
    // 'select' = pick existing | 'new' = create new
    const [debtorMode, setDebtorMode] = useState('select');
    const [selectedDebtorId, setSelectedDebtorId] = useState('');
    const [newDebtorName, setNewDebtorName] = useState('');
    const [newDebtorDesc, setNewDebtorDesc] = useState('');
    const [debtorDropdownOpen, setDebtorDropdownOpen] = useState(false);

    // existing deudores only
    const existingDeudores = debts.filter(d => d.type === 'deudor');

    const filteredInventory = inventory.filter(p => {
        const term = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) ||
            (p.brand && p.brand.toLowerCase().includes(term)) ||
            (p.barcode && p.barcode.includes(term));
    });

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setQuantity(1);
        if (product.presentations.length === 1) {
            setSelectedPresentation(product.presentations[0]);
        } else {
            setSelectedPresentation(null);
        }
    };

    const handleAddToCart = () => {
        if (!selectedPresentation) {
            alert("Por favor seleccione el tipo de empaque (ej. Caja o Unidad)");
            return;
        }

        const existingIdx = cartItems.findIndex(i => i.id === selectedProduct.id && i.presentationId === selectedPresentation.id);

        if (existingIdx >= 0) {
            const newItems = [...cartItems];
            newItems[existingIdx].quantity += quantity;
            setCartItems(newItems);
        } else {
            setCartItems([...cartItems, {
                id: selectedProduct.id,
                name: selectedProduct.name,
                presentationId: selectedPresentation.id,
                presentationName: selectedPresentation.name,
                unitPrice: selectedPresentation.price,
                quantity: quantity
            }]);
        }

        setSelectedProduct(null);
        setSearchTerm('');
    };

    const removeFromCart = (idx) => {
        setCartItems(cartItems.filter((_, i) => i !== idx));
    };

    const currentTotal = cartItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);

    // Validate debtor panel before allowing process
    const debtorPanelValid = !registerAsDebtor || (
        debtorMode === 'select'
            ? selectedDebtorId !== ''
            : newDebtorName.trim() !== ''
    );

    const handleGenerateInvoice = () => {
        if (cartItems.length === 0) return;
        if (!debtorPanelValid) return;

        const newInvoice = {
            id: `INV-${Date.now().toString().slice(-6)}`,
            timestamp: new Date().toISOString(),
            items: cartItems,
            total: currentTotal,
            exchangeRates: exchangeRates
        };

        setCompletedInvoice(newInvoice);
    };

    const handleCloseOverlay = () => {
        // Build debtInfo if applicable
        let debtInfo = null;
        if (registerAsDebtor) {
            if (debtorMode === 'select') {
                debtInfo = { isNew: false, debtorId: parseInt(selectedDebtorId) };
            } else {
                debtInfo = {
                    isNew: true,
                    newDebtor: { name: newDebtorName.trim(), description: newDebtorDesc.trim() }
                };
            }
        }

        onCheckout(completedInvoice, debtInfo);
    };

    const handleDownload = () => {
        alert("Descargando factura... (La versión completa estará en el siguiente paso)");
    };

    // Switch to overlay if completed
    if (completedInvoice) {
        return (
            <CheckoutOverlay
                invoice={completedInvoice}
                onDownload={handleDownload}
                onClose={handleCloseOverlay}
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--white)', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <ShoppingCart size={40} color="var(--accent-orange)" />
                    <h2 className="title" style={{ border: 'none', margin: 0 }}>Punto de Venta</h2>
                </div>
                <button className="btn" onClick={onClose}>Volver al menú</button>
            </div>

            <div style={{ display: 'flex', gap: '40px', flex: 1, minHeight: 0 }}>

                {/* Left Side: Search & Selection */}
                <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '25px', overflowY: 'auto', paddingRight: '10px', paddingBottom: '20px' }}>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--divider-blue-light)' }}>
                        <Search size={24} color="var(--divider-blue)" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, marca o escanear código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 1, margin: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: '18px' }}
                            autoFocus
                        />
                    </div>

                    {searchTerm && !selectedProduct && (
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ddd' }}>
                            {filteredInventory.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>No se encontraron productos.</p>
                            ) : (
                                filteredInventory.map(prod => (
                                    <div
                                        key={prod.id}
                                        onClick={() => handleSelectProduct(prod)}
                                        style={{ padding: '20px', borderBottom: '1px solid #ddd', cursor: 'pointer', transition: 'background 0.2s', background: 'var(--white)' }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#fcfcfc'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--white)'}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: '18px' }}>{prod.name} <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginLeft: '10px' }}>{prod.brand}</span></div>
                                        <div style={{ fontSize: '14px', color: 'var(--accent-orange)', marginTop: '8px' }}>
                                            {prod.presentations.map(p => p.name).join(' > ')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {selectedProduct && (
                        <div style={{ padding: '25px', borderRadius: '12px', border: '2px dashed var(--accent-orange)', background: '#fffcf5' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '24px' }}>{selectedProduct.name}</h3>
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4f', padding: '5px' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div style={{ width: '120px' }}>
                                    <label style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cantidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={e => setQuantity(Number(e.target.value))}
                                        style={{ fontSize: '24px', textAlign: 'center', margin: 0, padding: '15px' }}
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tipo de Empaque</label>
                                    {selectedProduct.presentations.length === 1 ? (
                                        <div style={{ padding: '15px', background: 'var(--white)', borderRadius: '6px', fontWeight: 600, fontSize: '18px', border: '1px solid #ddd' }}>
                                            {selectedProduct.presentations[0].name} - ${selectedProduct.presentations[0].price.toFixed(2)}
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedPresentation?.id || ''}
                                            onChange={e => setSelectedPresentation(selectedProduct.presentations.find(p => p.id === Number(e.target.value)))}
                                            style={{ margin: 0, padding: '15px', fontSize: '18px' }}
                                        >
                                            <option value="" disabled>Seleccione en qué lo lleva...</option>
                                            {selectedProduct.presentations.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} - ${p.price.toFixed(2)}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <button className="btn btn-accent" onClick={handleAddToCart} style={{ width: '100%', marginTop: '30px', justifyContent: 'center', fontSize: '20px', padding: '15px' }}>
                                <Plus size={24} style={{ marginRight: '10px' }} /> Agregar a Factura
                            </button>
                        </div>
                    )}

                </div>

                {/* Right Side: Bill Summary */}
                <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ddd', minHeight: '500px' }}>
                    <h3 style={{ padding: '20px', margin: 0, background: 'var(--divider-blue)', color: 'white', textAlign: 'center', fontSize: '20px' }}>Cuenta Actual</h3>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#fff' }}>
                        {cartItems.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '60px' }}>
                                <ShoppingCart size={64} style={{ opacity: 0.1, marginBottom: '15px' }} />
                                <p style={{ fontSize: '18px' }}>Factura vacía</p>
                            </div>
                        ) : (
                            cartItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #eee' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>{item.name}</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>
                                            {item.quantity} x {item.presentationName} a ${item.unitPrice.toFixed(2)}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--divider-blue)', marginRight: '15px' }}>
                                        ${(item.quantity * item.unitPrice).toFixed(2)}
                                    </div>
                                    <button onClick={() => removeFromCart(idx)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '5px' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ background: 'var(--white)', padding: '20px', borderTop: '2px dashed #ddd', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: 'bold' }}>
                            <span>Total USD:</span>
                            <span style={{ color: 'var(--accent-orange)' }}>${currentTotal.toFixed(2)}</span>
                        </div>

                        {/* Conversions */}
                        {(() => {
                            const promedioRate = exchangeRates.find(r => r.id === 'usd_promedio')?.value || 0;
                            const bcvRate = exchangeRates.find(r => r.id === 'usd_bcv')?.value || 0;
                            const binanceRate = exchangeRates.find(r => r.id === 'usd_binance')?.value || 0;
                            return (
                                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Equivalencias</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#64748b' }}>BCV</span>
                                            <span style={{ fontWeight: 600, color: '#1e40af' }}>Bs. {(currentTotal * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#64748b' }}>Binance</span>
                                            <span style={{ fontWeight: 600, color: '#7c3aed' }}>Bs. {(currentTotal * binanceRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', marginTop: '4px' }}>
                                            <span style={{ color: '#059669', fontWeight: 600 }}>∅ Promedio</span>
                                            <span style={{ fontWeight: 800, color: '#059669' }}>Bs. {(currentTotal * promedioRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── DEBTOR PANEL ─────────────────────────────────── */}
                        <div style={{
                            borderRadius: '12px',
                            border: registerAsDebtor ? '2px solid #f59e0b' : '2px dashed #e2e8f0',
                            overflow: 'hidden',
                            transition: 'border-color 0.2s'
                        }}>
                            {/* Toggle row */}
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '14px 16px', cursor: 'pointer',
                                    background: registerAsDebtor ? '#fffbeb' : 'var(--bg-secondary)',
                                    transition: 'background 0.2s'
                                }}
                                onClick={() => setRegisterAsDebtor(p => !p)}
                            >
                                <div style={{
                                    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                                    border: `2px solid ${registerAsDebtor ? '#f59e0b' : '#cbd5e1'}`,
                                    background: registerAsDebtor ? '#f59e0b' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    {registerAsDebtor && <span style={{ color: 'white', fontSize: '14px', lineHeight: 1, fontWeight: 800 }}>✓</span>}
                                </div>
                                <Users size={18} color={registerAsDebtor ? '#f59e0b' : '#94a3b8'} />
                                <span style={{ fontWeight: 600, fontSize: '14px', color: registerAsDebtor ? '#92400e' : 'var(--text-muted)' }}>
                                    Registrar como fiado (deudor)
                                </span>
                            </div>

                            {/* Expanded debtor options */}
                            {registerAsDebtor && (
                                <div style={{ padding: '16px', background: '#fffbeb', borderTop: '1px solid #fde68a' }}>

                                    {/* Mode tabs */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                                        {[
                                            { key: 'select', label: '👤 Deudor existente', icon: Users },
                                            { key: 'new', label: '➕ Nuevo deudor', icon: UserPlus },
                                        ].map(t => (
                                            <button
                                                key={t.key}
                                                onClick={() => { setDebtorMode(t.key); setSelectedDebtorId(''); }}
                                                style={{
                                                    flex: 1, padding: '8px 10px', borderRadius: '8px',
                                                    fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                                                    border: '2px solid',
                                                    borderColor: debtorMode === t.key ? '#f59e0b' : '#e2e8f0',
                                                    background: debtorMode === t.key ? '#fef3c7' : 'var(--white)',
                                                    color: debtorMode === t.key ? '#92400e' : 'var(--text-muted)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Select existing deudor */}
                                    {debtorMode === 'select' && (
                                        <div style={{ position: 'relative' }}>
                                            <div
                                                onClick={() => setDebtorDropdownOpen(p => !p)}
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                                                    border: '1.5px solid #fde68a', background: 'var(--white)',
                                                    fontSize: '14px', fontWeight: 500,
                                                    color: selectedDebtorId ? 'var(--text-main)' : '#94a3b8'
                                                }}
                                            >
                                                <span>
                                                    {selectedDebtorId
                                                        ? existingDeudores.find(d => d.id === parseInt(selectedDebtorId))?.name || 'Deudor'
                                                        : 'Seleccionar deudor…'}
                                                </span>
                                                <ChevronDown size={16} color="#94a3b8" />
                                            </div>
                                            {debtorDropdownOpen && (
                                                <div style={{
                                                    position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
                                                    background: 'var(--white)', border: '1.5px solid #fde68a',
                                                    borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                    zIndex: 50, maxHeight: '180px', overflowY: 'auto'
                                                }}>
                                                    {existingDeudores.length === 0 ? (
                                                        <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                            No hay deudores registrados. Crea uno nuevo.
                                                        </div>
                                                    ) : (
                                                        existingDeudores.map(d => (
                                                            <div
                                                                key={d.id}
                                                                onClick={() => { setSelectedDebtorId(String(d.id)); setDebtorDropdownOpen(false); }}
                                                                style={{
                                                                    padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                                                                    borderBottom: '1px solid #fef3c7',
                                                                    background: selectedDebtorId === String(d.id) ? '#fef3c7' : 'var(--white)',
                                                                    transition: 'background 0.15s'
                                                                }}
                                                                onMouseOver={e => e.currentTarget.style.background = '#fef3c7'}
                                                                onMouseOut={e => e.currentTarget.style.background = selectedDebtorId === String(d.id) ? '#fef3c7' : 'var(--white)'}
                                                            >
                                                                <span style={{ fontWeight: 600 }}>{d.name}</span>
                                                                {d.description && <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>{d.description}</span>}
                                                                <span style={{ float: 'right', fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
                                                                    Bs {d.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Create new deudor */}
                                    {debtorMode === 'new' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <input
                                                type="text"
                                                placeholder="Nombre del cliente *"
                                                value={newDebtorName}
                                                onChange={e => setNewDebtorName(e.target.value)}
                                                style={{
                                                    padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                                                    border: '1.5px solid #fde68a', background: 'var(--white)',
                                                    color: 'var(--text-main)', outline: 'none'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Descripción (opcional)"
                                                value={newDebtorDesc}
                                                onChange={e => setNewDebtorDesc(e.target.value)}
                                                style={{
                                                    padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                                                    border: '1.5px solid #fde68a', background: 'var(--white)',
                                                    color: 'var(--text-main)', outline: 'none'
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Validation hint */}
                                    {!debtorPanelValid && (
                                        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#d97706', fontWeight: 500 }}>
                                            {debtorMode === 'select'
                                                ? '⚠ Selecciona un deudor de la lista para continuar.'
                                                : '⚠ El nombre del cliente es obligatorio.'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Process button */}
                        <button
                            className="btn"
                            style={{
                                width: '100%', height: '60px', fontSize: '20px',
                                background: (cartItems.length > 0 && debtorPanelValid)
                                    ? (registerAsDebtor ? '#f59e0b' : '#28a745')
                                    : '#ccc',
                                cursor: (cartItems.length > 0 && debtorPanelValid) ? 'pointer' : 'not-allowed',
                                color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold',
                                transition: 'background 0.3s'
                            }}
                            onClick={handleGenerateInvoice}
                            disabled={cartItems.length === 0 || !debtorPanelValid}
                        >
                            {registerAsDebtor ? '📋 Registrar como Fiado' : 'Procesar y Generar Factura'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CartModule;
