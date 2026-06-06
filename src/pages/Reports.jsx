// ============================================================
// REPORTS — Reportes y Estadísticas
// ============================================================

import { BarChart2, Download, TrendingDown, PiggyBank, DollarSign, Target, Printer } from 'lucide-react';
import { useApp, useActiveMedications } from '../context/AppContext';
import { calculateAccumulatedSavings, calculateMonthlyExpense, calculateTotalSavingsPotential, calculateSavingsPotential, formatCLP } from '../services/savingsEngine';
import './Reports.css';

export default function Reports() {
  const { state } = useApp();
  const medications = useActiveMedications();
  
  const familyPurchases = state.purchases;
  const totalSavings = calculateAccumulatedSavings(familyPurchases);
  const gastoMensual = calculateMonthlyExpense(medications);
  const ahorroPotencial = calculateTotalSavingsPotential(medications);

  // Derive monthly data from real purchases (group by month)
  const monthlyData = (() => {
    const months = {};
    // Seed with the last 6 months even if empty
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { gasto: 0, ahorro: 0 };
    }
    // Fill with real purchase data
    familyPurchases.forEach(p => {
      const d = new Date(p.fecha || p.creadoEn);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].gasto += p.costoFinal || 0;
        months[key].ahorro += p.ahorroObtenido || 0;
      }
    });
    // If no real purchases, use estimated monthly values for demonstration
    const hasRealData = familyPurchases.length > 0;
    if (!hasRealData && medications.length > 0) {
      const keys = Object.keys(months);
      keys.forEach((key, i) => {
        const factor = 0.8 + Math.sin(i) * 0.2; // slight variation
        months[key].gasto = Math.round(gastoMensual * factor);
        months[key].ahorro = Math.round(ahorroPotencial * factor * 0.6);
      });
    }
    return Object.entries(months).map(([mes, data]) => ({
      mes,
      label: mes.split('-')[1] + '/' + mes.split('-')[0].slice(2),
      ...data
    }));
  })();

  const maxChartValue = Math.max(...monthlyData.map(d => Math.max(d.gasto, d.ahorro)), 1);

  // Top savings medications — computed from real catalog data
  const topSavings = medications
    .map(med => {
      const sp = calculateSavingsPotential(med.catalogId);
      return { nombre: med.nombre, dosis: med.dosis, ...sp };
    })
    .filter(m => m.ahorro > 0)
    .sort((a, b) => b.ahorro - a.ahorro)
    .slice(0, 5);

  const handleExportPDF = () => {
    // Use the browser's native print dialog to generate a PDF
    window.print();
  };

  const hasData = medications.length > 0;

  return (
    <div className="reports-page animate-fade-in" id="reports-printable">
      <div className="reports-header no-print">
        <div>
          <h2 className="reports-title">Reportes y Estadísticas</h2>
          <p className="text-secondary">Evolución de tu gasto y ahorro familiar en medicamentos.</p>
          {!hasData && (
            <p className="text-xs text-warning mt-2">
              ⚠️ Agrega medicamentos para ver datos personalizados. Los valores mostrados son estimaciones de referencia.
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={handleExportPDF}>
          <Printer size={18} /> Exportar / Imprimir PDF
        </button>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="print-only print-header">
        <h1>Reporte de Ahorro — Ahorro Inteligente en Fármacos</h1>
        <p>Generado: {new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI Cards */}
      <div className="reports-kpi-grid mt-6 stagger-children">
        <div className="card reports-kpi-card">
          <div className="reports-kpi-icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary)' }}>
            <PiggyBank size={24} />
          </div>
          <div className="reports-kpi-info">
            <span className="reports-kpi-label">Ahorro Acumulado</span>
            <span className="reports-kpi-value text-accent">{formatCLP(totalSavings || ahorroPotencial * 3)}</span>
          </div>
        </div>
        <div className="card reports-kpi-card">
          <div className="reports-kpi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <DollarSign size={24} />
          </div>
          <div className="reports-kpi-info">
            <span className="reports-kpi-label">Gasto Mensual Estimado</span>
            <span className="reports-kpi-value">{formatCLP(gastoMensual)}</span>
          </div>
        </div>
        <div className="card reports-kpi-card">
          <div className="reports-kpi-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>
            <Target size={24} />
          </div>
          <div className="reports-kpi-info">
            <span className="reports-kpi-label">Ahorro Potencial / Mes</span>
            <span className="reports-kpi-value">{formatCLP(ahorroPotencial)}</span>
          </div>
        </div>
      </div>

      <div className="reports-charts-grid mt-6">
        {/* Chart */}
        <div className="card reports-chart-section">
          <div className="reports-section-header">
            <BarChart2 size={20} className="text-primary" />
            <h3>Evolución Mensual (Últimos 6 meses)</h3>
          </div>
          
          <div className="reports-chart-container">
            <div className="css-chart">
              {monthlyData.map((d, i) => {
                const hGasto = (d.gasto / maxChartValue) * 100;
                const hAhorro = (d.ahorro / maxChartValue) * 100;
                return (
                  <div key={i} className="css-chart-col">
                    <div className="css-chart-bars">
                      <div className="css-chart-bar bar-ahorro" style={{ height: `${Math.max(hAhorro, 2)}%` }} title={`Ahorro: ${formatCLP(d.ahorro)}`} />
                      <div className="css-chart-bar bar-gasto" style={{ height: `${Math.max(hGasto, 2)}%` }} title={`Gasto: ${formatCLP(d.gasto)}`} />
                    </div>
                    <span className="css-chart-label">{d.label}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="css-chart-legend">
              <div className="legend-item"><span className="legend-color" style={{ background: '#cbd5e1' }}></span> Gasto</div>
              <div className="legend-item"><span className="legend-color" style={{ background: 'var(--color-primary)' }}></span> Ahorro</div>
            </div>
          </div>
        </div>

        {/* Top Meds */}
        <div className="card reports-list-section">
          <div className="reports-section-header">
            <TrendingDown size={20} className="text-primary" />
            <h3>Donde más ahorras</h3>
          </div>
          {topSavings.length > 0 ? (
            <div className="reports-list">
              {topSavings.map((m, i) => (
                <div key={i} className="reports-list-item">
                  <div>
                    <strong>{m.nombre} {m.dosis}</strong>
                    <p className="text-xs text-secondary">
                      {m.mejorPrecio ? `Mejor: ${m.mejorPrecio.farmacia.nombre}` : 'Comparando farmacias'}
                    </p>
                  </div>
                  <span className="text-success font-bold">{formatCLP(m.ahorro)} /mes</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ padding: 'var(--space-6)' }}>
              Agrega medicamentos para ver oportunidades de ahorro.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
