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

import { useState, useEffect } from 'react';
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

// ── URL base del backend ──
// Cambiar esta constante cuando se despliegue en otro servidor
const API_URL = 'http://localhost:3001/api';

function App() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState('home');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Core application state
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [debts, setDebts] = useState([]);

  // Función auxiliar para hacer peticiones al backend
  // Agrega automáticamente los headers necesarios (JSON)
  const secureFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include', // Habilitado para autenticación
      headers: {
        ...options.headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
  };

  // ── Cargar datos iniciales al montar el componente ──
  // Se ejecuta una sola vez al iniciar la aplicación
  useEffect(() => {
    // Cargar inventario
    secureFetch(`${API_URL}/inventory`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setInventory(data); else setInventory([]); })
      .catch(err => console.error('Error cargando inventario:', err));

    // Cargar facturas
    secureFetch(`${API_URL}/invoices`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setInvoices(data); else setInvoices([]); })
      .catch(err => console.error('Error cargando facturas:', err));

    // Cargar deudas
    secureFetch(`${API_URL}/debts`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDebts(data); else setDebts([]); })
      .catch(err => console.error('Error cargando deudas:', err));
  }, []);

  // ── Estado de tasas de cambio ──
  // Valores por defecto que se sobreescriben cuando se cargan de la base de datos
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

  // ── Cargar tasas de cambio de la base de datos ──
  useEffect(() => {
    const cargarTasas = async () => {
      try {
        const res = await secureFetch(`${API_URL}/exchange-rates`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Convertir los campos de la DB al formato del frontend
            const mappedRates = data.map(r => ({
              id: r.id,
              name: r.name,
              value: parseFloat(r.value),
              isDeletable: r.is_deletable,
              isComputed: r.is_computed,
              group: r.currency_group,
              customName: r.custom_name
            }));
            setExchangeRates(mappedRates);
          }
        }
      } catch (err) {
        console.error('Error cargando tasas de cambio:', err);
        // Si falla, se usan los valores por defecto definidos arriba
      }
    };
    cargarTasas();
  }, []);

  // ── Handlers de la API de tasas de cambio ──

  // Agregar una nueva tasa de cambio personalizada
  const handleAddExchangeRate = async (newRate) => {
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
      // Agregar la tasa recién creada al estado
      setExchangeRates(prev => [...prev, {
        id: created.id,
        name: created.name,
        value: parseFloat(created.value),
        isDeletable: created.is_deletable,
        isComputed: created.is_computed,
        group: created.currency_group,
        customName: created.custom_name
      }]);
    } catch (err) {
      console.error(err);
      alert('Error al crear la equivalencia: ' + err.message);
    }
  };

  // Actualizar una tasa de cambio existente
  const handleUpdateExchangeRate = async (id, updates) => {
    try {
      const res = await secureFetch(`${API_URL}/exchange-rates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Error al actualizar la equivalencia');
      const updated = await res.json();
      setExchangeRates(prev => prev.map(r => {
        if (r.id !== id) return r;
        return {
          ...r,
          name: updated.name,
          value: parseFloat(updated.value),
          customName: updated.custom_name
        };
      }));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar la equivalencia: ' + err.message);
    }
  };

  // Eliminar una tasa de cambio personalizada
  const handleDeleteExchangeRate = async (id) => {
    try {
      const res = await secureFetch(`${API_URL}/exchange-rates/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar la equivalencia');
      setExchangeRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la equivalencia: ' + err.message);
    }
  };

  // Guardar todas las tasas de cambio de una vez (actualización masiva)
  const handleSaveAllExchangeRates = async (rates) => {
    try {
      // Filtrar la tasa "Promedio" porque se calcula en el frontend, no se guarda
      const ratesToSave = rates.filter(r => r.id !== 'usd_promedio');
      const res = await secureFetch(`${API_URL}/exchange-rates`, {
        method: 'PUT',
        body: JSON.stringify({ rates: ratesToSave })
      });
      if (!res.ok) throw new Error('Error al guardar las equivalencias');
      const saved = await res.json();

      // Convertir los datos guardados al formato del frontend
      const savedRates = saved.map(r => ({
        id: r.id,
        name: r.name,
        value: parseFloat(r.value),
        isDeletable: r.is_deletable,
        isComputed: r.is_computed,
        group: r.currency_group,
        customName: r.custom_name
      }));

      // Mantener las tasas calculadas (Promedio) que no se guardan en DB
      const computedRates = rates.filter(r => r.id === 'usd_promedio');
      setExchangeRates([...savedRates, ...computedRates]);
    } catch (err) {
      console.error(err);
      alert('Error al guardar las equivalencias: ' + err.message);
    }
  };

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

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

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


  return (
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
          onCheckout={async (invoice, debtInfo) => {
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
                // Venta normal (sin deudor)
                const payload = {
                  id: invoice.id,
                  total_usd: invoice.total,
                  items: invoice.items
                };

                const res = await secureFetch(`${API_URL}/invoices`, {
                  method: 'POST',
                  body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Error guardando la factura');

                setInvoices([...invoices, invoice]);
              }

              // Recargar inventario actualizado después de la venta
              const invRes = await secureFetch(`${API_URL}/inventory`);
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
  );
}

export default App;
