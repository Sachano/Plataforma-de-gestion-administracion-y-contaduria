import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, X, Check, CreditCard, Users, ArrowUpCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatMoney = (amount) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

// ─── Add / Abono Modal ──────────────────────────────────────────────────────
const Modal = ({ title, icon: Icon, accentColor, onClose, children }) => (
    <div style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.18s ease'
    }}>
        <div style={{
            background: 'var(--white)', borderRadius: '16px',
            padding: '32px', width: '100%', maxWidth: '460px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            position: 'relative',
            borderTop: `5px solid ${accentColor}`
        }}>
            <button onClick={onClose} style={{
                position: 'absolute', top: '14px', right: '14px',
                background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px',
                padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}>
                <X size={18} color="var(--text-muted)" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ background: accentColor, borderRadius: '10px', padding: '8px', display: 'flex' }}>
                    <Icon size={20} color="white" />
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h2>
            </div>
            {children}
        </div>
    </div>
);

// ─── Input Field ─────────────────────────────────────────────────────────────
const Field = ({ label, type = 'text', value, onChange, placeholder, min }) => (
    <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
            {label}
        </label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            min={min}
            style={{
                width: '100%', padding: '11px 14px', borderRadius: '8px',
                border: '1.5px solid var(--border-color)',
                background: 'var(--bg-secondary)', color: 'var(--text-main)',
                fontSize: '15px', boxSizing: 'border-box',
                outline: 'none', transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--divider-blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
    </div>
);

// ─── Debt Card ───────────────────────────────────────────────────────────────
const DebtCard = ({ entry, onAbono, onDelete }) => {
    const isDebt = entry.type === 'deuda';
    const accentColor = isDebt ? '#ef4444' : '#f59e0b';
    const badgeLabel = isDebt ? 'DEUDA' : 'DEUDOR';
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{
            background: 'var(--white)',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            borderLeft: `5px solid ${accentColor}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s'
        }}>
            {/* Main row */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '18px 20px', cursor: 'pointer'
            }} onClick={() => setExpanded(p => !p)}>
                {/* Icon bubble */}
                <div style={{
                    width: '46px', height: '46px', borderRadius: '12px',
                    background: isDebt ? '#fee2e2' : '#fef3c7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    {isDebt
                        ? <CreditCard size={22} color={accentColor} />
                        : <Users size={22} color={accentColor} />}
                </div>

                {/* Name + badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                            {entry.name}
                        </span>
                        <span style={{
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px',
                            background: isDebt ? '#fee2e2' : '#fef3c7',
                            color: accentColor, padding: '2px 8px', borderRadius: '6px'
                        }}>
                            {badgeLabel}
                        </span>
                    </div>
                    {entry.description && (
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entry.description}
                        </p>
                    )}
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '20px', color: accentColor }}>
                        Bs {formatMoney(entry.amount)}
                    </div>
                    {entry.history && entry.history.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {entry.history.length} abono{entry.history.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>

                {/* Expand chevron */}
                <div style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* Expanded actions + history */}
            {expanded && (
                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    padding: '16px 20px',
                    background: 'var(--bg-secondary)',
                    display: 'grid', gap: '16px'
                }}>
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => onAbono(entry)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#10b981', color: 'white',
                                border: 'none', padding: '9px 16px', borderRadius: '8px',
                                fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            <ArrowUpCircle size={16} /> Abonar dinero
                        </button>
                        <button
                            onClick={() => onDelete(entry.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#fee2e2', color: '#ef4444',
                                border: '1px solid #fecaca', padding: '9px 16px', borderRadius: '8px',
                                fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            <Trash2 size={16} /> Eliminar
                        </button>
                    </div>

                    {/* History */}
                    {entry.history && entry.history.length > 0 && (
                        <div>
                            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                Historial de abonos
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {[...entry.history].reverse().map((h, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: 'var(--white)', borderRadius: '8px',
                                        padding: '8px 12px', fontSize: '13px'
                                    }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{h.date}</span>
                                        {h.note && <span style={{ color: 'var(--text-main)', flex: 1, margin: '0 12px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.note}</span>}
                                        <span style={{ fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>+ Bs {formatMoney(h.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Module ──────────────────────────────────────────────────────────────
const DebtsModule = ({ debts = [], onAdd, onAbono, onDelete }) => {
    const [filter, setFilter] = useState('all');   // 'all' | 'deuda' | 'deudor'
    const [search, setSearch] = useState('');

    // Modals
    const [addModal, setAddModal] = useState(false);
    const [abonoTarget, setAbonoTarget] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Add form
    const [addForm, setAddForm] = useState({ type: 'deuda', name: '', amount: '', description: '' });

    // Abono form
    const [abonoForm, setAbonoForm] = useState({ amount: '', note: '' });

    // ── Derived list ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return debts.filter(e => {
            const matchType = filter === 'all' || e.type === filter;
            const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                (e.description || '').toLowerCase().includes(search.toLowerCase());
            return matchType && matchSearch;
        });
    }, [debts, filter, search]);

    const totalDeudas = debts.filter(e => e.type === 'deuda').reduce((s, e) => s + e.amount, 0);
    const totalDeudores = debts.filter(e => e.type === 'deudor').reduce((s, e) => s + e.amount, 0);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        const { type, name, amount, description } = addForm;
        if (!name.trim() || !amount || parseFloat(amount) <= 0) return;
        await onAdd({ type, name: name.trim(), amount: parseFloat(amount), description: description.trim() });
        setAddModal(false);
        setAddForm({ type: 'deuda', name: '', amount: '', description: '' });
    };

    const handleAbono = async () => {
        const { amount, note } = abonoForm;
        if (!amount || parseFloat(amount) <= 0) return;
        await onAbono(abonoTarget.id, parseFloat(amount), note.trim());
        setAbonoTarget(null);
        setAbonoForm({ amount: '', note: '' });
    };

    const handleDelete = async (id) => {
        await onDelete(id);
        setDeleteConfirm(null);
    };

    return (
        <div style={{ paddingBottom: '60px' }}>

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, var(--white) 0%, var(--bg-secondary) 100%)',
                borderLeft: '6px solid #ef4444',
                padding: '28px 32px', marginBottom: '28px'
            }}>
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: 'var(--divider-blue)', lineHeight: 1.2 }}>
                    Deudas y Deudores
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: '8px 0 0', fontSize: '14px' }}>
                    Gestiona las deudas con distribuidores y las cuentas por cobrar a clientes.
                </p>
            </div>

            {/* ── Summary Cards ──────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {/* Deudas */}
                <div style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    borderRadius: '14px', padding: '22px 24px', color: 'white',
                    boxShadow: '0 4px 20px rgba(239,68,68,0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Deudas</p>
                            <p style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800 }}>Bs {formatMoney(totalDeudas)}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px', display: 'flex' }}>
                            <CreditCard size={24} />
                        </div>
                    </div>
                    <p style={{ margin: '12px 0 0', fontSize: '12px', opacity: 0.75 }}>
                        {debts.filter(e => e.type === 'deuda').length} distribuidor(es)
                    </p>
                </div>

                {/* Deudores */}
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: '14px', padding: '22px 24px', color: 'white',
                    boxShadow: '0 4px 20px rgba(245,158,11,0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Deudores</p>
                            <p style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800 }}>Bs {formatMoney(totalDeudores)}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px', display: 'flex' }}>
                            <Users size={24} />
                        </div>
                    </div>
                    <p style={{ margin: '12px 0 0', fontSize: '12px', opacity: 0.75 }}>
                        {debts.filter(e => e.type === 'deudor').length} cliente(s)
                    </p>
                </div>
            </div>

            {/* ── Toolbar: search + filter + add ─────────────────────────────── */}
            <div style={{
                display: 'flex', gap: '12px', marginBottom: '22px',
                flexWrap: 'wrap', alignItems: 'center'
            }}>
                {/* Search */}
                <div style={{
                    flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'var(--white)', border: '1.5px solid var(--border-color)',
                    borderRadius: '10px', padding: '0 14px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            border: 'none', outline: 'none', background: 'transparent',
                            color: 'var(--text-main)', fontSize: '14px', width: '100%', padding: '11px 0'
                        }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                            <X size={16} color="var(--text-muted)" />
                        </button>
                    )}
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                        { key: 'all', label: '🗂 Todos' },
                        { key: 'deuda', label: '💳 Deudas' },
                        { key: 'deudor', label: '👤 Deudores' },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={{
                                padding: '9px 16px', borderRadius: '10px', fontWeight: 600,
                                fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                                border: filter === f.key ? 'none' : '1.5px solid var(--border-color)',
                                background: filter === f.key ? 'var(--divider-blue)' : 'var(--white)',
                                color: filter === f.key ? 'white' : 'var(--text-main)',
                                boxShadow: filter === f.key ? '0 2px 10px rgba(0,0,0,0.15)' : 'none'
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Add button */}
                <button
                    onClick={() => setAddModal(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'var(--divider-blue)', color: 'white',
                        border: 'none', padding: '11px 20px', borderRadius: '10px',
                        fontWeight: 700, cursor: 'pointer', fontSize: '14px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)', transition: 'opacity 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Plus size={18} /> Añadir deuda / deudor
                </button>
            </div>

            {/* ── Entry List ────────────────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px', borderRadius: '14px',
                    background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)'
                }}>
                    <AlertCircle size={40} color="var(--text-muted)" style={{ marginBottom: '14px' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '17px' }}>
                        No hay resultados
                    </p>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {search ? 'Prueba con otra búsqueda.' : 'Añade una deuda o un deudor para empezar.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filtered.map(e => (
                        <DebtCard
                            key={e.id}
                            entry={e}
                            onAbono={entry => { setAbonoTarget(entry); setAbonoForm({ amount: '', note: '' }); }}
                            onDelete={id => setDeleteConfirm(id)}
                        />
                    ))}
                </div>
            )}

            {/* ── ADD MODAL ─────────────────────────────────────────────────── */}
            {addModal && (
                <Modal title="Nueva deuda / deudor" icon={Plus} accentColor="var(--divider-blue)" onClose={() => setAddModal(false)}>
                    {/* Type selector */}
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                            Tipo
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[
                                { key: 'deuda', label: '💳 Deuda (distribuidor)', color: '#ef4444' },
                                { key: 'deudor', label: '👤 Deudor (cliente)', color: '#f59e0b' },
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setAddForm(p => ({ ...p, type: t.key }))}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '13px', border: '2px solid',
                                        borderColor: addForm.type === t.key ? t.color : 'var(--border-color)',
                                        background: addForm.type === t.key ? (t.key === 'deuda' ? '#fee2e2' : '#fef3c7') : 'var(--bg-secondary)',
                                        color: addForm.type === t.key ? t.color : 'var(--text-muted)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Field
                        label="Nombre"
                        value={addForm.name}
                        onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                        placeholder={addForm.type === 'deuda' ? 'Nombre del distribuidor' : 'Nombre del cliente'}
                    />
                    <Field
                        label="Monto (Bs)"
                        type="number"
                        min="0"
                        value={addForm.amount}
                        onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0.00"
                    />
                    <Field
                        label="Descripción (opcional)"
                        value={addForm.description}
                        onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Detalles adicionales…"
                    />

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button
                            onClick={handleAdd}
                            disabled={!addForm.name.trim() || !addForm.amount || parseFloat(addForm.amount) <= 0}
                            style={{
                                flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                background: 'var(--divider-blue)', color: 'white', border: 'none',
                                padding: '12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
                                opacity: (!addForm.name.trim() || !addForm.amount || parseFloat(addForm.amount) <= 0) ? 0.5 : 1,
                                fontSize: '14px'
                            }}
                        >
                            <Check size={17} /> Guardar
                        </button>
                        <button onClick={() => setAddModal(false)} style={{
                            flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-main)',
                            border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px',
                            fontWeight: 600, cursor: 'pointer', fontSize: '14px'
                        }}>
                            Cancelar
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── ABONO MODAL ───────────────────────────────────────────────── */}
            {abonoTarget && (
                <Modal title={`Abonar a ${abonoTarget.name}`} icon={ArrowUpCircle} accentColor="#10b981" onClose={() => setAbonoTarget(null)}>
                    <p style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        Saldo actual: <strong style={{ color: 'var(--text-main)' }}>Bs {formatMoney(abonoTarget.amount)}</strong>
                    </p>
                    <Field
                        label="Monto a abonar (Bs)"
                        type="number"
                        min="0"
                        value={abonoForm.amount}
                        onChange={e => setAbonoForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0.00"
                    />
                    <Field
                        label="Nota (opcional)"
                        value={abonoForm.note}
                        onChange={e => setAbonoForm(p => ({ ...p, note: e.target.value }))}
                        placeholder="Ej: Pago con transferencia…"
                    />

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button
                            onClick={handleAbono}
                            disabled={!abonoForm.amount || parseFloat(abonoForm.amount) <= 0}
                            style={{
                                flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                background: '#10b981', color: 'white', border: 'none',
                                padding: '12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
                                opacity: (!abonoForm.amount || parseFloat(abonoForm.amount) <= 0) ? 0.5 : 1,
                                fontSize: '14px'
                            }}
                        >
                            <Check size={17} /> Confirmar abono
                        </button>
                        <button onClick={() => setAbonoTarget(null)} style={{
                            flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-main)',
                            border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px',
                            fontWeight: 600, cursor: 'pointer', fontSize: '14px'
                        }}>
                            Cancelar
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────── */}
            {deleteConfirm !== null && (
                <Modal title="Confirmar eliminación" icon={Trash2} accentColor="#ef4444" onClose={() => setDeleteConfirm(null)}>
                    <p style={{ margin: '0 0 24px', fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.6 }}>
                        ¿Estás seguro de que deseas eliminar esta entrada permanentemente? <br />
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Esta acción no se puede deshacer.</span>
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => handleDelete(deleteConfirm)}
                            style={{
                                flex: 1, background: '#ef4444', color: 'white', border: 'none',
                                padding: '12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                fontSize: '14px'
                            }}
                        >
                            <Trash2 size={17} /> Sí, eliminar
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} style={{
                            flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-main)',
                            border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px',
                            fontWeight: 600, cursor: 'pointer', fontSize: '14px'
                        }}>
                            Cancelar
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DebtsModule;
