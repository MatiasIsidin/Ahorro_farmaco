// ============================================================
// PROFILE — Perfil de Usuario
// ============================================================

import { useState, useEffect } from 'react';
import { User, Edit3, Heart, Save } from 'lucide-react';
import { useApp, useActiveProfile } from '../context/AppContext';
import { COMUNAS, RANGOS_EDAD } from '../data/mockData';
import { calculateAccumulatedSavings, formatCLP } from '../services/savingsEngine';
import { SkeletonCard } from '../components/LoadingSkeleton';
import './Profile.css';

export default function Profile() {
  const { state, dispatch } = useApp();
  const profile = useActiveProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    rangoEdad: '',
    comuna: '',
    prevision: 'Fonasa',
  });

  // Sincronizar form cuando el perfil carga desde Supabase
  useEffect(() => {
    if (profile) {
      setForm({
        nombre: profile.nombre || '',
        rangoEdad: profile.rangoEdad || '',
        comuna: profile.comuna || '',
        prevision: profile.prevision || 'Fonasa',
      });
    }
  }, [profile?.id]); // solo re-sincronizar si cambia el perfil activo

  // Loading state — datos aún cargando desde Supabase
  if (state.isLoadingData) {
    return (
      <div className="profile-page animate-fade-in">
        <div className="profile-header">
          <h2 className="profile-title">Mi Perfil</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  // Sin perfil activo — datos cargados pero no hay perfiles
  if (!profile) {
    return (
      <div className="profile-page animate-fade-in">
        <div className="profile-header">
          <h2 className="profile-title">Mi Perfil</h2>
        </div>
        <div className="empty-state">
          <span className="empty-state-icon">👤</span>
          <h3 className="empty-state-title">No hay perfil activo</h3>
          <p>Ve a "Mi Familia" para crear tu primer perfil.</p>
          <a href="/family" className="btn btn-primary mt-4">Ir a Mi Familia</a>
        </div>
      </div>
    );
  }

  // Calcular estadísticas solo cuando profile existe
  const totalProfileSavings = calculateAccumulatedSavings(
    state.purchases.filter(p => p.profileId === profile.id)
  );
  const profileMeds = state.medications.filter(m => m.profileId === profile.id && !m.deleted).length;
  const profileRecipes = state.recipes.filter(r => r.profileId === profile.id).length;

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: { id: profile.id, updates: form },
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setForm({
      nombre: profile.nombre || '',
      rangoEdad: profile.rangoEdad || '',
      comuna: profile.comuna || '',
      prevision: profile.prevision || 'Fonasa',
    });
    setIsEditing(false);
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-header">
        <h2 className="profile-title">Mi Perfil</h2>
        <p className="text-secondary">Gestiona tus datos personales y configuración de salud.</p>
      </div>

      <div className="card profile-hero-card">
        <div className="profile-hero-content">
          <div className="profile-avatar">{profile.icono || '👤'}</div>
          <div className="profile-hero-info">
            <h3>{profile.nombre}</h3>
            <span className="badge badge-info mt-1">{profile.tipo}</span>
          </div>
          {!isEditing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
              <Edit3 size={16} /> Editar
            </button>
          )}
        </div>
      </div>

      <div className="profile-grid mt-6">
        {/* Datos Personales */}
        <div className="card profile-section stagger-children">
          <div className="profile-section-header">
            <User className="text-primary" size={20} />
            <h4>Datos Personales</h4>
          </div>

          <div className="profile-form-grid">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              {isEditing ? (
                <input
                  type="text"
                  className="form-input"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              ) : (
                <div className="profile-value">{profile.nombre}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Rango de Edad</label>
              {isEditing ? (
                <select
                  className="form-select"
                  value={form.rangoEdad}
                  onChange={e => setForm({ ...form, rangoEdad: e.target.value })}
                >
                  <option value="">Seleccione</option>
                  {RANGOS_EDAD.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <div className="profile-value">{profile.rangoEdad || 'No especificado'}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Previsión de Salud</label>
              {isEditing ? (
                <select
                  className="form-select"
                  value={form.prevision}
                  onChange={e => setForm({ ...form, prevision: e.target.value })}
                >
                  <option value="Fonasa">Fonasa</option>
                  <option value="Isapre CruzBlanca">Isapre CruzBlanca</option>
                  <option value="Isapre Banmédica">Isapre Banmédica</option>
                  <option value="Isapre Consalud">Isapre Consalud</option>
                  <option value="Isapre Colmena">Isapre Colmena</option>
                  <option value="Particular">Particular</option>
                </select>
              ) : (
                <div className="profile-value">{profile.prevision || 'No especificado'}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Comuna de residencia</label>
              {isEditing ? (
                <select
                  className="form-select"
                  value={form.comuna}
                  onChange={e => setForm({ ...form, comuna: e.target.value })}
                >
                  <option value="">Seleccione</option>
                  {COMUNAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <div className="profile-value">{profile.comuna || 'No especificado'}</div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button className="btn btn-ghost" onClick={handleCancelEdit}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={18} /> Guardar Cambios
              </button>
            </div>
          )}
        </div>

        {/* Estadísticas */}
        <div className="card profile-section">
          <div className="profile-section-header">
            <Heart className="text-primary" size={20} />
            <h4>Estadísticas de este Perfil</h4>
          </div>

          <div className="profile-stats-list">
            <div className="profile-stat-item">
              <span>Ahorro Acumulado</span>
              <strong className="text-accent text-xl">{formatCLP(totalProfileSavings)}</strong>
            </div>
            <div className="profile-stat-item">
              <span>Medicamentos Activos</span>
              <strong>{profileMeds}</strong>
            </div>
            <div className="profile-stat-item">
              <span>Recetas Subidas</span>
              <strong>{profileRecipes}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
