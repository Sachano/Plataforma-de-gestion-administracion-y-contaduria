// ============================================================================
// App.jsx — Componente principal de la aplicación
// ============================================================================
// Este es el "cerebro" de la aplicación. Aquí se maneja:
// - El estado global (inventario, facturas, deudas, tasas de cambio)
// - La navegación entre módulos
// - Las llamadas a la API del backend
// - El carrito de ventas (POS)
//
// Nota: La autenticación está deshabilitada temporalmente (modo un solo usuario).
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import MainLayout from './components/MainLayout';
import StorageModule from './modules/Storage/StorageModule';
import InvoicingModule from './modules/Invoicing/InvoicingModule';
import AccountingModule from './modules/Accounting/AccountingModule';
import CartModule from './modules/Cart/CartModule';
import HomeModule from './modules/Home/HomeModule';
import MonetaryEquivalenciesModule from './modules/MonetaryEquivalencies/MonetaryEquivalenciesModule';
import DebtsModule from './modules/Debts/DebtsModule';
import Login from './modules/Auth/Login';

import { useAuth } from './context/AuthContext';
import { secureFetch, API_URL } from './utils/api';

// ── Helper: mapear datos de la API al formato del frontend ──
const mapRateFromAPI = (r) => ({
  id: r.id,
  name: r.name,
  value: parseFloat(r.value),
  isDeletable: r.is_deletable,
  isComputed: r.is_computed,
  group: r.currency_group,
  customName: r.custom_name
});

