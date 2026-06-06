// ============================================================
// CART — Carrito Inteligente
// Algoritmo para recomendar la mejor opción de compra
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, AlertTriangle, Check, ArrowRight, X, Sparkles, MapPin } from 'lucide-react';
import { useApp, useActiveProfile } from '../context/AppContext';
import { fetchSmartCart, formatCLP } from '../services/savingsEngine';
import './Cart.css';

export default function Cart() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAnalysis() {
      if (state.cart.length > 0) {
        setLoadingAnalysis(true);
        try {
          const result = await fetchSmartCart(state.cart);
          if (!active) return;
          
          const options = result.options || [];
          const bestOption = result.bestOption;

          const unicaOption = options.find(o => o.tipo === 'UNICA');
          const mixtaOption = options.find(o => o.tipo === 'MIXTA');

          const escenarioA = unicaOption
            ? {
                mejor: {
                  farmacia: unicaOption.farmacia,
                  costoTotal: unicaOption.subtotal,
                  detalles: unicaOption.items.map(i => {
                    const cartItem = state.cart.find(c => c.catalogId === i.catalogId);
                    const qty = cartItem?.cantidad || i.qty || 1;
                    const nombre = cartItem?.nombre || i.catalogId;
                    return {
                      medicamento: nombre,
                      precio: i.priceData.precio * qty,
                      precioUnit: i.priceData.precio,
                      qty,
                    };
                  }),
                },
              }
            : { mejor: null };

          const escenarioB = mixtaOption
            ? {
                todosDisponibles: true,
                costoTotal: mixtaOption.subtotal,
                farmaciasInvolucradas: mixtaOption.farmacias?.map(f => f.nombre) || [],
                compras: mixtaOption.items.map(i => {
                  const cartItem = state.cart.find(c => c.catalogId === i.catalogId);
                  const qty = cartItem?.cantidad || i.qty || 1;
                  const nombre = cartItem?.nombre || i.catalogId;
                  return {
                    medicamento: nombre,
                    farmacia: i.priceData.farmacia,
                    precio: i.priceData.precio * qty,
                    precioUnit: i.priceData.precio,
                    qty,
                  };
                }),
              }
            : { todosDisponibles: false };

          const recomendacion = bestOption
            ? {
                tipo: bestOption.tipo,
                mensaje: bestOption.tipo === 'MIXTA'
                  ? `Comprando en diferentes farmacias ahorras ${formatCLP(bestOption.ahorroTotal)}.`
                  : `La mejor opción es comprar todo en ${bestOption.farmacia?.nombre}.`,
                ahorro: bestOption.ahorroTotal || 0,
              }
            : { tipo: null, mensaje: 'No hay suficientes datos para recomendar.', ahorro: 0 };

          setAnalysis({ recomendacion, escenarioA, escenarioB });
        } catch (error) {
          console.error("Error fetching smart cart:", error);
        } finally {
          if (active) setLoadingAnalysis(false);
        }
      } else {
        setAnalysis(null);
      }
    }

    loadAnalysis();

    return () => {
      active = false;
    };
  }, [state.cart]);

  const handleRemove = (medicationId) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: medicationId });
  };

  const handleClear = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const handlePurchase = () => {
    if (!analysis || !analysis.recomendacion) return;

    // Simulate purchase recording
    const ahorroObtenido = analysis.recomendacion.ahorro || 0;
    
    dispatch({
      type: 'ADD_PURCHASE',
      payload: {
        id: `purch-${Date.now()}`,
        profileId: state.activeProfileId,
        fecha: new Date().toISOString(),
        items: state.cart.length,
        ahorroObtenido,
        tipoCompra: analysis.recomendacion.tipo,
      }
    });

    handleClear();
    alert('¡Compra registrada con éxito! Tu ahorro acumulado se ha actualizado.');
    navigate('/dashboard');
  };

  if (!profile) return null;

  if (state.cart.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <span className="empty-state-icon">🛒</span>
        <h3 className="empty-state-title">Tu carrito está vacío</h3>
        <p>Agrega medicamentos desde el comparador para analizar la mejor estrategia de compra.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/compare')}>
          Ir al comparador
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page animate-fade-in">
      <div className="cart-header">
        <div>
          <h2 className="cart-title">Carrito Inteligente</h2>
          <p className="text-secondary text-sm">Analizando combinaciones para {state.cart.length} medicamentos</p>
        </div>
        <button className="btn btn-ghost btn-sm text-danger" onClick={handleClear}>
          Vaciar carrito
        </button>
      </div>

      <div className="cart-grid">
        {/* Left Col: Items */}
        <div className="cart-items stagger-children">
          <h3 className="cart-section-title">Medicamentos a comprar</h3>
          <div className="card">
            {state.cart.map((item) => (
              <div key={item.medicationId} className="list-item cart-item">
                <div style={{ flex: 1 }}>
                  <strong>{item.nombre}</strong>
                  <br />
                  <span className="text-secondary text-sm">{item.dosis} • {item.forma || 'Comprimido'}</span>
                </div>

                {/* Controles de cantidad */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ width: 28, height: 28, fontSize: 18, lineHeight: 1, padding: 0 }}
                    onClick={() => handleRemove(item.medicationId)}
                    aria-label="Reducir cantidad"
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                    {item.cantidad || 1}
                  </span>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ width: 28, height: 28, fontSize: 18, lineHeight: 1, padding: 0 }}
                    onClick={() => dispatch({
                      type: 'ADD_TO_CART',
                      payload: { catalogId: item.catalogId, cantidad: 1 }
                    })}
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>

                <button
                  className="btn btn-ghost btn-icon text-danger"
                  style={{ marginLeft: 4 }}
                  onClick={async () => {
                    // Eliminar completamente el item del carrito
                    await dispatch({ type: 'DELETE_FROM_CART', payload: item.medicationId });
                  }}
                  aria-label="Eliminar del carrito"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Smart Analysis */}
        <div className="cart-analysis stagger-children">
          {loadingAnalysis ? (
            <div className="card p-8 text-center text-muted flex flex-col items-center justify-center">
              <div className="spinner"></div>
              <p className="mt-4">Consultando precios en farmacias en tiempo real...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Recommendation Hero */}
            <div className={`cart-recommendation card card-glass ${analysis.recomendacion.ahorro > 0 ? 'cart-recommendation-best' : ''}`}>
              <div className="cart-recommendation-header">
                <Sparkles size={24} className="text-primary" />
                <h3>Recomendación Óptima</h3>
              </div>
              <p className="cart-recommendation-msg">
                {analysis.recomendacion.mensaje}
              </p>
              
              {analysis.recomendacion.ahorro > 0 && (
                <div className="cart-savings-badge">
                  <span className="cart-savings-label">Ahorro detectado</span>
                  <span className="cart-savings-value">{formatCLP(analysis.recomendacion.ahorro)}</span>
                </div>
              )}

              <button className="btn btn-primary btn-block mt-4" onClick={handlePurchase}>
                <Check size={18} />
                Continuar con esta opción
              </button>
            </div>

            {/* Scenario Comparison */}
            <h3 className="cart-section-title mt-6">Comparación de escenarios</h3>

            {/* Scenario A: Single Pharmacy */}
            <div className="card cart-scenario">
              <div className="cart-scenario-header">
                <div>
                  <span className="badge badge-info mb-1">Escenario A</span>
                  <h4>Comprar todo en un solo lugar</h4>
                </div>
                {analysis.escenarioA.mejor && (
                  <span className="cart-scenario-price">{formatCLP(analysis.escenarioA.mejor.costoTotal)}</span>
                )}
              </div>
              
              {analysis.escenarioA.mejor ? (
                <div className="cart-scenario-body">
                  <div className="cart-pharmacy-badge mb-2">
                    {analysis.escenarioA.mejor.farmacia.logo} {analysis.escenarioA.mejor.farmacia.nombre}
                  </div>
                  <ul className="cart-scenario-list">
                    {analysis.escenarioA.mejor.detalles.map((d, i) => (
                      <li key={i}>
                        <span>
                          {d.medicamento}
                          {d.qty > 1 && <span className="text-xs text-muted ml-1">×{d.qty}</span>}
                        </span>
                        <div className="text-right">
                          <span className="text-primary font-medium">{formatCLP(d.precio)}</span>
                          {d.qty > 1 && <div className="text-xs text-muted">{formatCLP(d.precioUnit)}/u</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="alert-banner alert-banner-warning mt-2">
                  <AlertTriangle size={18} />
                  <span>Ninguna farmacia tiene stock de todos los medicamentos juntos.</span>
                </div>
              )}
            </div>

            {/* Scenario B: Split Purchase */}
            <div className="card cart-scenario">
              <div className="cart-scenario-header">
                <div>
                  <span className="badge badge-info mb-1">Escenario B</span>
                  <h4>Compra dividida (Mejor precio por ítem)</h4>
                </div>
                {analysis.escenarioB.todosDisponibles && (
                  <span className="cart-scenario-price text-accent">{formatCLP(analysis.escenarioB.costoTotal)}</span>
                )}
              </div>

              {analysis.escenarioB.todosDisponibles ? (
                <div className="cart-scenario-body">
                  <div className="cart-pharmacies-list mb-2">
                    <MapPin size={14} className="text-secondary" />
                    <span className="text-sm text-secondary">
                      Requiere ir a: {analysis.escenarioB.farmaciasInvolucradas.join(', ')}
                    </span>
                  </div>
                  <ul className="cart-scenario-list">
                    {analysis.escenarioB.compras.map((c, i) => (
                      <li key={i}>
                        <div>
                          <span>{c.medicamento}</span>
                          {c.qty > 1 && <span className="text-xs text-muted ml-1">×{c.qty}</span>}
                          <span className="text-xs text-secondary ml-1">en {c.farmacia.nombre}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-accent font-medium">{formatCLP(c.precio)}</span>
                          {c.qty > 1 && <div className="text-xs text-muted">{formatCLP(c.precioUnit)}/u</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="alert-banner alert-banner-danger mt-2">
                  <AlertTriangle size={18} />
                  <span>Hay medicamentos sin stock en todas las farmacias.</span>
                </div>
              )}
            </div>

            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
