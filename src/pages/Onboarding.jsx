// ============================================================
// ONBOARDING PAGE — Flujo personalizado de registro
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { COMUNAS, PATOLOGIAS, RANGOS_EDAD, TIPOS_PERFIL, MEDICATIONS_CATALOG as MOCK_CATALOG } from '../data/mockData';
import { calculateMonthlyExpense, calculateTotalSavingsPotential, formatCLP, getMedicationCatalog } from '../services/savingsEngine';
import './Onboarding.css';

const STEPS = ['perfil', 'ubicacion', 'salud', 'consentimiento', 'resumen'];

export default function Onboarding() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    tipoPerfil: 'yo',
    rangoEdad: '',
    comuna: '',
    patologias: [],
    medicamentosSeleccionados: [],
  });

  const currentStep = STEPS[step];

  const togglePatologia = (id) => {
    if (id === 'none') {
      setForm((prev) => ({ ...prev, patologias: [] }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      patologias: prev.patologias.includes(id)
        ? prev.patologias.filter((p) => p !== id)
        : [...prev.patologias, id],
    }));
  };

  const handleFinish = async () => {
    const tipoPerfil = TIPOS_PERFIL.find((t) => t.id === form.tipoPerfil);

    // dispatch ADD_PROFILE retorna el UUID real generado por Supabase
    const realProfileId = await dispatch({
      type: 'ADD_PROFILE',
      payload: {
        id: `profile-${Date.now()}`, // temporal, se reemplaza con UUID real
        nombre: form.nombre || tipoPerfil?.label || 'Mi perfil',
        tipo: tipoPerfil?.label || 'Mi perfil',
        tipoPerfil: form.tipoPerfil,
        icono: tipoPerfil?.icono || '👤',
        rangoEdad: form.rangoEdad,
        comuna: form.comuna,
        patologias: form.patologias,
        creadoEn: new Date().toISOString(),
      },
    });

    if (realProfileId) {
      // Agregar medicamentos usando el UUID real del perfil
      const liveCatalog = getMedicationCatalog();
      const catalog = liveCatalog.length > 0 ? liveCatalog : MOCK_CATALOG;

      for (const patId of form.patologias) {
        const pat = PATOLOGIAS.find((p) => p.id === patId);
        if (!pat) continue;
        const seen = new Set();
        for (const medId of pat.medicamentosRelacionados) {
          if (seen.has(medId)) continue;
          seen.add(medId);
          const catalogMed = catalog.find((m) => m.id === medId);
          if (catalogMed && !catalogMed.esBioequivalente) {
            await dispatch({
              type: 'ADD_MEDICATION',
              payload: {
                id: `med-${Date.now()}-${medId}`,
                profileId: realProfileId,
                catalogId: medId,
                nombre: catalogMed.nombre,
                dosis: catalogMed.dosis,
                frecuencia: catalogMed.frecuenciaComun,
                alertasActivas: true,
                creadoEn: new Date().toISOString(),
              },
            });
          }
        }
      }
    }

    dispatch({
      type: 'COMPLETE_ONBOARDING',
      payload: { ...form, consentGiven: true, completed: true },
    });

    navigate('/dashboard');
  };

  // Compute estimated savings for summary
  const getEstimates = () => {
    // Usar catálogo live con fallback al mock estático
    const liveCatalog = getMedicationCatalog();
    const catalog = liveCatalog.length > 0 ? liveCatalog : MOCK_CATALOG;
    const mockMeds = [];
    for (const patId of form.patologias) {
      const pat = PATOLOGIAS.find((p) => p.id === patId);
      if (pat) {
        pat.medicamentosRelacionados.forEach((medId) => {
          if (!mockMeds.find((m) => m.catalogId === medId)) {
            mockMeds.push({ catalogId: medId, deleted: false });
          }
        });
      }
    }
    return {
      gastoMensual: calculateMonthlyExpense(mockMeds),
      ahorroPotencial: calculateTotalSavingsPotential(mockMeds),
      medicamentos: mockMeds.length,
    };
  };

  const canProceed = () => {
    if (currentStep === 'perfil') return form.nombre.trim() && form.rangoEdad;
    if (currentStep === 'ubicacion') return form.comuna;
    if (currentStep === 'salud') return true;
    if (currentStep === 'consentimiento') return consentGiven;
    return true;
  };

  return (
    <div className="onboarding-page">
      {/* Progress */}
      <div className="onboarding-progress">
        {STEPS.map((s, i) => (
          <div key={s} className={`onboarding-progress-step ${i <= step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
            {i < step ? <Check size={14} /> : <span>{i + 1}</span>}
          </div>
        ))}
        <div className="onboarding-progress-bar">
          <div className="onboarding-progress-fill" style={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="onboarding-content animate-fade-in">
        {/* Step 1: Profile */}
        {currentStep === 'perfil' && (
          <div className="onboarding-step">
            <h2>👋 ¡Bienvenido!</h2>
            <p className="onboarding-desc">Cuéntanos sobre ti para personalizar tu experiencia.</p>

            <div className="form-group">
              <label className="form-label" htmlFor="nombre">¿Cómo te llamas?</label>
              <input
                id="nombre"
                className="form-input"
                type="text"
                placeholder="Ingresa tu nombre"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>

            <div className="form-group mt-4">
              <label className="form-label">¿Para quién es este perfil?</label>
              <div className="onboarding-type-grid">
                {TIPOS_PERFIL.map((tipo) => (
                  <button
                    key={tipo.id}
                    className={`onboarding-type-btn ${form.tipoPerfil === tipo.id ? 'active' : ''}`}
                    onClick={() => setForm((p) => ({ ...p, tipoPerfil: tipo.id }))}
                  >
                    <span className="onboarding-type-icon">{tipo.icono}</span>
                    <span>{tipo.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group mt-4">
              <label className="form-label" htmlFor="edad">Rango de edad</label>
              <select
                id="edad"
                className="form-select"
                value={form.rangoEdad}
                onChange={(e) => setForm((p) => ({ ...p, rangoEdad: e.target.value }))}
              >
                <option value="">Selecciona un rango</option>
                {RANGOS_EDAD.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 'ubicacion' && (
          <div className="onboarding-step">
            <h2>📍 ¿Dónde vives?</h2>
            <p className="onboarding-desc">Esto nos permite encontrar farmacias cercanas y beneficios locales.</p>

            <div className="form-group">
              <label className="form-label" htmlFor="comuna">Ciudad o comuna</label>
              <select
                id="comuna"
                className="form-select"
                value={form.comuna}
                onChange={(e) => setForm((p) => ({ ...p, comuna: e.target.value }))}
              >
                <option value="">Selecciona tu comuna</option>
                {COMUNAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Health */}
        {currentStep === 'salud' && (
          <div className="onboarding-step">
            <h2>💊 ¿Qué condiciones manejas?</h2>
            <p className="onboarding-desc">Selecciona las patologías crónicas. Esto nos ayuda a sugerir medicamentos.</p>

            <div className="onboarding-patologias">
              <button
                type="button"
                className={`onboarding-patologia-btn ${form.patologias.length === 0 ? 'active' : ''}`}
                onClick={() => togglePatologia('none')}
                style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', gap: '8px' }}
              >
                <Check size={16} className={`onboarding-patologia-check ${form.patologias.length === 0 ? 'visible' : ''}`} />
                <span>Ninguna enfermedad / Sin patologías conocidas</span>
              </button>

              {PATOLOGIAS.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  className={`onboarding-patologia-btn ${form.patologias.includes(pat.id) ? 'active' : ''}`}
                  onClick={() => togglePatologia(pat.id)}
                >
                  <Check size={16} className={`onboarding-patologia-check ${form.patologias.includes(pat.id) ? 'visible' : ''}`} />
                  <span>{pat.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Consent */}
        {currentStep === 'consentimiento' && (
          <div className="onboarding-step">
            <h2>⚖️ Privacidad de Datos</h2>
            <p className="onboarding-desc">De acuerdo con la Ley 19.628 de Protección de la Vida Privada de Chile, necesitamos tu consentimiento explícito para procesar tus datos de salud.</p>

            <div className="card mt-4" style={{ background: 'var(--color-bg-secondary)' }}>
              <div className="flex items-start gap-3">
                <ShieldCheck size={24} className="text-primary mt-1" />
                <div>
                  <h3 className="text-base font-bold mb-2">Tratamiento de Datos Sensibles</h3>
                  <p className="text-sm text-secondary mb-4">
                    Al aceptar, consientes que "Ahorro Inteligente en Fármacos Crónicos" procese y almacene localmente la información sobre tus patologías y medicamentos con el único fin de generar recomendaciones de ahorro. No vendemos ni compartimos esta información con terceros.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 accent-primary"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                    />
                    <span className="text-sm font-semibold">He leído, comprendo y otorgo mi consentimiento explícito.</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {currentStep === 'resumen' && (() => {
          const est = getEstimates();
          return (
            <div className="onboarding-step">
              <h2>🎯 Tu diagnóstico inicial</h2>
              <p className="onboarding-desc">Basado en tu información, esto es lo que encontramos:</p>

              <div className="onboarding-summary-cards">
                <div className="card card-accent">
                  <div className="stat-card">
                    <span className="stat-label">Gasto mensual estimado</span>
                    <span className="stat-value">{formatCLP(est.gastoMensual)}</span>
                  </div>
                </div>
                <div className="card card-savings">
                  <div className="stat-card">
                    <span className="stat-label">Ahorro potencial mensual</span>
                    <span className="stat-value stat-value-accent">{formatCLP(est.ahorroPotencial)}</span>
                  </div>
                </div>
                <div className="card">
                  <div className="stat-card">
                    <span className="stat-label">Medicamentos detectados</span>
                    <span className="stat-value">{est.medicamentos}</span>
                  </div>
                </div>
                <div className="card">
                  <div className="stat-card">
                    <span className="stat-label">Ahorro anual proyectado</span>
                    <span className="stat-value stat-value-accent">{formatCLP(est.ahorroPotencial * 12)}</span>
                  </div>
                </div>
              </div>

              <div className="alert-banner alert-banner-success mt-6">
                <span>🎉</span>
                <span>
                  <strong>¡Buenas noticias!</strong> Podrías ahorrar hasta{' '}
                  <strong>{formatCLP(est.ahorroPotencial * 12)}</strong> al año en medicamentos.
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Navigation */}
      <div className="onboarding-nav">
        {step > 0 && (
          <button className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft size={18} />
            Anterior
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            Siguiente
            <ArrowRight size={18} />
          </button>
        ) : (
          <button className="btn btn-accent btn-lg" onClick={handleFinish}>
            <Check size={20} />
            Comenzar a ahorrar
          </button>
        )}
      </div>
    </div>
  );
}
