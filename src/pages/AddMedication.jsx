// ============================================================
// ADD MEDICATION (Dual Mode: OCR + Búsqueda Manual)
// – Búsqueda tolerante (acentos, case-insensitive, parcial)
// – OCR con control de confianza (NUNCA inventa medicamentos)
// ============================================================

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Edit3, CheckCircle, ArrowRight, ArrowLeft, Loader, AlertTriangle, Search, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMedicationCatalog } from '../services/savingsEngine';
import { normalizeText, tolerantMatch } from '../utils/textUtils';
import './AddMedication.css';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Calcula un puntaje de confianza (0-100) basado en la similitud
 * del texto OCR contra los medicamentos del catálogo.
 * Retorna { match, confidence, ocrText, parsedText, candidates }
 */
function matchOCRToCatalog(ocrItem, catalog) {
  const ocrNombre = normalizeText(ocrItem.nombre);
  const ocrDosis = normalizeText(ocrItem.dosis);

  let bestMatch = null;
  let bestScore = 0;
  const candidatesEvaluated = [];

  for (const med of catalog) {
    let score = 0;
    const medNombre = normalizeText(med.nombre);
    const medPrincipio = normalizeText(med.principioActivo);
    const medDosis = normalizeText(med.dosis);

    // Coincidencia de "acido acetil" o "acido acetilsalicilico" con Aspirina Protect / ácido acetilsalicílico
    const isAcidoAcetilQuery = ocrNombre.includes('acido') && ocrNombre.includes('acetil');
    const isAcidoAcetilMed = medPrincipio.includes('acido') && medPrincipio.includes('acetil');

    if (isAcidoAcetilQuery && isAcidoAcetilMed) {
      score = 95; // Mapeo automático de alta confianza
    } else {
      // Coincidencia exacta de nombre → 60 puntos
      if (ocrNombre === medNombre) {
        score += 60;
      }
      // Coincidencia exacta de principio activo → 55 puntos
      else if (ocrNombre === medPrincipio) {
        score += 55;
      }
      // Nombre contenido en el catálogo o viceversa → 40 puntos
      else if (medNombre.includes(ocrNombre) || ocrNombre.includes(medNombre)) {
        score += 40;
      }
      // Principio activo contenido o viceversa → 35 puntos
      else if (medPrincipio.includes(ocrNombre) || ocrNombre.includes(medPrincipio)) {
        score += 35;
      }
      // Sin coincidencia de nombre ni principio activo
      else {
        candidatesEvaluated.push({
          name: `${med.nombre} ${med.dosis}`,
          score: 0
        });
        continue;
      }

      // Bonus por coincidencia de dosis
      if (ocrDosis && medDosis) {
        if (ocrDosis === medDosis) {
          score += 30; // dosis exacta → 30 puntos
        } else if (medDosis.includes(ocrDosis) || ocrDosis.includes(medDosis)) {
          score += 15; // dosis parcial → 15 puntos
        }
      }

      // Bonus por coincidencia de forma farmacéutica
      if (ocrItem.forma) {
        const ocrForma = normalizeText(ocrItem.forma);
        const medForma = normalizeText(med.forma);
        if (ocrForma === medForma) score += 10;
        else if (medForma.includes(ocrForma) || ocrForma.includes(medForma)) score += 5;
      }
    }

    const finalScore = Math.min(score, 100);
    candidatesEvaluated.push({
      name: `${med.nombre} ${med.dosis}`,
      score: finalScore
    });

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = med;
    }
  }

  // Ordenar candidatos por puntaje descendente y quedarse con el top 5
  candidatesEvaluated.sort((a, b) => b.score - a.score);

  return {
    match: bestMatch,
    confidence: bestScore,
    ocrText: `${ocrItem.nombre} ${ocrItem.dosis || ''}`.trim(),
    parsedText: bestMatch ? `${bestMatch.nombre} ${bestMatch.dosis}` : null,
    candidates: candidatesEvaluated.slice(0, 5)
  };
}

// ── Constantes ────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 90; // Por debajo de esto → revisión manual obligatoria

const STEPS = {
  UPLOAD: 'UPLOAD',
  PROCESSING: 'PROCESSING',
  REVIEW: 'REVIEW',
  SUCCESS: 'SUCCESS',
  MANUAL_SEARCH: 'MANUAL_SEARCH',
};

// ── Componente ────────────────────────────────────────────────

