// ============================================================
// SAVINGS — Centro de Ahorro
// ============================================================

import { PiggyBank, Search, CheckCircle, ExternalLink, Filter } from 'lucide-react';
import { useApp, useActiveMedications } from '../context/AppContext';
import { getApplicableBenefits, formatCLP, calculateAccumulatedSavings } from '../services/savingsEngine';
import { BENEFICIOS } from '../data/mockData';
import './Savings.css';

export default function Savings() {
  const { state } = useApp();
  const medications = useActiveMedications();

  const totalSavings = calculateAccumulatedSavings(state.purchases);

  // Find all applicable benefits for active profile
  const applicableBenefits = new Set();
  medications.forEach(med => {
    getApplicableBenefits(med.catalogId).forEach(b => applicableBenefits.add(b));
  });
  
  const benefitsList = Array.from(applicableBenefits);
  const otherBenefits = BENEFICIOS.filter(b => !benefitsList.some(ab => ab.id === b.id));

  return (
    <div className="savings-page animate-fade-in">
      <div className="savings-header">
        <div>
          <h2 className="savings-title">Centro de Ahorro</h2>
          <p className="text-secondary">Oportunidades, convenios y beneficios disponibles para ti.</p>
        </div>
      </div>

      <div className="card savings-hero-card">
        <PiggyBank size={40} className="text-primary opacity-80" />
        <div className="savings-hero-content">
          <span className="savings-hero-label">Ahorro histórico acumulado</span>
          <span className="savings-hero-value">{formatCLP(totalSavings)}</span>
        </div>
      </div>

      <div className="savings-content mt-8">
        <h3 className="savings-section-title">✨ Recomendados para tu tratamiento</h3>
        
        {benefitsList.length > 0 ? (
          <div className="savings-grid stagger-children mb-8">
            {benefitsList.map(b => (
              <div key={b.id} className="card savings-benefit-card highlight">
                <div className="savings-benefit-header">
                  <span className="badge badge-success">{b.tipo}</span>
                  <span className="savings-benefit-discount">{b.descuento} DCTO</span>
                </div>
                <h4 className="savings-benefit-title">{b.nombre}</h4>
                <p className="savings-benefit-desc">{b.descripcion}</p>
                <div className="savings-benefit-meta">
                  <CheckCircle size={16} className="text-success" />
                  <span>Aplica a tus medicamentos</span>
                </div>
                <button className="btn btn-primary btn-block mt-4">
                  Ver cómo usar <ExternalLink size={16} className="ml-2" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state bg-white rounded-xl border mb-8 p-6">
            <span className="empty-state-icon">🔍</span>
            <p>Aún no detectamos beneficios específicos para tus medicamentos actuales. Explora otros convenios abajo.</p>
          </div>
        )}

        <h3 className="savings-section-title">Explorar otros convenios</h3>
        <div className="savings-grid stagger-children">
          {otherBenefits.map(b => (
            <div key={b.id} className="card savings-benefit-card">
              <div className="savings-benefit-header">
                <span className="badge badge-info">{b.tipo}</span>
                <span className="savings-benefit-discount text-primary">{b.descuento} DCTO</span>
              </div>
              <h4 className="savings-benefit-title">{b.nombre}</h4>
              <p className="savings-benefit-desc">{b.descripcion}</p>
              <div className="savings-benefit-meta text-muted">
                <span>Vigencia: {b.vigencia}</span>
              </div>
              <button className="btn btn-secondary btn-block mt-4">
                Ver requisitos
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
