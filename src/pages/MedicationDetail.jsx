// ============================================================
// MEDICATION DETAIL — Vista individual de medicamento
// ============================================================

import { useParams, useNavigate } from 'react-router-dom';
import { Pill, Clock, Bell, TrendingDown, ArrowLeft, ArrowRight, ShieldAlert, ShoppingCart, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getMedicationCatalog, getPriceHistory, getPricesForMedication,
  formatCLP, getBioequivalentSavings, predictNextRefill
} from '../services/savingsEngine';
import './MedicationDetail.css';

export default function MedicationDetail() {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const MEDICATIONS_CATALOG = getMedicationCatalog();
  const historyData = getPriceHistory(id);

  let userMed = state.medications.find(m => m.catalogId === id && m.profileId === state.activeProfileId && !m.deleted);
  const catalogMed = MEDICATIONS_CATALOG.find(m => m.id === id);

  if (!catalogMed) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🤔</span>
        <h3>Medicamento no encontrado</h3>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/medications')}>Volver</button>
      </div>
    );
  }

  const prices = getPricesForMedication(id);
  const bioequivalents = getBioequivalentSavings(id);
  const refill = userMed ? predictNextRefill(userMed) : null;
  const inCart = state.cart.some(c => c.catalogId === id);
  const history = getPriceHistory(id);

  const handleAddToCart = () => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        medicationId: `cart-${Date.now()}`,
        catalogId: catalogMed.id,
        nombre: catalogMed.nombre,
        dosis: catalogMed.dosis,
        forma: catalogMed.forma,
      }
    });
  };

  const handleAddToProfile = () => {
    dispatch({
      type: 'ADD_MEDICATION',
      payload: {
        profileId: state.activeProfileId,
        catalogId: catalogMed.id,
        nombre: catalogMed.nombre,
        dosis: catalogMed.dosis,
        frecuencia: catalogMed.frecuenciaComun,
        alertasActivas: true,
        origen: 'Catálogo',
      },
    });
  };

  const handleToggleAlerts = () => {
    if (!userMed) return;
    dispatch({
      type: 'UPDATE_MEDICATION',
      payload: { id: userMed.id, updates: { alertasActivas: !userMed.alertasActivas } }
    });
  };

  // Compute max price for chart scaling
  const maxHistoryPrice = history.length > 0
    ? Math.max(...history.map(h => h.precioPromedio)) * 1.1
    : 1;

  return (
    <div className="med-detail-page animate-fade-in">
      <button className="btn btn-ghost btn-sm mb-4 text-secondary" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="card med-detail-hero">
        <div className="med-detail-hero-content">
          <div className="med-detail-icon">
            <Pill size={40} className="text-primary" />
          </div>
          <div className="med-detail-info">
            <h2>{catalogMed.nombre} {catalogMed.dosis}</h2>
            <p className="text-secondary">{catalogMed.principioActivo} • {catalogMed.forma} • {catalogMed.categoria}</p>
          </div>
          <div className="med-detail-hero-actions">
            <button className="btn btn-primary" onClick={handleAddToCart} disabled={inCart}>
              <ShoppingCart size={18} /> {inCart ? 'En Carrito' : 'Añadir al Carrito'}
            </button>
            {userMed && (
              <button className={`btn ${userMed.alertasActivas ? 'btn-secondary' : 'btn-ghost'}`} onClick={handleToggleAlerts}>
                <Bell size={18} className={userMed.alertasActivas ? 'text-primary' : 'text-muted'} />
                {userMed.alertasActivas ? 'Alertas Activadas' : 'Alertas Desactivadas'}
              </button>
            )}
          </div>
        </div>
        {catalogMed.esBioequivalente && (
          <div className="alert-banner alert-banner-success mt-4">
            <ShieldAlert size={18} />
            <span>Bioequivalente certificado por ISP (Código: {catalogMed.certificacionISP}). Consulte con su médico antes de cambiar.</span>
          </div>
        )}
      </div>

      <div className="med-detail-grid mt-6">
        {/* Left Column: Prices & Alternatives */}
        <div className="med-detail-col stagger-children">
          <div className="card med-detail-section">
            <h3 className="section-title">Precios Actuales en Farmacias</h3>
            <p className="text-xs text-muted mb-4">⚠️ Precios de referencia. Confirme en farmacia antes de comprar.</p>
            <div className="price-list">
              {prices.sort((a,b) => a.precio - b.precio).map((p, i) => (
                <div key={p.farmacia.id} className={`price-item ${i===0 && p.stock ? 'best-price' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.farmacia.logo}</span>
                    <div>
                      <span className="font-semibold">{p.farmacia.nombre}</span>
                      {p.promocion && <div className="text-xs text-accent mt-1">🏷️ {p.promocion}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    {p.stock ? (
                      <span className="text-xl font-bold">{formatCLP(p.precio)}</span>
                    ) : (
                      <span className="badge badge-danger">Sin stock</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price History Chart */}
          {historyData.length > 0 && (
            <div className="card med-detail-section">
              <h3 className="section-title flex items-center gap-2">
                <BarChart2 size={20} className="text-primary" /> Evolución de Precio (6 meses)
              </h3>
              <div className="price-history-chart">
                <div className="price-history-bars">
                  {history.map((h, i) => {
                    const pct = (h.precioPromedio / maxHistoryPrice) * 100;
                    const isLowest = h.precioPromedio === Math.min(...history.map(x => x.precioPromedio));
                    return (
                      <div key={i} className="price-history-col">
                        <div className="price-history-value">{formatCLP(h.precioPromedio)}</div>
                        <div 
                          className={`price-history-bar ${isLowest ? 'bar-lowest' : ''}`} 
                          style={{ height: `${pct}%` }}
                          title={`${h.mes}: ${formatCLP(h.precioPromedio)}`}
                        />
                        <div className="price-history-label">{h.mes.split('-')[1]}/{h.mes.split('-')[0].slice(2)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {bioequivalents.length > 0 && (
            <div className="card med-detail-section" style={{ borderLeft: '4px solid var(--color-accent)' }}>
              <h3 className="section-title flex items-center gap-2">
                <TrendingDown className="text-accent" /> Alternativas Más Económicas
              </h3>
              <p className="text-sm text-secondary mb-2">Mismo principio activo, dosis y forma farmacéutica.</p>
              <p className="text-xs text-danger mb-4">⚠️ Todo cambio de medicamento debe ser autorizado por su médico tratante.</p>
              <div className="flex flex-col gap-3">
                {bioequivalents.map(bio => (
                  <div key={bio.medicamento.id} className="bio-item" onClick={() => navigate(`/medication/${bio.medicamento.id}`)} style={{ cursor: 'pointer' }}>
                    <div>
                      <strong>{bio.medicamento.nombre}</strong>
                      <div className="text-xs text-secondary mt-1">Ahorras {formatCLP(bio.ahorro)} ({bio.porcentajeAhorro}%)</div>
                      {bio.certificacion && <div className="text-xs text-muted">ISP: {bio.certificacion}</div>}
                    </div>
                    <ArrowRight size={16} className="text-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tracking */}
        <div className="med-detail-col stagger-children">
          {userMed ? (
            <div className="card med-detail-section">
              <h3 className="section-title">Seguimiento de Tratamiento</h3>
              
              {refill && (
                <div className={`refill-status refill-${refill.urgencia}`}>
                  <Clock size={24} />
                  <div>
                    <strong className="block text-lg">Te quedan para {refill.diasRestantes} días</strong>
                    <span className="text-sm opacity-90">Basado en tu consumo de {userMed.frecuencia}</span>
                  </div>
                </div>
              )}

              <div className="tracking-stats mt-6">
                <div className="tracking-stat">
                  <span className="stat-label">Comprados</span>
                  <strong className="stat-val">{userMed.cantidadComprada || 0} comp.</strong>
                </div>
                <div className="tracking-stat">
                  <span className="stat-label">Ingresado vía</span>
                  <strong className="stat-val">{userMed.origen || 'Manual'}</strong>
                </div>
                <div className="tracking-stat">
                  <span className="stat-label">Alertas</span>
                  <strong className="stat-val">{userMed.alertasActivas ? '✅ Activas' : '⏸️ Pausadas'}</strong>
                </div>
                <div className="tracking-stat">
                  <span className="stat-label">Frecuencia</span>
                  <strong className="stat-val">{userMed.frecuencia}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="card med-detail-section" style={{ background: 'var(--color-bg-secondary)', textAlign: 'center', padding: 'var(--space-8)' }}>
              <Pill size={48} className="text-muted mb-4" style={{ opacity: 0.4, margin: '0 auto' }} />
              <h3 className="mb-2">¿Es parte de tu tratamiento?</h3>
              <p className="text-secondary text-sm mb-6">Agrega este medicamento a tu perfil para predecir cuándo debes comprar y recibir alertas automáticas.</p>
              <button className="btn btn-secondary" onClick={handleAddToProfile}>Agregar a Mi Perfil</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
