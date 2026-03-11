import { useState, useEffect } from 'react';
import MainLayout from './components/MainLayout';
import StorageModule from './modules/Storage/StorageModule';
import InvoicingModule from './modules/Invoicing/InvoicingModule';
import AccountingModule from './modules/Accounting/AccountingModule';
import CartModule from './modules/Cart/CartModule';
import HomeModule from './modules/Home/HomeModule';
import MonetaryEquivalenciesModule from './modules/MonetaryEquivalencies/MonetaryEquivalenciesModule';
import DebtsModule from './modules/Debts/DebtsModule';

function App() {
  const [activeModule, setActiveModule] = useState('home');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Core application state that will later be moved to global context/backend
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Debts & Debtors state 
  const [debts, setDebts] = useState([]);

  // Fetch inventory, invoices and debts from backend on mount
  useEffect(() => {
    // Inventory
    fetch('http://localhost:3001/api/inventory')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setInventory(data); else setInventory([]); })
      .catch(err => console.error('Error fetching inventory:', err));

    // Invoices
    fetch('http://localhost:3001/api/invoices')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setInvoices(data); else setInvoices([]); })
      .catch(err => console.error('Error fetching invoices:', err));

    // Debts
    fetch('http://localhost:3001/api/debts')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDebts(data); else setDebts([]); })
      .catch(err => console.error('Error fetching debts:', err));
  }, []);

  // Monetary Equivalencies State
  const [exchangeRates, setExchangeRates] = useState([
    { id: 'usd_bcv', name: 'BCV', value: 425.67, isDeletable: false, group: 'usd' },
    { id: 'usd_binance', name: 'Binance', value: 622.11, isDeletable: false, group: 'usd' },
    { id: 'cop', name: 'Pesos Colombianos', value: 6, isDeletable: false, group: 'cop' }
  ]);

  // Compute promedio (BCV + Binance) / 2 dynamically
  const bcvRate = exchangeRates.find(r => r.id === 'usd_bcv')?.value || 0;
  const binanceRate = exchangeRates.find(r => r.id === 'usd_binance')?.value || 0;
  const promedioRate = (bcvRate + binanceRate) / 2;

  // Inject the computed promedio into exchangeRates for downstream use
  const exchangeRatesWithPromedio = [
    ...exchangeRates.filter(r => r.id !== 'usd_promedio'),
    { id: 'usd_promedio', name: 'Promedio', value: promedioRate, isDeletable: false, isComputed: true, group: 'usd' }
  ];
  const [autoRatesEnabled, setAutoRatesEnabled] = useState(false);

  // Fetch live exchange rates when autoRatesEnabled is toggled on, or on mount if already on
  useEffect(() => {
    if (!autoRatesEnabled) return;

    const fetchLiveRates = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/exchange-rates/live');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        if (data.bcv && data.binance) {
          setExchangeRates(prev => prev.map(rate => {
            if (rate.id === 'usd_bcv') return { ...rate, value: data.bcv };
            if (rate.id === 'usd_binance') return { ...rate, value: data.binance };
            return rate;
          }));
        }
      } catch (err) {
        console.error('Failed to fetch live rates:', err);
      }
    };

    fetchLiveRates();

    // Optional: Refresh every 30 minutes
    const interval = setInterval(fetchLiveRates, 30 * 60 * 1000);
    return () => clearInterval(interval);

  }, [autoRatesEnabled]);

  const handleModuleChange = (moduleId) => {
    setActiveModule(moduleId);
    setIsCartOpen(false);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  // ─── Debts API Handlers ───────────────────────────────────────────────────
  const handleAddDebt = async (formData) => {
    try {
      const res = await fetch('http://localhost:3001/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Error al guardar');
      const newDebt = await res.json();
      setDebts(prev => [...prev, newDebt]);
    } catch (err) {
      console.error(err);
      alert('Error al guardar la deuda: ' + err.message);
    }
  };

  const handleAbono = async (debtId, amount, note) => {
    try {
      const res = await fetch(`http://localhost:3001/api/debts/${debtId}/abono`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, note })
      });
      if (!res.ok) throw new Error('Error al registrar el abono');
      const updated = await res.json();
      setDebts(prev => prev.map(d => {
        if (d.id !== debtId) return d;
        return {
          ...d,
          amount: updated.amount,
          history: [...(d.history || []), {
            amount: updated.lastAbono?.amount || amount,
            note: note || '',
            date: new Date().toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' })
          }]
        };
      }));
    } catch (err) {
      console.error(err);
      alert('Error al registrar el abono: ' + err.message);
    }
  };

  const handleDeleteDebt = async (debtId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/debts/${debtId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setDebts(prev => prev.filter(d => d.id !== debtId));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <MainLayout
      activeModule={activeModule}
      onModuleChange={handleModuleChange}
      onCartToggle={toggleCart}
    >
      {isCartOpen ? (
        <CartModule
          inventory={inventory}
          exchangeRates={exchangeRatesWithPromedio}
          debts={debts}
          setDebts={setDebts}
          onCheckout={async (invoice, debtInfo) => {
            try {
              if (debtInfo) {
                // Generate Invoice as Debt
                const { debtorId, isNew, newDebtor } = debtInfo;
                const payload = {
                  id: invoice.id,
                  total_usd: invoice.total,
                  items: invoice.items,
                  debtorId: isNew ? undefined : parseInt(debtorId),
                  newDebtorName: isNew ? newDebtor.name : undefined
                };

                const res = await fetch('http://localhost:3001/api/debts/invoice', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Error guardando la deuda');

                // For simplicity, re-fetch all debts (since we don't have a GET yet, we'll append to local state if missing, but we better fetch it soon)
                // We'll update state locally for now based on the assumption it worked
                if (isNew) {
                  const data = await res.json();
                  const newDbId = data.debtorId;
                  setDebts(prev => [...prev, {
                    id: newDbId,
                    type: 'deudor',
                    name: newDebtor.name,
                    description: newDebtor.description || '',
                    amount: invoice.total,
                    history: [{ amount: invoice.total }]
                  }]);
                } else {
                  setDebts(prev => prev.map(d => {
                    if (d.id !== parseInt(debtorId)) return d;
                    return {
                      ...d,
                      amount: Number(d.amount) + Number(invoice.total),
                      history: d.history ? [...d.history, { amount: invoice.total }] : [{ amount: invoice.total }]
                    };
                  }));
                }
              } else {
                // Generate Standard Invoice
                const payload = {
                  id: invoice.id,
                  total_usd: invoice.total,
                  items: invoice.items
                };

                const res = await fetch('http://localhost:3001/api/invoices', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Error guardando la factura');

                setInvoices([...invoices, invoice]);
              }

              // Finally, re-fetch the entire inventory because stock has decreased!
              const invRes = await fetch('http://localhost:3001/api/inventory');
              if (invRes.ok) {
                const updatedInventory = await invRes.json();
                setInventory(updatedInventory);
              }

              setIsCartOpen(false);
              alert(debtInfo ? '✅ Deuda registrada con éxito' : '✅ Factura generada con éxito. ¡Venta completada!');
            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          }}
          onClose={() => setIsCartOpen(false)}
        />
      ) : (
        <>
          {activeModule === 'home' && (
            <HomeModule invoices={invoices} inventory={inventory} exchangeRates={exchangeRatesWithPromedio} />
          )}
          {activeModule === 'storage' && (
            <StorageModule inventory={inventory} setInventory={setInventory} />
          )}
          {activeModule === 'invoicing' && (
            <InvoicingModule invoices={invoices} />
          )}
          {activeModule === 'accounting' && (
            <AccountingModule invoices={invoices} inventory={inventory} />
          )}
          {activeModule === 'monetary_equivalencies' && (
            <MonetaryEquivalenciesModule
              exchangeRates={exchangeRatesWithPromedio}
              setExchangeRates={setExchangeRates}
              autoRatesEnabled={autoRatesEnabled}
              setAutoRatesEnabled={setAutoRatesEnabled}
            />
          )}
          {activeModule === 'debts' && (
            <DebtsModule
              debts={debts}
              onAdd={handleAddDebt}
              onAbono={handleAbono}
              onDelete={handleDeleteDebt}
            />
          )}
        </>
      )}
    </MainLayout>
  );
}

export default App;
