import { Download, LogOut, CheckCircle } from 'lucide-react';

const CheckoutOverlay = ({ invoice, onDownload, onClose }) => {
    const rates = invoice.exchangeRates || [];
    const bcvRate = rates.find(r => r.id === 'usd_bcv')?.value || 0;
    const binanceRate = rates.find(r => r.id === 'usd_binance')?.value || 0;
    const promedioRate = rates.find(r => r.id === 'usd_promedio')?.value || 0;

    const totalUSD = invoice.total;
    const totalBcv = totalUSD * bcvRate;
    const totalBinance = totalUSD * binanceRate;
    const totalPromedio = totalUSD * promedioRate;

    const fmtBs = (val) => val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '40px', overflowY: 'auto' }}>

            <div style={{ textAlign: 'center', marginBottom: '30px', animation: 'fadeIn 0.5s ease-out' }}>
                <CheckCircle size={80} color="var(--accent-orange)" style={{ marginBottom: '15px' }} />
                <h1 style={{ color: 'var(--divider-blue)', fontSize: '36px', margin: 0 }}>La compra se realizó con éxito</h1>
            </div>

            <div className="card" style={{ maxWidth: '800px', margin: '0 auto 30px', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                <h2 style={{ textAlign: 'center', borderBottom: '2px solid var(--divider-blue-light)', paddingBottom: '20px', fontSize: '28px', color: 'var(--divider-blue)', letterSpacing: '2px' }}>DONDE JENNY</h2>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', color: 'var(--text-muted)', fontSize: '16px', marginTop: '20px' }}>
                    <span style={{ fontWeight: 'bold' }}>Factura N°: {invoice.id}</span>
                    <span>Fecha: {new Date(invoice.timestamp).toLocaleString()}</span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                            <th style={{ textAlign: 'left', padding: '15px 10px', color: 'var(--divider-blue)' }}>Producto</th>
                            <th style={{ textAlign: 'center', padding: '15px 10px', color: 'var(--divider-blue)' }}>Cant.</th>
                            <th style={{ textAlign: 'right', padding: '15px 10px', color: 'var(--divider-blue)' }}>Precio Unit. (USD)</th>
                            <th style={{ textAlign: 'right', padding: '15px 10px', color: 'var(--divider-blue)' }}>Total (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.2s' }}>
                                <td style={{ padding: '20px 10px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px' }}>{item.name}</div>
                                    <div style={{ fontSize: '14px', color: 'var(--accent-orange)' }}>Empaque: {item.presentationName}</div>
                                </td>
                                <td style={{ textAlign: 'center', padding: '20px 10px', fontSize: '18px' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', padding: '20px 10px', fontSize: '16px' }}>${item.unitPrice.toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '20px 10px', fontWeight: 'bold', fontSize: '18px' }}>${(item.quantity * item.unitPrice).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals section */}
                <div style={{ marginTop: 'auto', borderTop: '3px solid var(--divider-blue)', paddingTop: '25px' }}>

                    {/* Total USD - main */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--divider-blue)' }}>
                            Total a Pagar: <span style={{ color: 'var(--accent-orange)' }}>${totalUSD.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Conversions box */}
                    {(bcvRate > 0 || binanceRate > 0 || promedioRate > 0) && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <div style={{ background: 'var(--divider-blue)', color: 'white', padding: '10px 18px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Equivalencias en Bolívares (Bs)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>

                                {/* BCV */}
                                <div style={{ padding: '18px 20px', background: '#eff6ff', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>BCV</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                                        ${totalUSD.toFixed(2)} × {bcvRate.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e40af' }}>
                                        Bs. {fmtBs(totalBcv)}
                                    </div>
                                </div>

                                {/* Binance */}
                                <div style={{ padding: '18px 20px', background: '#faf5ff', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Binance</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                                        ${totalUSD.toFixed(2)} × {binanceRate.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>
                                        Bs. {fmtBs(totalBinance)}
                                    </div>
                                </div>

                                {/* Promedio */}
                                <div style={{ padding: '18px 20px', background: '#f0fdf4', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>⌀ Promedio</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                                        (BCV + Binance) ÷ 2 = {promedioRate.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                                        Bs. {fmtBs(totalPromedio)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
                <button className="btn" onClick={onDownload} style={{ background: '#28a745', fontSize: '18px', padding: '15px 30px' }}>
                    <Download size={24} style={{ marginRight: '10px' }} /> Descargar Factura
                </button>
                <button className="btn btn-accent" onClick={onClose} style={{ fontSize: '18px', padding: '15px 30px' }}>
                    <LogOut size={24} style={{ marginRight: '10px' }} /> Salir
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
        </div>
    );
};

export default CheckoutOverlay;
