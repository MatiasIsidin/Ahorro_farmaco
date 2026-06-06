// ============================================================
// ALERTS — Alertas Inteligentes
// ============================================================

import { useState } from 'react';
import { Bell, AlertTriangle, TrendingDown, TrendingUp, Clock, FileText, CheckCircle, Search, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Alerts.css';

export default function Alerts() {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState('ALL');
  
  // All alerts for active profile
  const profileAlerts = state.alerts.filter(a => a.profileId === state.activeProfileId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const filteredAlerts = profileAlerts.filter(a => {
    if (filter === 'UNREAD') return !a.leida;
    if (filter === 'ACTIVE') return a.activa;
    return true;
  });

  const getAlertIcon = (tipo) => {
    switch(tipo) {
      case 'QUIEBRE_STOCK': return <AlertTriangle className="text-danger" />;
      case 'BAJA_PRECIO': return <TrendingDown className="text-success" />;
      case 'ALZA_PRECIO': return <TrendingUp className="text-warning" />;
      case 'PROXIMA_COMPRA': return <Clock className="text-primary" />;
      case 'RECETA_VENCER': return <FileText className="text-warning" />;
      case 'REPOSICION': return <CheckCircle className="text-success" />;
      default: return <Bell className="text-secondary" />;
    }
  };

  const markAsRead = (id) => {
    dispatch({ type: 'UPDATE_ALERT', payload: { id, updates: { leida: true } } });
  };

  const toggleActive = (id, current) => {
    dispatch({ type: 'UPDATE_ALERT', payload: { id, updates: { activa: !current } } });
  };

  return (
    <div className="alerts-page animate-fade-in">
      <div className="alerts-header">
        <div>
          <h2 className="alerts-title">Alertas Inteligentes</h2>
          <p className="text-secondary">Monitoreamos el mercado 24/7 para proteger tu salud y tu bolsillo.</p>
        </div>
      </div>

      <div className="alerts-filters mb-6">
        <button className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('ALL')}>
          Todas
        </button>
        <button className={`btn btn-sm ${filter === 'UNREAD' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('UNREAD')}>
          No leídas
        </button>
        <button className={`btn btn-sm ${filter === 'ACTIVE' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('ACTIVE')}>
          Solo activas
        </button>
      </div>

      <div className="alerts-list stagger-children">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
            <div key={alert.id} className={`card alert-item-card ${!alert.leida ? 'unread' : ''} ${!alert.activa ? 'inactive' : ''}`}>
              <div className="alert-item-icon">
                {getAlertIcon(alert.tipo)}
              </div>
              <div className="alert-item-content">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold">{alert.medicamento}</h4>
                  <span className="text-xs text-muted">{new Date(alert.fecha).toLocaleDateString()}</span>
                </div>
                <p className="text-sm mt-1 mb-2">{alert.mensaje}</p>
                
                <div className="alert-item-actions">
                  {!alert.leida && (
                    <button className="btn btn-ghost btn-sm text-primary" onClick={() => markAsRead(alert.id)}>
                      Marcar como leída
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(alert.id, alert.activa)}>
                    {alert.activa ? 'Desactivar esta alerta' : 'Reactivar'}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon">🔔</span>
            <p>No tienes alertas en esta categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
}
