// ============================================================
// FAMILY — Gestión Familiar
// ============================================================

import { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Heart, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCLP, calculateFamilySavings, generateSmartAlerts } from '../services/savingsEngine';
import { TIPOS_PERFIL, RANGOS_EDAD, COMUNAS } from '../data/mockData';
import './Family.css';

export default function Family() {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  
  // Modal form state
  const [form, setForm] = useState({
    nombre: '',
    tipoPerfil: 'otro',
    rangoEdad: '',
    comuna: '',
  });

  const totalFamilySavings = calculateFamilySavings(state.purchases);
  const canAddMore = state.subscription.plan === 'premium' || state.profiles.length < 2;

  const handleOpenModal = (profile = null) => {
    if (profile) {
      setEditingProfile(profile.id);
      setForm({
        nombre: profile.nombre,
        tipoPerfil: profile.tipoPerfil,
        rangoEdad: profile.rangoEdad || '',
        comuna: profile.comuna || '',
      });
    } else {
      setEditingProfile(null);
      setForm({
        nombre: '',
        tipoPerfil: 'otro',
        rangoEdad: '',
        comuna: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre.trim() || !form.rangoEdad) return;

    const tipo = TIPOS_PERFIL.find(t => t.id === form.tipoPerfil);
    
    if (editingProfile) {
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: {
          id: editingProfile,
          updates: {
            ...form,
            tipo: tipo.label,
            icono: tipo.icono,
          }
        }
      });
    } else {
      dispatch({
        type: 'ADD_PROFILE',
        payload: {
          id: `profile-${Date.now()}`, // AppContext reemplaza con UUID real de Supabase
          ...form,
          tipo: tipo.label,
          icono: tipo.icono,
          creadoEn: new Date().toISOString(),
          patologias: [],
        }
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (state.profiles.length === 1) {
      alert('No puedes eliminar el único perfil de la cuenta.');
      return;
    }
    if (window.confirm('¿Estás seguro de eliminar este perfil? Se conservará el historial de compras pero se borrarán las alertas activas.')) {
      dispatch({ type: 'DELETE_PROFILE', payload: id });
    }
  };

  const switchProfile = (id) => {
    dispatch({ type: 'SET_ACTIVE_PROFILE', payload: id });
  };

  return (
    <div className="family-page animate-fade-in">
      <div className="family-header">
        <div>
          <h2 className="family-title">Gestión Familiar</h2>
          <p className="text-secondary">Administra los medicamentos y alertas de tus seres queridos.</p>
        </div>
        {!canAddMore && (
          <div className="badge badge-warning">
            Límite gratuito alcanzado (2/2)
          </div>
        )}
      </div>

      <div className="card family-hero-card">
        <div className="family-hero-content">
          <div className="family-hero-icon">
            <Heart size={32} />
          </div>
          <div className="family-hero-text">
            <h3>Ahorro Familiar Acumulado</h3>
            <p>Juntos han ahorrado {formatCLP(totalFamilySavings)} desde que usan la plataforma.</p>
          </div>
        </div>
      </div>

      <div className="family-grid mt-6 stagger-children">
        {state.profiles.map((p) => {
          const profileMeds = state.medications.filter(m => m.profileId === p.id && !m.deleted);
          const profileAlerts = generateSmartAlerts(profileMeds);
          const isActive = state.activeProfileId === p.id;

          return (
            <div key={p.id} className={`card family-profile-card ${isActive ? 'active' : ''}`}>
              <div className="family-profile-header">
                <div className="family-profile-avatar">{p.icono}</div>
                <div className="family-profile-info">
                  <h4>{p.nombre}</h4>
                  <span className="text-secondary text-sm">{p.tipo} • {p.rangoEdad}</span>
                </div>
              </div>

              <div className="family-profile-stats">
                <div className="family-profile-stat">
                  <strong>{profileMeds.length}</strong>
                  <span>Medicamentos</span>
                </div>
                <div className="family-profile-stat">
                  <strong>{profileAlerts.length}</strong>
                  <span>Alertas</span>
                </div>
              </div>

              <div className="family-profile-actions">
                <button 
                  className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'} btn-sm`} 
                  style={{ flex: 1 }}
                  onClick={() => switchProfile(p.id)}
                  disabled={isActive}
                >
                  {isActive ? 'Perfil Activo' : 'Cambiar a este perfil'}
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => handleOpenModal(p)}>
                  <Edit2 size={16} />
                </button>
                <button className="btn btn-ghost btn-icon text-danger" onClick={() => handleDelete(p.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {canAddMore ? (
          <button className="family-add-card" onClick={() => handleOpenModal()}>
            <div className="family-add-icon">
              <Plus size={32} />
            </div>
            <span>Agregar nuevo familiar</span>
          </button>
        ) : (
          <div className="family-premium-upsell">
            <ShieldAlert size={32} className="text-warning mb-2" />
            <h4>¿Necesitas más perfiles?</h4>
            <p className="text-sm text-secondary text-center mt-2 mb-4">
              Pásate a Premium para gestionar familiares ilimitados y obtener reportes avanzados.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.href = '/premium'}>
              Ver planes Premium
            </button>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editingProfile ? 'Editar Perfil' : 'Nuevo Perfil Familiar'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsModalOpen(false)}>
                <Users size={20} />
              </button>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Nombre del familiar</label>
              <input 
                className="form-input" 
                value={form.nombre} 
                onChange={e => setForm({...form, nombre: e.target.value})} 
                placeholder="Ej. María"
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Relación</label>
              <select 
                className="form-select" 
                value={form.tipoPerfil}
                onChange={e => setForm({...form, tipoPerfil: e.target.value})}
              >
                {TIPOS_PERFIL.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Rango de edad</label>
              <select 
                className="form-select" 
                value={form.rangoEdad}
                onChange={e => setForm({...form, rangoEdad: e.target.value})}
              >
                <option value="">Seleccione rango</option>
                {RANGOS_EDAD.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Ciudad o Comuna</label>
              <select 
                className="form-select" 
                value={form.comuna}
                onChange={e => setForm({...form, comuna: e.target.value})}
              >
                <option value="">Seleccione comuna (opcional)</option>
                {COMUNAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={handleSave}
                disabled={!form.nombre || !form.rangoEdad}
              >
                Guardar perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
