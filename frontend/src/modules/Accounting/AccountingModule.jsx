import { useState, useMemo } from 'react';
import {
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Filter } from 'lucide-react';

const COLORS = ['#2b3a67', '#f0a500', '#526194', '#e88d14', '#1d2d50', '#ffc107'];

const AccountingModule = ({ invoices, inventory }) => {
    const [timeFilter, setTimeFilter] = useState('monthly');

    // --- MOCK DATA GENERATION ---
    const actualRevenue = invoices.reduce((acc, inv) => acc + inv.total, 0);

    const baseRevenue = timeFilter === 'daily' ? 1500 : timeFilter === 'weekly' ? 10500 : timeFilter === 'monthly' ? 45000 : 540000;
    const simulatedRevenue = baseRevenue + actualRevenue;
    const simulatedExpenses = simulatedRevenue * 0.4;
    const simulatedAssets = simulatedRevenue * 2.5;
    const simulatedLiabilities = simulatedAssets * 0.4;
    const simulatedEquity = simulatedAssets - simulatedLiabilities;

    const lineData = useMemo(() => {
        const points = timeFilter === 'yearly' ? 12 : timeFilter === 'monthly' ? 4 : 7;
        const labels = timeFilter === 'yearly' ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] :
            timeFilter === 'monthly' ? ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'] :
                ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

        return Array.from({ length: points }).map((_, i) => ({
            name: labels[i] || `Punto ${i + 1}`,
            Ingresos: Math.round((simulatedRevenue / points) * (1 + (Math.random() * 0.4 - 0.2))),
            Egresos: Math.round((simulatedExpenses / points) * (1 + (Math.random() * 0.4 - 0.2)))
        }));
    }, [timeFilter, simulatedRevenue, simulatedExpenses]);

    const pieData = [
        { name: 'Activos Corrientes', value: Math.round(simulatedAssets * 0.6) },
        { name: 'Activos Fijos', value: Math.round(simulatedAssets * 0.3) },
        { name: 'Cargos Diferidos', value: Math.round(simulatedAssets * 0.1) },
    ];

    const areaData = useMemo(() => {
        return lineData.map((d) => ({
            name: d.name,
            Costos: Math.round(d.Ingresos * 0.3),
            Depreciacion: Math.round(d.Egresos * 0.15),
            Amortizacion: Math.round(d.Egresos * 0.05),
        }));
    }, [lineData]);

    const MetricCard = ({ title, amount, icon: Icon, color, trend }) => (
        <div className="card" style={{ flex: 1, minWidth: '200px', padding: '20px', display: 'flex', flexDirection: 'column', borderLeft: `5px solid ${color}`, borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)', fontWeight: 600 }}>{title}</h3>
                <div style={{ padding: '8px', background: `${color}15`, borderRadius: '8px', color: color }}>
                    <Icon size={20} />
                </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--divider-blue)', marginBottom: '10px' }}>
                ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: trend > 0 ? '#28a745' : '#ff4d4f', fontWeight: 500 }}>
                {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{Math.abs(trend)}% vs periodo anterior</span>
            </div>
        </div>
    );

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 className="title" style={{ margin: 0, border: 'none', fontSize: '26px' }}>Contaduría General</h2>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--white)', padding: '5px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--divider-blue-light)' }}>
                    <Filter size={18} color="var(--divider-blue)" />
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        style={{ margin: 0, border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: 'var(--divider-blue)', cursor: 'pointer', padding: '8px', fontSize: '15px' }}
                    >
                        <option value="daily">Vista Diaria</option>
                        <option value="weekly">Vista Semanal</option>
                        <option value="monthly">Vista Mensual</option>
                        <option value="yearly">Vista Anual</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '25px', marginBottom: '35px', flexWrap: 'wrap' }}>
                <MetricCard title="Ingresos Totales (Ventas)" amount={simulatedRevenue} icon={DollarSign} color="#28a745" trend={12.5} />
                <MetricCard title="Egresos y Gastos" amount={simulatedExpenses} icon={TrendingDown} color="#ff4d4f" trend={-4.2} />
                <MetricCard title="Patrimonio Neto" amount={simulatedEquity} icon={Activity} color="var(--accent-orange)" trend={8.4} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(600px, 2fr) minmax(350px, 1fr)', gap: '30px', marginBottom: '30px' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'var(--divider-blue)', marginTop: 0, marginBottom: '25px', fontSize: '20px' }}>Evolución de Ingresos y Egresos</h3>
                    <div style={{ width: '100%', height: '350px' }}>
                        <ResponsiveContainer>
                            <LineChart data={lineData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 13 }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 13 }} tickFormatter={(val) => `$${val / 1000}k`} dx={-10} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="Ingresos" stroke="#28a745" strokeWidth={4} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="Egresos" stroke="#ff4d4f" strokeWidth={4} dot={{ r: 5, strokeWidth: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, var(--divider-blue) 0%, #1a2444 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
                        <Activity size={200} />
                    </div>

                    <h3 style={{ margin: '0 0 25px 0', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '15px', fontSize: '22px', position: 'relative', zIndex: 1 }}>Fórmulas Financieras</h3>

                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '25px', borderRadius: '12px', marginBottom: '20px', position: 'relative', zIndex: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '8px' }}>Ingresos - Costos de Venta =</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-orange)' }}>Ganancia Bruta</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '25px', borderRadius: '12px', position: 'relative', zIndex: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '8px' }}>Activos Totales - Pasivos Totales =</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80' }}>Patrimonio Neto</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(600px, 2fr)', gap: '30px' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'var(--divider-blue)', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>Distribución de Activos</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={40} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'var(--divider-blue)', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>Costos, Depreciación y Amortización</h3>
                    <div style={{ width: '100%', height: '350px' }}>
                        <ResponsiveContainer>
                            <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCostos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--divider-blue)" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="var(--divider-blue)" stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-orange)" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="var(--accent-orange)" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 13 }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 13 }} tickFormatter={(val) => `$${val / 1000}k`} dx={-10} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="Costos" stroke="var(--divider-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorCostos)" />
                                <Area type="monotone" dataKey="Depreciacion" stroke="var(--accent-orange)" strokeWidth={3} fillOpacity={1} fill="url(#colorDep)" />
                                <Area type="monotone" dataKey="Amortizacion" stroke="#8884d8" strokeWidth={3} fillOpacity={0.3} fill="#8884d8" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountingModule;
