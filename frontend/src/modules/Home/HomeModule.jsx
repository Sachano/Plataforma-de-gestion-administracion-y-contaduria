import { useMemo, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ShoppingBag, BarChart2 } from 'lucide-react';

// ─────────────────────────────────────────────
// Helper: devuelve el saludo según la hora del sistema.
// Cuando exista un backend, éste puede inyectar el valor
// directamente en el prop `greeting` y esta función queda de respaldo.
// ─────────────────────────────────────────────
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

const HomeModule = ({ invoices = [], inventory = [], exchangeRates = [], greeting: greetingProp }) => {
    // El backend puede pasar el saludo como prop; si no, lo calculamos localmente.
    const greeting = greetingProp || getGreeting();

    // ── DATOS PARA EL GRÁFICO ──────────────────
    const actualRevenue = invoices.reduce((acc, inv) => acc + inv.total, 0);
    const baseMonthlyRevenue = 45000;
    const simulatedRevenue = baseMonthlyRevenue + actualRevenue;

    const [chartView, setChartView] = useState('monthly');

    const areaData = useMemo(() => {
        if (chartView === 'monthly') {
            const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
            return labels.map((name) => ({
                name,
                Ingresos: Math.round((simulatedRevenue / 4) * (1 + (Math.random() * 0.4 - 0.2))),
            }));
        } else {
            const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return labels.map((name) => ({
                name,
                Ingresos: Math.round((simulatedRevenue) * (1 + (Math.random() * 0.4 - 0.2))),
            }));
        }
    }, [simulatedRevenue, chartView]);

    // ── VENTAS DEL DÍA: del más nuevo al más viejo ─
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysInvoices = [...invoices]
        .filter(inv => {
            try {
                return new Date(inv.timestamp).toISOString().split('T')[0] === todayStr;
            } catch { return false; }
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // ── PRODUCTOS VENDIDOS HOY (agrupados) ────────
    // Recorre todas las ventas del día y acumula cantidad por producto
    const soldProductsMap = {};
    todaysInvoices.forEach(inv => {
        (inv.items || []).forEach(item => {
            if (!soldProductsMap[item.name]) {
                soldProductsMap[item.name] = { name: item.name, quantity: 0, revenue: 0, lastSale: inv.timestamp };
            }
            soldProductsMap[item.name].quantity += item.quantity;
            soldProductsMap[item.name].revenue += item.quantity * item.price;
            // Mantiene el timestamp de la venta más reciente
            if (new Date(inv.timestamp) > new Date(soldProductsMap[item.name].lastSale)) {
                soldProductsMap[item.name].lastSale = inv.timestamp;
            }
        });
    });
    // Ordena por última vez que se vendió (más reciente primero)
    const soldProducts = Object.values(soldProductsMap)
        .sort((a, b) => new Date(b.lastSale) - new Date(a.lastSale));

    // ── TOTAL VENTAS DE HOY ───────────────────────
    const todayTotal = todaysInvoices.reduce((acc, inv) => acc + inv.total, 0);

    return (
        <div style={{ paddingBottom: '40px' }}>

            {/* ── CABECERA: Saludo + Nombre ───────────────── */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, var(--white) 0%, var(--bg-secondary) 100%)',
                borderLeft: '6px solid var(--accent-orange)',
                padding: '30px 35px',
                marginBottom: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.03em' }}>
                        {greeting} 👋
                    </p>
                    <h1 style={{ color: 'var(--divider-blue)', margin: 0, fontSize: '34px', fontWeight: 700, lineHeight: 1.2 }}>
                        Señorita Jenny
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '8px 0 0 0' }}>
                        Aquí tienes el resumen del negocio. Navega en el menú izquierdo para todas las opciones.
                    </p>
                </div>

                {/* Chip de total del día */}
                <div style={{
                    background: 'var(--accent-orange)',
                    borderRadius: '16px',
                    padding: '14px 24px',
                    textAlign: 'center',
                    color: 'white',
                    boxShadow: '0 4px 14px rgba(230,126,34,0.35)',
                    minWidth: '160px',
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.85, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ventas de hoy
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800 }}>
                        ${todayTotal.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                        {todaysInvoices.length} {todaysInvoices.length === 1 ? 'factura' : 'facturas'}
                    </div>
                </div>
            </div>

            {/* ── SECCIÓN: PRODUCTOS VENDIDOS HOY ─────────── */}
            <div className="card" style={{ marginBottom: '30px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '20px', borderBottom: '2px solid var(--divider-blue-light)', paddingBottom: '12px'
                }}>
                    <ShoppingBag size={22} color="var(--accent-orange)" />
                    <h3 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '17px', fontWeight: 700 }}>
                        Productos Vendidos Hoy
                    </h3>
                    <span style={{
                        marginLeft: 'auto', background: 'var(--bg-secondary)',
                        color: 'var(--text-muted)', borderRadius: '20px',
                        padding: '2px 12px', fontSize: '12px', fontWeight: 600
                    }}>
                        Del más reciente al más antiguo
                    </span>
                </div>

                {soldProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '14px' }}>
                        <ShoppingBag size={40} style={{ opacity: 0.25, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                        No se han registrado ventas el día de hoy.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {soldProducts.map((prod, idx) => (
                            <div key={prod.name} style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                padding: '16px',
                                borderLeft: '4px solid var(--accent-orange)',
                                position: 'relative',
                                transition: 'box-shadow 0.2s',
                            }}>
                                {/* Número de orden (1 = más reciente) */}
                                <span style={{
                                    position: 'absolute', top: '10px', right: '12px',
                                    fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700
                                }}>
                                    #{idx + 1}
                                </span>
                                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', marginBottom: '6px', paddingRight: '24px' }}>
                                    {prod.name}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    Cantidad vendida:&nbsp;
                                    <span style={{ color: 'var(--divider-blue)', fontWeight: 700 }}>{prod.quantity}</span>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-orange)', marginTop: '6px' }}>
                                    ${prod.revenue.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Última venta: {new Date(prod.lastSale).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── SECCIÓN: ANÁLISIS MENSUAL / ANUAL ────────── */}
            <div className="card" style={{ marginBottom: 0 }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '20px', borderBottom: '2px solid var(--divider-blue-light)', paddingBottom: '12px',
                    flexWrap: 'wrap', gap: '10px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart2 size={22} color="var(--accent-orange)" />
                        <h3 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '17px', fontWeight: 700 }}>
                            Análisis de Ingresos&nbsp;
                            <span style={{ fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>
                                — {chartView === 'monthly' ? 'Vista Mensual' : 'Vista Anual'}
                            </span>
                        </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['monthly', 'yearly'].map(view => (
                            <button
                                key={view}
                                onClick={() => setChartView(view)}
                                style={{
                                    padding: '6px 18px',
                                    background: chartView === view ? 'var(--divider-blue)' : 'var(--bg-secondary)',
                                    color: chartView === view ? 'white' : 'var(--text-main)',
                                    border: 'none', borderRadius: '20px', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                                }}
                            >
                                {view === 'monthly' ? 'Mensual' : 'Anual'}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-orange)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--accent-orange)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 13 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 13 }} tickFormatter={(val) => `$${val / 1000}k`} dx={-10} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                                formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']}
                            />
                            <Area type="monotone" dataKey="Ingresos" stroke="var(--accent-orange)" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── SECCIÓN: EQUIVALENCIAS MONETARIAS ────────── */}
            <div className="card" style={{ marginBottom: 0, marginTop: '30px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '20px', borderBottom: '2px solid var(--divider-blue-light)', paddingBottom: '12px'
                }}>
                    <h3 style={{ margin: 0, color: 'var(--divider-blue)', fontSize: '17px', fontWeight: 700 }}>
                        Equivalencias Monetarias
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '16px',
                        borderRadius: '12px',
                        borderLeft: '4px solid #10b981'
                    }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Dólares (1)</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            {exchangeRates.filter(r => r.group === 'usd').map(r => (
                                <span key={r.id}>
                                    <strong>{r.name === 'Tu equivalencia' && r.isCustomLabel ? (r.customName || 'Tu equivalencia') : r.name}</strong>
                                    {' '}={r.value || 0} Bs {' / '}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '16px',
                        borderRadius: '12px',
                        borderLeft: '4px solid #f59e0b'
                    }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Pesos Colombianos</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            {exchangeRates.find(r => r.id === 'cop')?.value || 6} Bs
                        </div>
                    </div>

                    {/* Mostrar cualquier otra moneda agregada que no sea USD o COP */}
                    {exchangeRates.filter(r => r.group !== 'usd' && r.group !== 'cop').map(r => (
                        <div key={r.id} style={{
                            background: 'var(--bg-secondary)',
                            padding: '16px',
                            borderRadius: '12px',
                            borderLeft: '4px solid #6366f1' // Indigo
                        }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>{r.name}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                {r.value} Bs
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default HomeModule;
