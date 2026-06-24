// ============================================================
// ALERTS — Alertas Inteligentes
// ============================================================

import { Bell, AlertTriangle, TrendingDown, Clock, Search, ExternalLink } from 'lucide-react';
import { useActiveAlerts } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import './Alerts.css';

export default function Alerts() {
  const alerts = useActiveAlerts();
  const navigate = useNavigate();

  const getAlertIcon = (categoria) => {
    switch(categoria) {
      case 'CRITICA': return <AlertTriangle className="text-danger" />;
      case 'INFORMATIVA': return <TrendingDown className="text-success" />;
      default: return <Bell className="text-warning" />;
    }
  };

  return (
    <div className="alerts-page animate-fade-in">
      <div className="alerts-header">
        <div>
          <h2 className="alerts-title">Alertas Inteligentes</h2>
          <p className="text-secondary">Monitoreamos el mercado 24/7 para proteger tu salud y tu bolsillo.</p>
        </div>
      </div>

      <div className="alerts-list stagger-children mt-6">
        {alerts.length > 0 ? (
          alerts.map((alert) => {
            let badgeClass = 'warning';
            if (alert.categoria === 'CRITICA') badgeClass = 'danger';
            if (alert.categoria === 'INFORMATIVA') badgeClass = 'success';

            return (
              <div key={alert.id} className="card alert-item-card">
                <div className="alert-item-icon">
                  {getAlertIcon(alert.categoria)}
                </div>
                <div className="alert-item-content">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold">{alert.medicamento}</h4>
                    <span className={`badge badge-${badgeClass}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {alert.categoria}
                    </span>
                  </div>
                  <p className="text-sm mt-2 mb-3 text-secondary">{alert.mensaje}</p>
                  
                  <div className="alert-item-actions mt-2">
                    <button 
                      className={`btn btn-sm btn-${badgeClass}`} 
                      onClick={() => navigate(`/medication/${alert.catalogId}`)}
                    >
                      {alert.accion} <ExternalLink size={14} className="ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon">🔔</span>
            <h3 className="empty-state-title mt-4">Todo al día</h3>
            <p className="mt-2 text-secondary">No hay alertas críticas ni recomendaciones pendientes por ahora. Seguimos monitoreando por ti.</p>
          </div>
        )}
      </div>
    </div>
  );
}