function App() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState('home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  // Escuchar eventos del AutoUpdater
  useEffect(() => {
    if (window.electron && window.electron.onUpdateMessage) {
      // El callback recibe el (event, message) del ipcRenderer
      window.electron.onUpdateMessage((event, message) => {
        setUpdateStatus(message);
      });
    }
  }, []);

  const handleRestartApp = () => {
    if (window.electron && window.electron.restartApp) {
      window.electron.restartApp();
    }
  };

  // Core application state
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [debts, setDebts] = useState([]);

  const [exchangeRates, setExchangeRates] = useState([
    { id: 'usd_bcv', name: 'BCV', value: 425.67, isDeletable: false, group: 'usd' },
    { id: 'usd_binance', name: 'Binance', value: 622.11, isDeletable: false, group: 'usd' },
    { id: 'cop', name: 'Pesos Colombianos', value: 6, isDeletable: false, group: 'cop' }
  ]);

  // Calcular el promedio de BCV y Binance automáticamente
  const bcvRate = exchangeRates.find(r => r.id === 'usd_bcv')?.value || 0;
  const binanceRate = exchangeRates.find(r => r.id === 'usd_binance')?.value || 0;
  const promedioRate = (bcvRate + binanceRate) / 2;

  // Agregar la tasa "Promedio" al array (se calcula en el frontend, no se guarda en la DB)
  const exchangeRatesWithPromedio = [
    ...exchangeRates.filter(r => r.id !== 'usd_promedio'),
    { id: 'usd_promedio', name: 'Promedio', value: promedioRate, isDeletable: false, isComputed: true, group: 'usd' }
  ];

  // Las tasas BCV y Binance se actualizan automáticamente siempre
  const [autoRatesEnabled, setAutoRatesEnabled] = useState(true);

  // ── Cargar datos iniciales de la base de datos (en paralelo) ──
  useEffect(() => {
    const fetchJSON = async (endpoint) => {
      try {
        const res = await secureFetch(`${API_URL}/${endpoint}`);
        return res.ok ? await res.json() : [];
      } catch (err) {
        console.error(`Error cargando ${endpoint}:`, err);
        return [];
      }
    };

    Promise.all([
      fetchJSON('exchange-rates'),
      fetchJSON('inventory'),
      fetchJSON('invoices'),
      fetchJSON('debts')
    ]).then(([ratesData, inventoryData, invoicesData, debtsData]) => {
      if (Array.isArray(ratesData) && ratesData.length > 0) {
        setExchangeRates(ratesData.map(mapRateFromAPI));
      }
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setDebts(Array.isArray(debtsData) ? debtsData : []);
    });
  }, []);

  // ── Handlers de la API de tasas de cambio ──
  const handleAddExchangeRate = useCallback(async (newRate) => {
    try {
      const res = await secureFetch(`${API_URL}/exchange-rates`, {
        method: 'POST',
        body: JSON.stringify({
          id: newRate.id,
          name: newRate.name,
          value: newRate.value,
          isDeletable: newRate.isDeletable,
          currencyGroup: newRate.group,
          customName: newRate.customName
        })
      });
      if (!res.ok) throw new Error('Error al crear la equivalencia');
      const created = await res.json();
      setExchangeRates(prev => [...prev, mapRateFromAPI(created)]);
    } catch (err) {
      console.error(err);
      alert('Error al crear la equivalencia: ' + err.message);
    }
  }, []);

  const handleUpdateExchangeRate = useCallback(async (id, updates) => {
    try {
      const res = await secureFetch(`${API_URL}/exchange-rates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Error al actualizar la equivalencia');
      const updated = await res.json();
      setExchangeRates(prev => prev.map(r => r.id !== id ? r : {
        ...r,
        name: updated.name,
        value: parseFloat(updated.value),
        customName: updated.custom_name
      }));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar la equivalencia: ' + err.message);
    }
  }, []);

  const handleDeleteExchangeRate = useCallback(async (id) => {
    try {
      const res = await secureFetch(`${API_URL}/exchange-rates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar la equivalencia');
      setExchangeRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la equivalencia: ' + err.message);
    }
  }, []);

  const handleSaveAllExchangeRates = useCallback(async (rates) => {
    try {
      const ratesToSave = rates.filter(r => r.id !== 'usd_promedio');
      const res = await secureFetch(`${API_URL}/exchange-rates`, {
        method: 'PUT',
        body: JSON.stringify({ rates: ratesToSave })
      });
      if (!res.ok) throw new Error('Error al guardar las equivalencias');
      const saved = await res.json();
      const savedRates = saved.map(mapRateFromAPI);
      const computedRates = rates.filter(r => r.id === 'usd_promedio');
      setExchangeRates([...savedRates, ...computedRates]);
    } catch (err) {
      console.error(err);
      alert('Error al guardar las equivalencias: ' + err.message);
    }
  }, []);

  // ── Actualización automática de tasas en vivo ──
  // Cuando autoRatesEnabled está activado, busca tasas cada 30 minutos
  useEffect(() => {
    if (!autoRatesEnabled) return;

    const obtenerTasasEnVivo = async () => {
      try {
        const res = await secureFetch(`${API_URL}/exchange-rates/live`);
        if (!res.ok) throw new Error('Error obteniendo tasas en vivo');
        const data = await res.json();

        // Actualizar solo BCV y Binance con los valores en vivo
        if (data.bcv && data.binance) {
          setExchangeRates(prev => prev.map(rate => {
            if (rate.id === 'usd_bcv') return { ...rate, value: data.bcv };
            if (rate.id === 'usd_binance') return { ...rate, value: data.binance };
            return rate;
          }));
        }
      } catch (err) {
        console.error('Error obteniendo tasas en vivo:', err);
      }
    };

    // Ejecutar inmediatamente y luego cada 30 minutos
    obtenerTasasEnVivo();
    const interval = setInterval(obtenerTasasEnVivo, 30 * 60 * 1000);
    return () => clearInterval(interval);

  }, [autoRatesEnabled]);

  const handleModuleChange = (moduleId) => {
    setActiveModule(moduleId);
    setIsCartOpen(false);
  };

  const toggleCart = () => setIsCartOpen(prev => !prev);

  // Verificar autenticación antes de renderizar
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-color)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--bg-secondary)',
            borderTop: '3px solid var(--accent-orange)',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // ── Handlers de la API de deudas ──

  // Crear una nueva deuda o deudor
  const handleAddDebt = async (formData) => {
    try {
      const res = await secureFetch(`${API_URL}/debts`, {
        method: 'POST',
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

  // Registrar un abono (pago parcial) a una deuda
  const handleAbono = async (debtId, amount, note) => {
    try {
      const res = await secureFetch(`${API_URL}/debts/${debtId}/abono`, {
        method: 'PATCH',
        body: JSON.stringify({ amount, note })
      });
      if (!res.ok) throw new Error('Error al registrar el abono');
      const updated = await res.json();
      // Actualizar la deuda localmente con el nuevo monto
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

  // Eliminar una deuda o deudor
  const handleDeleteDebt = async (debtId) => {
    try {
      const res = await secureFetch(`${API_URL}/debts/${debtId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setDebts(prev => prev.filter(d => d.id !== debtId));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar: ' + err.message);
    }
  };

  // ── Handler del checkout del carrito ──
  const handleCheckout = async (invoice, debtInfo) => {
    try {
      if (debtInfo) {
        const { debtorId, isNew, newDebtor } = debtInfo;
        const payload = {
          id: invoice.id,
          total_usd: invoice.total,
          items: invoice.items,
          debtorId: isNew ? undefined : parseInt(debtorId),
          newDebtorName: isNew ? newDebtor.name : undefined
        };

        const res = await secureFetch(`${API_URL}/debts/invoice`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error guardando la deuda');

        if (isNew) {
          const data = await res.json();
          setDebts(prev => [...prev, {
            id: data.debtorId,
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
        const res = await secureFetch(`${API_URL}/invoices`, {
          method: 'POST',
          body: JSON.stringify({ id: invoice.id, total_usd: invoice.total, items: invoice.items })
        });
        if (!res.ok) throw new Error('Error guardando la factura');
        setInvoices(prev => [...prev, invoice]);
      }

      // Recargar inventario después de la venta
      const invRes = await secureFetch(`${API_URL}/inventory`);
      if (invRes.ok) setInventory(await invRes.json());

      setIsCartOpen(false);
      alert(debtInfo ? '✅ Deuda registrada con éxito' : '✅ Factura generada con éxito. ¡Venta completada!');
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };


  return (
    <>
      {updateStatus && updateStatus.type !== 'not-available' && updateStatus.type !== 'checking' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: updateStatus.type === 'error' ? '#f44336' : (updateStatus.type === 'downloaded' ? '#4caf50' : '#ff9800'),
          color: 'white',
          textAlign: 'center',
          padding: '10px',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <span style={{ fontWeight: '500' }}>{updateStatus.text}</span>
          {updateStatus.type === 'progress' && updateStatus.data && (
            <div style={{ width: '200px', backgroundColor: 'rgba(255,255,255,0.3)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${updateStatus.data.percent}%`, backgroundColor: 'white', height: '100%', transition: 'width 0.2s' }}></div>
            </div>
          )}
          {updateStatus.type === 'downloaded' && (
            <button 
              onClick={handleRestartApp}
              style={{
                backgroundColor: 'white',
                color: '#4caf50',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Reiniciar Ahora
            </button>
          )}
          {updateStatus.type === 'error' && (
            <button 
              onClick={() => setUpdateStatus(null)}
              style={{ backgroundColor: 'transparent', border: '1px solid white', color: 'white', cursor: 'pointer', padding: '4px 10px', borderRadius: '4px' }}
            >
              Cerrar
            </button>
          )}
        </div>
      )}
      <MainLayout
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        onCartToggle={toggleCart}
        user={user}
      >
      {isCartOpen ? (
        <CartModule
          inventory={inventory}
          exchangeRates={exchangeRatesWithPromedio}
          debts={debts}
          setDebts={setDebts}
          onCheckout={handleCheckout}
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
              user={user}
              onAdd={handleAddExchangeRate}
              onUpdate={handleUpdateExchangeRate}
              onDelete={handleDeleteExchangeRate}
              onSaveAll={handleSaveAllExchangeRates}
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
    </>
  );
}

export default App;
