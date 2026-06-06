// ============================================================
// COMPARE — Comparador de Precios
// ============================================================

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Info, MapPin, ChevronRight, X, AlertCircle, TrendingDown, ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getMedicationCatalog, getPharmacies, formatCLP, fetchPricesForMedication, fetchBioequivalentSavings } from '../services/savingsEngine';
import { tolerantMatch } from '../utils/textUtils';
import './Compare.css';

export default function Compare() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  
  const MEDICATIONS_CATALOG = getMedicationCatalog();
  const FARMACIAS = getPharmacies();

  const [query, setQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState(null);
  
  const [prices, setPrices] = useState([]);
  const [bioequivalents, setBioequivalents] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search logic (tolerant match supporting accents, case and partial)
  const results = query.length > 1
    ? MEDICATIONS_CATALOG.filter((m) =>
        tolerantMatch(m.nombre, query) ||
        tolerantMatch(m.principioActivo, query)
      )
    : [];

  useEffect(() => {
    let active = true;
    if (!selectedMed) {
      setPrices([]);
      setBioequivalents([]);
      return;
    }

    async function loadRealTimeData() {
      setLoadingPrices(true);
      try {
        // Callback que se llama cuando el scraper en background obtiene precios frescos
        const onPriceRefresh = (freshPrices) => {
          if (active) {
            setPrices(freshPrices);
            setRefreshing(false);
          }
        };

        const [fetchedPrices, fetchedBio] = await Promise.all([
          fetchPricesForMedication(selectedMed.id, onPriceRefresh),
          fetchBioequivalentSavings(selectedMed.id)
        ]);
        if (active) {
          setPrices(fetchedPrices);
          setBioequivalents(fetchedBio);
          // Si hay datos en caché, mostrarlos pero indicar que se está actualizando
          setRefreshing(true);
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        if (active) setLoadingPrices(false);
      }
    }

    loadRealTimeData();

    return () => {
      active = false;
    };
  }, [selectedMed]);

  const handleAddToCart = () => {
    if (!selectedMed) return;
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        medicationId: `cart-${Date.now()}`,
        catalogId: selectedMed.id,
        nombre: selectedMed.nombre,
        dosis: selectedMed.dosis,
        forma: selectedMed.forma,
      }
    });
    alert('Medicamento agregado al Carrito Inteligente');
  };

  return (
    <div className="compare-page animate-fade-in">
      <div className="compare-header">
        <h2 className="compare-title">Comparador de Precios</h2>
        <p className="text-secondary">Encuentra la mejor alternativa en farmacias cercanas.</p>
      </div>

      <div className="compare-search">
        <div className="compare-search-input-wrapper">
          <Search className="compare-search-icon" size={20} />
          <input
            type="text"
            className="form-input compare-input"
            placeholder="Buscar por nombre o principio activo (ej. Losartán, Metformina)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedMed(null);
            }}
          />
        </div>

        {query.length > 1 && !selectedMed && (
          <div className="compare-results card">
            {results.length > 0 ? (
              <ul className="compare-results-list">
                {results.map((med) => (
                  <li key={med.id} onClick={() => setSelectedMed(med)}>
                    <div>
                      <strong>{med.nombre}</strong> <span className="text-sm text-secondary">{med.dosis}</span>
                      <br />
                      <span className="text-xs text-muted">{med.principioActivo}</span>
                    </div>
                    {med.esBioequivalente && (
                      <span className="badge badge-success ml-2">Bioequivalente</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-muted">
                No se encontraron resultados para "{query}"
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMed && (
        <div className="compare-details animate-slide-up">
          <div className="card compare-hero-card">
            <div className="compare-hero-header">
              <div>
                <h3 className="compare-med-name">{selectedMed.nombre} {selectedMed.dosis}</h3>
                <span className="text-secondary">{selectedMed.principioActivo} • {selectedMed.forma}</span>
              </div>
              <button className="btn btn-primary" onClick={handleAddToCart}>
                <ShoppingCart size={18} />
                Agregar al carrito
              </button>
            </div>
            {selectedMed.esBioequivalente && (
              <div className="alert-banner alert-banner-success mt-4">
                <ShieldAlert size={18} />
                <span>
                  <strong>Medicamento Bioequivalente.</strong> Certificación ISP: {selectedMed.certificacionISP}
                </span>
              </div>
            )}
          </div>

          <div className="compare-grid mt-6">
            <div className="compare-prices-col">
              <h4 className="compare-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Precios en Farmacias
                {refreshing && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    actualizando precios...
                  </span>
                )}
              </h4>
              <div className="compare-pharmacies stagger-children">
                {loadingPrices ? (
                  <div className="p-8 text-center text-muted flex flex-col items-center justify-center">
                    <div className="spinner"></div>
                    <p className="mt-4">Consultando precios en farmacias en tiempo real...</p>
                  </div>
                ) : prices.length > 0 ? (
                  <>
                    {/* Nota metodológica solo cuando alguna farmacia tiene precio por unidad */}
                    {prices.some(p => p.precioUnidad && p.unidades > 1) && (
                      <div className="alert-banner alert-banner-info mb-4" style={{ fontSize: 'var(--font-size-xs)' }}>
                        <Info size={16} style={{ flexShrink: 0 }} />
                        <span>
                          El orden usa <strong>precio por unidad</strong> para comparar productos con diferente cantidad de comprimidos. El precio total puede variar según el pack.
                        </span>
                      </div>
                    )}
                    {prices.sort((a, b) => {
                      // Ordenar por precio por unidad si está disponible, si no por precio total
                      const auPerUnit = a.precioUnidad || a.precio;
                      const buPerUnit = b.precioUnidad || b.precio;
                      return auPerUnit - buPerUnit;
                    }).map((p, i) => (
                      <div key={p.farmacia.id || i} className={`card compare-pharmacy-card ${i === 0 && p.stock ? 'best-price' : ''}`}>
                        {i === 0 && p.stock && (
                          <div className="compare-best-badge">Mejor precio/unidad</div>
                        )}
                        <div className="compare-pharmacy-info">
                          <span className="compare-pharmacy-logo">{p.farmacia.logo}</span>
                          <div>
                            <span className="font-semibold">{p.farmacia.nombre}</span>
                            {p.nombreProducto && (
                              <div className="text-xs text-muted mt-1" style={{ maxWidth: 180 }}>{p.nombreProducto}</div>
                            )}
                          </div>
                        </div>
                        <div className="compare-pharmacy-price-wrapper">
                          {p.stock ? (
                            <>
                              <span className="compare-pharmacy-price">{formatCLP(p.precio)}</span>
                              {p.unidades > 1 && p.precioUnidad && (
                                <span className="text-xs text-accent font-semibold mt-1 text-right">
                                  {p.unidades} u. · {formatCLP(Math.round(p.precioUnidad))}/u
                                </span>
                              )}
                              {p.promocion && (
                                <span className="text-xs text-accent mt-1 text-right">{p.promocion}</span>
                              )}
                            </>
                          ) : (
                            <span className="badge badge-danger">Sin stock</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="card p-6 text-center text-muted" style={{ fontWeight: 600 }}>
                    Sin datos de precio en la base de datos
                  </div>
                )}
              </div>
            </div>

            {bioequivalents.length > 0 && (
              <div className="compare-alternatives-col">
                <h4 className="compare-section-title">Alternativas Bioequivalentes</h4>
                
                <div className="medical-disclaimer mb-4">
                  <Info size={24} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Consulte con su médico</strong> antes de cambiar su tratamiento. Esta aplicación informa y no prescribe medicamentos.
                  </span>
                </div>

                <div className="stagger-children">
                  {bioequivalents.map((bio) => (
                    <div key={bio.medicamento.id} className="card compare-bio-card">
                      <div className="compare-bio-header">
                        <div>
                          <strong>{bio.medicamento.nombre}</strong>
                          <div className="text-xs text-secondary">
                            Cert. ISP: {bio.certificacion}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-accent">{formatCLP(bio.mejorPrecio.precio)}</div>
                          <div className="text-xs text-secondary">en {bio.mejorPrecio.farmacia.nombre}</div>
                        </div>
                      </div>
                      
                      <div className="compare-bio-savings">
                        <span className="badge badge-success">
                          <TrendingDown size={14} /> 
                          Ahorras {formatCLP(bio.ahorro)} ({bio.porcentajeAhorro}%)
                        </span>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedMed(bio.medicamento)}
                        >
                          Ver detalle <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
