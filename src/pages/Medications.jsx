// ============================================================
// MEDICATIONS — Mis Medicamentos
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Pill, Plus, AlertTriangle, ArrowRight, Clock, BellOff, Bell } from 'lucide-react';
import { useApp, useActiveMedications } from '../context/AppContext';
import { predictNextRefill, assessStockRisk, getAverageHistoricalPrice, formatCLP, getCatalogMedication } from '../services/savingsEngine';
import './Medications.css';

export default function Medications() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const medications = useActiveMedications();

  const handleToggleAlert = (id, currentStatus) => {
    dispatch({
      type: 'UPDATE_MEDICATION',
      payload: { id, updates: { alertasActivas: !currentStatus } }
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este medicamento? Dejaremos de monitorear su precio y stock.')) {
      dispatch({ type: 'DELETE_MEDICATION', payload: id });
    }
  };

  return (
    <div className="medications-page animate-fade-in">
      <div className="medications-header">
        <div>
          <h2 className="medications-title">Mis Medicamentos</h2>
          <p className="text-secondary">Gestiona tus tratamientos y configura alertas individuales.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/medications/add')}>
          <Plus size={18} /> Agregar Nuevo
        </button>
      </div>

      {medications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">💊</span>
          <h3 className="empty-state-title">Aún no tienes medicamentos</h3>
          <p>Agrega tus tratamientos para comenzar a monitorear precios y disponibilidad.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/medications/add')}>
            <Plus size={18} /> Agregar Medicamento
          </button>
        </div>
      ) : (
        <div className="medications-grid stagger-children mt-6">
          {medications.map((med) => {
            const catalog = getCatalogMedication(med.catalogId);
            const nombre = med.nombre || catalog?.nombre || med.catalogId;
            const dosis = med.dosis || catalog?.dosis || '';
            const refill = predictNextRefill(med);
            const risk = assessStockRisk(med.catalogId);
            const avgPrice = getAverageHistoricalPrice(med.catalogId);

            return (
              <div key={med.id} className="card med-card">
                <div className="med-card-header">
                  <div className="med-card-icon">
                    <Pill size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="med-card-title">{nombre} {dosis}</h3>
                    <span className="text-sm text-secondary">{med.frecuencia}</span>
                  </div>
                  <div className="med-card-actions">
                    <button 
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleToggleAlert(med.id, med.alertasActivas)}
                      title={med.alertasActivas ? "Desactivar alertas" : "Activar alertas"}
                    >
                      {med.alertasActivas ? <Bell size={18} className="text-primary" /> : <BellOff size={18} className="text-muted" />}
                    </button>
                  </div>
                </div>

                <div className="med-card-stats">
                  {avgPrice > 0 && (
                    <div className="med-card-stat">
                      <span className="med-card-stat-label">Precio Promedio</span>
                      <span className="med-card-stat-value">{formatCLP(avgPrice)}</span>
                    </div>
                  )}
                  {risk && (
                    <div className="med-card-stat">
                      <span className="med-card-stat-label">Estado Stock</span>
                      <span className="med-card-stat-value flex items-center gap-1">
                        {risk.color} <span className="text-sm font-normal">{risk.nivel}</span>
                      </span>
                    </div>
                  )}
                </div>

                {refill && refill.urgencia !== 'normal' && (
                  <div className={`alert-banner alert-banner-${refill.urgencia === 'urgente' ? 'danger' : 'warning'} mt-4`}>
                    <Clock size={16} />
                    <span>Te quedan para {refill.diasRestantes} días. {refill.urgencia === 'urgente' ? '¡Compra pronto!' : 'Planifica tu compra.'}</span>
                  </div>
                )}

                <div className="med-card-footer mt-4">
                  <button className="btn btn-ghost text-danger text-sm" onClick={() => handleDelete(med.id)}>
                    Eliminar
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/compare?q=${nombre}`)}>
                    Buscar precio <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
