// ============================================================
// DASHBOARD — Pantalla principal con widgets de resumen
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  TrendingDown, TrendingUp, AlertTriangle, Pill, ShoppingCart,
  Bell, PiggyBank, Users, ArrowRight, Calendar, FileText, AlertCircle
} from 'lucide-react';
import { useApp, useActiveProfile, useActiveMedications, useActiveAlerts } from '../context/AppContext';
import {
  formatCLP, calculateMonthlyExpense, calculateTotalSavingsPotential,
  calculateAccumulatedSavings, detectPurchaseOpportunity, assessStockRisk,
  predictNextRefill, getCatalogMedication
} from '../services/savingsEngine';
import './Dashboard.css';

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const medications = useActiveMedications();
  const alerts = useActiveAlerts();
  const allRecipes = state.recipes.filter(r => r.profileId === state.activeProfileId);

  const gastoMensual = calculateMonthlyExpense(medications);
  const ahorroPotencial = calculateTotalSavingsPotential(medications);
  const ahorroAcumulado = calculateAccumulatedSavings(state.purchases);

  // Generate opportunities
  const oportunidades = medications
    .map((med) => ({ med, opp: detectPurchaseOpportunity(med.catalogId) }))
    .filter((o) => o.opp && o.opp.tipo === 'COMPRAR_AHORA');

  // Stock risks
  const stockRisks = medications
    .map((med) => ({ med, risk: assessStockRisk(med.catalogId) }))
    .filter((r) => r.risk.nivel === 'alto' || r.risk.nivel === 'medio');

  // Next refills
  const refills = medications
    .map((med) => ({ med, refill: predictNextRefill(med) }))
    .filter((r) => r.refill && r.refill.urgencia !== 'normal')
    .sort((a, b) => a.refill.diasRestantes - b.refill.diasRestantes);

  const recetasPorVencer = allRecipes.filter(r => {
    const days = (new Date(r.fechaExpiracion) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 45;
  });

  if (!profile) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">👋</span>
        <h3 className="empty-state-title">¡Bienvenido!</h3>
        <p>Completa tu perfil para comenzar a ahorrar.</p>
        <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
          Comenzar onboarding
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard animate-fade-in">
      {/* Savings highlight — North Star Metric */}
      <div className="dashboard-savings-hero">
        <div className="dashboard-savings-hero-content">
          <span className="dashboard-savings-hero-label">💰 Ahorro acumulado</span>
          <span className="dashboard-savings-hero-value">{formatCLP(ahorroAcumulado)}</span>
          <span className="dashboard-savings-hero-sub">
            Tu copiloto de salud te ha ayudado a ahorrar
          </span>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="dashboard-stats stagger-children">
        <div className="card stat-card">
          <div className="dashboard-stat-icon dashboard-stat-icon-expense">
            <TrendingDown size={20} />
          </div>
          <span className="stat-label">Gasto mensual estimado</span>
          <span className="stat-value">{formatCLP(gastoMensual)}</span>
        </div>
        <div className="card stat-card">
          <div className="dashboard-stat-icon dashboard-stat-icon-savings">
            <PiggyBank size={20} />
          </div>
          <span className="stat-label">Ahorro potencial mensual</span>
          <span className="stat-value stat-value-accent">{formatCLP(ahorroPotencial)}</span>
        </div>
        <div className="card stat-card">
          <div className="dashboard-stat-icon dashboard-stat-icon-annual">
            <TrendingUp size={20} />
          </div>
          <span className="stat-label">Ahorro anual proyectado</span>
          <span className="stat-value stat-value-accent">{formatCLP(ahorroPotencial * 12)}</span>
        </div>
        <div className="card stat-card">
          <div className="dashboard-stat-icon dashboard-stat-icon-meds">
            <Pill size={20} />
          </div>
          <span className="stat-label">Medicamentos activos</span>
          <span className="stat-value">{medications.length}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Opportunities */}
        <div className="card dashboard-widget">
          <div className="card-header">
            <h3 className="card-title">🎯 Oportunidades de ahorro</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/compare')}>
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          {oportunidades.length > 0 ? (
            <div className="dashboard-opportunities stagger-children">
              {oportunidades.slice(0, 3).map(({ med, opp }) => {
                const catalog = getCatalogMedication(med.catalogId);
                const nombre = med.nombre || catalog?.nombre || med.catalogId;
                const dosis = med.dosis || catalog?.dosis || '';
                return (
                  <div key={med.id} className="dashboard-opportunity" onClick={() => navigate(`/medication/${med.catalogId}`)}>
                    <div className="dashboard-opportunity-info">
                      <strong>{nombre} {dosis}</strong>
                      <span className="text-secondary">{opp.motivo}</span>
                    </div>
                    <div className="dashboard-opportunity-savings">
                      <span className="badge badge-success">
                        <TrendingDown size={12} /> {formatCLP(opp.ahorroEstimado)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted" style={{ padding: 'var(--space-4)' }}>
              No hay oportunidades detectadas por ahora. Seguimos monitoreando.
            </p>
          )}
        </div>

        {/* Alerts */}
        <div className="card dashboard-widget">
          <div className="card-header">
            <h3 className="card-title">🔔 Alertas activas</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          {alerts.length > 0 ? (
            <div className="dashboard-alerts stagger-children">
              {alerts.slice(0, 4).map((alert, i) => (
                <div key={i} className={`dashboard-alert dashboard-alert-${alert.tipo === 'QUIEBRE_STOCK' ? 'danger' : alert.tipo === 'BAJA_PRECIO' ? 'success' : 'warning'}`}>
                  <div className="dashboard-alert-icon">
                    {alert.tipo === 'QUIEBRE_STOCK' ? <AlertTriangle size={16} /> :
                     alert.tipo === 'BAJA_PRECIO' ? <TrendingDown size={16} /> :
                     <Bell size={16} />}
                  </div>
                  <div>
                    <strong>{alert.medicamento}</strong>
                    <p>{alert.mensaje}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ padding: 'var(--space-4)' }}>
              Sin alertas activas. Todo está bajo control. ✅
            </p>
          )}
        </div>

        {/* Stock risks & Refills */}
        <div className="card dashboard-widget">
          <div className="card-header">
            <h3 className="card-title">📦 Stock y Próximas Compras</h3>
          </div>
          <div className="stagger-children">
            {refills.map(({ med, refill }) => {
              const catalog = getCatalogMedication(med.catalogId);
              const nombre = med.nombre || catalog?.nombre || med.catalogId;
              return (
                <div key={`refill-${med.id}`} className="list-item">
                  <span className="text-xl">⏳</span>
                  <div style={{ flex: 1 }}>
                    <strong>{nombre}</strong>
                    <br />
                    <span className={`text-sm ${refill.urgencia === 'urgente' ? 'text-danger font-bold' : 'text-secondary'}`}>
                      Quedan para {refill.diasRestantes} días
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/medication/${med.catalogId}`)}>Ver</button>
                </div>
              );
            })}
            {stockRisks.map(({ med, risk }) => {
              const catalog = getCatalogMedication(med.catalogId);
              const nombre = med.nombre || catalog?.nombre || med.catalogId;
              return (
                <div key={med.id} className="list-item">
                  <span>{risk.color}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{nombre}</strong>
                    <br />
                    <span className="text-secondary text-sm">{risk.descripcion}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/medication/${med.catalogId}`)}>
                    Ver
                  </button>
                </div>
              );
            })}
            {refills.length === 0 && stockRisks.length === 0 && (
              <p className="text-muted" style={{ padding: 'var(--space-4)' }}>
                Todo estable 🟢
              </p>
            )}
          </div>
        </div>

        {/* Recetas por vencer */}
        <div className="card dashboard-widget">
          <div className="card-header">
            <h3 className="card-title">📄 Recetas por Vencer</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recipes')}>
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          {recetasPorVencer.length > 0 ? (
            <div className="stagger-children">
              {recetasPorVencer.map(r => (
                <div key={r.id} className="list-item">
                  <span className="text-xl">⚠️</span>
                  <div style={{ flex: 1 }}>
                    <strong>{r.nombreArchivo}</strong>
                    <br />
                    <span className="text-sm text-warning font-bold">
                      Vence: {new Date(r.fechaExpiracion).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ padding: 'var(--space-4)' }}>
              No tienes recetas próximas a vencer.
            </p>
          )}
        </div>

        {/* Family */}
        <div className="card dashboard-widget">
          <div className="card-header">
            <h3 className="card-title">👨‍👩‍👧 Mi Familia</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/family')}>
              Administrar <ArrowRight size={14} />
            </button>
          </div>
          <div className="dashboard-family stagger-children">
            {state.profiles.map((p) => (
              <div key={p.id} className={`dashboard-family-member ${p.id === state.activeProfileId ? 'active' : ''}`}>
                <span className="dashboard-family-avatar">{p.icono}</span>
                <div>
                  <strong>{p.nombre}</strong>
                  <span className="text-secondary text-sm">{p.tipo}</span>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm mt-2" onClick={() => navigate('/family')}>
              + Agregar perfil
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card dashboard-widget">
          <div className="card-header">
            <h3 className="card-title">⚡ Acciones rápidas</h3>
          </div>
          <div className="dashboard-actions">
            <button className="dashboard-action-btn" onClick={() => navigate('/medications/add')}>
              <Pill size={20} />
              <span>Agregar medicamento</span>
            </button>
            <button className="dashboard-action-btn" onClick={() => navigate('/compare')}>
              <ShoppingCart size={20} />
              <span>Comparar precios</span>
            </button>
            <button className="dashboard-action-btn" onClick={() => navigate('/savings')}>
              <PiggyBank size={20} />
              <span>Centro de ahorro</span>
            </button>
            <button className="dashboard-action-btn" onClick={() => navigate('/recipes')}>
              <FileText size={20} />
              <span>Subir receta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
