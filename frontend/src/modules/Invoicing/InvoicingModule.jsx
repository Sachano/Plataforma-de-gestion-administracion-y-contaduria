import { useState, useRef } from 'react';
import { Search, Download, Image as ImageIcon, Calendar, CheckSquare, Square } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// import logo from '../../assets/logo.jpg';
const logo = '';

const InvoicingModule = ({ invoices }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // Ref for a hidden div used to render invoices for downloading
    const printRef = useRef(null);

    // Sorting invoices by newest first
    const sortedInvoices = [...invoices].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filtering
    const filteredInvoices = sortedInvoices.filter(inv => {
        let matchesSearch = true;
        let matchesDate = true;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            // search in ID or inside items
            const inId = inv.id.toLowerCase().includes(term);
            const inItems = inv.items.some(item => item.name.toLowerCase().includes(term) || (item.brand && item.brand.toLowerCase().includes(term)));
            matchesSearch = inId || inItems;
        }

        if (dateFilter) {
            const invDate = new Date(inv.timestamp).toISOString().split('T')[0];
            matchesDate = invDate === dateFilter;
        }

        return matchesSearch && matchesDate;
    });

    const handleSelectAll = () => {
        if (selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredInvoices.map(i => i.id));
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Download logic
    // We temporarily mount the invoice to printRef, capture it, then clear it.
    const [printingInvoice, setPrintingInvoice] = useState(null);

    const generateFile = async (format) => {
        if (selectedIds.length === 0) return alert("Seleccione al menos una factura para descargar.");

        // For simplicity, we process them one by one
        for (const sid of selectedIds) {
            const inv = invoices.find(i => i.id === sid);
            await processDownload(inv, format);
        }

        alert(`Se descargaron ${selectedIds.length} facturas en formato ${format.toUpperCase()}`);
        setSelectedIds([]); // clear selection
    };

    const processDownload = (invoice, format) => {
        return new Promise((resolve) => {
            // Step 1: Set the invoice to print state to render it in hidden div
            setPrintingInvoice(invoice);

            // Step 2: Wait for re-render, then capture
            setTimeout(async () => {
                if (!printRef.current) {
                    resolve(); return;
                }

                try {
                    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);

                    if (format === 'jpg') {
                        const link = document.createElement('a');
                        link.download = `Factura_${invoice.id}.jpg`;
                        link.href = imgData;
                        link.click();
                    } else if (format === 'pdf') {
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                        pdf.save(`Factura_${invoice.id}.pdf`);
                    }
                } catch (error) {
                    console.error("Error generando archivo", error);
                }

                setPrintingInvoice(null);
                resolve();
            }, 500); // 500ms delay to ensure images/fonts loaded in ref
        });
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="title">Control de Cuentas y Facturas</h2>

            <div className="card" style={{ marginBottom: '20px', padding: '15px 25px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--divider-blue-light)', flex: 1, minWidth: '300px' }}>
                        <Search size={20} color="var(--divider-blue)" />
                        <input
                            type="text"
                            placeholder="Buscar por producto, marca o N° Factura..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 1, margin: 0, border: 'none', background: 'transparent', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--divider-blue-light)' }}>
                        <Calendar size={20} color="var(--divider-blue)" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            style={{ margin: 0, border: 'none', background: 'transparent', outline: 'none' }}
                        />
                    </div>

                    {dateFilter && (
                        <button onClick={() => setDateFilter('')} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', textDecoration: 'underline' }}>Limpiar Fecha</button>
                    )}

                </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={handleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--divider-blue)', fontWeight: 500 }}>
                        {selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                        Seleccionar Todos
                    </button>
                    <span style={{ color: 'var(--text-muted)' }}>({selectedIds.length} seleccionados)</span>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button
                        className="btn"
                        style={{ background: selectedIds.length > 0 ? 'var(--divider-blue)' : '#ccc', cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed' }}
                        onClick={() => generateFile('pdf')}
                        disabled={selectedIds.length === 0}
                    >
                        <Download size={18} /> Descargar PDF
                    </button>
                    <button
                        className="btn btn-accent"
                        style={{ background: selectedIds.length > 0 ? 'var(--accent-orange)' : '#ccc', cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed' }}
                        onClick={() => generateFile('jpg')}
                        disabled={selectedIds.length === 0}
                    >
                        <ImageIcon size={18} /> Descargar JPG
                    </button>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="card" style={{ flex: 1, padding: 0, overflowY: 'auto' }}>
                {filteredInvoices.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '18px' }}>No hay facturas que coincidan con la búsqueda.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--divider-blue-light)', zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '15px 20px', width: '50px' }}></th>
                                <th style={{ padding: '15px 10px', color: 'var(--divider-blue)' }}>N° Factura</th>
                                <th style={{ padding: '15px 10px', color: 'var(--divider-blue)' }}>Fecha y Hora</th>
                                <th style={{ padding: '15px 10px', color: 'var(--divider-blue)' }}>Productos</th>
                                <th style={{ padding: '15px 20px', color: 'var(--divider-blue)', textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((inv, idx) => (
                                <tr key={inv.id} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'var(--white)' : '#fafafa', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => handleSelectOne(inv.id)}>
                                    <td style={{ padding: '15px 20px', color: 'var(--divider-blue)' }}>
                                        {selectedIds.includes(inv.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </td>
                                    <td style={{ padding: '15px 10px', fontWeight: 600 }}>{inv.id}</td>
                                    <td style={{ padding: '15px 10px' }}>{new Date(inv.timestamp).toLocaleString()}</td>
                                    <td style={{ padding: '15px 10px' }}>
                                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {inv.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 'bold', color: 'var(--divider-blue)' }}>
                                        ${inv.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Hidden Render Template for PDF/JPG generation */}
            <div style={{ height: 0, overflow: 'hidden' }}>
                <div ref={printRef} style={{ width: '800px', padding: '40px', background: 'white', color: '#333' }}>
                    {printingInvoice && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #2b3a67', paddingBottom: '20px' }}>
                                <h1 style={{ color: '#2b3a67', margin: 0, letterSpacing: '2px' }}>DONDE JENNY</h1>
                                <p style={{ margin: '5px 0 0', color: '#666' }}>Documento fiscal o Recibo</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '16px' }}>
                                <div><strong>Factura N°:</strong> {printingInvoice.id}</div>
                                <div><strong>Fecha:</strong> {new Date(printingInvoice.timestamp).toLocaleString()}</div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #ddd', background: '#f4f4f9' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', color: '#2b3a67' }}>Producto</th>
                                        <th style={{ textAlign: 'center', padding: '12px', color: '#2b3a67' }}>Cant.</th>
                                        <th style={{ textAlign: 'right', padding: '12px', color: '#2b3a67' }}>Precio Unit.</th>
                                        <th style={{ textAlign: 'right', padding: '12px', color: '#2b3a67' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {printingInvoice.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                <div style={{ fontSize: '12px', color: '#f0a500' }}>{item.presentationName}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '12px' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '12px' }}>${item.unitPrice.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>${(item.quantity * item.unitPrice).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ borderTop: '3px solid #2b3a67', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b3a67' }}>
                                    Total a Pagar: ${printingInvoice.total.toFixed(2)}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
};

export default InvoicingModule;