export default function AddMedication() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.UPLOAD);
  
  const MEDICATIONS_CATALOG = getMedicationCatalog();
  
  // OCR Form State
  const [detectedData, setDetectedData] = useState([]);
  const [activeProfile, setActiveProfile] = useState(state.activeProfileId);
  const fileInputRef = useRef(null);

  // Manual Search State
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processOCR(file);
    }
  };

  /**
   * Procesa el texto extraído del OCR (real o de archivo de texto).
   */
  const runOCRLogic = (rawText) => {
    // Si el texto indica que no se pudo leer, o es extremadamente corto
    if (!rawText || rawText.includes("No se pudo leer la receta") || rawText.trim().length < 3) {
      setDetectedData([{
        id: `ocr-${Date.now()}-empty`,
        nombre: '',
        dosis: '',
        frecuencia: '',
        cantidad: 30,
        forma: '',
        confidenceScore: 0,
        ocrTextRaw: rawText || 'Receta ilegible',
        ocrText: 'No se pudo leer la receta',
        parsedText: null,
        ocrCandidates: [],
        catalogMatch: null,
        needsManualReview: true,
        selected: false,
      }]);
      setStep(STEPS.REVIEW);
      return;
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const rawOcrItems = [];

    // Buscar nombres del catálogo en el texto
    MEDICATIONS_CATALOG.forEach(med => {
      // Evitar duplicados del mismo medicamento
      if (rawOcrItems.some(item => item.nombre === med.nombre)) return;

      const hasMed = lines.some(line => tolerantMatch(line, med.nombre) || tolerantMatch(line, med.principioActivo));
      if (hasMed) {
        const matchingLine = lines.find(line => tolerantMatch(line, med.nombre) || tolerantMatch(line, med.principioActivo));
        
        // Detección de dosis
        let dose = med.dosis; // valor predeterminado
        const doseRegex = /(\d+\s*(mg|mcg|g))/i;
        const doseMatch = matchingLine.match(doseRegex);
        if (doseMatch) {
          dose = doseMatch[1];
        }

        // Detección de frecuencia
        let frecuencia = 'Una vez al día';
        const freqLine = lines.find(line => 
          tolerantMatch(line, 'vez') || 
          tolerantMatch(line, 'veces') || 
          tolerantMatch(line, 'horas') || 
          tolerantMatch(line, 'cada') ||
          tolerantMatch(line, 'al dia')
        );
        if (freqLine) {
          frecuencia = freqLine;
        }

        // Detección de cantidad (comprimidos / días)
        let cantidad = 30;
        const qtyLine = lines.find(line => 
          tolerantMatch(line, 'dia') || 
          tolerantMatch(line, 'comprimido') || 
          tolerantMatch(line, 'tableta') || 
          tolerantMatch(line, 'caja')
        );
        if (qtyLine) {
          const numMatch = qtyLine.match(/\d+/);
          if (numMatch) {
            cantidad = parseInt(numMatch[0]);
          }
        }

        rawOcrItems.push({
          nombre: med.nombre,
          dosis: dose,
          frecuencia: frecuencia,
          cantidad: cantidad,
          forma: med.forma,
          rawTextLine: matchingLine
        });
      }
    });

    // Si no detecta nada del catálogo, pero el texto bruto tiene líneas, creamos un registro genérico
    if (rawOcrItems.length === 0 && lines.length > 0) {
      rawOcrItems.push({
        nombre: 'Medicamento no identificado',
        dosis: '',
        frecuencia: '',
        cantidad: 30,
        forma: '',
        rawTextLine: lines.join(' | ')
      });
    }

    // Para cada item detectado, calcular el score y aplicar reglas de confianza
    const processed = rawOcrItems.map((ocrItem, i) => {
      const { match, confidence, ocrText, parsedText, candidates } = matchOCRToCatalog(ocrItem, MEDICATIONS_CATALOG);
      
      const isHighConfidence = confidence >= CONFIDENCE_THRESHOLD; // 90%
      const hasMinMatch = confidence >= 60; // 60%

      return {
        id: `ocr-${Date.now()}-${i}`,
        // Si confidence < 60%, BLOQUEAR prellenado de nombre/dosis/frecuencia
        nombre: hasMinMatch ? (isHighConfidence && match ? match.nombre : ocrItem.nombre) : '',
        dosis: hasMinMatch ? (isHighConfidence && match ? match.dosis : ocrItem.dosis) : '',
        frecuencia: hasMinMatch ? ocrItem.frecuencia : '',
        cantidad: ocrItem.cantidad,
        forma: hasMinMatch ? (isHighConfidence && match ? match.forma : '') : '',
        confidenceScore: confidence,
        ocrTextRaw: ocrItem.rawTextLine || ocrItem.nombre,
        ocrText: ocrText,
        parsedText: isHighConfidence && match ? parsedText : null,
        // Si confidence < 60%, NO mostrar candidatos sugeridos
        ocrCandidates: hasMinMatch ? candidates.filter(c => c.score >= 60) : [],
        catalogMatch: isHighConfidence ? match : null,
        needsManualReview: !isHighConfidence, // Siempre true si < 90%
        selected: isHighConfidence, // Auto-selección solo si >= 90%
      };
    });

    setDetectedData(processed);
    setStep(STEPS.REVIEW);
  };

  /**
   * Pipeline OCR real con Tesseract.js.
   * Si es un archivo de texto, extrae su contenido.
   * Si es una imagen, carga dinámicamente Tesseract.js y realiza el OCR real.
   */
  const processOCR = (file) => {
    setStep(STEPS.PROCESSING);
    
    // 1. Si es un archivo de texto (.txt), leer su contenido real directamente
    if (file && (file.type.startsWith('text/') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        runOCRLogic(e.target.result || '');
      };
      reader.readAsText(file);
      return;
    }

    // 2. Si es una imagen, correr Tesseract.js real cargado desde el CDN
    const loadAndRunTesseract = () => {
      const scriptId = 'tesseract-cdn-script';
      let script = document.getElementById(scriptId);

      const startOCR = () => {
        if (!window.Tesseract) {
          console.error("Tesseract no está cargado en el objeto window.");
          runOCRLogic("No se pudo leer la receta");
          return;
        }

        window.Tesseract.recognize(
          file,
          'spa', // Idioma español
          {
            logger: m => console.log('[Tesseract Progress]', m.status, Math.round(m.progress * 100) + '%')
          }
        ).then(({ data: { text } }) => {
          if (!text || text.trim().length === 0) {
            runOCRLogic("No se pudo leer la receta");
          } else {
            runOCRLogic(text);
          }
        }).catch(err => {
          console.error("Error en reconocimiento OCR:", err);
          runOCRLogic("No se pudo leer la receta");
        });
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = startOCR;
        script.onerror = () => {
          console.error("Fallo al descargar Tesseract.js del CDN");
          runOCRLogic("No se pudo leer la receta");
        };
        document.body.appendChild(script);
      } else if (window.Tesseract) {
        startOCR();
      } else {
        setTimeout(startOCR, 500);
      }
    };

    try {
      loadAndRunTesseract();
    } catch (err) {
      console.error("Error en inicialización OCR:", err);
      runOCRLogic("No se pudo leer la receta");
    }
  };

  const handleEditChange = (id, field, value) => {
    setDetectedData(prev => 
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const handleToggleSelect = (id) => {
    setDetectedData(prev => 
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  /**
   * Al guardar, re-verificar el match contra el catálogo usando
   * el nombre editado por el usuario (por si corrigió manualmente).
   * Bloquea el guardado si no hay coincidencia válida en el catálogo clínico de Supabase.
   */
  const handleSave = () => {
    const toSave = detectedData.filter(d => d.selected);
    if (toSave.length === 0) return;

    let hasInvalid = false;

    toSave.forEach(data => {
      // Si ya tenemos un catalogMatch de alta confianza, usarlo
      let catalogMatch = data.catalogMatch;

      // Si fue editado manualmente o no tenía match, re-buscar
      if (!catalogMatch) {
        catalogMatch = MEDICATIONS_CATALOG.find(
          m => tolerantMatch(m.nombre, data.nombre) || tolerantMatch(m.principioActivo, data.nombre)
        );
      }

      if (!catalogMatch) {
        alert(`El medicamento "${data.nombre}" no existe en el catálogo oficial de la aplicación. Por favor, selecciona o escribe un nombre válido de medicamento.`);
        hasInvalid = true;
        return;
      }

      dispatch({
        type: 'ADD_MEDICATION',
        payload: {
          profileId: activeProfile,
          catalogId: catalogMatch.id,
          frecuencia: data.frecuencia,
          cantidadComprada: data.cantidad,
          alertasActivas: true,
          origen: 'OCR',
        },
      });
    });

    setStep(STEPS.SUCCESS);
  };

  const handleManualAdd = (catalogMed) => {
    dispatch({
      type: 'ADD_MEDICATION',
      payload: {
        profileId: activeProfile,
        catalogId: catalogMed.id,
        frecuencia: catalogMed.frecuenciaComun,
        cantidadComprada: 30,
        alertasActivas: true,
        origen: 'Manual',
      },
    });
    setStep(STEPS.SUCCESS);
  };

  // ── Búsqueda tolerante (sin acentos, case-insensitive, parcial) ──
  const searchResults = MEDICATIONS_CATALOG.filter(m => 
    tolerantMatch(m.nombre, searchQuery) ||
    tolerantMatch(m.principioActivo, searchQuery) ||
    tolerantMatch(m.dosis, searchQuery) ||
    tolerantMatch(m.categoria, searchQuery)
  );

  // ── Helper para badge de confianza ──
  const ConfidenceBadge = ({ score }) => {
    if (score >= 90) {
      return (
        <span className="confidence-badge confidence-high">
          <ShieldCheck size={14} /> {score}% confianza
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="confidence-badge confidence-medium">
          <AlertTriangle size={14} /> {score}% — Revisión sugerida
        </span>
      );
    }
    return (
      <span className="confidence-badge confidence-low">
        <ShieldAlert size={14} /> {score}% — Revisión manual requerida
      </span>
    );
  };

  return (
    <div className="add-med-page animate-fade-in">
      <div className="add-med-header">
        <h2 className="add-med-title">Agregar Medicamento</h2>
        <p className="text-secondary">Sube una foto de tu receta o búscalo manualmente.</p>
      </div>

      <div className="add-med-container">
        
        {/* STEP 1: UPLOAD (DEFAULT) */}
        {step === STEPS.UPLOAD && (
          <div className="card add-med-upload-card animate-scale-in">
            <div className="add-med-upload-area" onClick={() => fileInputRef.current?.click()}>
              <Camera size={48} className="text-primary mb-4" />
              <h3>Tomar foto o subir imagen</h3>
              <p className="text-sm text-secondary text-center mt-2">
                Asegúrate de que el nombre, dosis y frecuencia sean legibles.
              </p>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="sr-only" 
                capture="environment"
              />
              <button className="btn btn-primary mt-6">
                <Upload size={18} /> Subir Receta
              </button>
            </div>
            
            <div className="text-center mt-6">
              <span className="text-muted text-sm">¿Prefieres ingresarlo a mano?</span>
              <br />
              <button className="btn btn-ghost mt-2" onClick={() => setStep(STEPS.MANUAL_SEARCH)}>
                Búsqueda manual <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* MANUAL SEARCH MODE */}
        {step === STEPS.MANUAL_SEARCH && (
          <div className="add-med-manual animate-slide-up">
            <button className="btn btn-ghost btn-sm mb-4" onClick={() => setStep(STEPS.UPLOAD)}>
              <ArrowLeft size={16} /> Volver al escáner
            </button>

            <div className="form-group mb-6">
              <label className="form-label">¿A qué perfil deseas agregar este medicamento?</label>
              <select 
                className="form-select" 
                value={activeProfile}
                onChange={e => setActiveProfile(e.target.value)}
              >
                {state.profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.icono} {p.nombre} ({p.tipo})</option>
                ))}
              </select>
            </div>

            <div className="search-box mb-6">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Ej. Losartan, Paracetamol, acido acetilsalicilico..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="manual-results">
              {searchQuery.length > 0 ? (
                searchResults.length > 0 ? (
                  searchResults.map(med => (
                    <div key={med.id} className="card manual-result-card flex items-center justify-between mb-3 hover:bg-gray-50 transition-colors">
                      <div>
                        <strong>{med.nombre} {med.dosis}</strong>
                        <p className="text-xs text-secondary mt-1">{med.principioActivo} • {med.forma}</p>
                      </div>
                      <button className="btn btn-primary btn-sm btn-icon rounded-full" onClick={() => handleManualAdd(med)}>
                        <Plus size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">
                    No se encontraron medicamentos que coincidan.
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted">
                  Escribe el nombre o principio activo arriba para buscar en el catálogo.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING */}
        {step === STEPS.PROCESSING && (
          <div className="card add-med-processing animate-fade-in">
            <Loader size={48} className="text-primary animate-spin mb-4" />
            <h3>Analizando imagen...</h3>
            <p className="text-secondary mt-2">Nuestra IA está extrayendo los medicamentos de tu receta.</p>
            <div className="progress-bar mt-6 w-full">
              <div className="progress-bar-fill" style={{ width: '100%', animation: 'progress 2s ease-out' }} />
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW (OCR ONLY) */}
        {step === STEPS.REVIEW && (
          <div className="add-med-review animate-slide-up">
            <div className="alert-banner alert-banner-warning mb-6">
              <AlertTriangle size={24} />
              <div>
                <strong>Revisión obligatoria</strong>
                <p>Verifica que los datos detectados sean correctos. Los medicamentos con baja confianza requieren revisión manual.</p>
              </div>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">¿A qué perfil deseas agregar estos medicamentos?</label>
              <select 
                className="form-select" 
                value={activeProfile}
                onChange={e => setActiveProfile(e.target.value)}
              >
                {state.profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.icono} {p.nombre} ({p.tipo})</option>
                ))}
              </select>
            </div>

            <div className="stagger-children">
              {detectedData.map((data) => (
                <div key={data.id} className={`card add-med-edit-card ${!data.selected ? 'opacity-50' : ''} ${data.needsManualReview ? 'needs-review' : ''}`}>
                  <div className="add-med-edit-header">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={data.selected} 
                        onChange={() => handleToggleSelect(data.id)} 
                        className="w-5 h-5 accent-primary"
                      />
                      <strong>Incluir este medicamento</strong>
                    </label>
                    <ConfidenceBadge score={data.confidenceScore} />
                  </div>

                  {/* Trazabilidad completa del OCR */}
                  <div className="ocr-traceability-panel mt-3">
                    <div className="trace-title">Trazabilidad del Proceso OCR</div>
                    <div className="trace-grid">
                      <div>
                        <strong>Texto OCR bruto:</strong>
                        <div className="trace-code">{data.ocrTextRaw}</div>
                      </div>
                      <div>
                        <strong>Texto normalizado:</strong>
                        <div className="trace-code">{normalizeText(data.ocrTextRaw)}</div>
                      </div>
                    </div>
                    <div className="trace-candidates mt-3">
                      <strong>Candidatos Evaluados (Top 5):</strong>
                      <table className="trace-table">
                        <thead>
                          <tr>
                            <th>Medicamento en Catálogo</th>
                            <th>Coincidencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.ocrCandidates && data.ocrCandidates.map((cand, idx) => (
                            <tr key={idx} className={cand.score >= 90 ? 'cand-high' : cand.score >= 50 ? 'cand-med' : ''}>
                              <td>{cand.name}</td>
                              <td>{cand.score}%</td>
                            </tr>
                          ))}
                          {(!data.ocrCandidates || data.ocrCandidates.length === 0) && (
                            <tr>
                              <td colSpan="2" className="text-center text-secondary">No se evaluaron candidatos</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="trace-selection mt-3">
                      <strong>Resultado:</strong>{' '}
                      {data.confidenceScore >= 90 && data.catalogMatch ? (
                        <span className="text-success" style={{ fontWeight: 600 }}>
                          Elegido "{data.catalogMatch.nombre} {data.catalogMatch.dosis}" (Confianza alta: {data.confidenceScore}%)
                        </span>
                      ) : (
                        <span className="text-danger" style={{ fontWeight: 600 }}>
                          "Medicamento no identificado" (Confianza baja: {data.confidenceScore}%). Requiere revisión manual.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Advertencia de baja confianza */}
                  {data.needsManualReview && data.selected && (
                    <div className="low-confidence-warning mt-3">
                      <ShieldAlert size={16} />
                      <span>Confianza insuficiente. Verifica o edita el nombre del medicamento antes de guardar.</span>
                    </div>
                  )}
                  
                  {data.selected && (
                    <div className="add-med-edit-grid mt-4">
                      <div className="form-group">
                        <label className="form-label text-xs">Nombre</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={data.nombre}
                          onChange={e => handleEditChange(data.id, 'nombre', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Dosis</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={data.dosis}
                          onChange={e => handleEditChange(data.id, 'dosis', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Frecuencia</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={data.frecuencia}
                          onChange={e => handleEditChange(data.id, 'frecuencia', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Cantidad (comprimidos)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={data.cantidad}
                          onChange={e => handleEditChange(data.id, 'cantidad', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <button className="btn btn-secondary" onClick={() => setStep(STEPS.UPLOAD)}>
                <ArrowLeft size={18} /> Reintentar
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={handleSave}
                disabled={!detectedData.some(d => d.selected)}
              >
                Confirmar y Guardar
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === STEPS.SUCCESS && (
          <div className="card add-med-success animate-scale-in text-center">
            <CheckCircle size={64} className="text-success mb-4 mx-auto" />
            <h3 className="text-2xl font-bold mb-2">¡Medicamentos guardados!</h3>
            <p className="text-secondary mb-8">
              Ya estamos monitoreando los precios y el stock para generar recomendaciones de ahorro.
            </p>
            <div className="flex flex-col gap-3">
              <button className="btn btn-primary btn-block" onClick={() => navigate('/medications')}>
                Ver mis medicamentos
              </button>
              <button className="btn btn-secondary btn-block" onClick={() => setStep(STEPS.UPLOAD)}>
                Agregar otro
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
